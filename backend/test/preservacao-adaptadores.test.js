import test from 'node:test';
import assert from 'node:assert/strict';
import * as g from './golden-comum.js';
import { capturarAdaptadores } from './adaptadores-comum.js';

// Propriedade 2 (preservação): servidor local e Lambda respondem como antes (status, JSON, CORS, gravação de estado).
// **Validates: Requirements 3.8, 3.10**
// Referência: test/fixtures/golden-adaptadores.json.

const golden = g.lerFixture('golden-adaptadores.json');
const atual = await capturarAdaptadores();

test('Lambda: CORS inclui DELETE e a resposta de OPTIONS é 204 só com CORS', () => {
  const o = atual.lambda.respostas.options;
  assert.equal(o.statusCode, 204);
  assert.equal(o.headers['Access-Control-Allow-Methods'], 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  assert.equal(o.body, '');
});

test('servidor local: CORS não inclui DELETE', () => {
  const o = atual.servidor.respostas.options;
  assert.equal(o.status, 204);
  assert.equal(o.headers['access-control-allow-methods'], 'GET,POST,PUT,PATCH,OPTIONS');
});

test('Lambda grava o estado na hora fora de GET, e não grava em GET', () => {
  assert.equal(atual.lambda.estado_gravado.depois_de_get, false);
  assert.equal(atual.lambda.estado_gravado.depois_de_post, true);
});

test('servidor local grava o estado ao receber SIGTERM', () => {
  assert.equal(atual.servidor.estado_gravado_ao_sair, true);
});

test('servidor local serve o painel e rejeita corpo acima de 100 KB', () => {
  assert.equal(atual.servidor.respostas.painel.status, 200);
  assert.equal(atual.servidor.respostas.painel.html, true);
  assert.equal(atual.servidor.respostas['raiz para navegador'].html, true);
  assert.equal(atual.servidor.respostas['corpo grande'].rejeitado, true);
});

test('Lambda: corpo acima de 100 KB dá 413 e JSON inválido dá 400', () => {
  assert.equal(atual.lambda.respostas['corpo grande'].statusCode, 413);
  assert.equal(JSON.parse(atual.lambda.respostas['json invalido'].body).erro, 'json_invalido');
});

for (const [nome, esperado] of Object.entries(golden.lambda.respostas)) {
  test(`Lambda idêntico ao golden: ${nome}`, () => assert.deepEqual(atual.lambda.respostas[nome], esperado));
}
for (const [nome, esperado] of Object.entries(golden.servidor.respostas)) {
  test(`servidor local idêntico ao golden: ${nome}`, () => assert.deepEqual(atual.servidor.respostas[nome], esperado));
}
test('estado gravado igual ao golden', () => {
  assert.deepEqual(atual.lambda.estado_gravado, golden.lambda.estado_gravado);
  assert.equal(atual.servidor.estado_gravado_ao_sair, golden.servidor.estado_gravado_ao_sair);
});
