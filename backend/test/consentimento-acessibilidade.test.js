import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Isola o estado em pasta temporária e não carrega os CSVs: tudo roda sobre fixtures pequenas.
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'conecta-acess-'));
process.env.DATA_DIR = DIR;

const { dados } = await import('../src/dados/carga.js');
const store = await import('../src/dados/store.js');
const consent = await import('../src/dados/consentimento.js');
const { montarVitrine } = await import('../src/recomendacao/vitrine.js');
const { criarApp } = await import('../src/api/app.js');

const ID = 'C000001';
const SAUDE = 'saude_personalizacao';
const ACESS = 'acessibilidade_personalizacao';
const GENERICO = 'Pessoas com um perfil parecido com o seu também costumam acessar este serviço.';

const servico = (id, nome, extra = {}) => ({
  servico_id: id, nome, nome_resumido: nome, orgao: 'Órgão', orgao_sigla: `O${id}`, temas: [], grupos: [], publicos: [],
  palavras_chave: [], natureza: 'Agendamento', descricao: '', requisitos: [], passos: [], gratuito: true,
  nivel_digital: 4, cliques: 0, pessoas_unicas: 100, nota_media: null, tem_historico: true, ...extra,
});

const perfil = {
  cidadao_id: ID, idade: 40, faixa_etaria: '40-49', sexo: 'M', rpa: 3, situacao_renda: null, criancas_na_familia: null,
  empreendedor: false, mei: false, servidor_publico: false, proprietario_imovel: false, tutor_animal: false, estudante: false,
  cadastro_unico: false, bolsa_familia: false, usuario_compaz: false, microcredito: false, aceita_notificacao: false,
};

// Cidadão com diabetes E deficiência: assim dá para ver que cada consentimento libera só o seu lado.
function preparar({ origemId = 600 } = {}) {
  dados.cidadaos.clear(); dados.historico.clear(); dados.servicos.clear();
  dados.cidadaos.set(ID, {
    perfil,
    saude: { hipertensao: false, diabetes: true, saude_mental: false, gestante: false },
    acessibilidade: { pessoa_com_deficiencia: true },
  });
  dados.servicos.set(283, servico(283, 'Atendimento de diabetes'));
  dados.servicos.set(299, servico(299, 'Cartão de gratuidade no transporte'));
  dados.servicos.set(600, servico(600, 'Agendar consultas'));
  dados.servicos.set(500, servico(500, 'Pagar IPTU'));
  dados.historico.set(ID, [['2026-06-03', '10:00', origemId, 'S1', 1]]);
  return { proximo: { [origemId]: [[500, 10]] }, populares: {}, demanda: {}, semana_ref: '2026-09-21' };
}

const ids = (v) => v.itens.map((i) => i.servico_id);
const textos = (v) => v.itens.flatMap((i) => [i.motivo, ...i.outros_motivos]);

beforeEach(() => {
  for (const k of Object.keys(store.consentimentos)) delete store.consentimentos[k];
  store.eventos.length = 0;
});
after(() => fs.rmSync(DIR, { recursive: true, force: true }));

test('sem nenhum consentimento, nem saúde nem acessibilidade são sugeridas', () => {
  const v = montarVitrine(ID, preparar());
  assert.ok(!ids(v).includes(283));
  assert.ok(!ids(v).includes(299));
  assert.ok(!v.itens.some((i) => i.origem === 'saude' || i.origem === 'acessibilidade'));
});

test('só o consentimento de saúde não libera acessibilidade', () => {
  consent.registrarDecisao(ID, 'concedido', SAUDE);
  const v = montarVitrine(ID, preparar());
  assert.ok(ids(v).includes(283), 'saúde liberada');
  assert.ok(!ids(v).includes(299), 'acessibilidade continua escondida');
});

test('só o consentimento de acessibilidade libera o serviço de PCD e não libera saúde', () => {
  consent.registrarDecisao(ID, 'concedido', ACESS);
  const v = montarVitrine(ID, preparar());
  const item = v.itens.find((i) => i.servico_id === 299);
  assert.ok(item, 'serviço de acessibilidade aparece');
  assert.equal(item.origem, 'acessibilidade');
  assert.equal(item.tag, 'Acessibilidade, com a sua autorização');
  assert.ok(!/defici/i.test(`${item.tag} ${item.motivo}`), 'o texto não cita a deficiência');
  assert.ok(!ids(v).includes(283), 'saúde continua escondida');
});

test('revogar acessibilidade esconde o serviço de novo, sem mexer em saúde', () => {
  consent.registrarDecisao(ID, 'concedido', SAUDE);
  consent.registrarDecisao(ID, 'concedido', ACESS);
  consent.registrarDecisao(ID, 'revogado', ACESS);
  const v = montarVitrine(ID, preparar());
  assert.ok(!ids(v).includes(299));
  assert.ok(ids(v).includes(283));
  assert.equal(consent.statusConsentimento(ID, SAUDE), 'concedido');
  assert.equal(consent.statusConsentimento(ID, ACESS), 'revogado');
});

