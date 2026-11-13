import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Gatilhos de calendário, personas e privacidade da camada de contexto (OSINT). Estado em pasta temporária.
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'osint-'));
const { carregarDados, dados } = await import('../src/dados/carga.js');
const { montarVitrine } = await import('../src/recomendacao/vitrine.js');
const { registrarDecisao } = await import('../src/dados/consentimento.js');
const { preferencias } = await import('../src/dados/store.js');
await carregarDados();
const derivados = JSON.parse(fs.readFileSync(new URL('../data/derivados.json', import.meta.url), 'utf8'));
const ids = (id, limite = 12) => montarVitrine(id, derivados, { limite }).itens.map((i) => i.servico_id);

test('C076260: Jornada do Estudante (1148) aparece entre os primeiros', () => {
  assert.ok(ids('C076260', 8).includes(1148));
});

test('C062244: sem consentimento vê Academia da Cidade e castração, e não vê Medicamentos', () => {
  const l = ids('C062244', 8);
  assert.ok(l.includes(331) && l.includes(34));
  assert.ok(!l.includes(1101));
});

test('C062244: com consentimento de saúde vê Medicamentos, sem citar a condição', () => {
  registrarDecisao('C062244', 'concedido');
  const v = montarVitrine('C062244', derivados, { limite: 12 });
  assert.ok(v.itens.some((i) => i.servico_id === 1101));
  const texto = JSON.stringify(v.itens.map((i) => [i.motivo, i.outros_motivos, i.tag]));
  assert.ok(!/hipertens|diabet/i.test(texto));
  registrarDecisao('C062244', 'revogado');
});

test('"Não me interessa" tira o serviço da vitrine', () => {
  const id = 'C062244';
  preferencias[id] = { dispensados: [34] };
  assert.ok(!ids(id, 20).includes(34));
  delete preferencias[id];
});

test('"Não usar meus dados" ignora histórico e dados sensíveis', () => {
  const id = 'C062244';
  registrarDecisao(id, 'concedido');
  preferencias[id] = { personalizar: false };
  const v = montarVitrine(id, derivados, { limite: 12 });
  assert.equal(v.base_da_personalizacao, 'perfil');
  assert.ok(!v.itens.some((i) => i.servico_id === 1101));
  delete preferencias[id];
  registrarDecisao(id, 'revogado');
});

test('janela de calendário: creche (839) só ganha reforço dentro de 05/11 a 10/12/2026', async () => {
  const { candidatosPorRegra } = await import('../src/recomendacao/regras.js');
  const perfil = { ...[...dados.cidadaos.values()][0].perfil, criancas_na_familia: 'primeira_infancia' };
  const RealDate = Date;
  const fixar = (iso) => { globalThis.Date = class extends RealDate { constructor(...a) { a.length ? super(...a) : super(iso); } }; };
  try {
    fixar('2026-11-12T12:00:00Z');
    assert.ok(candidatosPorRegra(perfil, null).some((c) => c.regra === 'matricula_creche'));
    fixar('2027-01-20T12:00:00Z');
    assert.ok(!candidatosPorRegra(perfil, null).some((c) => c.regra === 'matricula_creche'));
  } finally { globalThis.Date = RealDate; }
});
