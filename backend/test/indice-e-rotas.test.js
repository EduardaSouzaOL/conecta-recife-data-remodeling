import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as g from './golden-comum.js';

// Tarefa 3.5: rotas por área e índice gerado.
// **Validates: Requirements 2.1, 2.4, 3.1, 3.2, 3.7**

let amb;
let roteador;
let gerarIndice;
before(async () => {
  amb = await g.prepararAmbiente();
  // Mesmo registro que `criarApp`, mas com acesso à lista de rotas.
  const { criarRoteador } = await import('../src/api/roteador.js');
  gerarIndice = (await import('../src/api/indice.js')).gerarIndice;
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

const indiceGolden = () => g.lerFixture('golden-http.json').entradas.find((e) => e.rotulo === 'índice').corpo;

test('gerarIndice é igual ao índice capturado antes da refatoração (chaves, textos e ordem)', () => {
  const gerado = gerarIndice(roteador.rotas());
  assert.deepEqual(gerado, indiceGolden());
  assert.equal(JSON.stringify(gerado), JSON.stringify(indiceGolden()), 'a ordem das chaves também é a mesma');
});

test('GET / da API montada devolve o índice gerado', async () => {
  const r = await amb.tratar({ metodo: 'GET', caminho: '', consulta: {}, corpo: {} });
  assert.equal(r.status, 200);
  assert.deepEqual(r.corpo, indiceGolden());
});

test('toda rota com doc está no índice e todo item do índice tem rota', () => {
  const rotas = roteador.rotas();
  const indice = gerarIndice(rotas);
  const itens = Object.entries(indice).filter(([, v]) => typeof v === 'object').flatMap(([, v]) => Object.keys(v));
  const comDoc = rotas.filter((r) => r.doc);
  assert.equal(itens.length, comDoc.length, 'um item de índice por rota documentada');
  for (const r of comDoc) {
    const chave = `${r.metodos[0]} ${r.padrao.replace(/:(\w+)/g, '{$1}')}${r.doc.consulta ?? ''}`;
    assert.ok(itens.includes(chave), `falta no índice: ${chave}`);
  }
  for (const item of itens) {
    const [metodo, resto] = item.split(' ');
    const caminho = resto.replace(/\?.*$/, '');
    const existe = rotas.some((r) => r.metodos.includes(metodo) && r.padrao.replace(/:(\w+)/g, '{$1}') === caminho);
    assert.ok(existe, `o item do índice não tem rota: ${item}`);
  }
});

test('aliases legados, /health e / ficam fora do índice', () => {
  const rotas = roteador.rotas();
  assert.ok(rotas.every((r) => r.doc && r.doc.area && r.doc.descricao), 'toda rota de área tem doc completo');
  const indice = gerarIndice(rotas);
  const chaves = [...Object.keys(indice.motor_de_dados), ...Object.keys(indice.motor_de_recomendacao)];
  assert.ok(!chaves.includes('POST /dados/jornadas/{id}'), 'o alias POST não vira item');
  assert.ok(!chaves.includes('POST /recomendacao/{id}?limite=8'), 'o alias POST não vira item');
  assert.ok(!chaves.some((k) => k.includes('/health')));
});

// ---------- fronteiras entre módulos ----------
const SRC = path.resolve(g.BACKEND, 'src');
const importsDe = (arq) => [...fs.readFileSync(arq, 'utf8').matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
const arquivosJs = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  return e.isDirectory() ? arquivosJs(p) : e.name.endsWith('.js') ? [p] : [];
});

test('nenhum módulo de src/api/rotas importa outro módulo de rotas', () => {
  const dirRotas = path.join(SRC, 'api', 'rotas');
  const arquivos = arquivosJs(dirRotas);
  assert.equal(arquivos.length, 8, 'cidadaos, servicos, consentimentos, jornadas, eventos, fixados, recomendacao, catalogo');
  for (const arq of arquivos) {
    for (const imp of importsDe(arq).filter((i) => i.startsWith('.'))) {
      const alvo = path.resolve(path.dirname(arq), imp);
      assert.ok(!alvo.startsWith(dirRotas + path.sep), `${path.basename(arq)} importa outro módulo de rotas: ${imp}`);
    }
  }
});

test('src/dados e src/recomendacao não importam de src/api', () => {
  const dirApi = path.join(SRC, 'api');
  for (const sub of ['dados', 'recomendacao']) {
    for (const arq of arquivosJs(path.join(SRC, sub))) {
      for (const imp of importsDe(arq).filter((i) => i.startsWith('.'))) {
        const alvo = path.resolve(path.dirname(arq), imp);
        assert.ok(!alvo.startsWith(dirApi + path.sep), `${path.relative(SRC, arq)} importa de api: ${imp}`);
      }
    }
  }
});

test('rotas-dados.js e rotas-recomendacao.js foram removidos e ninguém os importa', () => {
  for (const nome of ['rotas-dados.js', 'rotas-recomendacao.js']) {
    assert.ok(!fs.existsSync(path.join(SRC, 'api', nome)), `${nome} ainda existe`);
  }
  for (const arq of arquivosJs(SRC)) {
    for (const imp of importsDe(arq)) assert.ok(!/rotas-(dados|recomendacao)/.test(imp), `${arq} importa ${imp}`);
  }
});

test('POST /dados/eventos aceita só os 4 tipos permitidos', async () => {
  const { EVENTOS_PERMITIDOS } = await import('../src/api/rotas/eventos.js');
  assert.deepEqual([...EVENTOS_PERMITIDOS].sort(), ['erro_entendimento', 'servico_aberto', 'tela_pulada', 'vitrine_vista']);
});
