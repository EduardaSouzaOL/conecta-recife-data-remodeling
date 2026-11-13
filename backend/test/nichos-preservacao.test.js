import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import * as g from './golden-comum.js';

// Testes de preservação (destravar-backend-para-kodiak, tarefa 2).
// Devem PASSAR no código atual e seguir passando depois da correção.
// **Validates: Requirements 3.1, 3.5**

// C000003 existe em BD/cidadaos.csv e não aparece em BD/historico.csv.
const SEM_HISTORICO = 'C000003';
const COM_HISTORICO = 'C059592';

let amb;
before(async () => { amb = await g.prepararAmbiente(); });
after(() => amb?.limpar());

const home = async (id) => {
  const r = await amb.tratar({ metodo: 'GET', caminho: `/recomendacao/${id}/home`, consulta: {}, corpo: {} });
  assert.equal(r.status, 200);
  return r.corpo;
};
const tipo = (v) => (Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v);

const CAMPOS_DA_HOME = {
  perfil: 'string',
  cidadao_id: 'string',
  personalizacao_ativa: 'boolean',
  base_da_personalizacao: 'string',
  explicacao_geral: 'string',
  aviso_saude: 'string',
  aviso_acessibilidade: 'string',
  convite_consentimento: 'object',
  convite_acessibilidade: 'object',
  controles: 'array',
  blocos: 'array',
};
const CAMPOS_DO_BLOCO = { id: 'string', grupo: 'string', titulo: 'string', itens: 'array' };
const CAMPOS_DO_ITEM = {
  posicao: 'number',
  servico_id: 'number',
  titulo: 'string',
  orgao: 'string',
  motivo: 'string',
  por_que_vejo: 'object',
  rotulo_leitor: 'string',
  acao: 'object',
};

const confere = (obj, esperado, onde) => {
  for (const [campo, t] of Object.entries(esperado)) {
    assert.equal(tipo(obj[campo]), t, `${onde}.${campo} deveria ser ${t}`);
  }
};

test(`${SEM_HISTORICO} existe e não tem histórico`, () => {
  assert.ok(amb.dados.cidadaos.has(SEM_HISTORICO));
  assert.ok(!amb.dados.historico.has(SEM_HISTORICO));
});

test(`${SEM_HISTORICO} (sem histórico): nenhum bloco traz nichos nem filtros`, async () => {
  const h = await home(SEM_HISTORICO);
  assert.ok(h.blocos.length > 0);
  for (const b of h.blocos) {
    assert.ok(!('nichos' in b), `bloco ${b.id} não deveria ter nichos`);
    assert.ok(!('filtros' in b), `bloco ${b.id} não deveria ter filtros`);
  }
  assert.ok(!('nichos' in h) && !('filtros' in h));
});

test(`${SEM_HISTORICO} (sem histórico): base da personalização é o perfil`, async () => {
  const h = await home(SEM_HISTORICO);
  assert.equal(h.base_da_personalizacao, 'perfil');
});

for (const id of [SEM_HISTORICO, COM_HISTORICO]) {
  test(`${id}: campos existentes da Home mantêm nome e tipo`, async () => {
    const h = await home(id);
    confere(h, CAMPOS_DA_HOME, 'home');
    assert.equal(h.cidadao_id, id);
    assert.equal(h.personalizacao_ativa, true);
    for (const b of h.blocos) {
      confere(b, CAMPOS_DO_BLOCO, `bloco ${b.id}`);
      assert.ok(b.itens.length > 0, `bloco ${b.id} vazio`);
      for (const it of b.itens) {
        confere(it, CAMPOS_DO_ITEM, `item ${it.servico_id}`);
        assert.equal(tipo(it.acao.tipo), 'string');
        assert.equal(tipo(it.por_que_vejo.texto), 'string');
        assert.equal(tipo(it.por_que_vejo.dados_usados), 'array');
      }
    }
  });
}

test(`${COM_HISTORICO}: o grupo atalhos mantém id, título e itens atuais`, async () => {
  const h = await home(COM_HISTORICO);
  const bloco = h.blocos.find((b) => b.grupo === 'atalhos');
  assert.ok(bloco);
  assert.equal(bloco.id, 'atalhos');
  assert.equal(bloco.titulo, 'Seus atalhos');
  assert.equal(h.base_da_personalizacao, 'historico');
});
