import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Estado em pasta temporária; os dados de BD/ são somente leitura.
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'conecta-entrada-'));
process.env.DATA_DIR = DIR;
after(() => fs.rmSync(DIR, { recursive: true, force: true }));

const { carregarDados } = await import('../src/dados/carga.js');
const {
  identificarCidadao, lerCampo, lerFinalidade, lerLimite, lerCampos, lerTela, lerConfirmar, lerTipoDeEvento,
} = await import('../src/api/entrada.js');
const { ErroHttp } = await import('../src/api/erros.js');
await carregarDados();

// Expressão original do handler de /recomendacao, usada como oráculo.
const limiteOriginal = (corpo, consulta) => Math.min(20, Math.max(1, Number(corpo.limite ?? consulta.limite ?? 8) || 8));

const erroDe = (fn) => { try { fn(); } catch (e) { return e; } return null; };

test('lerCampo: corpo vence a consulta', () => {
  assert.equal(lerCampo({ a: 1 }, { a: 2 }, 'a'), 1);
  assert.equal(lerCampo({}, { a: 2 }, 'a'), 2);
  assert.equal(lerCampo({}, {}, 'a'), undefined);
});

test('lerLimite: padrão 8 e limites de 1 a 20', () => {
  assert.equal(lerLimite({}, {}), 8);
  assert.equal(lerLimite({}, { limite: '' }), 8);
  assert.equal(lerLimite({}, { limite: '0' }), 8);
  assert.equal(lerLimite({}, { limite: '99' }), 20);
  assert.equal(lerLimite({}, { limite: 'abc' }), 8);
  assert.equal(lerLimite({ limite: 3 }, { limite: '9' }), 3);
});

test('lerLimite: igual à expressão original para -5 a 50, texto e vazio', () => {
  const valores = [];
  for (let n = -5; n <= 50; n++) valores.push(n, String(n));
  valores.push('', 'abc', null, undefined, '3.7', 2.5);
  for (const v of valores) {
    assert.equal(lerLimite({ limite: v }, {}), limiteOriginal({ limite: v }, {}), `corpo ${String(v)}`);
    assert.equal(lerLimite({}, { limite: v }), limiteOriginal({}, { limite: v }), `consulta ${String(v)}`);
  }
});

test('lerCampos: objeto, texto válido e texto inválido', () => {
  assert.deepEqual(lerCampos({ campos: { a: 1 } }), { a: 1 });
  assert.deepEqual(lerCampos({ campos: '{"a":1}' }), { a: 1 });
  assert.equal(lerCampos({}), undefined);
  const e = erroDe(() => lerCampos({ campos: '{x' }));
  assert.ok(e instanceof ErroHttp);
  assert.equal(e.status, 400);
  assert.equal(e.erro, 'campos_invalidos');
});

test('lerFinalidade: padrão de saúde, valores válidos e inválido', () => {
  assert.equal(lerFinalidade({}, {}), 'saude_personalizacao');
  assert.equal(lerFinalidade({}, { finalidade: 'acessibilidade_personalizacao' }), 'acessibilidade_personalizacao');
  assert.equal(lerFinalidade({ finalidade: 'saude_personalizacao' }, { finalidade: 'x' }), 'saude_personalizacao');
  const e = erroDe(() => lerFinalidade({}, { finalidade: 'x' }));
  assert.equal(e.status, 400);
  assert.equal(e.erro, 'finalidade_invalida');
});

test('lerTela e lerConfirmar: corpo, depois consulta, valor bruto', () => {
  assert.equal(lerTela({}, { tela: 'local' }), 'local');
  assert.equal(lerTela({ tela: 'a' }, { tela: 'b' }), 'a');
  assert.equal(lerConfirmar({}, { confirmar: 'true' }), 'true');
  assert.equal(lerConfirmar({ confirmar: true }, {}), true);
  assert.equal(lerConfirmar({}, {}), undefined);
});

test('lerTipoDeEvento: só tipos permitidos', () => {
  const ok = new Set(['tela_pulada']);
  assert.equal(lerTipoDeEvento({ tipo: 'tela_pulada' }, ok), 'tela_pulada');
  const e = erroDe(() => lerTipoDeEvento({ tipo: 'outro' }, ok));
  assert.equal(e.status, 400);
  assert.equal(e.erro, 'evento_invalido');
});

test('identificarCidadao: id válido, inválido e inexistente', () => {
  const r = identificarCidadao('C000003');
  assert.equal(r.id, 'C000003');
  const invalido = erroDe(() => identificarCidadao('xyz'));
  assert.equal(invalido.status, 400);
  assert.equal(invalido.erro, 'id_invalido');
  assert.equal(invalido.message, 'Código inválido. Use o formato C000001 (ou só o número, como 1).');
  const inexistente = erroDe(() => identificarCidadao('C999999'));
  assert.equal(inexistente.status, 404);
  assert.equal(inexistente.erro, 'cidadao_nao_encontrado');
});
