import { dados } from '../dados/carga.js';
import { preferencias } from '../dados/store.js';
import { temConsentimentoSaude, temConsentimentoAcessibilidade } from '../dados/consentimento.js';
import { listarJornadas } from '../dados/jornada/index.js';
import { curto } from '../dados/servicos.js';
import { itemDeServico } from '../dados/catalogo.js';
import { montarVitrine } from './vitrine.js';
import { temHomeFixa, blocosFixos } from './home-fixa.js';
import { REGRAS, categoriasSensiveis } from './regras.js';
import { montarHomeVisitante, servicosMaisUsados, acaoDoServico } from './home-visitante.js';

// Home em blocos: reagrupa a lista da vitrine (que já aplica consentimento e preferências).
// Nada aqui recalcula pontuação. Cada serviço aparece em um só bloco, com no máximo 3 itens.

const MAX_POR_BLOCO = 3;
const MIN_HISTORICO = 3; // abaixo disso, "Seus atalhos" cai para "Mais procurados"

const idsDaRegra = (...regras) => new Set(REGRAS.filter((r) => regras.includes(r.id)).flatMap((r) => r.ids));
const PET = idsDaRegra('tutor');
const FAMILIA = idsDaRegra('primeira_infancia', 'crianca', 'adolescente');
const DIREITOS = idsDaRegra('cadunico_entrar', 'cadunico_tem', 'bolsa_familia');
const EPOCA = idsDaRegra('matricula_creche', 'frequencia_escolar');

// Blocos em ordem fixa. `quando` recebe o item da vitrine; o primeiro bloco que aceitar fica com ele.
const BLOCOS = [
  { id: 'saude', titulo: 'Cuidar de você', quando: (v) => v.origem === 'saude' },
  { id: 'pet', titulo: 'Você e seu pet', quando: (v) => PET.has(v.servico_id) },
  { id: 'familia', titulo: 'Para sua família', quando: (v) => FAMILIA.has(v.servico_id) },
  { id: 'direitos', titulo: 'Você pode ter direito a', quando: (v) => DIREITOS.has(v.servico_id) || v.origem === 'acessibilidade' },
  { id: 'epoca', titulo: 'Nesta época do ano', quando: (v) => v.origem === 'demanda' || EPOCA.has(v.servico_id) },
  { id: 'parecidos', titulo: 'Quem é como você também usa', quando: (v) => v.origem === 'popular' || v.origem === 'historico' },
];

const DADOS = {
  cadastro: { id: 'cadastro', rotulo: 'Seu cadastro' },
  historico: { id: 'historico', rotulo: 'Seu histórico no app' },
  epoca: { id: 'epoca', rotulo: 'Época do ano' },
  saude: { id: 'saude', rotulo: 'Informações de saúde que você autorizou' },
  acessibilidade: { id: 'acessibilidade', rotulo: 'Informação de acessibilidade que você autorizou' },
};

// "Por que vejo isto?": uma linha por tipo de motivo, sem citar dado pessoal.
function porQueVejo(v) {
  switch (v.origem) {
    case 'repetir': return { texto: 'Você já usou este serviço.', dados_usados: [DADOS.historico] };
    case 'historico': {
      const nome = /^Quem acessou "(.+)" também/.exec(v.motivo)?.[1];
      return { texto: nome ? `Quem usou ${nome} também costuma usar este.` : 'Quem usou serviços parecidos também costuma usar este.', dados_usados: [DADOS.historico] };
    }
    case 'popular': return { texto: 'Muita gente no Recife procura este serviço.', dados_usados: [DADOS.cadastro] };
    case 'demanda': return { texto: 'Este serviço é muito procurado nesta época do ano.', dados_usados: [DADOS.epoca] };
    case 'saude': return { texto: 'Com base no seu uso do app.', dados_usados: [DADOS.saude] };
    case 'acessibilidade': return { texto: 'Isso combina com as informações do seu cadastro.', dados_usados: [DADOS.acessibilidade] };
    case 'geral': return { texto: 'Muita gente no Recife procura este serviço.', dados_usados: [] };
    default: return { texto: 'Isso combina com as informações do seu cadastro.', dados_usados: [DADOS.cadastro] };
  }
}

