import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

// DATA_DIR precisa ser definido ANTES de importar o store (dados.js lê a variável na carga).
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'conecta-store-'));
process.env.DATA_DIR = DIR;
const ARQ = path.join(DIR, 'estado.json');
const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');

const store = await import('../src/dados/store.js');
const consent = await import('../src/dados/consentimento.js');

const limpar = () => { for (const f of [ARQ, ARQ + '.tmp']) fs.rmSync(f, { force: true }); };
const lerArquivo = () => JSON.parse(fs.readFileSync(ARQ, 'utf8'));
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

beforeEach(() => {
  limpar();
  for (const k of Object.keys(store.consentimentos)) delete store.consentimentos[k];
  for (const k of Object.keys(store.jornadas)) delete store.jornadas[k];
  store.eventos.length = 0;
  delete process.env.EVENTOS_MAX;
});

after(() => fs.rmSync(DIR, { recursive: true, force: true }));

test('carregarEstado preenche os mesmos objetos exportados (identidade mantida)', () => {
  const antes = { c: store.consentimentos, j: store.jornadas, e: store.eventos };
  fs.writeFileSync(ARQ, JSON.stringify({
    consentimentos: { C000003: [{ finalidade: 'saude_personalizacao', status: 'concedido', ts: '2026-11-12T10:00:00.000Z' }] },
    jornadas: { 'J-1': { jornada_id: 'J-1', cidadao_id: 'C000003' } },
    eventos: [{ cidadao_id: 'C000003', tipo: 'entrou_como', ts: 'x' }],
  }));
  store.carregarEstado();
  assert.equal(store.consentimentos, antes.c);
  assert.equal(store.jornadas, antes.j);
  assert.equal(store.eventos, antes.e);
  assert.equal(consent.statusConsentimento('C000003'), 'concedido');
  assert.equal(store.jornadas['J-1'].cidadao_id, 'C000003');
  assert.equal(store.eventos.length, 1);
});

test('salvarLogo grava exatamente o que está em memória, de forma atômica', () => {
  assert.deepEqual(consent.registrarDecisao('C000003', 'concedido'), { ok: true });
  store.salvarLogo();
  assert.equal(fs.existsSync(ARQ + '.tmp'), false);
  const f = lerArquivo();
  assert.deepEqual(Object.keys(f).sort(), ['consentimentos', 'eventos', 'fixados', 'jornadas', 'preferencias']);
  assert.equal(f.consentimentos.C000003.at(-1).status, 'concedido');
  assert.ok(f.consentimentos.C000003.at(-1).ts, 'o registro de consentimento tem data');
  assert.ok(f.eventos.some((e) => e.tipo === 'consentimento_concedido'));
});

test('ida e volta: gravar, recarregar e comparar (várias rodadas com semente fixa)', () => {
  let seed = 42;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  for (let rodada = 0; rodada < 25; rodada++) {
    for (const k of Object.keys(store.consentimentos)) delete store.consentimentos[k];
    for (const k of Object.keys(store.jornadas)) delete store.jornadas[k];
    store.eventos.length = 0;
    const n = 1 + Math.floor(rnd() * 8);
    for (let i = 0; i < n; i++) {
      const id = 'C' + String(Math.floor(rnd() * 999999)).padStart(6, '0');
      store.consentimentos[id] = [{ finalidade: 'saude_personalizacao', status: rnd() > 0.5 ? 'concedido' : 'recusado', ts: `t${i}` }];
      store.jornadas[`J-${rodada}-${i}`] = { jornada_id: `J-${rodada}-${i}`, cidadao_id: id, campos: { a: i } };
      store.eventos.push({ cidadao_id: id, tipo: 'entrou_como', ts: `t${i}` });
    }
    const esperado = JSON.parse(JSON.stringify({ consentimentos: store.consentimentos, jornadas: store.jornadas, eventos: store.eventos }));
    store.salvarLogo();
    for (const k of Object.keys(store.consentimentos)) delete store.consentimentos[k];
    for (const k of Object.keys(store.jornadas)) delete store.jornadas[k];
    store.eventos.length = 0;
    store.carregarEstado();
    const obtido = JSON.parse(JSON.stringify({ consentimentos: store.consentimentos, jornadas: store.jornadas, eventos: store.eventos }));
    assert.deepEqual(obtido, esperado);
  }
});

