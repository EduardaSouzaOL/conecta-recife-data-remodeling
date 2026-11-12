import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import * as g from './golden-comum.js';

// Propriedade 2 (preservação): as respostas HTTP (status e JSON) são as mesmas de antes da refatoração.
// **Validates: Requirements 3.1, 3.2, 3.3, 3.5, 3.6, 3.7, 3.10**
// Referência: test/fixtures/golden-http.json. Campos aleatórios (id da jornada, código do protocolo) são mascarados;
// as datas não variam porque o relógio é fixado em golden-comum.js.

const golden = g.lerFixture('golden-http.json');
let amb;
let atual;
before(async () => {
  amb = await g.prepararAmbiente();
  atual = await g.executarCenarioHttp(amb);
});
after(() => amb?.limpar());

const achar = (lista, rotulo) => lista.find((e) => e.rotulo === rotulo);

test('o cenário tem as mesmas chamadas, na mesma ordem', () => {
  assert.equal(atual.length, golden.total);
  assert.deepEqual(atual.map((e) => e.rotulo), golden.entradas.map((e) => e.rotulo));
});

for (const [i, esperado] of golden.entradas.entries()) {
  test(`resposta idêntica: ${esperado.rotulo}`, () => {
    assert.deepEqual(atual[i], esperado);
  });
}

test('o golden cobre cada código de erro da API e nenhum 500', () => {
  const codigos = new Set(golden.entradas.map((e) => e.corpo?.erro).filter(Boolean));
  for (const c of [
    'id_invalido', 'cidadao_nao_encontrado', 'servico_nao_encontrado', 'finalidade_invalida', 'decisao_invalida',
    'nada_a_revogar', 'use_revogado', 'campos_invalidos', 'evento_invalido', 'confirmacao_necessaria',
    'campos_pendentes', 'jornada_indisponivel', 'jornada_encerrada', 'jornada_nao_encontrada',
    'rota_nao_encontrada', 'metodo_nao_permitido',
  ]) assert.ok(codigos.has(c), `faltou um caso de ${c}`);
  assert.ok(golden.entradas.every((e) => e.status !== 500));
});

test('jornada 352 de ponta a ponta: 400, 422, 200 com erros[], protocolo e ja_concluida', () => {
  assert.equal(achar(atual, 'confirmar com false').status, 400);
  assert.equal(achar(atual, 'confirmar com false').corpo.erro, 'confirmacao_necessaria');
  assert.ok(achar(atual, 'confirmar com false').corpo.jornada, 'jornada vai nos campos extras');
  const pend = achar(atual, 'confirmar com pendências');
  assert.equal(pend.status, 422);
  assert.equal(pend.corpo.erro, 'campos_pendentes');
  assert.ok(pend.corpo.jornada);
  const inval = achar(atual, 'PATCH valor inválido');
  assert.equal(inval.status, 200);
  assert.ok(inval.corpo.erros.length >= 1);
  assert.equal(achar(atual, 'jornada 352 retomada').corpo.retomada, true);
  const ok = achar(atual, 'confirmar com tudo certo');
  assert.equal(ok.status, 200);
  assert.equal(ok.corpo.estado, 'concluida');
  assert.match(ok.corpo.protocolo, /^DEMO-\d{4}-<COD>$/);
  assert.equal(achar(atual, 'confirmar de novo (já concluída)').corpo.estado, 'concluida');
  assert.equal(achar(atual, 'PATCH em jornada concluída').status, 409);
});

test('eventos: entrou_como, vitrine_vista, tela_pulada e jornadas aparecem no resumo', () => {
  const r = achar(atual, 'resumo de eventos').corpo.por_tipo;
  for (const tipo of ['entrou_como', 'vitrine_vista', 'tela_pulada', 'servico_aberto', 'jornada_iniciada', 'jornada_concluida', 'consentimento_concedido', 'consentimento_revogado', 'erro_entendimento']) {
    assert.ok(r[tipo] > 0, `sem evento ${tipo}`);
  }
  assert.equal(achar(atual, 'evento tipo não permitido').status, 400);
});

test('limite da vitrine segue a expressão original (mínimo 1, máximo 20, padrão 8)', () => {
  for (const e of atual.filter((x) => x.rotulo.startsWith('vitrine limite') || x.rotulo.startsWith('vitrine POST') || x.rotulo === 'vitrine padrão')) {
    const esperado = g.limiteOriginal(e.req.corpo, e.req.consulta);
    assert.ok(e.corpo.itens.length >= 1 && e.corpo.itens.length <= esperado, `${e.rotulo}: ${e.corpo.itens.length} itens para limite ${esperado}`);
  }
  assert.deepEqual(
    [undefined, '', 'abc', '0', '-4', '3', '99'].map((l) => g.limiteOriginal({}, { limite: l })),
    [8, 8, 8, 8, 1, 3, 20],
  );
  assert.equal(g.limiteOriginal({ limite: 2 }, { limite: '9' }), 2);
});

test('sem consentimento, a vitrine de quem tem saúde registrada não cita a condição', () => {
  const v = achar(atual, 'vitrine C062244 sem consentimento').corpo;
  assert.doesNotMatch(JSON.stringify(v.itens), /diabetes|hipertens/i);
  const e = achar(atual, 'entrar como C062244').corpo;
  assert.equal(e.saude, null);
});