// Campos que diferenciam os cartões: descrição curta e tipo do serviço (Agendamento, Solicitacao, Informacao).
function extrasDoServico(s) {
  if (!s) return { descricao: '', tipo_servico: 'Informacao' };
  const i = itemDeServico(s);
  return { descricao: i.descricao, tipo_servico: i.tipo };
}

function itemDaVitrine(v, id, posicao, id_bloco) {
  const s = dados.servicos.get(v.servico_id);
  const base = porQueVejo(v);
  // No bloco de direitos, o motivo sempre fala de direito ("pode ter direito"), nunca de outro bloco.
  const motivo = id_bloco === 'direitos' && !/direito/i.test(v.motivo || '')
    ? 'Você pode ter direito a este serviço. Confira as regras antes de pedir.'
    : (v.motivo || base.texto);
  const p = { ...base, texto: motivo === base.texto ? motivo : `${motivo} ${base.texto}` };
  return {
    ...extrasDoServico(s),
    posicao,
    servico_id: v.servico_id,
    titulo: v.titulo,
    orgao: v.orgao,
    tag: v.tag,
    motivo,
    por_que_vejo: p,
    rotulo_leitor: `Abrir ${v.titulo}`,
    acao: acaoDoServico(s),
    dispensar: { rotulo: 'Não me interessa', rotulo_leitor: `Não quero ver ${v.titulo}`, acao: { tipo: 'api', metodo: 'POST', caminho: `/recomendacao/${id}/dispensar`, corpo: { servico_id: v.servico_id } } },
  };
}

// Itens que não vêm da vitrine (atalhos, mais procurados, próximo passo).
function itemSimples(s, posicao, motivo, origem) {
  const titulo = curto(s.nome);
  const p = { texto: motivo, dados_usados: origem === 'historico' ? [DADOS.historico] : [] };
  return { ...extrasDoServico(s), posicao, servico_id: s.servico_id, titulo, orgao: s.orgao_sigla, motivo, por_que_vejo: p, rotulo_leitor: `Abrir ${titulo}`, acao: acaoDoServico(s) };
}

const podeMostrar = (s, id) => categoriasSensiveis(s).every((c) => (c === 'saude' ? temConsentimentoSaude(id) : temConsentimentoAcessibilidade(id)));

export function controles(id, ativa) {
  return [{
    id: ativa ? 'desligar_personalizacao' : 'ligar_personalizacao',
    rotulo: ativa ? 'Não usar meus dados para sugestões' : 'Usar meus dados para sugestões',
    rotulo_leitor: ativa ? 'Desligar as sugestões feitas com os seus dados' : 'Ligar as sugestões feitas com os seus dados',
    acao: { tipo: 'api', metodo: 'POST', caminho: `/recomendacao/${id}/personalizacao`, corpo: { ativa: !ativa } },
  }];
}

