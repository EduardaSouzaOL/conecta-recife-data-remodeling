import { estadoPublico } from './acompanhamento.js';
import crypto from 'node:crypto';
import { dados } from '../carga.js';
import { jornadas, registrarEvento, salvar } from '../store.js';
import { temJornada } from '../servicos.js';
import { telasDoServico } from './telas.js';
import { validar } from './validacao.js';
import { contexto, visao } from './visao.js';

function limparInvalidos(j) {
  const servico = dados.servicos.get(j.servico_id);
  const telas = telasDoServico(servico);
  let mudou = true;
  while (mudou) {
    mudou = false;
    const ctx = contexto(j);
    for (const t of telas) for (const c of t.campos) {
      if (j.campos[c.nome] !== undefined && validar(c, j.campos[c.nome], ctx).erro) {
        delete j.campos[c.nome];
        j.auto = j.auto.filter((x) => x !== c.nome);
        mudou = true;
      }
    }
  }
}

// ---------- operações ----------

function prefill(j, servico) {
  const p = dados.cidadaos.get(j.cidadao_id).perfil;
  // só o que já é do perfil e não é sensível: preferência de aviso vem do cadastro
  const telas = telasDoServico(servico);
  if (telas.some((t) => t.campos.some((c) => c.nome === 'canal_aviso'))) {
    j.campos.canal_aviso = p.aceita_notificacao ? 'app' : 'nenhum';
    j.auto.push('canal_aviso');
  }
}

export function iniciarJornada(cidadao_id, servico_id, { idempotency_key } = {}) {
  const servico = dados.servicos.get(Number(servico_id));
  if (!servico) return { erro: 'servico_nao_encontrado', mensagem: 'Não encontramos esse serviço.' };
  if (!temJornada(servico)) {
    return { erro: 'jornada_indisponivel', mensagem: 'Este serviço ainda não tem pedido pelo app no protótipo. Escolha um serviço de agendamento, pedido, inscrição ou emissão.' };
  }
  const chave = typeof idempotency_key === 'string' && idempotency_key.trim() ? idempotency_key.trim().slice(0, 80) : null;
  // mesma chave de repetição (toque duplo, rede lenta): devolve o pedido que ela já criou
  if (chave) {
    const repetido = Object.values(jornadas).find((x) => x.cidadao_id === cidadao_id && x.servico_id === servico.servico_id && x.idempotency_key === chave);
    if (repetido) return { jornada: visao(repetido), retomada: true };
  }
  // retoma jornada em andamento do mesmo serviço
  const existente = Object.values(jornadas).find((x) => x.cidadao_id === cidadao_id && x.servico_id === servico.servico_id && x.estado === 'em_andamento');
  if (existente) return { jornada: visao(existente), retomada: true };
  const j = {
    jornada_id: 'J-' + crypto.randomBytes(5).toString('hex').toUpperCase(),
    cidadao_id, servico_id: servico.servico_id, estado: 'em_andamento',
    ...(chave ? { idempotency_key: chave } : {}),
    campos: {}, auto: [], criada_em: new Date().toISOString(), atualizada_em: new Date().toISOString(),
  };
  prefill(j, servico);
  jornadas[j.jornada_id] = j;
  salvar();
  registrarEvento(cidadao_id, 'jornada_iniciada', { servico_id: servico.servico_id });
  const v = visao(j);
  v.telas_puladas.forEach((t) => registrarEvento(cidadao_id, 'tela_pulada', { servico_id: servico.servico_id, tela: t }));
  return { jornada: v };
}

/**
 * O que a pessoa digitou ao criar o pedido. Aceita `campos` (objeto) e `valor_campo`:
 * objeto vira `campos`; texto vai para `campo` (se informado), para "observacao" (se o serviço tem)
 * ou para o primeiro campo da tela atual. Devolve `null` quando não há nada a aplicar.
 */
export function aplicarValorDigitado(id, { campos, valor_campo, campo } = {}) {
  const j = jornadas[id];
  if (!j) return null;
  let novos = campos && typeof campos === 'object' && !Array.isArray(campos) ? { ...campos } : {};
  if (valor_campo && typeof valor_campo === 'object' && !Array.isArray(valor_campo)) novos = { ...novos, ...valor_campo };
  else if (valor_campo !== undefined && valor_campo !== null && valor_campo !== '') {
    const todos = telasDoServico(dados.servicos.get(j.servico_id)).flatMap((t) => t.campos);
    const alvo = (typeof campo === 'string' && todos.find((c) => c.nome === campo))
      || todos.find((c) => c.nome === 'observacao')
      || visao(j).tela_atual.campos[0];
    if (alvo) novos[alvo.nome] = valor_campo;
  }
  if (!Object.keys(novos).length) return null;
  return preencherJornada(id, novos);
}

