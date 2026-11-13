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
    assert.equal(bloco.filtros[0].id, 'todos');
    for (const n of bloco.nichos) {
      assert.ok(n.itens.length > 0 && n.itens.length <= 6);
      assert.ok(!/hipertens|diabet|mental|gestan|defici/i.test(n.titulo));
      for (const it of n.itens) {
        assert.equal(typeof it.fixado, 'boolean');
        assert.equal(typeof it.rotulo_fixar, 'string');
        assert.equal(it.acao_fixar.tipo, 'fixar_servico');
        assert.equal(it.acao_fixar.fixar, !it.fixado);
        assert.equal(typeof it.rotulo_leitor, 'string');
        assert.equal(it.logo.tipo, 'sigla');
        assert.equal(typeof it.banner.titulo, 'string');
        assert.equal(typeof it.banner.texto, 'string');
        assert.ok(['Agende aqui', 'Abrir serviço'].includes(it.banner.rotulo_botao));
        assert.ok(['iniciar_jornada', 'abrir_servico'].includes(it.banner.acao.tipo));
        assert.ok(!('telefone' in it.banner) && !('horario' in it.banner) && !('local' in it.banner));
      }
    }
  });
}

test('cidadão sem histórico e com fixado passa a ter nichos só dos fixados', async () => {
  const id = 'C000003';
  const fix = await amb.tratar({ metodo: 'POST', caminho: `/dados/fixados/${id}`, consulta: {}, corpo: { servico_id: 942, fixar: true } });
  assert.equal(fix.status, 200);
  const h = await home(id);
  const bloco = h.blocos.find((b) => b.grupo === 'atalhos');
  assert.ok(bloco.nichos && bloco.nichos.length === 1);
  const item = bloco.nichos[0].itens[0];
  assert.equal(item.servico_id, 942);
  assert.equal(item.fixado, true);
  assert.equal(item.motivo, 'Fixado por você');
  assert.equal(item.rotulo_fixar, 'Remover dos atalhos');
  assert.equal(item.acao_fixar.fixar, false);
  assert.equal(item.banner.rotulo_botao, 'Agende aqui');
  assert.equal(item.banner.acao.tipo, 'iniciar_jornada');
  await amb.tratar({ metodo: 'POST', caminho: `/dados/fixados/${id}`, consulta: {}, corpo: { servico_id: 942, fixar: false } });
});
