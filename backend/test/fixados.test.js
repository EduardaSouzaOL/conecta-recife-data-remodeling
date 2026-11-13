import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import * as g from './golden-comum.js';

// Tarefa 3.3: fixados (store, rotas e eventos). **Validates: Requirements 2.11**

let amb;
let store;
before(async () => {
  amb = await g.prepararAmbiente();
  store = await import('../src/dados/store.js');
});
after(() => amb?.limpar());

const chamar = async (metodo, caminho, corpo = {}) => {
  try {
    return await amb.tratar({ metodo, caminho, consulta: {}, corpo });
  } catch (e) {
    return { status: e.status, corpo: { erro: e.erro, mensagem: e.message } };
  }
};
const post = (id, servico_id, fixar) => chamar('POST', `/dados/fixados/${id}`, { servico_id, fixar });
const lista = async (id) => (await chamar('GET', `/dados/fixados/${id}`)).corpo.fixados;
const contar = (tipo, id) => store.eventos.filter((e) => e.tipo === tipo && e.cidadao_id === id).length;

test('fixar mantém a ordem de fixação e GET devolve a lista', async () => {
  assert.deepEqual(await lista('C000001'), []);
  await post('C000001', 352, true);
  await post('C000001', 942, true);
  const r = await chamar('GET', '/dados/fixados/C000001');
  assert.equal(r.status, 200);
  assert.deepEqual(r.corpo, { cidadao_id: 'C000001', fixados: [352, 942], limite: 6 });
});

test('idempotência: fixar de novo ou desafixar quem não está devolve 200 sem evento novo', async () => {
  const antes = contar('servico_fixado', 'C000001');
  const r = await post('C000001', 352, true);
  assert.equal(r.status, 200);
  assert.deepEqual(r.corpo.fixados, [352, 942]);
  assert.equal(contar('servico_fixado', 'C000001'), antes);
  const d = await post('C000001', 216, false);
  assert.equal(d.status, 200);
  assert.equal(contar('servico_desafixado', 'C000001'), 0);
});

test('desafixar remove e registra o evento servico_desafixado só quando muda', async () => {
  const r = await post('C000001', 352, false);
  assert.deepEqual(r.corpo.fixados, [942]);
  assert.equal(contar('servico_desafixado', 'C000001'), 1);
  const ev = store.eventos.find((e) => e.tipo === 'servico_desafixado' && e.cidadao_id === 'C000001');
  assert.equal(ev.servico_id, 352);
  assert.deepEqual(Object.keys(ev).sort(), ['cidadao_id', 'servico_id', 'tipo', 'ts']);
});

test('limite de 6: o sétimo volta 422 e nada muda', async () => {
  const ids = [352, 942, 216, 519, 1475, 953];
  for (const s of ids) assert.equal((await post('C000002', s, true)).status, 200);
  const r = await post('C000002', 1428, true);
  assert.equal(r.status, 422);
  assert.equal(r.corpo.erro, 'limite_de_fixados');
  assert.deepEqual(await lista('C000002'), ids);
  assert.equal(contar('servico_fixado', 'C000002'), 6);
  // fixar quem já está fixado com a lista cheia continua idempotente
  assert.equal((await post('C000002', 216, true)).status, 200);
});

test('serviço inexistente: 404; cidadão inexistente ou id inválido', async () => {
  assert.equal((await post('C000001', 99999999, true)).status, 404);
  assert.equal((await post('C999999', 352, true)).status, 404);
  assert.equal((await chamar('GET', '/dados/fixados/C999999')).status, 404);
  assert.equal((await chamar('GET', '/dados/fixados/abc')).status, 400);
});

test('corpo inválido: 422 fixar_invalido', async () => {
  for (const corpo of [{}, { servico_id: 352 }, { servico_id: 352, fixar: 'true' }, { fixar: true }, { servico_id: 'abc', fixar: true }, { servico_id: 3.5, fixar: true }]) {
    const r = await chamar('POST', '/dados/fixados/C000001', corpo);
    assert.equal(r.status, 422, JSON.stringify(corpo));
    assert.equal(r.corpo.erro, 'fixar_invalido');
  }
});

test('só GET e POST existem: PATCH, PUT e DELETE dão 405', async () => {
  for (const m of ['PATCH', 'PUT', 'DELETE']) assert.equal((await chamar(m, '/dados/fixados/C000001')).status, 405);
});

test('fixar serviço de saúde não exige consentimento', async () => {
  const r = await post('C062244', 519, true);
  assert.equal(r.status, 200);
  assert.deepEqual(r.corpo.fixados, [519]);
});

test('definirFixado no store: cópia, idempotência e persistência no objeto de estado', () => {
  const a = store.definirFixado('C000003', 10, true);
  assert.equal(a.mudou, true);
  a.fixados.push(99); // mexer na cópia não altera o estado
  assert.deepEqual(store.listarFixados('C000003'), [10]);
  assert.equal(store.definirFixado('C000003', 10, true).mudou, false);
  assert.equal(store.fixados['C000003'][0], 10);
});
