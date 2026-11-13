import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import * as g from './golden-comum.js';

// Tarefa 1 (backend-fechar-lacunas): Home do visitante. **Validates: R1**

let amb;
before(async () => { amb = await g.prepararAmbiente(); });
after(() => amb?.limpar());

const pedir = (consulta = {}) => amb.tratar({ metodo: 'GET', caminho: '/recomendacao/visitante/home', consulta, corpo: {} });

test('visitante: 200, até 2 blocos, nenhum vazio, itens com acao e rotulo_leitor', async () => {
  const r = await pedir();
  assert.equal(r.status, 200);
  assert.equal(r.corpo.perfil, 'visitante');
  assert.ok(r.corpo.blocos.length >= 1 && r.corpo.blocos.length <= 2);
  assert.equal(r.corpo.cidadao_id, undefined);
  for (const b of r.corpo.blocos) {
    assert.ok(b.itens.length > 0);
    for (const i of b.itens) {
      assert.ok(i.rotulo_leitor && i.titulo && i.motivo);
      assert.ok(['abrir_servico', 'iniciar_jornada'].includes(i.acao.tipo));
    }
  }
  assert.ok(r.corpo.blocos.find((b) => b.id === 'mais_usados').itens.length <= 6);
  assert.equal(r.corpo.blocos.find((b) => b.id === 'atalhos').itens.length, 3);
});

test('visitante: busca sem resultado não quebra e não envia bloco vazio', async () => {
  const r = await pedir({ q: 'zzzzqqqq' });
  assert.equal(r.status, 200);
  assert.deepEqual(r.corpo.blocos, []);
  assert.ok(r.corpo.mensagem_busca);
});

test('visitante: /recomendacao/visitante não vira cidadão inválido', async () => {
  const r = await pedir();
  assert.equal(r.corpo.erro, undefined);
});
