// Apoio dos testes de preservação (golden). Não é um teste: só funções usadas pelos arquivos
// `preservacao-*.test.js` e por `gerar-golden.js`.
//
// Regra: este arquivo só importa interfaces que a refatoração NÃO muda:
//   src/api/app.js (criarApp, ErroHttp), src/api/lambda.js (handler), src/api/server.js (processo),
//   src/recomendacao/vitrine.js (montarVitrine), src/dados/* (carga, consentimento, servicos).
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const AQUI = path.dirname(fileURLToPath(import.meta.url));
export const DIR_FIXTURES = path.join(AQUI, 'fixtures');
export const BACKEND = path.resolve(AQUI, '..');
export const DERIVADOS = path.join(BACKEND, 'data', 'derivados.json');

export const PERSONAS = ['C007938', 'C068579', 'C059592', 'C036462', 'C039227', 'C076260', 'C006566', 'C062244'];

// Relógio fixo: as datas oferecidas na jornada (dias úteis) e os horários "ocupados" dependem de hoje.
// Com o relógio parado, o golden não muda de um dia para o outro.
const AGORA = new Date('2026-11-12T15:00:00Z').getTime();
export function congelarRelogio() {
  const Real = Date;
  class DataFixa extends Real {
    constructor(...a) { if (a.length) super(...a); else super(AGORA); }
    static now() { return AGORA; }
  }
  globalThis.Date = DataFixa;
}

/** Prepara estado em pasta temporária, congela o relógio e carrega os dados (BD/ só leitura). */
export async function prepararAmbiente() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'golden-'));
  process.env.DATA_DIR = tmp;
  fs.copyFileSync(DERIVADOS, path.join(tmp, 'derivados.json'));
  congelarRelogio();
  const { carregarDados, dados } = await import('../src/dados/carga.js');
  const { carregarDerivados } = await import('../src/recomendacao/derivados.js');
  const app = await import('../src/api/app.js');
  await carregarDados();
  const derivados = await carregarDerivados();
  const tratar = app.criarApp(derivados);
  const limpar = () => fs.rmSync(tmp, { recursive: true, force: true });
  return { tmp, dados, derivados, tratar, ErroHttp: app.ErroHttp, limpar };
}

export const lerFixture = (nome) => JSON.parse(fs.readFileSync(path.join(DIR_FIXTURES, nome), 'utf8'));
export function gravarFixture(nome, obj) {
  fs.mkdirSync(DIR_FIXTURES, { recursive: true });
  fs.writeFileSync(path.join(DIR_FIXTURES, nome), JSON.stringify(obj, null, 1) + '\n');
}

// ---------- máscara de campos aleatórios ----------
/** Troca o que muda a cada execução: id da jornada (J-XXXXXXXXXX) e o código do protocolo. */
export function mascarar(valor) {
  const txt = JSON.stringify(valor)
    .replace(/J-[0-9A-F]{10}/g, 'J-<ID>')
    .replace(/DEMO-(\d{4})-[0-9A-F]{6}/g, 'DEMO-$1-<COD>');
  return JSON.parse(txt);
}

// ---------- oráculo: expressão original do limite da vitrine ----------
// Copiada de rotas-recomendacao.js antes da refatoração. `corpo` e `consulta` são os objetos da rota.
export const limiteOriginal = (corpo, consulta) => Math.min(20, Math.max(1, Number(corpo.limite ?? consulta.limite ?? 8) || 8));

// ---------- chamada à API no formato do servidor ----------
/** Igual ao que server.js faz: ErroHttp vira { status, corpo: { erro, mensagem, ...extra } }; outro erro vira 500. */
export function criarChamador(tratar, ErroHttp) {
  return async (metodo, caminho, corpo = {}, consulta = {}) => {
    try {
      const r = await tratar({ metodo, caminho, consulta, corpo });
      return { status: r.status, corpo: r.corpo };
    } catch (e) {
      if (e instanceof ErroHttp) return { status: e.status, corpo: { erro: e.erro, mensagem: e.message, ...e.extra } };
      return { status: 500, corpo: { erro: 'erro_interno', mensagem: 'Algo deu errado. Tente de novo em instantes.' } };
    }
  };
}

