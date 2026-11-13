import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import * as g from './golden-comum.js';
// API da demonstração: visitante, cidadã DEMO001, pedido sem duplicar, valor digitado, etapas e avaliação.
let amb;
before(async () => {
  amb = await g.prepararAmbiente();
  const { iniciarDemo } = await import('../src/dados/demo.js');
  iniciarDemo();
});
after(() => amb?.limpar());
const chamar = async (metodo, caminho, corpo = {}, consulta = {}) => {
  try { return await amb.tratar({ metodo, caminho, consulta, corpo }); } catch (e) { return { status: e.status, corpo: { erro: e.erro, mensagem: e.message } }; }
};
test('visitante: rotas de leitura respondem 200 e as que gravam pedem login (403), nunca 500', async () => {
  for (const c of ['/dados/cidadaos/visitante', '/dados/cidadaos/visitante/jornadas', '/dados/consentimentos/visitante', '/dados/fixados/visitante',
    '/recomendacao/visitante', '/recomendacao/visitante/home', '/recomendacao/visitante/personalizacao']) {
    assert.equal((await chamar('GET', c)).status, 200, c);
  }
  assert.ok((await chamar('GET', '/recomendacao/visitante')).corpo.itens.length > 0);
  for (const [m, c, b] of [['POST', '/dados/jornadas', { cidadao_id: 'visitante', servico_id: 942 }], ['POST', '/dados/consentimentos/visitante', { decisao: 'concedido' }],
    ['POST', '/dados/fixados/visitante', { servico_id: 942, fixar: true }], ['POST', '/recomendacao/visitante/personalizacao', { ativa: false }]]) {
    const r = await chamar(m, c, b);
    assert.equal(r.status, 403, c);
    assert.equal(r.corpo.erro, 'login_necessario');
  }
});
test('DEMO001 (Ana): perfil, 2 pedidos de exemplo e item na lista de demonstração', async () => {
  const perfil = (await chamar('GET', '/dados/cidadaos/DEMO001')).corpo;
  assert.equal(perfil.nome_exibicao, 'Ana');
  const lista = (await chamar('GET', '/dados/cidadaos/DEMO001/jornadas')).corpo.jornadas;
  assert.deepEqual(lista.map((j) => j.protocolo), ['CNX-2026-000123', 'CNX-2026-000087']);
  const j = (await chamar('GET', '/dados/jornadas/J-DEMO0001')).corpo;
  assert.deepEqual(j.etapa_atual, { numero: 2, total: 4, titulo: 'Aguardando confirmação da unidade' });
  assert.equal(j.previsao, 'até 2 dias úteis');
  assert.deepEqual(j.etapas.map((e) => e.estado), ['feita', 'andamento', 'a_fazer', 'a_fazer']);
  assert.ok(j.unidade.nome && j.unidade.endereco);
  assert.ok((await chamar('GET', '/dados/cidadaos/demo')).corpo.cidadaos.some((c) => c.cidadao_id === 'DEMO001'));
  assert.ok((await chamar('GET', '/recomendacao/DEMO001/home')).corpo.blocos.length > 0);
  assert.equal((await chamar('GET', '/health')).corpo.cidadaos, 89046);
});
test('criar pedido: repetição devolve o mesmo, idempotency_key vale e valor_campo é aplicado', async () => {
  const a = (await chamar('POST', '/dados/jornadas', { cidadao_id: 'C068579', servico_id: 942, idempotency_key: 'abc' })).corpo;
  const b = (await chamar('POST', '/dados/jornadas', { cidadao_id: 'C068579', servico_id: 942, idempotency_key: 'abc' })).corpo;
  const c = (await chamar('POST', '/dados/jornadas', { cidadao_id: 'C068579', servico_id: 942 })).corpo;
  assert.equal(b.jornada_id, a.jornada_id); assert.equal(c.jornada_id, a.jornada_id); assert.equal(b.retomada, true);
  const unidade = a.tela_atual.campos[0].opcoes[0].valor;
  const d = (await chamar('POST', '/dados/jornadas', { cidadao_id: 'C068579', servico_id: 942, valor_campo: unidade })).corpo;
  assert.equal(d.campos_preenchidos.unidade, unidade);
});
test('pedido: resumo, protocolo e mensagem_final sempre existem; avançar, avaliar e GET proibido', async () => {
  const id = 'J-DEMO0001';
  const antes = (await chamar('POST', '/dados/jornadas', { cidadao_id: 'C006566', servico_id: 942 })).corpo;
  assert.ok(Array.isArray(antes.resumo));
  assert.equal(antes.protocolo, null); assert.equal(antes.concluida_em, null); assert.equal(antes.mensagem_final, null);
  for (const r of ['cancelar', 'alterar', 'avaliar', 'confirmar']) assert.equal((await chamar('GET', `/dados/jornadas/${id}/${r}`)).status, 405);
  assert.equal((await chamar('POST', `/demo/jornadas/${antes.jornada_id}/avancar`)).corpo.erro, 'jornada_nao_concluida');
  assert.equal((await chamar('POST', `/dados/jornadas/${id}/avaliar`, { nota: 5, resolvido: 'talvez' })).corpo.erro, 'avaliacao_invalida');
  const av = await chamar('POST', `/demo/jornadas/${id}/avancar`);
  assert.equal(av.corpo.etapa_atual.titulo, 'Consulta confirmada');
  await chamar('POST', `/demo/jornadas/${id}/avancar`);
  assert.equal((await chamar('POST', `/demo/jornadas/${id}/avancar`)).corpo.erro, 'etapa_final');
  const ok = (await chamar('POST', `/dados/jornadas/${id}/avaliar`, { nota: 4, resolvido: 'em_parte', comentario: 'Demorou um pouco' })).corpo;
  assert.equal(ok.avaliacao.resolvido, 'em_parte');
  await chamar('POST', '/demo/reiniciar');
  assert.equal((await chamar('GET', `/dados/jornadas/${id}`)).corpo.etapa_atual.numero, 2);
});
test('personalização: GET mostra o estado e POST aceita só o campo escolhido', async () => {
  const id = 'C076260';
  let r = (await chamar('GET', `/recomendacao/${id}/personalizacao`)).corpo;
  assert.equal(r.personalizacao_ativa, true); assert.equal(r.autorizou_dados_de_saude, false);
  r = (await chamar('POST', `/recomendacao/${id}/personalizacao`, { consentimento_saude: 'concedido' })).corpo;
  assert.equal(r.autorizou_dados_de_saude, true); assert.equal(r.personalizacao_ativa, true);
  r = (await chamar('POST', `/recomendacao/${id}/personalizacao`, { ativa: false })).corpo;
  assert.equal(r.personalizacao_ativa, false); assert.equal(r.autorizou_dados_de_saude, true);
  await chamar('POST', `/recomendacao/${id}/personalizacao`, { ativa: true, consentimento_saude: 'revogado' });
  assert.equal((await chamar('POST', `/recomendacao/${id}/personalizacao`, {})).corpo.erro, 'valor_invalido');
});
test('busca, categorias, interesses e métricas', async () => {
  const b = (await chamar('GET', '/dados/busca', {}, { q: 'agendar consulta' })).corpo;
  assert.ok(b.total > 0);
  assert.deepEqual(Object.keys(b.itens[0]).sort(), ['descricao', 'id', 'orgao', 'tipo', 'titulo']);
  assert.ok(['Agendamento', 'Solicitacao', 'Informacao'].includes(b.itens[0].tipo));
  const vazio = (await chamar('GET', '/dados/busca', {}, { q: 'xyzxyzxyz' })).corpo;
  assert.deepEqual(vazio.itens, []); assert.ok(vazio.mensagem);
  const cats = (await chamar('GET', '/dados/categorias')).corpo;
  assert.equal(cats.total, 17);
  assert.equal(cats.categorias[0].categoria_id, 'saude');
  const s = (await chamar('GET', '/dados/categorias/saude/servicos', {}, { limite: '5' })).corpo;
  assert.equal(s.itens.length, 5); assert.equal(s.total, cats.categorias[0].total_servicos);
  assert.equal((await chamar('GET', '/dados/categorias/nada/servicos')).status, 404);
  const put = (await chamar('PUT', '/dados/cidadaos/C007938/interesses', { interesses: ['saude', 'animais', 'saude'] })).corpo;
  assert.deepEqual(put.interesses, ['saude', 'animais']);
  assert.deepEqual((await chamar('GET', '/dados/cidadaos/C007938/interesses')).corpo.interesses, ['saude', 'animais']);
  assert.equal((await chamar('PUT', '/dados/cidadaos/C007938/interesses', { interesses: ['inexistente'] })).corpo.erro, 'tema_invalido');
  assert.equal((await chamar('PUT', '/dados/cidadaos/visitante/interesses', { interesses: ['saude'] })).status, 403);
  const m = (await chamar('GET', '/dados/metricas')).corpo;
  assert.ok(m.pedidos_criados >= 1 && m.pedidos_confirmados >= 0 && m.avaliacoes >= 1);
  assert.ok(Array.isArray(m.por_dia));
});
