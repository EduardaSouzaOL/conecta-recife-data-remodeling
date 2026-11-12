import { consentimentos, registrarEvento, salvar } from './store.js';

// Duas finalidades independentes. Cada uma tem texto, registro e revogação próprios (LGPD, art. 11, I).
export const FINALIDADE_SAUDE = 'saude_personalizacao';
export const FINALIDADE_ACESSIBILIDADE = 'acessibilidade_personalizacao';
export const FINALIDADE = FINALIDADE_SAUDE; // padrão, mantido para quem chama sem informar a finalidade
export const FINALIDADES = [FINALIDADE_SAUDE, FINALIDADE_ACESSIBILIDADE];

/** Textos mostrados ao cidadão. Ficam aqui no backend para o app só exibir (e para auditoria). */
export const TEXTO_CONSENTIMENTO = {
  finalidade: FINALIDADE_SAUDE,
  versao_texto: '2.0',
  titulo: 'Quer ver serviços de saúde pensados para você?',
  resumo: 'Podemos usar informações de saúde do seu cadastro para mostrar serviços que combinam com a sua situação. Só fazemos isso se você deixar.',
  o_que_usamos: [
    'Se você tem hipertensão ou diabetes',
    'Se você tem algum cuidado de saúde mental',
    'Se você está gestante',
  ],
  para_que_usamos: 'Apenas para escolher e ordenar os serviços que aparecem na sua tela inicial e explicar por que cada um apareceu.',
  o_que_nao_fazemos: [
    'Não descobrimos nada sobre a sua saúde pelos serviços que você acessa.',
    'Não mostramos informação de saúde para outras pessoas.',
    'Não compartilhamos esses dados com empresas.',
    'Não condicionamos nenhum serviço ao seu consentimento.',
  ],
  se_nao_aceitar: 'Tudo continua funcionando normalmente. Você só deixa de ver as sugestões de saúde feitas para o seu caso.',
  como_mudar_de_ideia: 'Você pode retirar o consentimento quando quiser, em Privacidade. Ao retirar, paramos de usar esses dados na hora.',
  base_legal: 'LGPD, art. 11, inciso I (consentimento específico e destacado para dado sensível).',
  opcoes: [
    { valor: 'concedido', rotulo: 'Aceito' },
    { valor: 'recusado', rotulo: 'Agora não' },
  ],
};

export const TEXTO_ACESSIBILIDADE = {
  finalidade: FINALIDADE_ACESSIBILIDADE,
  versao_texto: '1.0',
  titulo: 'Quer ver serviços com apoio de acessibilidade?',
  resumo: 'Podemos usar a informação de que você é pessoa com deficiência, que já consta no seu cadastro, para mostrar serviços e benefícios que podem ajudar. Só fazemos isso se você deixar.',
  o_que_usamos: [
    'Se você é pessoa com deficiência',
  ],
  para_que_usamos: 'Apenas para escolher e ordenar os serviços que aparecem na sua tela inicial e explicar por que cada um apareceu. Não pedimos laudo nem detalhes da sua condição.',
  o_que_nao_fazemos: [
    'Não mudamos a aparência do aplicativo por causa dessa informação. As opções de acessibilidade da tela são para todas as pessoas.',
    'Não usamos informações de saúde. Isso é outra autorização, separada.',
    'Não mostramos essa informação para outras pessoas.',
    'Não compartilhamos esses dados com empresas.',
    'Não condicionamos nenhum serviço ao seu consentimento.',
  ],
  se_nao_aceitar: 'Tudo continua funcionando normalmente. Você só deixa de ver as sugestões de acessibilidade feitas para o seu caso.',
  como_mudar_de_ideia: 'Você pode retirar o consentimento quando quiser, em Privacidade. Ao retirar, paramos de usar essa informação na hora.',
  base_legal: 'LGPD, art. 11, inciso I (consentimento específico e destacado para dado sensível).',
  opcoes: [
    { valor: 'concedido', rotulo: 'Aceito' },
    { valor: 'recusado', rotulo: 'Agora não' },
  ],
};

const TEXTOS = { [FINALIDADE_SAUDE]: TEXTO_CONSENTIMENTO, [FINALIDADE_ACESSIBILIDADE]: TEXTO_ACESSIBILIDADE };

