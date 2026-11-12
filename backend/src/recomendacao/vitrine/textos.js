import {
  resumoConsentimento, TEXTO_CONSENTIMENTO, TEXTO_ACESSIBILIDADE, FINALIDADE_ACESSIBILIDADE,
} from '../../dados/consentimento.js';

export const TAGS = {
  perfil: 'Para o seu perfil',
  momento: 'Seu momento de vida',
  historico: 'Pelo seu histórico',
  repetir: 'Continue de onde parou',
  popular: 'Pessoas parecidas com você',
  demanda: 'Em alta agora',
  saude: 'Com a sua autorização',
  acessibilidade: 'Acessibilidade, com a sua autorização',
  geral: 'Mais usados',
};

const EXPLICACOES = {
  historico: 'Montamos esta lista com o seu perfil e com os serviços que você já usou.',
  historico_curto: 'Você usou poucos serviços até agora. Por isso combinamos o seu perfil com o que pessoas parecidas com você mais usam.',
  perfil: 'Ainda não temos histórico seu. Por isso mostramos serviços pelo seu perfil, pelo momento de vida e pelo que pessoas parecidas com você mais usam.',
};

export function baseDaPersonalizacao(totalHistorico) {
  const n = totalHistorico;
  return n >= 3 ? 'historico' : n >= 1 ? 'historico_curto' : 'perfil';
}

// Avisos, resumos de consentimento e convites. Os convites são iguais para todas as pessoas
// (o de acessibilidade não revela quem tem deficiência).
export function montarAvisosEConvites(ctx, base) {
  const { id, consentiu, consentiuAcessibilidade } = ctx;
  const consent = resumoConsentimento(id);
  const consentAcess = resumoConsentimento(id, FINALIDADE_ACESSIBILIDADE);
  return {
    explicacao_geral: EXPLICACOES[base],
    aviso_saude: consentiu
      ? 'Usamos informações de saúde porque você autorizou. Você pode retirar quando quiser.'
      : 'Não usamos nenhuma informação de saúde nesta lista.',
    aviso_acessibilidade: consentiuAcessibilidade
      ? 'Usamos a informação de acessibilidade porque você autorizou. Você pode retirar quando quiser.'
      : 'Não usamos nenhuma informação de acessibilidade nesta lista.',
    consentimento: consent,
    convite_consentimento: consent.deve_pedir_agora
      ? { finalidade: TEXTO_CONSENTIMENTO.finalidade, titulo: TEXTO_CONSENTIMENTO.titulo, resumo: TEXTO_CONSENTIMENTO.resumo, opcoes: TEXTO_CONSENTIMENTO.opcoes }
      : null,
    consentimento_acessibilidade: consentAcess,
    convite_acessibilidade: consentAcess.deve_pedir_agora
      ? { finalidade: TEXTO_ACESSIBILIDADE.finalidade, titulo: TEXTO_ACESSIBILIDADE.titulo, resumo: TEXTO_ACESSIBILIDADE.resumo, opcoes: TEXTO_ACESSIBILIDADE.opcoes }
      : null,
  };
}
