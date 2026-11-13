import test from 'node:test';
import assert from 'node:assert/strict';
import { montarNichos } from '../src/recomendacao/nichos.js';
// Tarefa 3.2 (destravar-backend-para-kodiak). **Validates: Requirements 2.11**
const cat = (...linhas) => new Map(linhas.map(([servico_id, tema]) => [servico_id, { servico_id, nome: `Serviço ${servico_id}`, temas: Array.isArray(tema) ? tema : [tema] }]));
// Linha de histórico: o servico_id fica no índice 2.
const hist = (...ids) => ids.map((sv) => ['2026-06-03', '10:00', sv]);
const sempre = () => true;

test('sem histórico ou sem serviço válido devolve null', () => {
  assert.equal(montarNichos('C1', [], sempre, [], cat([1, 'A'])), null);
  assert.equal(montarNichos('C1', hist(99), sempre, [], cat([1, 'A'])), null);
  assert.equal(montarNichos('C1', hist(1), sempre, [], cat([1, ['Conecta Labs']])), null);
});

test('nichos ordenados por soma de usos; empate pelo nome; só o primeiro aberto', () => {
  const c = cat([1, 'Zeta'], [2, 'Beta'], [3, 'Alfa'], [4, 'Alfa']);
  const r = montarNichos('C1', hist(1, 1, 1, 2, 3, 4), sempre, [], c);
  assert.deepEqual(r.nichos.map((n) => n.titulo), ['Zeta', 'Alfa', 'Beta']);
  assert.deepEqual(r.nichos.map((n) => n.aberto), [true, false, false]);
  const e = montarNichos('C1', hist(1, 2), sempre, [], cat([1, 'Zeta'], [2, 'Beta']));
  assert.deepEqual(e.nichos.map((n) => n.titulo), ['Beta', 'Zeta']);
});

test('máximo de 4 nichos', () => {
  const c = cat([1, 'A'], [2, 'B'], [3, 'C'], [4, 'D'], [5, 'E']);
  const r = montarNichos('C1', hist(1, 2, 3, 4, 5, 5), sempre, [], c);
  assert.equal(r.nichos.length, 4);
  assert.deepEqual(r.nichos.map((n) => n.titulo), ['E', 'A', 'B', 'C']);
});

test('itens por usos e desempate por servico_id; máximo de 6', () => {
  const ids = [1, 2, 3, 4, 5, 6, 7, 8];
  const c = cat(...ids.map((i) => [i, 'Saúde']));
  const r = montarNichos('C1', hist(...ids, 8, 8, 7), sempre, [], c);
  assert.equal(r.nichos.length, 1);
  assert.deepEqual(r.nichos[0].itens.map((i) => i.servico_id), [8, 7, 1, 2, 3, 4]);
  assert.deepEqual(Object.keys(r.nichos[0].itens[0]).sort(), ['servico_id', 'titulo']);
});

test('nicho cujos serviços foram bloqueados por podeMostrar fica ausente', () => {
  const c = cat([1, 'Saúde'], [2, 'Cidadania']);
  const r = montarNichos('C1', hist(1, 1, 2), (s) => s.servico_id !== 1, [], c);
  assert.deepEqual(r.nichos.map((n) => n.titulo), ['Cidadania']);
  assert.equal(montarNichos('C1', hist(1), () => false, [], c), null);
});

test('tema normalizado: espaços e Conecta Labs', () => {
  const c = cat([1, [' Conecta Labs ', '  Saúde ']], [2, 'Saúde']);
  const r = montarNichos('C1', hist(1, 2), sempre, [], c);
  assert.equal(r.nichos.length, 1);
  assert.equal(r.nichos[0].titulo, 'Saúde');
  assert.equal(r.nichos[0].itens.length, 2);
});

// Tarefa 3.4: fixados. **Validates: Requirements 2.11**
const ids = (n) => n.itens.map((i) => i.servico_id);

test('fixado sem uso entra no seu nicho, antes dos mais usados, na ordem de fixação', () => {
  const c = cat([1, 'Saúde'], [2, 'Saúde'], [3, 'Saúde'], [4, 'Saúde']);
  const r = montarNichos('C1', hist(1, 1, 2), sempre, [4, 2], c);
  assert.deepEqual(ids(r.nichos[0]), [4, 2, 1]);
});

test('nicho com fixado vem antes dos demais; sem fixados fica igual ao atual', () => {
  const c = cat([1, 'Zeta'], [2, 'Zeta'], [3, 'Beta']);
  const h = hist(1, 1, 2);
  assert.deepEqual(montarNichos('C1', h, sempre, [3], c).nichos.map((n) => n.titulo), ['Beta', 'Zeta']);
  assert.deepEqual(montarNichos('C1', h, sempre, [], c), montarNichos('C1', h, sempre, undefined, c));
  assert.deepEqual(montarNichos('C1', h, sempre, [], c).nichos.map((n) => n.titulo), ['Zeta']);
  assert.deepEqual(montarNichos('C1', h, sempre, [3], c).nichos.map((n) => n.aberto), [true, false]);
});

test('sem histórico: só fixados formam nichos; sem fixados devolve null', () => {
  const c = cat([1, 'A'], [2, 'B']);
  const r = montarNichos('C1', [], sempre, [2], c);
  assert.deepEqual(r.nichos.map((n) => n.titulo), ['B']);
  assert.deepEqual(ids(r.nichos[0]), [2]);
  assert.equal(montarNichos('C1', [], sempre, [], c), null);
});

test('fixado ignora podeMostrar; inexistente ou sem tema válido fica fora', () => {
  const c = cat([1, 'Saúde'], [2, ['Conecta Labs']]);
  const bloqueia = () => false;
  const r = montarNichos('C1', hist(1), bloqueia, [1, 2, 99], c);
  assert.deepEqual(ids(r.nichos[0]), [1]);
  assert.equal(montarNichos('C1', [], sempre, [2, 99], c), null);
});

test('corte: fixados têm prioridade em 6 itens e em 4 nichos', () => {
  const c = cat(...[1, 2, 3, 4, 5, 6, 7, 8].map((i) => [i, 'Saúde']));
  const r = montarNichos('C1', hist(1, 1, 1, 2, 2, 3), sempre, [8, 7, 6, 5, 4, 3], c);
  assert.deepEqual(ids(r.nichos[0]), [8, 7, 6, 5, 4, 3]);
  const c2 = cat([1, 'A'], [2, 'B'], [3, 'C'], [4, 'D'], [5, 'E']);
  const r2 = montarNichos('C1', hist(1, 1, 2, 3, 4), sempre, [5], c2);
  assert.equal(r2.nichos.length, 4);
  assert.equal(r2.nichos[0].titulo, 'E');
});
