import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import * as g from './golden-comum.js';

// Propriedade 2 (preservação): a vitrine tem a mesma saída de antes da refatoração.
// **Validates: Requirements 3.4, 3.9, 3.10**
// Referência: test/fixtures/golden-vitrine.json (SHA-256 do JSON de montarVitrine, gerado com o código original).

const golden = g.lerFixture('golden-vitrine.json');
let amb;
let atual;
before(async () => {
  amb = await g.prepararAmbiente();
  atual = await g.calcularHashesDaVitrine(amb);
});
after(() => amb?.limpar());

test('a amostra tem 300 cidadãos (8 personas, 50 sem histórico) e 3.600 combinações', () => {
  const ids = g.amostraDeCidadaos(amb.dados);
  assert.equal(new Set(ids).size, 300);
  assert.equal(ids.filter((i) => !amb.dados.historico.has(i)).length, 50);
  assert.deepEqual(ids.slice(0, 8), g.PERSONAS);
  assert.equal(golden.total, 300 * 4 * 3);
  assert.equal(Object.keys(atual).length, golden.total);
});

for (const combinacao of Object.keys(g.COMBINACOES)) {
  for (const limite of g.LIMITES) {
    test(`vitrine idêntica ao golden: consentimento "${combinacao}", limite ${limite}`, () => {
      const diferentes = Object.keys(golden.hashes)
        .filter((k) => k.endsWith(`|${combinacao}|${limite}`))
        .filter((k) => atual[k] !== golden.hashes[k]);
      assert.deepEqual(diferentes, [], `cidadãos com vitrine diferente: ${diferentes.slice(0, 5).join(', ')}`);
    });
  }
}
