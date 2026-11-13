import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import * as g from './golden-comum.js';

// Tarefa 2 (backend-fechar-lacunas): Home em blocos. **Validates: R2, R6, design seção 9**

let amb;
before(async () => { amb = await g.prepararAmbiente(); });
after(() => amb?.limpar());

const home = async (id) => {
  const r = await amb.tratar({ metodo: 'GET', caminho: `/recomendacao/${id}/home`, consulta: {}, corpo: {} });
  assert.equal(r.status, 200);
  return r.corpo;
};
const ids = (h) => h.blocos.map((b) => b.id);
const servicosDe = (h) => h.blocos.flatMap((b) => b.itens.map((i) => i.servico_id));

test('estrutura: blocos não vazios, até 3 itens, serviço em um só bloco, itens com acao e rotulo_leitor', async () => {
  for (const id of ['C007938', 'C068579', 'C059592', 'C036462', 'C039227', 'C076260', 'C006566', 'C062244']) {
    const h = await home(id);
    assert.equal(h.perfil, 'logado');
    assert.ok(h.blocos.length > 0);
    const todos = servicosDe(h);
    assert.equal(new Set(todos).size, todos.length, `${id}: serviço repetido entre blocos`);
    for (const b of h.blocos) {
      assert.ok(b.itens.length >= 1 && b.itens.length <= 3, `${id}/${b.id}`);
      for (const i of b.itens) {
        assert.ok(i.acao?.tipo && i.rotulo_leitor && i.motivo && i.por_que_vejo.texto);
        assert.ok(Array.isArray(i.por_que_vejo.dados_usados));
      }
    }
    assert.ok(h.controles.length > 0);
  }
});

test('personas diferentes recebem blocos diferentes', async () => {
  const mae = await home('C076260');
  const idoso = await home('C062244');
  assert.notDeepEqual(servicosDe(mae), servicosDe(idoso));
  assert.ok(ids(mae).includes('familia'));
});

test('sem consentimento não há "Cuidar de você" nem dado de saúde no motivo', async () => {
  const h = await home('C062244');
  assert.ok(!ids(h).includes('saude'));
  const texto = JSON.stringify(h.blocos);
  assert.doesNotMatch(texto, /hipertens|diabet|saúde mental|gestante|deficiência/i);
  assert.ok(!texto.includes('"id":"saude"'));
});

test('com consentimento de saúde o bloco aparece e o título não cita a condição', async () => {
  const id = 'C062244';
  await amb.tratar({ metodo: 'POST', caminho: `/dados/consentimentos/${id}`, consulta: {}, corpo: { decisao: 'concedido', finalidade: 'saude_personalizacao' } });
  const h = await home(id);
  // C062244 tem Home definida pela equipe: com consentimento ganha "Cuidados contínuos".
  const b = h.blocos.find((x) => x.id === 'cuidados_continuos');
  assert.ok(b, 'bloco cuidados_continuos ausente');
  assert.equal(b.titulo, 'Cuidados contínuos');
  for (const x of h.blocos) {
    assert.doesNotMatch(x.titulo, /hipertens|diabet|gestan|saúde mental/i);
    for (const i of x.itens) assert.doesNotMatch(i.motivo_curto, /hipertens|diabet|gestan|saúde mental/i);
  }
  await amb.tratar({ metodo: 'POST', caminho: `/dados/consentimentos/${id}`, consulta: {}, corpo: { decisao: 'revogado', finalidade: 'saude_personalizacao' } });
  const sem = await home(id);
  assert.ok(!sem.blocos.some((x) => x.id === 'cuidados_continuos'));
  assert.doesNotMatch(JSON.stringify(sem.blocos), /hipertens|diabet/i);
});

test('pouco ou nenhum histórico: primeiro bloco é "Mais procurados", nunca vazio', async () => {
  const { dados } = await import('../src/dados/carga.js');
  const semHist = [...dados.cidadaos.keys()].find((c) => !dados.historico.has(c));
  const h = await home(semHist);
  assert.equal(h.blocos[0].id, 'mais_procurados');
  assert.ok(h.blocos[0].itens.length > 0);
  assert.equal(h.base_da_personalizacao, 'perfil');
});

test('personalização desligada devolve a estrutura do visitante com personalizacao_ativa=false', async () => {
  const id = 'C068579';
  await amb.tratar({ metodo: 'POST', caminho: `/recomendacao/${id}/personalizacao`, consulta: {}, corpo: { ativa: false } });
  const h = await home(id);
  assert.equal(h.personalizacao_ativa, false);
  assert.deepEqual(ids(h), ['mais_usados', 'atalhos']);
  assert.equal(h.controles[0].id, 'ligar_personalizacao');
  await amb.tratar({ metodo: 'POST', caminho: `/recomendacao/${id}/personalizacao`, consulta: {}, corpo: { ativa: true } });
});

test('GET personalizacao mostra o estado (ligada por padrão, desligada depois do POST) e o botão para mudar', async () => {
  const id = 'C076260';
  const ler = async () => (await amb.tratar({ metodo: 'GET', caminho: `/recomendacao/${id}/personalizacao`, consulta: {}, corpo: {} })).corpo;
  let r = await ler();
  assert.equal(r.cidadao_id, id);
  assert.equal(r.personalizacao_ativa, true);
  assert.equal(r.controle.id, 'desligar_personalizacao');
  assert.deepEqual(r.controle.acao.corpo, { ativa: false });
  await amb.tratar({ metodo: 'POST', caminho: `/recomendacao/${id}/personalizacao`, consulta: {}, corpo: { ativa: false } });
  r = await ler();
  assert.equal(r.personalizacao_ativa, false);
  assert.equal(r.controle.id, 'ligar_personalizacao');
  assert.match((await home(id)).explicacao_geral, /desligou as sugestões/);
  await amb.tratar({ metodo: 'POST', caminho: `/recomendacao/${id}/personalizacao`, consulta: {}, corpo: { ativa: true } });
  // visitante não tem personalização: a rota responde (sem erro 500) com o estado "desligado"
  const vis = (await amb.tratar({ metodo: 'GET', caminho: '/recomendacao/visitante/personalizacao', consulta: {}, corpo: {} })).corpo;
  assert.equal(vis.personalizacao_ativa, false);
});
test('id inexistente dá 404 e a lista plana segue com "itens"', async () => {
  await assert.rejects(() => amb.tratar({ metodo: 'GET', caminho: '/recomendacao/C999999/home', consulta: {}, corpo: {} }), (e) => e.status === 404 || e.codigo === 'cidadao_nao_encontrado' || /cidadao_nao_encontrado/.test(JSON.stringify(e)));
  const plana = await amb.tratar({ metodo: 'GET', caminho: '/recomendacao/C007938', consulta: {}, corpo: {} });
  assert.ok(Array.isArray(plana.corpo.itens));
});
