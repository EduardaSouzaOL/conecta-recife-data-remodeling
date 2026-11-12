import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Contrato da API que o Kodiak consome, sobre os dados reais de BD/ (somente leitura).
// O estado (consentimento, jornadas, eventos) vai para uma pasta temporária; derivados.json é copiado se existir.
const aqui = path.dirname(fileURLToPath(import.meta.url));
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'conecta-api-'));
process.env.DATA_DIR = DIR;
const derivadosReal = path.resolve(aqui, '..', 'data', 'derivados.json');
if (fs.existsSync(derivadosReal)) fs.copyFileSync(derivadosReal, path.join(DIR, 'derivados.json'));
after(() => fs.rmSync(DIR, { recursive: true, force: true }));

const { carregarDados } = await import('../src/dados/carga.js');
const { carregarDerivados } = await import('../src/recomendacao/derivados.js');
const { criarApp } = await import('../src/api/app.js');
await carregarDados();
const tratar = criarApp(await carregarDerivados());

const chamar = (metodo, caminho, corpo = {}, consulta = {}) => tratar({ metodo, caminho, consulta, corpo });
const falha = (promessa, status, erro) =>
  assert.rejects(promessa, (e) => { assert.equal(e.status, status); assert.equal(e.erro, erro); return true; });

const PERSONAS = ['C007938', 'C068579', 'C059592', 'C036462', 'C039227', 'C076260', 'C006566', 'C062244'];

test('índice e saúde da API listam os dois motores', async () => {
  const idx = (await chamar('GET', '')).corpo;
  assert.ok(idx.motor_de_dados && idx.motor_de_recomendacao);
  const h = (await chamar('GET', '/health')).corpo;
  assert.equal(h.ok, true);
  assert.equal(h.cidadaos, 89046);
  assert.equal(h.servicos, 843);
});

test('rotas antigas (sem prefixo) não existem mais', async () => {
  await falha(chamar('GET', '/vitrine/C000001'), 404, 'rota_nao_encontrada');
  await falha(chamar('GET', '/entrar/C000001'), 404, 'rota_nao_encontrada');
});

test('método errado em rota existente dá 405', async () => {
  await falha(chamar('DELETE', '/dados/cidadaos/C000001'), 405, 'metodo_nao_permitido');
});

test('demo traz as 8 personas oficiais primeiro', async () => {
  const { cidadaos } = (await chamar('GET', '/dados/cidadaos/demo')).corpo;
  assert.deepEqual(cidadaos.slice(0, 8).map((c) => c.cidadao_id), PERSONAS);
});

test('entrar como: aceita número simples e rejeita código inválido ou inexistente', async () => {
  assert.equal((await chamar('GET', '/dados/cidadaos/7938')).corpo.cidadao_id, 'C007938');
  await falha(chamar('GET', '/dados/cidadaos/abc'), 400, 'id_invalido');
  await falha(chamar('GET', '/dados/cidadaos/C999999'), 404, 'cidadao_nao_encontrado');
});

test('entrar como: sem consentimento, saúde e deficiência não saem', async () => {
  const r = (await chamar('GET', '/dados/cidadaos/C059592')).corpo;
  assert.equal(r.saude, null);
  assert.equal(r.acessibilidade, null);
  assert.equal(r.saude_liberada, false);
});

test('recomendação funciona para as 8 personas e para quem não tem histórico', async () => {
  const semHist = (await chamar('GET', '/dados/cidadaos/demo')).corpo.cidadaos.find((c) => c.cenario === 'Sem nenhum histórico');
  for (const id of [...PERSONAS, semHist.cidadao_id]) {
    const v = (await chamar('GET', `/recomendacao/${id}`, {}, { limite: '10' })).corpo;
    assert.ok(v.itens.length > 0 && v.itens.length <= 10, id);
    assert.ok(['historico', 'historico_curto', 'perfil'].includes(v.base_da_personalizacao));
    for (const it of v.itens) assert.ok(it.motivo && it.servico_id, `${id}: item sem motivo`);
    assert.equal(new Set(v.itens.map((i) => i.servico_id)).size, v.itens.length, `${id}: serviço repetido`);
    // diversidade: no máximo 2 do mesmo órgão entre os 5 primeiros
    const orgaos = {};
    for (const it of v.itens.slice(0, 5)) orgaos[it.orgao] = (orgaos[it.orgao] || 0) + 1;
    assert.ok(Object.values(orgaos).every((n) => n <= 2), `${id}: órgão repetido`);
  }
});

test('recomendação: sem consentimento nenhum item cita saúde e o aviso diz isso', async () => {
  const v = (await chamar('POST', '/recomendacao/C062244', { limite: 10 })).corpo; // hipertensão e diabetes
  assert.match(v.aviso_saude, /Não usamos/);
  assert.doesNotMatch(JSON.stringify(v.itens), /diabetes|hipertens/i);
});