/** Os 3 serviços mais usados pelo cidadão, em posição fixa (mais acessos, depois menor id). */
function atalhosDoHistorico(hist, id) {
  const cont = new Map();
  for (const h of hist) cont.set(h[2], (cont.get(h[2]) || 0) + 1);
  return [...cont.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .map(([sv]) => dados.servicos.get(sv))
    .filter((s) => s && podeMostrar(s, id));
}

/** Serviço sugerido depois do último pedido concluído, se houver. */
function proximoPasso(id, derivados) {
  const concluida = listarJornadas(id).find((j) => j.estado === 'concluida');
  if (!concluida) return null;
  for (const [dest] of derivados.proximo[concluida.servico_id] || []) {
    const s = dados.servicos.get(dest);
    if (s && dest !== concluida.servico_id && podeMostrar(s, id)) {
      return { servico: s, de: dados.servicos.get(concluida.servico_id) };
    }
  }
  return null;
}

/** Home do cidadão logado. Personalização desligada: mesma estrutura da Home do visitante. */
export function montarHome(id, derivados, consulta = {}) {
  const pref = preferencias[id] || {};
  if (pref.personalizar === false) {
    const v = montarHomeVisitante(consulta);
    return {
      ...v,
      perfil: 'logado',
      cidadao_id: id,
      personalizacao_ativa: false,
      explicacao_geral: 'Você desligou as sugestões com os seus dados. Mostramos os serviços mais usados por todas as pessoas.',
      controles: controles(id, false),
    };
  }

  const vit = montarVitrine(id, derivados, { limite: 20 });
  const hist = dados.historico.get(id) || [];
  const dispensados = new Set(pref.dispensados || []);
  // Atalhos primeiro: o que a pessoa mais usa fica fixo e não se repete nos recomendados.
  const atalhos = hist.length >= MIN_HISTORICO ? atalhosDoHistorico(hist, id).slice(0, MAX_POR_BLOCO) : [];
  const usados = new Set(atalhos.map((s) => s.servico_id));
  const porBloco = new Map(BLOCOS.map((b) => [b.id, []]));
  for (const v of vit.itens) {
    if (v.origem === 'repetir' || v.origem === 'geral' || usados.has(v.servico_id)) continue; // já cobertos por atalhos e mais procurados
    const b = BLOCOS.find((x) => x.quando(v));
    if (!b || porBloco.get(b.id).length >= MAX_POR_BLOCO) continue;
    porBloco.get(b.id).push(v);
    usados.add(v.servico_id);
  }

  const blocos = [];

  // Primeiro bloco: atalhos do histórico ou, com pouco histórico, os mais procurados.
  if (hist.length >= MIN_HISTORICO) {
    if (atalhos.length) {
      blocos.push({ id: 'atalhos', grupo: 'atalhos', titulo: 'Seus atalhos', itens: atalhos.map((s, i) => itemSimples(s, i + 1, 'Você já usou este serviço.', 'historico')) });
    }
  } else {
    const lista = servicosMaisUsados()
      .filter((s) => !usados.has(s.servico_id) && !dispensados.has(s.servico_id) && podeMostrar(s, id))
      .slice(0, MAX_POR_BLOCO);
    lista.forEach((s) => usados.add(s.servico_id));
    if (lista.length) {
      blocos.push({ id: 'mais_procurados', grupo: 'atalhos', titulo: 'Mais procurados', itens: lista.map((s, i) => itemSimples(s, i + 1, 'Muita gente no Recife procura este serviço.', 'geral')) });
    }
  }

  for (const b of BLOCOS) {
    const itens = porBloco.get(b.id);
    if (!itens.length) continue;
    blocos.push({ id: b.id, grupo: 'recomendados', titulo: b.titulo, itens: itens.map((v, i) => itemDaVitrine(v, id, i + 1, b.id)) });
  }

  const prox = proximoPasso(id, derivados);
  if (prox && !usados.has(prox.servico.servico_id)) {
    blocos.push({
      id: 'proximo_passo',
      grupo: 'recomendados',
      titulo: 'Próximo passo',
      itens: [itemSimples(prox.servico, 1, `Quem usou ${curto(prox.de.nome, 60)} também costuma usar este.`, 'historico')],
    });
  }

  return {
    perfil: 'logado',
    cidadao_id: id,
    personalizacao_ativa: true,
    base_da_personalizacao: vit.base_da_personalizacao,
    explicacao_geral: vit.explicacao_geral,
    aviso_saude: vit.aviso_saude,
    aviso_acessibilidade: vit.aviso_acessibilidade,
    convite_consentimento: vit.convite_consentimento,
    convite_acessibilidade: vit.convite_acessibilidade,
    controles: controles(id, true),
    // Personas da apresentação (C076260 e C062244): blocos definidos pela equipe.
    blocos: temHomeFixa(id) ? blocosFixos(id) : blocos,
  };
}
