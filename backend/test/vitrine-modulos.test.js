import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as g from './golden-comum.js';
// Tarefa 3.7: `montarVitrine` foi dividida em `recomendacao/vitrine/`. Estes testes cobrem a estrutura,
// as regras de diversidade e do serviço novo, a saída idêntica ao golden e a vitrine de dois cidadãos.
// **Validates: Requirements 2.8, 3.4, 3.9, 3.10**
const PASTA = fileURLToPath(new URL('../src/recomendacao/vitrine/', import.meta.url));
let amb;
let V;
let D;
before(async () => {
  amb = await g.prepararAmbiente();
  V = await import('../src/recomendacao/vitrine.js');
  D = await import('../src/recomendacao/vitrine/diversidade.js');
});
after(() => amb?.limpar());

// ---------- estrutura ----------
test('a pasta tem os módulos previstos e nenhum importa de api/', () => {
  assert.deepEqual(readdirSync(PASTA).sort(), ['candidatos.js', 'diversidade.js', 'item.js', 'pontuacao.js', 'textos.js']);
  for (const arq of readdirSync(PASTA)) {
    assert.ok(!/from '(\.\.\/)+api/.test(readFileSync(join(PASTA, arq), 'utf8')), `${arq} importa de api/`);
  }
});

test('o texto genérico de saúde sem consentimento fica em candidatos.js', () => {
  const GENERICO = 'Pessoas com um perfil parecido com o seu também costumam acessar este serviço.';
  for (const arq of readdirSync(PASTA)) {
    const tem = readFileSync(join(PASTA, arq), 'utf8').includes(GENERICO);
    assert.equal(tem, arq === 'candidatos.js', `${arq}`);
  }
});

// ---------- diversidade ----------
const ponto = (sv, orgao, extra = {}) => ({ sv, s: { orgao_sigla: orgao }, x: { m: {} }, melhor: 'regra', contrib: { pop: 0 }, ...extra });

test('diversificar: no máximo 2 do mesmo órgão nos 5 primeiros', () => {
  const lista = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => ponto(i, i <= 6 ? 'A' : 'B'));
  const esc = D.diversificar(lista, 8);
  assert.deepEqual(esc.slice(0, 5).map((p) => p.s.orgao_sigla).filter((o) => o === 'A').length, 2);
  assert.ok(esc.slice(0, 5).every((p, i, a) => a.filter((q) => q.s.orgao_sigla === p.s.orgao_sigla).length <= 2));
  assert.ok(esc.length <= 8);
});

test('diversificar: aceita só uma repetição do histórico e respeita o limite', () => {
  const lista = [1, 2, 3, 4].map((i) => ponto(i, `O${i}`, { melhor: 'rep' }));
  assert.equal(D.diversificar(lista, 8).length, 1);
  assert.equal(D.diversificar([1, 2, 3].map((i) => ponto(i, `O${i}`)), 2).length, 2);
});

test('garantirServicoNovo: insere serviço novo com o motivo "Pessoas como você também usam"', () => {
  const popular = { texto: 'Pessoas como você também usam. É muito acessado por X.', peso: 1 };
  const base = [1, 2].map((i) => ponto(i, `O${i}`));
  const novo = ponto(9, 'O9', { x: { m: { popular } }, melhor: 'dem', contrib: { pop: 0.2 } });
  const escolhidos = [...base];
  D.garantirServicoNovo(escolhidos, [...base, novo], { hist: [] }, 8);
  assert.ok(escolhidos.includes(novo));
  assert.equal(novo.melhor, 'pop');
  assert.ok(novo.x.m.popular.texto.startsWith('Pessoas como você também usam'));
  // com a lista cheia, substitui a última posição
  const cheia = [1, 2, 3].map((i) => ponto(i, `O${i}`));
  D.garantirServicoNovo(cheia, [...cheia, novo], { hist: [] }, 3);
  assert.equal(cheia[2], novo);
  // serviço já usado no histórico não entra
  const usado = [];
  D.garantirServicoNovo(usado, [novo], { hist: [['2026-06-03', '10:00', 9]] }, 8);
  assert.equal(usado.length, 0);
});

// ---------- saída idêntica ao golden ----------
test('hash de cada combinação igual ao golden (8 personas + 300 cidadãos, 4 consentimentos, 3 limites)', async () => {
  const golden = g.lerFixture('golden-vitrine.json');
  const hashes = await g.calcularHashesDaVitrine(amb);
  assert.equal(Object.keys(hashes).length, 3600);
  assert.deepEqual(hashes, golden.hashes);
});

// ---------- dois cidadãos lado a lado ----------
test('mãe com criança pequena e senhor de 70 anos: vitrines diferentes e sem saúde sem consentimento', async () => {
  const { dados } = amb;
  const mae = g.PERSONAS.find((id) => dados.cidadaos.get(id).perfil.criancas_na_familia === 'primeira_infancia')
    ?? 'C076260';
  const senhor = 'C062244';
  const a = V.montarVitrine(mae, amb.derivados, { limite: 8 });
  const b = V.montarVitrine(senhor, amb.derivados, { limite: 8 });
  assert.notDeepEqual(a.itens.map((i) => i.servico_id), b.itens.map((i) => i.servico_id));
  for (const v of [a, b]) {
    assert.equal(v.aviso_saude, 'Não usamos nenhuma informação de saúde nesta lista.');
    assert.ok(v.itens.every((i) => i.origem !== 'saude' && i.origem !== 'acessibilidade'));
    assert.ok(!/hipertens|diabet|gestan|saúde mental/i.test(JSON.stringify(v.itens.map((i) => [i.tag, i.motivo, i.outros_motivos]))));
  }
});
