import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizarTema } from '../src/recomendacao/nichos.js';
// Tarefa 3.1 (destravar-backend-para-kodiak). **Validates: Requirements 2.13**

test('normalizarTema remove espaços sobrando', () => {
  assert.equal(normalizarTema(['  Saúde  ']), 'Saúde');
  assert.equal(normalizarTema(['Educação', 'Saúde']), 'Educação');
});

test('normalizarTema ignora "Conecta Labs" em qualquer caixa e com espaços', () => {
  assert.equal(normalizarTema([' Conecta Labs ', 'Saúde']), 'Saúde');
  assert.equal(normalizarTema(['CONECTA LABS', 'conecta labs', ' Cidadania']), 'Cidadania');
});

test('normalizarTema pula valores vazios', () => {
  assert.equal(normalizarTema(['', '   ', 'Mobilidade']), 'Mobilidade');
});

test('normalizarTema devolve null sem tema válido', () => {
  assert.equal(normalizarTema([]), null);
  assert.equal(normalizarTema(['Conecta Labs']), null);
  assert.equal(normalizarTema([' ', ' conecta labs ']), null);
  assert.equal(normalizarTema(undefined), null);
  assert.equal(normalizarTema(null), null);
});
