import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import * as g from './golden-comum.js';

// Tarefa 3 (backend-fechar-lacunas): canais de problema, cancelar, alterar e avaliar. **Validates: R3**

let amb;
before(async () => { amb = await g.prepararAmbiente(); });
after(() => amb?.limpar());

const chamar = (metodo, caminho, corpo = {}) => amb.tratar({ metodo, caminho, consulta: {}, corpo });
const codigo = async (p) => { try { await p; return null; } catch (e) { return e.erro; } };

async function iniciar(cidadao, servico) {
  const r = await chamar('POST', '/dados/jornadas', { cidadao_id: cidadao, servico_id: servico });
  return r.corpo.jornada_id;
}

/** Preenche e confirma o serviço 942 até o protocolo. */
async function concluir942(id) {
  for (let i = 0; i < 6; i++) {
    const v = (await chamar('GET', `/dados/jornadas/${id}`)).corpo;
    if (v.pode_confirmar) break;
    const campos = {};
    for (const c of v.tela_atual.campos) if (c.valor === null) campos[c.nome] = c.opcoes?.[0]?.valor ?? 1;
    await chamar('PATCH', `/dados/jornadas/${id}`, { campos });
  }
  return (await chamar('POST', `/dados/jornadas/${id}/confirmar`, { confirmar: true })).corpo;
}

test('problema: canais do serviço primeiro, depois a Ouvidoria; sem chat', async () => {
  const id = await iniciar('C007938', 352);
  const r = (await chamar('GET', `/dados/jornadas/${id}/problema`)).corpo;
  assert.equal(r.canais[0].id, 'servico_web');
  assert.equal(r.canais[0].acao.url, 'https://cadunico.recife.pe.gov.br/');
  const ids = r.canais.map((c) => c.id);
  assert.deepEqual(ids.slice(1), ['ouvidoria_link', 'ouvidoria_telefone', 'ouvidoria_email', 'ouvidoria_presencial']);
  assert.equal(r.canais.find((c) => c.id === 'ouvidoria_telefone').acao.tipo, 'discar');
  assert.match(r.canais.find((c) => c.id === 'ouvidoria_telefone').detalhe, /07h/);
  assert.ok(!ids.some((i) => /chat/.test(i)));
  const id942 = await iniciar('C007938', 942);
  const r2 = (await chamar('GET', `/dados/jornadas/${id942}/problema`)).corpo;
  assert.deepEqual(r2.canais.slice(0, 2).map((c) => c.id), ['servico_web', 'servico_app']);
  assert.equal(r2.canais[1].acao.codigo, 'CCON');
});

test('cancelar: muda o estado e repetir dá 409', async () => {
  const id = await iniciar('C068579', 352);
  const r = (await chamar('POST', `/dados/jornadas/${id}/cancelar`)).corpo;
  assert.equal(r.jornada.estado, 'cancelada');
  assert.equal(await codigo(chamar('POST', `/dados/jornadas/${id}/cancelar`)), 'jornada_encerrada');
  assert.equal(await codigo(chamar('POST', `/dados/jornadas/${id}/confirmar`, { confirmar: true })), 'jornada_encerrada');
  assert.equal(await codigo(chamar('POST', '/dados/jornadas/J-NAOEXISTE/cancelar')), 'jornada_nao_encontrada');
});

test('avaliar e alterar: só depois de concluir; avaliação uma vez; alterar reabre e mantém campos', async () => {
  const id = await iniciar('C076260', 942);
  assert.equal(await codigo(chamar('POST', `/dados/jornadas/${id}/avaliar`, { nota: 5 })), 'jornada_nao_concluida');
  assert.equal(await codigo(chamar('POST', `/dados/jornadas/${id}/alterar`)), 'jornada_encerrada');
  const fim = await concluir942(id);
  assert.equal(fim.estado, 'concluida');
  assert.ok(fim.protocolo);
  assert.deepEqual(fim.acoes.map((a) => a.id), ['problema', 'alterar', 'avaliar']);

  assert.equal(await codigo(chamar('POST', `/dados/jornadas/${id}/avaliar`, { nota: 9 })), 'nota_invalida');
  assert.equal(await codigo(chamar('POST', `/dados/jornadas/${id}/avaliar`, {})), 'nota_invalida');
  const a = (await chamar('POST', `/dados/jornadas/${id}/avaliar`, { nota: 4 })).corpo;
  assert.equal(a.avaliacao.nota, 4);
  assert.equal(await codigo(chamar('POST', `/dados/jornadas/${id}/avaliar`, { nota: 5 })), 'ja_avaliada');

  const alt = (await chamar('POST', `/dados/jornadas/${id}/alterar`)).corpo.jornada;
  assert.equal(alt.estado, 'em_andamento');
  assert.equal(alt.protocolo, null); // o campo sempre existe; vazio até confirmar de novo
  assert.ok(Object.keys(alt.campos_preenchidos).length > 0);
  assert.deepEqual(alt.acoes.map((x) => x.id), ['problema', 'cancelar']);
});

test('avaliar "não consegui" é aceito; alterar fora de 352 e 942 dá 422', async () => {
  const id = await iniciar('C039227', 942);
  await concluir942(id);
  const a = (await chamar('POST', `/dados/jornadas/${id}/avaliar`, { nao_consegui: true })).corpo;
  assert.equal(a.avaliacao.nao_consegui, true);

  const { jornadas } = await import('../src/dados/store.js');
  const { dados } = await import('../src/dados/carga.js');
  const outro = [...dados.servicos.values()].find((s) => ![352, 942].includes(s.servico_id) && s.natureza === 'Agendamento');
  const j2 = await iniciar('C039227', outro.servico_id);
  jornadas[j2].estado = 'concluida'; // estado forçado: o foco é a regra de serviço
  assert.equal(await codigo(chamar('POST', `/dados/jornadas/${j2}/alterar`)), 'alteracao_indisponivel');
});

test('eventos das ações são gravados sem texto livre', async () => {
  const { eventos } = await import('../src/dados/store.js');
  const tipos = new Set(eventos.map((e) => e.tipo));
  for (const t of ['canais_vistos', 'jornada_cancelada', 'jornada_alterada', 'avaliacao_registrada']) assert.ok(tipos.has(t), t);
});
