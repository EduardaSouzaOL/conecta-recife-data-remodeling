import { dados } from '../carga.js';
import { telasDoServico } from './telas.js';
import { acoesDisponiveis } from './acoes-visao.js';
import { opcoesDoCampo, todosValidos, validar, unidadeEscolhida } from './validacao.js';
import { acompanhar, rotuloDeData, estadoPublico } from './acompanhamento.js';

// ---------- montagem da resposta ----------

export const AVISO = 'Protótipo com dados fictícios. Nenhuma solicitação real foi enviada à Prefeitura.';

export function contexto(j) {
  const c = dados.cidadaos.get(j.cidadao_id);
  return { rpa: c.perfil.rpa, campos: j.campos, perfil: c.perfil };
}

function descreverCampo(c, ctx, j) {
  return {
    nome: c.nome, rotulo: c.rotulo, tipo: c.tipo, obrigatorio: !!c.obrigatorio,
    ...(c.ajuda ? { ajuda: c.ajuda } : {}),
    ...(c.min !== undefined ? { min: c.min, max: c.max } : {}),
    ...(c.tipo === 'texto' ? { max: c.max } : {}),
    ...(['select'].includes(c.tipo) ? { opcoes: opcoesDoCampo(c, ctx) } : {}),
    valor: ctx.campos[c.nome] ?? null,
    preenchido_automaticamente: j.auto.includes(c.nome),
  };
}

function rotuloDoValor(c, valor, ctx) {
  if (c.tipo === 'select') return (opcoesDoCampo(c, ctx) || []).find((o) => o.valor === valor)?.rotulo ?? (c.nome === 'data' ? rotuloDeData(valor) : String(valor));
  if (c.tipo === 'booleano') return valor ? 'Sim' : 'Não';
  if (c.nome === 'data') return rotuloDeData(valor);
  return String(valor);
}

function resumoDe(j) {
  const ctx = contexto(j);
  const linhas = [];
  for (const t of telasDoServico(dados.servicos.get(j.servico_id))) {
    for (const c of t.campos) {
      if (ctx.campos[c.nome] === undefined) continue;
      linhas.push({ rotulo: c.rotulo.replace(/\?$/, ''), valor: rotuloDoValor(c, ctx.campos[c.nome], ctx) });
    }
  }
  return linhas;
}

/** Quais telas são puladas, qual é a atual e quais ficam visíveis. */
function calcularTelas(j, telas, ctx, telaPedida) {
  // tela pulada: todos os campos válidos e todos preenchidos pelo sistema
  const puladas = telas.filter((t) => !t.revisao && t.campos.length && t.campos.every((c) => j.auto.includes(c.nome)) && todosValidos(t, ctx)).map((t) => t.id);
  const pendente = telas.find((t) => !t.revisao && !todosValidos(t, ctx));
  const naturalId = pendente ? pendente.id : 'revisar';
  const atual = j.estado === 'concluida' ? telas[telas.length - 1]
    : telas.find((t) => t.id === telaPedida) || telas.find((t) => t.id === naturalId);
  const visiveis = telas.filter((t) => !puladas.includes(t.id));
  const idx = visiveis.findIndex((t) => t.id === atual.id);
  return { puladas, atual, visiveis, idx };
}

/** Nomes dos campos obrigatórios ainda vazios ou inválidos. */
function calcularFaltando(telas, ctx) {
  const faltando = [];
  for (const t of telas) for (const c of t.campos) {
    if (c.obrigatorio && (ctx.campos[c.nome] === undefined || validar(c, ctx.campos[c.nome], ctx).erro)) faltando.push(c.nome);
  }
  return faltando;
}

function montarVisao(j, servico, ctx, { puladas, atual, visiveis, idx }, faltando, erros, alterados) {
  const base = {
    jornada_id: j.jornada_id,
    cidadao_id: j.cidadao_id,
    servico: { servico_id: servico.servico_id, nome: servico.nome, orgao: servico.orgao_sigla },
    estado: estadoPublico(j),
    aviso: AVISO,
    telas: visiveis.map((t) => ({ id: t.id, titulo: t.titulo })),
    telas_puladas: puladas,
    progresso: { atual: idx + 1, total: visiveis.length, percentual: Math.round(((idx + 1) / visiveis.length) * 100) },
    tela_atual: {
      id: atual.id,
      titulo: atual.titulo,
      descricao: atual.descricao || (atual.id === 'documentos' ? servico.requisitos.join(' • ') : undefined),
      revisao: !!atual.revisao,
      campos: atual.campos.map((c) => descreverCampo(c, ctx, j)),
    },
    campos_preenchidos: { ...j.campos },
    campos_preenchidos_automaticamente: [...j.auto],
    alterados_por_dependencia: alterados,
    faltando,
    erros,
    pode_confirmar: faltando.length === 0 && j.estado === 'em_andamento',
    acoes: acoesDisponiveis(j),
    resumo: resumoDe(j),
    protocolo: null,
    concluida_em: null,
    mensagem_final: null,
    unidade: unidadeEscolhida(j.campos, ctx),
    ...acompanhar(j, visiveis, idx),
  };
  if (j.estado === 'concluida') {
    base.protocolo = j.protocolo;
    base.concluida_em = j.concluida_em;
    base.mensagem_final = `Pedido registrado (demonstração). Seu protocolo fictício é ${j.protocolo}.`;
  }
  return base;
}

export function visao(j, { telaPedida, erros = [], alterados = [] } = {}) {
  const servico = dados.servicos.get(j.servico_id);
  const telas = telasDoServico(servico);
  const ctx = contexto(j);
  const calculo = calcularTelas(j, telas, ctx, telaPedida);
  const faltando = calcularFaltando(telas, ctx);
  return montarVisao(j, servico, ctx, calculo, faltando, erros, alterados);
}