// ---------- vitrine ----------
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 8 personas + 50 sem histórico + 242 sorteados com semente fixa = 300 cidadãos. */
export function amostraDeCidadaos(dados) {
  const rnd = mulberry32(2026);
  const ids = [...dados.cidadaos.keys()].sort();
  const sem = ids.filter((i) => !dados.historico.has(i));
  const com = ids.filter((i) => dados.historico.has(i) && !PERSONAS.includes(i));
  const sorteia = (lista, n) => {
    const usados = new Set();
    while (usados.size < n) usados.add(lista[Math.floor(rnd() * lista.length)]);
    return [...usados].sort();
  };
  return [...PERSONAS, ...sorteia(sem, 50), ...sorteia(com, 242)];
}

export const COMBINACOES = {
  nenhum: [],
  saude: ['saude_personalizacao'],
  acessibilidade: ['acessibilidade_personalizacao'],
  ambos: ['saude_personalizacao', 'acessibilidade_personalizacao'],
};
export const LIMITES = [1, 8, 20];

export const sha256 = (obj) => crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex');

/** Calcula { "<id>|<combinação>|<limite>": sha256 } da saída de montarVitrine. */
export async function calcularHashesDaVitrine({ dados, derivados }) {
  const { montarVitrine } = await import('../src/recomendacao/vitrine.js');
  const { registrarDecisao } = await import('../src/dados/consentimento.js');
  const { consentimentos } = await import('../src/dados/store.js');
  const saida = {};
  for (const id of amostraDeCidadaos(dados)) {
    for (const [nome, finalidades] of Object.entries(COMBINACOES)) {
      delete consentimentos[id];
      for (const f of finalidades) registrarDecisao(id, 'concedido', f);
      for (const limite of LIMITES) saida[`${id}|${nome}|${limite}`] = sha256(montarVitrine(id, derivados, { limite }));
    }
    delete consentimentos[id];
  }
  return saida;
}

// ---------- cenário HTTP ----------
/**
 * Roda a lista fixa de chamadas, em ordem, e devolve [{ rotulo, req, status, corpo }] já mascarado.
 * Cobre todos os endpoints, um erro de cada código, 404, 405, rotas antigas, JSON inválido (no adaptador) e jornadas.
 */
