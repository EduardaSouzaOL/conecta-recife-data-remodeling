import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import * as g from './golden-comum.js';

// Teste de exploração da condição do bug (destravar-backend-para-kodiak, tarefa 1).
// Deve FALHAR no código atual: a Home não traz `nichos` no grupo `atalhos`.
// **Validates: Requirements 1.11, 2.11**

let amb;
before(async () => { amb = await g.prepararAmbiente(); });
after(() => amb?.limpar());

const home = async (id) => {
  const r = await amb.tratar({ metodo: 'GET', caminho: `/recomendacao/${id}/home`, consulta: {}, corpo: {} });
  assert.equal(r.status, 200);
  return r.corpo;
};

for (const id of ['C059592', 'C007938']) {
  test(`${id}: o bloco do grupo atalhos traz nichos[] e filtros[]`, async () => {
    const h = await home(id);
    const bloco = h.blocos.find((b) => b.grupo === 'atalhos');
    assert.ok(bloco, 'sem bloco do grupo atalhos');
    assert.ok(Array.isArray(bloco.nichos) && bloco.nichos.length > 0, 'nichos ausente no bloco de atalhos');
    assert.ok(bloco.nichos.length <= 4);
    assert.equal(bloco.nichos[0].aberto, true);
    assert.ok(bloco.nichos.slice(1).every((n) => n.aberto === false));
    assert.equal(bloco.filtros.length, bloco.nichos.length + 1);
  });
}