test('recomendação: limite é aplicado e id inválido dá erro claro', async () => {
  assert.ok((await chamar('GET', '/recomendacao/C007938', {}, { limite: '3' })).corpo.itens.length <= 3);
  await falha(chamar('GET', '/recomendacao/xx'), 400, 'id_invalido');
});

test('quem já está no Cadastro Único não recebe sugestão de se inscrever', async () => {
  const v = (await chamar('GET', '/recomendacao/C039227', {}, { limite: '20' })).corpo;
  assert.ok(!v.itens.some((i) => i.servico_id === 1032 || i.servico_id === 995));
});

test('consentimento: conceder, ver e revogar por finalidade, de forma independente', async () => {
  const id = 'C062244';
  let r = (await chamar('POST', `/dados/consentimentos/${id}`, { decisao: 'concedido', finalidade: 'saude_personalizacao' })).corpo;
  assert.equal(r.finalidades.saude_personalizacao.usa_dados, true);
  assert.equal(r.finalidades.acessibilidade_personalizacao.usa_dados, false);
  const e = (await chamar('GET', `/dados/cidadaos/${id}`)).corpo;
  assert.equal(e.saude_liberada, true);
  assert.equal(e.acessibilidade, null);
  r = (await chamar('POST', `/dados/consentimentos/${id}`, { decisao: 'revogado', finalidade: 'saude_personalizacao' })).corpo;
  assert.equal(r.finalidades.saude_personalizacao.usa_dados, false);
  assert.equal((await chamar('GET', `/dados/cidadaos/${id}`)).corpo.saude, null);
});

test('serviço: detalhe e 404', async () => {
  assert.equal((await chamar('GET', '/dados/servicos/352')).corpo.servico_id, 352);
  await falha(chamar('GET', '/dados/servicos/99999'), 404, 'servico_nao_encontrado');
});

test('jornada: só conclui com confirmar e gera protocolo fictício', async () => {
  const id = 'C007938';
  const j = (await chamar('POST', '/dados/jornadas', { cidadao_id: id, servico_id: 352 })).corpo;
  assert.equal(j.estado, 'em_andamento');
  assert.equal((await chamar('POST', '/dados/jornadas', { cidadao_id: id, servico_id: 352 })).corpo.retomada, true);
  await falha(chamar('POST', `/dados/jornadas/${j.jornada_id}/confirmar`, { confirmar: false }), 400, 'confirmacao_necessaria');
  await falha(chamar('POST', `/dados/jornadas/${j.jornada_id}/confirmar`, { confirmar: true }), 422, 'campos_pendentes');
  const lista = (await chamar('GET', `/dados/cidadaos/${id}/jornadas`)).corpo;
  assert.ok(lista.jornadas.some((x) => x.jornada_id === j.jornada_id));
  await falha(chamar('PATCH', '/dados/jornadas/J-NAOEXISTE', { campos: {} }), 404, 'jornada_nao_encontrada');
  await falha(chamar('POST', '/dados/jornadas', { cidadao_id: id, servico_id: 99999 }), 404, 'servico_nao_encontrado');
});

test('jornada ponta a ponta: preenche as telas, confirma e recebe protocolo', async () => {
  const id = 'C068579';
  let j = (await chamar('POST', '/dados/jornadas', { cidadao_id: id, servico_id: 352 })).corpo;
  // percorre as telas pendentes preenchendo o primeiro valor válido de cada campo
  for (let i = 0; i < 20 && !j.pode_confirmar; i++) {
    const tela = j.tela_atual;
    const campos = {};
    // um campo por vez: as opções de hora dependem de unidade e data já escolhidas
    const c = tela.campos.find((x) => x.valor === null);
    if (c) {
      if (c.tipo === 'select') campos[c.nome] = c.opcoes[0].valor;
      else if (c.tipo === 'booleano') campos[c.nome] = true;
      else if (c.tipo === 'numero') campos[c.nome] = c.min ?? 1;
      else if (c.tipo === 'texto') campos[c.nome] = 'Teste';
      else assert.fail(`tipo de campo sem preenchimento no teste: ${c.tipo} (${c.nome})`);
    }
    j = (await chamar('PATCH', `/dados/jornadas/${j.jornada_id}`, { campos })).corpo;
    assert.deepEqual(j.erros, []);
  }
  assert.equal(j.pode_confirmar, true);
  const fim = (await chamar('POST', `/dados/jornadas/${j.jornada_id}/confirmar`, { confirmar: true })).corpo;
  assert.equal(fim.estado, 'concluida');
  assert.match(fim.protocolo, /^DEMO-\d{4}-[0-9A-F]{6}$/);
});

test('eventos: aceita só tipos permitidos e conta por tipo', async () => {
  await falha(chamar('POST', '/dados/eventos', { cidadao_id: 'C000001', tipo: 'voz_ativada' }), 400, 'evento_invalido');
  await chamar('POST', '/dados/eventos', { cidadao_id: 'C000001', tipo: 'servico_aberto', servico_id: 352 });
  const r = (await chamar('GET', '/dados/eventos/resumo')).corpo;
  assert.ok(r.por_tipo.servico_aberto >= 1);
});