test('restart real em dois processos: o consentimento sobrevive', () => {
  const rodar = (codigo) => spawnSync(process.execPath, ['--input-type=module', '-e', codigo], {
    env: { ...process.env, DATA_DIR: DIR }, encoding: 'utf8',
  });
  const url = (f) => JSON.stringify(pathToFileURL(path.join(SRC, f)).href);
  const a = rodar(`
    import { salvarLogo } from ${url('dados/store.js')};
    import { registrarDecisao } from ${url('dados/consentimento.js')};
    registrarDecisao('C000003', 'concedido');
    salvarLogo();
  `);
  assert.equal(a.status, 0, a.stderr);
  const b = rodar(`
    import { carregarEstado } from ${url('dados/store.js')};
    import { statusConsentimento, historicoConsentimento } from ${url('dados/consentimento.js')};
    carregarEstado();
    console.log(JSON.stringify({ s: statusConsentimento('C000003'), h: historicoConsentimento('C000003').length }));
  `);
  assert.equal(b.status, 0, b.stderr);
  assert.deepEqual(JSON.parse(b.stdout.trim()), { s: 'concedido', h: 1 });
});

test('salvar() volta a agendar depois de um salvarLogo direto', async () => {
  store.registrarEvento('C000003', 'entrou_como');
  store.salvarLogo();
  store.registrarEvento('C000003', 'vitrine_vista');
  await esperar(700);
  const tipos = lerArquivo().eventos.map((e) => e.tipo);
  assert.deepEqual(tipos, ['entrou_como', 'vitrine_vista']);
});

test('primeira execução: arquivo ausente, vazio, inválido ou com formato errado inicia vazio', () => {
  const casos = [null, '', '   ', '{nao é json', '[]', '"texto"', 'null'];
  for (const conteudo of casos) {
    limpar();
    if (conteudo !== null) fs.writeFileSync(ARQ, conteudo);
    assert.doesNotThrow(() => store.carregarEstado());
    assert.equal(Object.keys(store.consentimentos).length, 0);
    assert.equal(Object.keys(store.jornadas).length, 0);
    assert.equal(store.eventos.length, 0);
  }
});

test('campo com tipo errado vira vazio e os outros são carregados', () => {
  fs.writeFileSync(ARQ, JSON.stringify({
    consentimentos: [],
    jornadas: { 'J-1': { jornada_id: 'J-1' } },
    eventos: { nao: 'array' },
  }));
  store.carregarEstado();
  assert.equal(Object.keys(store.consentimentos).length, 0);
  assert.equal(store.eventos.length, 0);
  assert.ok(store.jornadas['J-1']);
});

test('ids como "constructor" não acham propriedade herdada', () => {
  assert.equal(store.jornadas['constructor'], undefined);
  assert.equal(store.consentimentos['toString'], undefined);
});

test('limite de eventos: padrão acima de 5000 e todos preservados em ordem', () => {
  assert.ok(store.limiteEventos() > 5000);
  for (let i = 0; i < 5001; i++) store.registrarEvento('C000003', 'vitrine_vista', { servico_id: i });
  assert.equal(store.eventos.length, 5001);
  assert.equal(store.eventos[0].servico_id, 0);
  assert.equal(store.eventos.at(-1).servico_id, 5000);
});

test('EVENTOS_MAX configura o limite; valor inválido usa o padrão; descarta os mais antigos', () => {
  process.env.EVENTOS_MAX = '3';
  assert.equal(store.limiteEventos(), 3);
  for (let i = 0; i < 5; i++) store.registrarEvento('C000003', 'vitrine_vista', { servico_id: i });
  assert.deepEqual(store.eventos.map((e) => e.servico_id), [2, 3, 4]);
  for (const ruim of ['abc', '0', '-5', '2.5', '']) {
    process.env.EVENTOS_MAX = ruim;
    assert.equal(store.limiteEventos(), 50000, `valor ${JSON.stringify(ruim)}`);
  }
});

test('o arquivo gravado não ganha campos novos nos registros de consentimento', () => {
  consent.registrarDecisao('C000003', 'recusado');
  store.salvarLogo();
  const reg = lerArquivo().consentimentos.C000003[0];
  assert.deepEqual(Object.keys(reg).sort(), ['finalidade', 'status', 'ts', 'versao_texto']);
});
