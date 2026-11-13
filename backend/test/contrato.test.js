import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as g from './golden-comum.js';

// Tarefa 3.8: contrato das APIs. Todo par método/caminho registrado tem seção no contrato.
// **Validates: Requirements 2.7**

const CONTRATO = path.resolve(g.BACKEND, '..', '.kiro', 'specs', 'refatorar-clareza-apis', 'contrato-das-apis.md');

let amb;
let roteador;

before(async () => {
  amb = await g.prepararAmbiente();
  const { criarRoteador } = await import('../src/api/roteador.js');
  roteador = criarRoteador();
  const { rota } = roteador;
  (await import('../src/api/rotas/cidadaos.js')).registrarRotasCidadaos(rota);
  (await import('../src/api/rotas/servicos.js')).registrarRotasServicos(rota);
  (await import('../src/api/rotas/consentimentos.js')).registrarRotasConsentimentos(rota);
  (await import('../src/api/rotas/jornadas.js')).registrarRotasJornadas(rota);
  (await import('../src/api/rotas/eventos.js')).registrarRotasEventos(rota);
  (await import('../src/api/rotas/fixados.js')).registrarRotasFixados(rota);
  (await import('../src/api/rotas/recomendacao.js')).registrarRotasRecomendacao(rota, amb.derivados);
  (await import('../src/api/rotas/catalogo.js')).registrarRotasCatalogo(rota);
});
after(() => amb?.limpar());

/** `/dados/x/:id/y` vira `/dados/x/{id}/y`; a raiz (padrão vazio) vira `/`. */
const caminhoDoContrato = (padrao) => (padrao === '' ? '/' : padrao.replace(/:(\w+)/g, '{$1}'));

/** Seções `### MÉTODO /caminho` do contrato. */
function secoesDoContrato() {
  const texto = fs.readFileSync(CONTRATO, 'utf8');
  return new Set([...texto.matchAll(/^### ([A-Z]+) (\S+)\s*$/gm)].map((m) => `${m[1]} ${m[2]}`));
}

test('todo par método/caminho registrado nas áreas tem seção no contrato', () => {
  const secoes = secoesDoContrato();
  const faltando = [];
  for (const r of roteador.rotas()) {
    for (const metodo of r.metodos) {
      const par = `${metodo} ${caminhoDoContrato(r.padrao)}`;
      if (!secoes.has(par)) faltando.push(par);
    }
  }
  assert.deepEqual(faltando, [], `Sem seção no contrato: ${faltando.join(', ')}`);
});

test('GET /health e GET / existem na API montada e têm seção no contrato', async () => {
  const secoes = secoesDoContrato();
  for (const [caminho, secao] of [['/health', 'GET /health'], ['', 'GET /']]) {
    const r = await amb.tratar({ metodo: 'GET', caminho, consulta: {}, corpo: {} });
    assert.equal(r.status, 200, `${secao} deve responder 200`);
    assert.ok(secoes.has(secao), `Sem seção no contrato: ${secao}`);
  }
});

test('toda seção do contrato corresponde a uma rota registrada (sem seção sobrando)', () => {
  const registrados = new Set(['GET /', 'GET /health']);
  for (const r of roteador.rotas()) for (const m of r.metodos) registrados.add(`${m} ${caminhoDoContrato(r.padrao)}`);
  const sobrando = [...secoesDoContrato()].filter((s) => !registrados.has(s));
  assert.deepEqual(sobrando, [], `Seção sem rota: ${sobrando.join(', ')}`);
});

test('o teste enxerga todas as áreas: app.js importa cada módulo de rotas', () => {
  const app = fs.readFileSync(path.join(g.BACKEND, 'src', 'api', 'app.js'), 'utf8');
  const modulos = fs.readdirSync(path.join(g.BACKEND, 'src', 'api', 'rotas')).filter((f) => f.endsWith('.js'));
  for (const m of modulos) assert.ok(app.includes(`./rotas/${m}`), `app.js não importa rotas/${m}; inclua-o neste teste também`);
  assert.equal(modulos.length, 8);
});

test('legados e efeitos colaterais de GET estão marcados no contrato', () => {
  const texto = fs.readFileSync(CONTRATO, 'utf8');
  assert.match(texto, /### POST \/recomendacao\/\{id\}\n\n- \*\*Legado\*\*/);
  assert.match(texto, /### POST \/dados\/jornadas\/\{id\}\n\n- \*\*Legado\*\*/);
  assert.match(texto, /usa_dados_de_saude/);
  assert.match(texto, /grava o evento `entrou_como`/);
  assert.match(texto, /grava o evento `vitrine_vista`/);
  assert.match(texto, /## Erros e status/);
  assert.match(texto, /## Formato de erro/);
});

test('o README do backend aponta para o contrato', () => {
  const readme = fs.readFileSync(path.join(g.BACKEND, 'README.md'), 'utf8');
  assert.ok(readme.includes('refatorar-clareza-apis/contrato-das-apis.md'));
});
