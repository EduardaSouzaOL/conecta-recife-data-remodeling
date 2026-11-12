import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import * as g from './golden-comum.js';
import { criarRoteador } from '../src/api/roteador.js';

// Propriedade 1 (condição do defeito): caminho com % inválido e ordem de registro do roteador.
// **Validates: Requirements 2.5, 2.9**
//
// ESTES TESTES DEVEM FALHAR NO CÓDIGO ATUAL (a falha prova o defeito). Não corrija o teste para passar:
// eles passam a valer depois da refatoração (tarefa 3.3). Rodar só este arquivo, em backend/:
//   node --test test/explorar-bug-caminho-e-roteador.test.js

let amb;
let chamar;
before(async () => {
  amb = await g.prepararAmbiente();
  chamar = g.criarChamador(amb.tratar, amb.ErroHttp);
});
after(() => amb?.limpar());

// ---------- 2.9: caminho inválido ----------
const CAMINHO_INVALIDO = '/dados/cidadaos/%E0%A4%A';

test('GET com % inválido devolve 400 caminho_invalido, nunca 500', async () => {
  const r = await chamar('GET', CAMINHO_INVALIDO);
  assert.equal(r.status, 400, `esperado 400, veio ${r.status} ${r.corpo?.erro}`);
  assert.equal(r.corpo.erro, 'caminho_invalido');
  assert.equal(typeof r.corpo.mensagem, 'string');
  assert.ok(r.corpo.mensagem.length > 0);
  assert.ok(!/URIError|decodeURI|malformed/i.test(r.corpo.mensagem), 'a mensagem deve ser texto simples');
});

test('% inválido em outras áreas também dá 400 caminho_invalido', async () => {
  for (const [metodo, caminho] of [
    ['GET', '/recomendacao/%E0%A4%A'],
    ['GET', '/dados/servicos/%'],
    ['GET', '/dados/jornadas/%ZZ'],
  ]) {
    const r = await chamar(metodo, caminho);
    assert.equal(r.status, 400, `${metodo} ${caminho}: esperado 400, veio ${r.status} ${r.corpo?.erro}`);
    assert.equal(r.corpo.erro, 'caminho_invalido', `${metodo} ${caminho}`);
  }
});

test('% inválido com método não permitido continua 405 (decodifica só depois de aceitar o método)', async () => {
  // Este caso hoje já passa: guarda que a correção não troque 405 por 400.
  const r = await chamar('DELETE', CAMINHO_INVALIDO);
  assert.equal(r.status, 405);
  assert.equal(r.corpo.erro, 'metodo_nao_permitido');
});

test('% inválido numa rota que não existe continua 404', async () => {
  const r = await chamar('GET', '/nao/existe/%E0%A4%A');
  assert.equal(r.status, 404);
  assert.equal(r.corpo.erro, 'rota_nao_encontrada');
});

// ---------- 2.5: ordem do roteador ----------
// Conjunto pequeno: duas rotas fixas, duas parametrizadas. O rótulo do handler diz qual rota respondeu.
const ROTAS = [
  { padrao: '/x/texto', rotulo: 'fixa-texto' },
  { padrao: '/x/texto/sub', rotulo: 'fixa-texto-sub' },
  { padrao: '/x/:id', rotulo: 'param-id' },
  { padrao: '/x/:id/sub', rotulo: 'param-id-sub' },
];
const CASOS = [
  ['/x/texto', 'fixa-texto'],
  ['/x/texto/sub', 'fixa-texto-sub'],
  ['/x/outro', 'param-id'],
  ['/x/outro/sub', 'param-id-sub'],
];

function permutacoes(lista) {
  if (lista.length <= 1) return [lista];
  return lista.flatMap((item, i) => permutacoes([...lista.slice(0, i), ...lista.slice(i + 1)]).map((resto) => [item, ...resto]));
}

async function qualRotaResponde(ordem, caminho) {
  const { rota, tratar } = criarRoteador();
  for (const r of ordem) rota(['GET'], r.padrao, () => ({ rota: r.rotulo }));
  const resp = await tratar({ metodo: 'GET', caminho });
  return resp.corpo.rota;
}

test('rota fixa vence a parametrizada em qualquer ordem de registro (24 permutações)', async () => {
  const contraexemplos = [];
  for (const ordem of permutacoes(ROTAS)) {
    for (const [caminho, esperada] of CASOS) {
      const obtida = await qualRotaResponde(ordem, caminho);
      if (obtida !== esperada) {
        contraexemplos.push(`registro [${ordem.map((r) => r.padrao).join(', ')}]: GET ${caminho} => ${obtida} (esperado ${esperada})`);
      }
    }
  }
  assert.deepEqual(contraexemplos, [], `${contraexemplos.length} contraexemplo(s); primeiro: ${contraexemplos[0]}`);
});

test('caso mínimo: /x/:id registrado antes de /x/texto ainda deixa GET /x/texto cair na rota fixa', async () => {
  const obtida = await qualRotaResponde([{ padrao: '/x/:id', rotulo: 'param-id' }, { padrao: '/x/texto', rotulo: 'fixa-texto' }], '/x/texto');
  assert.equal(obtida, 'fixa-texto');
});

test('registrar padrões equivalentes com método em comum lança erro', () => {
  const { rota } = criarRoteador();
  rota(['GET'], '/y/:id', () => ({}));
  assert.throws(() => rota(['GET', 'POST'], '/y/:codigo', () => ({})), Error, 'o segundo registro devia lançar erro');
});

test('registrar o mesmo padrão fixo duas vezes com o mesmo método lança erro', () => {
  const { rota } = criarRoteador();
  rota(['GET'], '/z/fixa', () => ({}));
  assert.throws(() => rota(['GET'], '/z/fixa', () => ({})), Error, 'o segundo registro devia lançar erro');
});

test('padrões equivalentes com métodos diferentes são aceitos', () => {
  // Este caso hoje já passa: guarda que a correção não bloqueie o registro legítimo.
  const { rota } = criarRoteador();
  rota(['GET'], '/w/:id', () => ({}));
  assert.doesNotThrow(() => rota(['POST'], '/w/:codigo', () => ({})));
});