test('o nome do serviço de acessibilidade de origem só aparece com o consentimento dele', () => {
  consent.registrarDecisao(ID, 'concedido', SAUDE); // saúde não basta
  let v = montarVitrine(ID, preparar({ origemId: 299 }));
  assert.ok(textos(v).includes(GENERICO));
  assert.ok(textos(v).every((x) => !x.includes('Cartão de gratuidade')));

  consent.registrarDecisao(ID, 'concedido', ACESS);
  v = montarVitrine(ID, preparar({ origemId: 299 }));
  assert.ok(textos(v).some((x) => x.includes('Quem acessou "Cartão de gratuidade no transporte"')));
});

test('as decisões são independentes e cada registro guarda a própria finalidade e data', () => {
  assert.deepEqual(consent.registrarDecisao(ID, 'recusado', ACESS), { ok: true });
  assert.equal(consent.statusConsentimento(ID, ACESS), 'recusado');
  assert.equal(consent.statusConsentimento(ID, SAUDE), 'pendente');
  assert.deepEqual(consent.registrarDecisao(ID, 'concedido', SAUDE), { ok: true });
  const h = consent.historicoConsentimento(ID);
  assert.deepEqual(h.map((x) => [x.finalidade, x.status]), [[ACESS, 'recusado'], [SAUDE, 'concedido']]);
  assert.ok(h.every((x) => x.ts));
  assert.deepEqual(consent.historicoConsentimento(ID, ACESS).map((x) => x.status), ['recusado']);
});

test('registros antigos, sem finalidade, contam como saúde', () => {
  store.consentimentos[ID] = [{ status: 'concedido', ts: 't' }];
  assert.equal(consent.statusConsentimento(ID, SAUDE), 'concedido');
  assert.equal(consent.statusConsentimento(ID, ACESS), 'pendente');
});

test('finalidade inválida é recusada, e sem finalidade vale saúde', () => {
  assert.equal(consent.registrarDecisao(ID, 'concedido', 'outra').erro, 'finalidade_invalida');
  assert.equal(consent.registrarDecisao(ID, 'concedido').ok, true);
  assert.equal(consent.statusConsentimento(ID), 'concedido');
});

test('o convite de acessibilidade aparece para quem não respondeu, sem depender de ter deficiência', () => {
  const derivados = preparar();
  dados.cidadaos.get(ID).acessibilidade.pessoa_com_deficiencia = false;
  const v = montarVitrine(ID, derivados);
  assert.equal(v.convite_acessibilidade.finalidade, ACESS);
  consent.registrarDecisao(ID, 'recusado', ACESS);
  assert.equal(montarVitrine(ID, derivados).convite_acessibilidade, null);
});

test('API: texto por finalidade, decisão por finalidade e erro claro', async () => {
  const tratar = criarApp(preparar());
  const texto = await tratar({ metodo: 'GET', caminho: '/dados/consentimentos/texto', consulta: { finalidade: ACESS }, corpo: {} });
  assert.equal(texto.corpo.finalidade, ACESS);
  assert.ok(!texto.corpo.o_que_usamos.join(' ').match(/diabetes|hipertens|gestante|mental/i));

  const padrao = await tratar({ metodo: 'GET', caminho: '/dados/consentimentos/texto', consulta: {}, corpo: {} });
  assert.equal(padrao.corpo.finalidade, SAUDE);
  assert.ok(!padrao.corpo.o_que_usamos.join(' ').match(/defici/i), 'o texto de saúde não cobre deficiência');

  const r = await tratar({ metodo: 'POST', caminho: `/dados/consentimentos/${ID}`, consulta: {}, corpo: { decisao: 'concedido', finalidade: ACESS } });
  assert.equal(r.corpo.finalidade, ACESS);
  assert.equal(r.corpo.usa_dados, true);
  assert.equal(r.corpo.finalidades[SAUDE].status, 'pendente');
  assert.deepEqual(r.corpo.historico.map((x) => x.finalidade), [ACESS]);

  await assert.rejects(
    tratar({ metodo: 'POST', caminho: `/dados/consentimentos/${ID}`, consulta: {}, corpo: { decisao: 'concedido', finalidade: 'x' } }),
    (e) => e.status === 400 && e.erro === 'finalidade_invalida',
  );
});

test('API: entrar como só devolve o campo de deficiência com o consentimento próprio', async () => {
  const tratar = criarApp(preparar());
  const entrar = async () => (await tratar({ metodo: 'GET', caminho: `/dados/cidadaos/${ID}`, consulta: {}, corpo: {} })).corpo;

  assert.equal((await entrar()).acessibilidade, null);
  consent.registrarDecisao(ID, 'concedido', SAUDE);
  let e = await entrar();
  assert.equal(e.acessibilidade, null, 'consentimento de saúde não libera deficiência');
  assert.ok(e.saude && !('pessoa_com_deficiencia' in e.saude));

  consent.registrarDecisao(ID, 'concedido', ACESS);
  e = await entrar();
  assert.deepEqual(e.acessibilidade, { pessoa_com_deficiencia: true });
});