export function obterJornada(id, { tela } = {}) {
  const j = jornadas[id];
  if (!j) return { erro: 'jornada_nao_encontrada', mensagem: 'Não encontramos esse pedido.' };
  return { jornada: visao(j, { telaPedida: tela }) };
}

function resumoDoAcompanhamento(j) {
  const v = visao(j);
  return { situacao: v.situacao, etapa_atual: v.etapa_atual, previsao: v.previsao };
}

export function listarJornadas(cidadao_id) {
  return Object.values(jornadas)
    .filter((j) => j.cidadao_id === cidadao_id)
    .sort((a, b) => b.criada_em.localeCompare(a.criada_em))
    .map((j) => ({
      jornada_id: j.jornada_id, servico_id: j.servico_id, servico: dados.servicos.get(j.servico_id)?.nome,
      estado: estadoPublico(j), protocolo: j.protocolo || null, criada_em: j.criada_em,
      ...resumoDoAcompanhamento(j),
    }));
}

export function preencherJornada(id, camposNovos, { tela } = {}) {
  const j = jornadas[id];
  if (!j) return { erro: 'jornada_nao_encontrada', mensagem: 'Não encontramos esse pedido.' };
  if (j.estado !== 'em_andamento') return { erro: 'jornada_encerrada', mensagem: 'Este pedido já foi concluído.' };
  const servico = dados.servicos.get(j.servico_id);
  const todos = telasDoServico(servico).flatMap((t) => t.campos);
  const erros = [];
  const antes = { ...j.campos };
  // unidade e data antes de hora, para a disponibilidade ser conferida com os valores novos
  const ordem = (n) => todos.findIndex((c) => c.nome === n);
  const entradas = Object.entries(camposNovos || {}).sort((a, b) => ordem(a[0]) - ordem(b[0]));
  for (const [nome, bruto] of entradas) {
    const campo = todos.find((c) => c.nome === nome);
    if (!campo) { erros.push({ campo: nome, mensagem: 'Esse campo não existe neste pedido.' }); continue; }
    const r = validar(campo, bruto, contexto(j));
    if (r.erro) {
      erros.push({ campo: nome, mensagem: r.erro });
      registrarEvento(j.cidadao_id, 'erro_entendimento', { servico_id: j.servico_id, campo: nome });
      continue;
    }
    if (r.valor === undefined) delete j.campos[nome]; else j.campos[nome] = r.valor;
    j.auto = j.auto.filter((x) => x !== nome); // agora é escolha da pessoa
  }
  limparInvalidos(j);
  j.atualizada_em = new Date().toISOString();
  const alterados = Object.keys(antes).filter((k) => j.campos[k] === undefined && !(k in (camposNovos || {})));
  salvar();
  return { jornada: visao(j, { telaPedida: tela, erros, alterados }) };
}

export function confirmarJornada(id, confirmar) {
  const j = jornadas[id];
  if (!j) return { erro: 'jornada_nao_encontrada', mensagem: 'Não encontramos esse pedido.' };
  if (j.estado === 'cancelada') return { erro: 'jornada_encerrada', mensagem: 'Este pedido foi cancelado.' };
  if (j.estado === 'concluida') return { jornada: visao(j), ja_concluida: true };
  const v = visao(j);
  if (confirmar !== true && confirmar !== 'true') {
    return { erro: 'confirmacao_necessaria', mensagem: 'O pedido só é feito depois que você confirmar.', jornada: v };
  }
  if (!v.pode_confirmar) {
    return { erro: 'campos_pendentes', mensagem: 'Ainda faltam informações para concluir.', jornada: v };
  }
  j.estado = 'concluida';
  j.concluida_em = new Date().toISOString();
  j.atualizada_em = j.concluida_em;
  j.protocolo = `DEMO-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  salvar();
  registrarEvento(j.cidadao_id, 'jornada_concluida', { servico_id: j.servico_id });
  return { jornada: visao(j) };
}