const MENSAGENS = {
  [FINALIDADE_SAUDE]: {
    pendente: 'Ainda não perguntamos. Enquanto isso, não usamos nenhuma informação de saúde.',
    concedido: 'Você autorizou. Usamos suas informações de saúde só para sugerir serviços. Você pode retirar quando quiser.',
    recusado: 'Você escolheu não autorizar. Não usamos nenhuma informação de saúde. Se mudar de ideia, é só aceitar depois.',
    revogado: 'Você retirou a autorização. Paramos de usar suas informações de saúde.',
  },
  [FINALIDADE_ACESSIBILIDADE]: {
    pendente: 'Ainda não perguntamos. Enquanto isso, não usamos essa informação.',
    concedido: 'Você autorizou. Usamos essa informação só para sugerir serviços de acessibilidade. Você pode retirar quando quiser.',
    recusado: 'Você escolheu não autorizar. Não usamos essa informação. Se mudar de ideia, é só aceitar depois.',
    revogado: 'Você retirou a autorização. Paramos de usar essa informação.',
  },
};

const STATUS_VALIDOS = ['concedido', 'recusado', 'revogado'];

export const finalidadeValida = (f) => FINALIDADES.includes(f);
export const textoDaFinalidade = (f = FINALIDADE_SAUDE) => TEXTOS[f] || null;

// Registro sem finalidade (formato antigo) conta como saúde.
const daFinalidade = (x, finalidade) => (x.finalidade || FINALIDADE_SAUDE) === finalidade;

function ultimo(id, finalidade) {
  const l = (consentimentos[id] || []).filter((x) => daFinalidade(x, finalidade));
  return l.length ? l[l.length - 1] : null;
}

/** Status atual: pendente (nunca respondeu), concedido, recusado ou revogado. */
export function statusConsentimento(id, finalidade = FINALIDADE_SAUDE) {
  return ultimo(id, finalidade)?.status || 'pendente';
}

export const temConsentimento = (id, finalidade) => statusConsentimento(id, finalidade) === 'concedido';
export const temConsentimentoSaude = (id) => temConsentimento(id, FINALIDADE_SAUDE);
export const temConsentimentoAcessibilidade = (id) => temConsentimento(id, FINALIDADE_ACESSIBILIDADE);

/** Histórico de mudanças. Sem `finalidade`, devolve as duas, na ordem em que aconteceram. */
export function historicoConsentimento(id, finalidade = null) {
  return (consentimentos[id] || [])
    .filter((x) => !finalidade || daFinalidade(x, finalidade))
    .map((x) => ({ ...x }));
}

export function registrarDecisao(id, decisao, finalidade = FINALIDADE_SAUDE) {
  if (!finalidadeValida(finalidade)) {
    return { erro: 'finalidade_invalida', mensagem: `A finalidade deve ser "${FINALIDADE_SAUDE}" ou "${FINALIDADE_ACESSIBILIDADE}".` };
  }
  if (!STATUS_VALIDOS.includes(decisao)) {
    return { erro: 'decisao_invalida', mensagem: 'A decisão deve ser "concedido", "recusado" ou "revogado".' };
  }
  const atual = statusConsentimento(id, finalidade);
  if (decisao === 'revogado' && atual !== 'concedido') {
    return { erro: 'nada_a_revogar', mensagem: 'Não há consentimento ativo para retirar.' };
  }
  if (decisao === 'recusado' && atual === 'concedido') {
    return { erro: 'use_revogado', mensagem: 'Para retirar um consentimento já dado, use "revogado".' };
  }
  if (decisao !== atual) {
    (consentimentos[id] ||= []).push({ finalidade, status: decisao, ts: new Date().toISOString(), versao_texto: TEXTOS[finalidade].versao_texto });
    registrarEvento(id, `consentimento_${decisao}`, { finalidade });
    salvar();
  }
  return { ok: true };
}

/** Resumo de uma finalidade para o app: o que está valendo e o que o cidadão pode fazer agora. */
export function resumoConsentimento(id, finalidade = FINALIDADE_SAUDE) {
  const status = statusConsentimento(id, finalidade);
  return {
    finalidade,
    status,
    // `usa_dados_de_saude` é o nome antigo; vale para a finalidade pedida. Prefira `usa_dados`.
    usa_dados: status === 'concedido',
    usa_dados_de_saude: finalidade === FINALIDADE_SAUDE && status === 'concedido',
    mensagem: MENSAGENS[finalidade][status],
    // Só perguntamos de forma ativa quem nunca respondeu. Quem recusou/revogou não é pressionado: vê apenas o link em Privacidade.
    deve_pedir_agora: status === 'pendente',
    acoes_disponiveis: status === 'concedido' ? ['revogado'] : ['concedido'],
    atualizado_em: ultimo(id, finalidade)?.ts || null,
  };
}

/** Resumo das duas finalidades, por nome. */
export function resumoTodos(id) {
  return Object.fromEntries(FINALIDADES.map((f) => [f, resumoConsentimento(id, f)]));
}
