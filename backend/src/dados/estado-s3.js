import { carregarEstadoDeTexto, estadoComoTexto } from './store.js';

/**
 * Estado compartilhado entre instâncias do Lambda (pedidos, consentimentos, preferências, eventos).
 * Cada instância tem o seu /tmp; sem isso, um pedido criado numa instância não existe na outra.
 *
 * Liga só com a variável ESTADO_S3="bucket/chave.json". Sem ela (servidor local e testes), nada muda.
 * Antes de cada requisição: baixa o objeto se ele mudou (ETag). Depois de cada requisição que grava: envia.
 * Usa o SDK que já vem no runtime Node.js do Lambda (@aws-sdk/client-s3); nada novo no pacote.
 */

const alvo = () => {
  const v = process.env.ESTADO_S3 || '';
  const i = v.indexOf('/');
  return i > 0 ? { Bucket: v.slice(0, i), Key: v.slice(i + 1) } : null;
};

let s3 = null;
let sdk = null;
let etag = null;

async function cliente() {
  if (!s3) {
    sdk = await import('@aws-sdk/client-s3');
    s3 = new sdk.S3Client({});
  }
  return s3;
}

export const estadoCompartilhadoLigado = () => !!alvo();

/** Traz o estado mais novo do S3. Devolve true se recarregou. Falha de rede não derruba a requisição. */
export async function sincronizarDoS3() {
  const a = alvo();
  if (!a) return false;
  try {
    const c = await cliente();
    const r = await c.send(new sdk.GetObjectCommand({ ...a, ...(etag ? { IfNoneMatch: etag } : {}) }));
    const texto = await r.Body.transformToString('utf-8');
    carregarEstadoDeTexto(texto);
    etag = r.ETag;
    return true;
  } catch (e) {
    const st = e?.$metadata?.httpStatusCode;
    if (st === 304) return false; // não mudou
    if (st === 404 || e?.name === 'NoSuchKey') return false; // ainda não existe: a primeira gravação cria
    console.warn('[estado-s3] não consegui ler o estado compartilhado:', e?.name || e);
    return false;
  }
}

/** Envia o estado atual ao S3 (depois de criar, confirmar, avaliar etc.). */
export async function enviarParaS3() {
  const a = alvo();
  if (!a) return;
  try {
    const c = await cliente();
    const r = await c.send(new sdk.PutObjectCommand({ ...a, Body: estadoComoTexto(), ContentType: 'application/json' }));
    etag = r.ETag;
  } catch (e) {
    console.warn('[estado-s3] não consegui gravar o estado compartilhado:', e?.name || e);
  }
}
