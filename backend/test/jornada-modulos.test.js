import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as g from './golden-comum.js';

// Tarefa 3.6: `dados/jornada.js` virou a pasta `dados/jornada/`. Estes testes cobrem a divisão
// (módulos, dependências sem ciclo) e o passeio do serviço 352 direto no domínio.
// **Validates: Requirements 2.8, 3.5, 3.6, 3.10**

const PASTA = fileURLToPath(new URL('../src/dados/jornada/', import.meta.url));
let amb;
let J;
before(async () => {
  amb = await g.prepararAmbiente();
  J = await import('../src/dados/jornada/index.js');
});
after(() => amb?.limpar());

// ---------- estrutura ----------

test('a pasta tem os módulos previstos e o index reexporta os nomes públicos', async () => {
  assert.deepEqual(readdirSync(PASTA).sort(), ['acoes-visao.js', 'acoes.js', 'index.js', 'opcoes.js', 'operacoes.js', 'telas.js', 'validacao.js', 'visao.js']);
  assert.deepEqual(Object.keys(J).sort(), [
    'alterarJornada', 'avaliarJornada', 'canaisDeProblema', 'cancelarJornada', 'confirmarJornada', 'iniciarJornada', 'listarJornadas', 'obterJornada', 'preencherJornada', 'proximosDiasUteis',
  ]);
});

test('dependências entre módulos seguem operacoes → visao → validacao → opcoes, sem ciclo', () => {
  const permitido = {
    'opcoes.js': [],
    'telas.js': ['opcoes.js'],
    'validacao.js': ['opcoes.js'],
    'visao.js': ['telas.js', 'validacao.js'],
    'operacoes.js': ['telas.js', 'validacao.js', 'visao.js'],
    'acoes.js': ['visao.js'],
    'index.js': ['opcoes.js', 'operacoes.js', 'acoes.js'],
  };
  for (const [arq, ok] of Object.entries(permitido)) {
    const txt = readFileSync(join(PASTA, arq), 'utf8');
    const locais = [...txt.matchAll(/from '\.\/([a-z]+\.js)'/g)].map((m) => m[1]);
    for (const l of locais) assert.ok(ok.includes(l), `${arq} não deveria importar ${l}`);
    assert.ok(!/from '\.\.\/\.\.\/api/.test(txt), `${arq} importa de api/`);
  }
});

test('proximosDiasUteis pula fim de semana e começa amanhã', () => {
  const dias = J.proximosDiasUteis(5, new Date(2026, 10, 12)); // quinta-feira
  assert.deepEqual(dias.map((d) => d.valor), ['2026-11-13', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19']);
});

// ---------- passeio pelo serviço 352 ----------

const ID = 'C007938';

test('352 de ponta a ponta: sem true, pendências, preenchimento, protocolo e ja_concluida', () => {
  const ini = J.iniciarJornada(ID, 352);
  assert.equal(ini.retomada, undefined);
  const id = ini.jornada.jornada_id;
  assert.equal(ini.jornada.estado, 'em_andamento');
  assert.equal(J.iniciarJornada(ID, 352).retomada, true);

  const semTrue = J.confirmarJornada(id, false);
  assert.equal(semTrue.erro, 'confirmacao_necessaria');
  assert.ok(semTrue.jornada);
  assert.ok(!('status' in semTrue), 'o domínio não carrega status HTTP');
  const pend = J.confirmarJornada(id, true);
  assert.equal(pend.erro, 'campos_pendentes');
  assert.ok(pend.jornada.faltando.length > 0);
  assert.equal(pend.jornada.pode_confirmar, false);

  const dia = J.proximosDiasUteis(1)[0].valor;
  J.preencherJornada(id, { tipo_atendimento: 'atualizacao', pessoas_na_familia: 3, ciente_documentos: true, unidade: 'U3A', data: dia });
  const hora = J.obterJornada(id, { tela: 'data_hora' }).jornada.tela_atual.campos.find((c) => c.nome === 'hora').opcoes[0].valor;
  const pronto = J.preencherJornada(id, { hora });
  assert.deepEqual(pronto.jornada.faltando, []);
  assert.equal(pronto.jornada.pode_confirmar, true);

  const ok = J.confirmarJornada(id, true);
  assert.equal(ok.jornada.estado, 'concluida');
  assert.match(ok.jornada.protocolo, /^DEMO-\d{4}-[0-9A-F]{6}$/);
  assert.equal(ok.jornada.pode_confirmar, false);
  const de_novo = J.confirmarJornada(id, true);
  assert.equal(de_novo.ja_concluida, true);
  assert.equal(de_novo.jornada.protocolo, ok.jornada.protocolo);
  assert.equal(J.preencherJornada(id, { hora }).erro, 'jornada_encerrada');
  assert.ok(J.listarJornadas(ID).some((x) => x.jornada_id === id && x.estado === 'concluida'));
});

test('352: PATCH válido e inválido mantém o formato de erros[], faltando e pode_confirmar', () => {
  const id = J.iniciarJornada('C068579', 352).jornada.jornada_id;
  const ruim = J.preencherJornada(id, { unidade: 'XXX', pessoas_na_familia: 99, foo: 1 }).jornada;
  assert.deepEqual(ruim.erros.map((e) => e.campo).sort(), ['foo', 'pessoas_na_familia', 'unidade']);
  for (const e of ruim.erros) assert.deepEqual(Object.keys(e).sort(), ['campo', 'mensagem']);
  assert.equal(ruim.erros.find((e) => e.campo === 'foo').mensagem, 'Esse campo não existe neste pedido.');
  assert.equal(ruim.erros.find((e) => e.campo === 'pessoas_na_familia').mensagem, 'Informe um número de 1 a 20.');
  assert.ok(ruim.faltando.includes('unidade') && ruim.faltando.includes('pessoas_na_familia'));
  assert.equal(ruim.pode_confirmar, false);

  const dia = J.proximosDiasUteis(1)[0].valor;
  const unidade = J.obterJornada(id, { tela: 'local' }).jornada.tela_atual.campos[0].opcoes[0].valor; // depende da RPA
  const bom = J.preencherJornada(id, { unidade, data: dia, pessoas_na_familia: 2 }).jornada;
  assert.deepEqual(bom.erros, []);
  assert.ok(!bom.faltando.includes('unidade') && !bom.faltando.includes('data'));
  assert.ok(bom.faltando.includes('hora'));

  // mudar a data derruba a hora escolhida por dependência
  const hora = J.obterJornada(id, { tela: 'data_hora' }).jornada.tela_atual.campos.find((c) => c.nome === 'hora').opcoes[0].valor;
  J.preencherJornada(id, { hora });
  const outroDia = J.proximosDiasUteis(2)[1].valor;
  const mudou = J.preencherJornada(id, { data: outroDia }).jornada;
  assert.equal(mudou.campos_preenchidos.data, outroDia);
  assert.ok(Array.isArray(mudou.alterados_por_dependencia));
});

test('erros de início continuam no formato { erro, mensagem } sem status', () => {
  const sem = J.iniciarJornada(ID, 99999);
  assert.deepEqual(Object.keys(sem).sort(), ['erro', 'mensagem']);
  assert.equal(sem.erro, 'servico_nao_encontrado');
  assert.equal(J.obterJornada('J-NAOEXISTE').erro, 'jornada_nao_encontrada');
});
