import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// As variáveis precisam existir antes de importar o adaptador (carga.js lê DATA_DIR ao carregar).
const aqui = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lambda-test-'));
process.env.DATA_DIR = path.join(tmp, 'data');
process.env.DERIVADOS_SEMENTE = path.resolve(aqui, '..', 'data', 'derivados.json');

let handler;
before(async () => { ({ handler } = await import('../src/api/lambda.js')); });
after(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

const ev = (metodo, rawPath, extra = {}) => ({
  requestContext: { http: { method: metodo } }, rawPath, queryStringParameters: undefined, ...extra,
});
const json = (r) => JSON.parse(r.body);

test('GET /health responde ok', { timeout: 120000 }, async () => {
  const r = await handler(ev('GET', '/health'));
  assert.equal(r.statusCode, 200);
  assert.equal(json(r).ok, true);
  assert.ok(json(r).cidadaos > 80000);
  assert.match(r.headers['Content-Type'], /json/);
});

test('GET /dados/cidadaos/C007938 entra como a persona', async () => {
  const r = await handler(ev('GET', '/dados/cidadaos/C007938'));
  assert.equal(r.statusCode, 200);
});

test('GET /recomendacao/C007938 devolve itens', async () => {
  const r = await handler(ev('GET', '/recomendacao/C007938', { queryStringParameters: { limite: '8' } }));
  assert.equal(r.statusCode, 200);
  assert.ok(Array.isArray(json(r).itens) || Array.isArray(json(r).vitrine) || typeof json(r) === 'object');
});

test('cidadão inexistente devolve 404 cidadao_nao_encontrado', async () => {
  const r = await handler(ev('GET', '/dados/cidadaos/C999999'));
  assert.equal(r.statusCode, 404);
  assert.equal(json(r).erro, 'cidadao_nao_encontrado');
  assert.ok(json(r).mensagem);
});

test('OPTIONS responde 204 com CORS', async () => {
  const r = await handler(ev('OPTIONS', '/health'));
  assert.equal(r.statusCode, 204);
  assert.ok(r.headers['Access-Control-Allow-Methods'].includes('DELETE'));
});

test('POST com JSON inválido devolve 400 json_invalido', async () => {
  const r = await handler(ev('POST', '/dados/eventos', { body: '{quebrado' }));
  assert.equal(r.statusCode, 400);
  assert.equal(json(r).erro, 'json_invalido');
});

test('corpo grande devolve 413', async () => {
  const r = await handler(ev('POST', '/dados/eventos', { body: JSON.stringify({ x: 'a'.repeat(200 * 1024) }) }));
  assert.equal(r.statusCode, 413);
  assert.equal(json(r).erro, 'corpo_grande');
});

test('rota inexistente devolve 404 rota_nao_encontrada', async () => {
  const r = await handler(ev('GET', '/nao-existe'));
  assert.equal(r.statusCode, 404);
  assert.equal(json(r).erro, 'rota_nao_encontrada');
});
