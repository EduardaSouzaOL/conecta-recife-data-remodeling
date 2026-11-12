/** Erro esperado da API: vira resposta JSON `{ erro, mensagem, ...extra }` com o status informado. */
export class ErroHttp extends Error {
  constructor(status, erro, mensagem, extra = {}) {
    super(mensagem);
    Object.assign(this, { status, erro, extra });
  }
}

/**
 * Tabela única de erros: código → status HTTP. É o único lugar onde um código ganha status.
 *
 * Divergência registrada: a regra do projeto pede que erro corrigível pelo cidadão volte com
 * `200` e `ok: false`. Por decisão do usuário, os status abaixo ficam como já eram nesta
 * refatoração. Códigos de regra de negócio afetados: `confirmacao_necessaria` (400),
 * `campos_pendentes` (422), `decisao_invalida` (400), `finalidade_invalida` (400),
 * `campos_invalidos` (400), `nada_a_revogar` (409), `use_revogado` (409) e `jornada_encerrada` (409).
 * Só o `PATCH` de campo inválido já segue a regra (200 com `erros[]`).
 */
export const TABELA_ERROS = {
  // entrada
  id_invalido: 400,
  finalidade_invalida: 400,
  decisao_invalida: 400,
  campos_invalidos: 400,
  evento_invalido: 400,
  valor_invalido: 400,
  json_invalido: 400,
  caminho_invalido: 400,
  // regra de negócio
  confirmacao_necessaria: 400,
  nada_a_revogar: 409,
  use_revogado: 409,
  jornada_encerrada: 409,
  campos_pendentes: 422,
  jornada_indisponivel: 422,
  // não encontrado e roteamento
  cidadao_nao_encontrado: 404,
  servico_nao_encontrado: 404,
  jornada_nao_encontrada: 404,
  rota_nao_encontrada: 404,
  metodo_nao_permitido: 405,
  corpo_grande: 413,
};

/** Lança o `ErroHttp` do código, com o status vindo da tabela. Código fora da tabela é erro de programação. */
export function falhar(codigo, mensagem, extra = {}) {
  const status = TABELA_ERROS[codigo];
  if (status === undefined) throw new Error(`Código de erro "${codigo}" não está em TABELA_ERROS (api/erros.js).`);
  throw new ErroHttp(status, codigo, mensagem, extra);
}

/**
 * Converte o resultado de domínio em valor ou erro.
 * `{ erro, mensagem, jornada? }` lança; `{ jornada }` devolve a jornada.
 */
export function desembrulhar(resultado) {
  if (resultado.erro) falhar(resultado.erro, resultado.mensagem, resultado.jornada ? { jornada: resultado.jornada } : {});
  return resultado.jornada;
}
