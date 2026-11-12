import { ErroHttp, falhar } from './erros.js';

/**
 * Peças de HTTP que o servidor local (`server.js`) e o Lambda (`lambda.js`) compartilham:
 * CORS, limite de corpo, leitura de JSON e conversão de erro em resposta.
 * A diferença entre os ambientes (lista de métodos do CORS) entra por parâmetro.
 */

export const MAX_CORPO = 100 * 1024;

export const METODOS_COM_CORPO = ['POST', 'PUT', 'PATCH'];

/** Cabeçalhos de CORS. `metodos` é a lista anunciada em `Access-Control-Allow-Methods`. */
export const criarCors = (metodos) => ({
  'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
  'Access-Control-Allow-Methods': metodos,
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Max-Age': '600',
});

/** Cabeçalhos de toda resposta JSON, já com o CORS do ambiente. */
export const cabecalhosJson = (cors) => ({
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  ...cors,
});

/** Lança `413 corpo_grande` se o corpo passar de `MAX_CORPO` (o limite exato ainda é aceito). */
export function verificarTamanho(bytes) {
  if (bytes > MAX_CORPO) falhar('corpo_grande', 'Corpo da requisição grande demais.');
}

/** Corpo vazio vira `{}`; JSON quebrado lança `400 json_invalido`. */
export function interpretarJson(buffer) {
  if (!buffer.length) return {};
  try { return JSON.parse(buffer.toString('utf8')); }
  catch { return falhar('json_invalido', 'O corpo precisa ser um JSON válido.'); }
}

/** Converte um erro em `{ status, corpo }`. `ErroHttp` mantém o status; qualquer outro vira `500 erro_interno`. */
export function respostaDeErro(e) {
  if (e instanceof ErroHttp) return { status: e.status, corpo: { erro: e.erro, mensagem: e.message, ...e.extra } };
  console.error('[erro]', e);
  return { status: 500, corpo: { erro: 'erro_interno', mensagem: 'Algo deu errado. Tente de novo em instantes.' } };
}