export async function executarCenarioHttp({ tratar, ErroHttp, dados }) {
  const chamar = criarChamador(tratar, ErroHttp);
  const { temJornada } = await import('../src/dados/servicos.js');
  const saida = [];
  let J = null; // id da jornada atual
  const sub = (s) => (J ? s.replace('{J}', J) : s);
  const reg = async (rotulo, metodo, caminho, corpo = {}, consulta = {}) => {
    const r = await chamar(metodo, sub(caminho), corpo, consulta);
    saida.push(mascarar({ rotulo, req: { metodo, caminho, corpo, consulta }, status: r.status, corpo: r.corpo }));
    return r;
  };
  const semJornada = [...dados.servicos.values()].find((s) => !temJornada(s)).servico_id;

  // índice, saúde, roteamento
  await reg('índice', 'GET', '');
  await reg('health', 'GET', '/health');
  await reg('health com barra final', 'GET', '/health/');
  await reg('rota antiga /vitrine', 'GET', '/vitrine/C000001');
  await reg('rota antiga /entrar', 'GET', '/entrar/C000001');
  await reg('rota inexistente', 'GET', '/nada/aqui');
  await reg('405 cidadão', 'DELETE', '/dados/cidadaos/C000001');
  await reg('405 health', 'POST', '/health');
  await reg('405 recomendação', 'DELETE', '/recomendacao/C000001');
  await reg('POST em consentimentos/texto cai na rota :id', 'POST', '/dados/consentimentos/texto');
  await reg('405 eventos resumo', 'POST', '/dados/eventos/resumo');

  // cidadãos
  await reg('demo', 'GET', '/dados/cidadaos/demo');
  for (const p of PERSONAS) await reg(`entrar como ${p}`, 'GET', `/dados/cidadaos/${p}`);
  await reg('entrar como número simples', 'GET', '/dados/cidadaos/7938');
  await reg('entrar como sem histórico', 'GET', `/dados/cidadaos/${[...dados.cidadaos.keys()].find((i) => !dados.historico.has(i))}`);
  await reg('id inválido', 'GET', '/dados/cidadaos/abc');
  await reg('cidadão inexistente', 'GET', '/dados/cidadaos/C999999');
  await reg('jornadas do cidadão (vazio)', 'GET', '/dados/cidadaos/C000003/jornadas');
  await reg('jornadas de id inválido', 'GET', '/dados/cidadaos/zz/jornadas');

  // serviços
  await reg('serviço 352', 'GET', '/dados/servicos/352');
  await reg('serviço 942', 'GET', '/dados/servicos/942');
  await reg('serviço inexistente', 'GET', '/dados/servicos/99999');
  await reg('serviço id texto', 'GET', '/dados/servicos/abc');

  // consentimentos
  await reg('texto padrão', 'GET', '/dados/consentimentos/texto');
  await reg('texto saúde', 'GET', '/dados/consentimentos/texto', {}, { finalidade: 'saude_personalizacao' });
  await reg('texto acessibilidade', 'GET', '/dados/consentimentos/texto', {}, { finalidade: 'acessibilidade_personalizacao' });
  await reg('texto finalidade inválida', 'GET', '/dados/consentimentos/texto', {}, { finalidade: 'x' });
  await reg('situação padrão', 'GET', '/dados/consentimentos/C062244');
  await reg('situação acessibilidade', 'GET', '/dados/consentimentos/C059592', {}, { finalidade: 'acessibilidade_personalizacao' });
  await reg('situação finalidade inválida', 'GET', '/dados/consentimentos/C062244', {}, { finalidade: 'x' });
  await reg('situação id inválido', 'GET', '/dados/consentimentos/abc');
  await reg('situação cidadão inexistente', 'GET', '/dados/consentimentos/C999999');
  await reg('decisão inválida', 'POST', '/dados/consentimentos/C062244', { decisao: 'talvez' });
  await reg('decisão ausente', 'POST', '/dados/consentimentos/C062244', {});
  await reg('finalidade inválida no POST', 'POST', '/dados/consentimentos/C062244', { decisao: 'concedido', finalidade: 'x' });
  await reg('nada a revogar', 'POST', '/dados/consentimentos/C062244', { decisao: 'revogado' });
  await reg('recusar', 'POST', '/dados/consentimentos/C039227', { decisao: 'recusado' });
  await reg('vitrine C062244 sem consentimento', 'GET', '/recomendacao/C062244', {}, { limite: '10' });
  await reg('conceder saúde', 'POST', '/dados/consentimentos/C062244', { decisao: 'concedido', finalidade: 'saude_personalizacao' });
  await reg('conceder de novo (sem mudança)', 'POST', '/dados/consentimentos/C062244', { decisao: 'concedido' });
  await reg('recusar após conceder', 'POST', '/dados/consentimentos/C062244', { decisao: 'recusado' });
  await reg('vitrine C062244 com saúde', 'GET', '/recomendacao/C062244', {}, { limite: '10' });
  await reg('entrar como com saúde', 'GET', '/dados/cidadaos/C062244');
  await reg('conceder acessibilidade por consulta', 'POST', '/dados/consentimentos/C059592', {}, { decisao: 'concedido', finalidade: 'acessibilidade_personalizacao' });
  await reg('vitrine C059592 com acessibilidade', 'GET', '/recomendacao/C059592', {}, { limite: '10' });
  await reg('entrar como com acessibilidade', 'GET', '/dados/cidadaos/C059592');
  await reg('revogar saúde', 'POST', '/dados/consentimentos/C062244', { decisao: 'revogado', finalidade: 'saude_personalizacao' });
  await reg('situação após revogar', 'GET', '/dados/consentimentos/C062244');

  // recomendação
  await reg('vitrine padrão', 'GET', '/recomendacao/C007938');
  for (const l of ['3', '0', '99', 'abc', '-4', '']) await reg(`vitrine limite "${l}"`, 'GET', '/recomendacao/C068579', {}, { limite: l });
  await reg('vitrine POST limite 5', 'POST', '/recomendacao/C076260', { limite: 5 });
  await reg('vitrine POST limite texto', 'POST', '/recomendacao/C076260', { limite: 'abc' });
  await reg('vitrine POST limite no corpo e na consulta', 'POST', '/recomendacao/C076260', { limite: 2 }, { limite: '9' });
  await reg('vitrine id inválido', 'GET', '/recomendacao/xx');
  await reg('vitrine cidadão inexistente', 'GET', '/recomendacao/C999999');
  await reg('vitrine sem histórico', 'GET', `/recomendacao/${[...dados.cidadaos.keys()].find((i) => !dados.historico.has(i))}`);

  // eventos
  await reg('evento válido', 'POST', '/dados/eventos', { cidadao_id: 'C007938', tipo: 'servico_aberto', servico_id: 352 });
  await reg('evento válido sem serviço', 'POST', '/dados/eventos', { cidadao_id: 'C007938', tipo: 'tela_pulada' });
  await reg('evento tipo não permitido', 'POST', '/dados/eventos', { cidadao_id: 'C007938', tipo: 'jornada_concluida' });
  await reg('evento sem cidadão', 'POST', '/dados/eventos', { tipo: 'tela_pulada' });
  await reg('evento cidadão inexistente', 'POST', '/dados/eventos', { cidadao_id: 'C999999', tipo: 'tela_pulada' });

  // jornadas: erros de início
  await reg('jornada sem serviço', 'POST', '/dados/jornadas', { cidadao_id: 'C007938' });
  await reg('jornada serviço inexistente', 'POST', '/dados/jornadas', { cidadao_id: 'C007938', servico_id: 99999 });
  await reg('jornada serviço sem pedido', 'POST', '/dados/jornadas', { cidadao_id: 'C007938', servico_id: semJornada });
  await reg('jornada sem cidadão', 'POST', '/dados/jornadas', { servico_id: 352 });
  await reg('jornada inexistente GET', 'GET', '/dados/jornadas/J-NAOEXISTE');
  await reg('jornada inexistente PATCH', 'PATCH', '/dados/jornadas/J-NAOEXISTE', { campos: {} });
  await reg('jornada inexistente confirmar', 'POST', '/dados/jornadas/J-NAOEXISTE/confirmar', { confirmar: true });

  // jornada 352 de ponta a ponta
  const ini = await reg('jornada 352 início', 'POST', '/dados/jornadas', { cidadao_id: 'C007938', servico_id: 352 });
  J = ini.corpo.jornada_id;
  await reg('jornada 352 retomada', 'POST', '/dados/jornadas', { cidadao_id: 'C007938', servico_id: 352 });
  await reg('jornada 352 consulta', 'GET', '/dados/jornadas/{J}');
  await reg('jornada 352 tela pedida', 'GET', '/dados/jornadas/{J}', {}, { tela: 'documentos' });
  await reg('jornada 352 tela inexistente', 'GET', '/dados/jornadas/{J}', {}, { tela: 'nao_existe' });
  await reg('jornada 352 lista do cidadão', 'GET', '/dados/cidadaos/C007938/jornadas');
  await reg('confirmar com false', 'POST', '/dados/jornadas/{J}/confirmar', { confirmar: false });
  await reg('confirmar sem corpo', 'POST', '/dados/jornadas/{J}/confirmar');
  await reg('confirmar com pendências', 'POST', '/dados/jornadas/{J}/confirmar', { confirmar: true });
  await reg('confirmar "true" na consulta com pendências', 'POST', '/dados/jornadas/{J}/confirmar', {}, { confirmar: 'true' });
  await reg('PATCH valor inválido', 'PATCH', '/dados/jornadas/{J}', { campos: { unidade: 'XXX', pessoas_na_familia: 99 } });
  await reg('PATCH campo inexistente', 'PATCH', '/dados/jornadas/{J}', { campos: { foo: 1 } });
  await reg('PATCH campos em texto inválido', 'PATCH', '/dados/jornadas/{J}', { campos: 'não é json' });
  await reg('PATCH campos em texto válido', 'PATCH', '/dados/jornadas/{J}', { campos: '{"tipo_atendimento":"atualizacao"}' });
  await reg('PATCH sem campos', 'PATCH', '/dados/jornadas/{J}', {});
  await reg('POST (alias) preenche', 'POST', '/dados/jornadas/{J}', { campos: { pessoas_na_familia: 3 }, tela: 'sobre' });
  await reg('PATCH tela por consulta', 'PATCH', '/dados/jornadas/{J}', { campos: { ciente_documentos: true } }, { tela: 'local' });
  await reg('PATCH unidade', 'PATCH', '/dados/jornadas/{J}', { campos: { unidade: 'U3A' } });
  await reg('PATCH data', 'PATCH', '/dados/jornadas/{J}', { campos: { data: '2026-11-13' } });
  const dh = await reg('tela data_hora', 'GET', '/dados/jornadas/{J}', {}, { tela: 'data_hora' });
  const hora = dh.corpo.tela_atual.campos.find((c) => c.nome === 'hora').opcoes[0].valor;
  await reg('PATCH hora', 'PATCH', '/dados/jornadas/{J}', { campos: { hora } });
  await reg('PATCH data muda e hora cai por dependência', 'PATCH', '/dados/jornadas/{J}', { campos: { data: '2026-11-16' } });
  await reg('PATCH hora de novo', 'PATCH', '/dados/jornadas/{J}', { campos: { hora } });
  await reg('PATCH hora fora da lista', 'PATCH', '/dados/jornadas/{J}', { campos: { hora: '03:00' } });
  await reg('confirmar com tudo certo', 'POST', '/dados/jornadas/{J}/confirmar', { confirmar: true });
  await reg('confirmar de novo (já concluída)', 'POST', '/dados/jornadas/{J}/confirmar', { confirmar: true });
  await reg('PATCH em jornada concluída', 'PATCH', '/dados/jornadas/{J}', { campos: { hora } });
  await reg('jornada concluída GET', 'GET', '/dados/jornadas/{J}');
  await reg('lista do cidadão após concluir', 'GET', '/dados/cidadaos/C007938/jornadas');

  // jornada 942 (simulada), sem preencher: confirma com "true" em texto
  const j2 = await reg('jornada 942 início', 'POST', '/dados/jornadas', { cidadao_id: 'C068579', servico_id: 942 });
  J = j2.corpo.jornada_id;
  await reg('942 confirmar com pendências', 'POST', '/dados/jornadas/{J}/confirmar', { confirmar: 'true' });
  await reg('942 preencher unidade', 'PATCH', '/dados/jornadas/{J}', { campos: { unidade: 'U1A' } });
  await reg('942 GET', 'GET', '/dados/jornadas/{J}');

  // resumo de eventos no fim: mostra entrou_como, vitrine_vista, tela_pulada, consentimento_*, jornada_*
  await reg('resumo de eventos', 'GET', '/dados/eventos/resumo');
  return saida;
}
