import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Isola o estado em pasta temporária e não carrega os CSVs: a vitrine roda sobre fixtures pequenas.
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'conecta-vitrine-'));
process.env.DATA_DIR = DIR;

const { dados } = await import('../src/dados/carga.js');
const store = await import('../src/dados/store.js');
const consent = await import('../src/dados/consentimento.js');
const { montarVitrine } = await import('../src/recomendacao/vitrine.js');

const GENERICO = 'Pessoas com um perfil parecido com o seu também costumam acessar este serviço.';
const ID = 'C000001';

const servico = (id, nome, extra = {}) => ({
  servico_id: id, nome, nome_resumido: nome, orgao: 'Órgão', orgao_sigla: 'ORG', temas: [], grupos: [], publicos: [],
  palavras_chave: [], natureza: 'Agendamento', descricao: '', requisitos: [], passos: [], gratuito: true,
  nivel_digital: 4, cliques: 0, pessoas_unicas: 100, nota_media: null, tem_historico: true, ...extra,
});

const perfil = {
  cidadao_id: ID, idade: 40, faixa_etaria: '40-49', sexo: 'M', rpa: 3, situacao_renda: null, criancas_na_familia: null,
  empreendedor: false, mei: false, servidor_publico: false, proprietario_imovel: false, tutor_animal: false, estudante: false,
  cadastro_unico: false, bolsa_familia: false, usuario_compaz: false, microcredito: false, aceita_notificacao: false,
};

function preparar(origemId) {
  dados.cidadaos.clear(); dados.historico.clear(); dados.servicos.clear();
  dados.cidadaos.set(ID, { perfil, saude: { hipertensao: false, diabetes: false, saude_mental: false, gestante: false, pessoa_com_deficiencia: false } });
  dados.servicos.set(283, servico(283, 'Atendimento de diabetes'));
  dados.servicos.set(600, servico(600, 'Agendar consultas'));
  dados.servicos.set(500, servico(500, 'Pagar IPTU'));
  dados.historico.set(ID, [['2026-06-03', '10:00', origemId, 'S1', 1]]);
  return { proximo: { [origemId]: [[500, 10]] }, populares: {}, demanda: {}, semana_ref: '2026-09-21' };
}

const textos = (v) => v.itens.flatMap((i) => [i.motivo, ...i.outros_motivos]);

beforeEach(() => {
  for (const k of Object.keys(store.consentimentos)) delete store.consentimentos[k];
  store.eventos.length = 0;
});
after(() => fs.rmSync(DIR, { recursive: true, force: true }));

test('sem consentimento, origem sensível não aparece em nenhum texto e vira o texto genérico', () => {
  const v = montarVitrine(ID, preparar(283));
  const t = textos(v);
  assert.ok(t.length > 0);
  for (const x of t) {
    assert.ok(!/diabet/i.test(x), `vazou: ${x}`);
    assert.ok(!x.includes('Atendimento de diabetes'), `vazou: ${x}`);
  }
  assert.ok(t.includes(GENERICO), 'o item de destino usa o texto genérico');
  assert.ok(!v.itens.some((i) => i.servico_id === 283), 'serviço sensível não é sugerido sem consentimento');
});

test('com consentimento, o motivo mantém o nome da origem', () => {
  consent.registrarDecisao(ID, 'concedido');
  const v = montarVitrine(ID, preparar(283));
  assert.ok(textos(v).some((x) => x.includes('Quem acessou "Atendimento de diabetes"')));
  assert.ok(!textos(v).includes(GENERICO));
});

test('origem não sensível mantém o nome, com ou sem consentimento', () => {
  for (const decisao of [null, 'concedido', 'recusado']) {
    for (const k of Object.keys(store.consentimentos)) delete store.consentimentos[k];
    if (decisao) consent.registrarDecisao(ID, decisao);
    const v = montarVitrine(ID, preparar(600));
    assert.ok(textos(v).some((x) => x.includes('Quem acessou "Agendar consultas"')), `decisão ${decisao}`);
    assert.ok(!textos(v).includes(GENERICO), `decisão ${decisao}`);
  }
});

test('consentimento revogado volta a esconder o nome', () => {
  consent.registrarDecisao(ID, 'concedido');
  consent.registrarDecisao(ID, 'revogado');
  const v = montarVitrine(ID, preparar(283));
  assert.ok(textos(v).every((x) => !x.includes('Atendimento de diabetes')));
});
