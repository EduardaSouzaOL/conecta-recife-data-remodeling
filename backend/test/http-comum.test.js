import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { BACKEND, DERIVADOS, lerFixture } from './golden-comum.js';
import { ErroHttp, falhar } from '../src/api/erros.js';
import {
  MAX_CORPO, METODOS_COM_CORPO, cabecalhosJson, criarCors, interpretarJson, respostaDeErro, verificarTamanho,
} from '../src/api/http-comum.js';

// Tarefa 3.4: HTTP comum compartilhado por servidor local e Lambda.
// **Validates: Requirements 2.6, 3.8, 3.10**

const golden = lerFixture('golden-adaptadores.json');

test('MAX_CORPO é 100 KB e só POST, PUT e PATCH têm corpo', () => {
  assert.equal(MAX_CORPO, 100 * 1024);
  assert.deepEqual(METODOS_COM_CORPO, ['POST', 'PUT', 'PATCH']);
});

test('interpretarJson: vazio vira {}, válido é lido, inválido dá 400 json_invalido', () => {
  assert.deepEqual(interpretarJson(Buffer.alloc(0)), {});
  assert.deepEqual(interpretarJson(Buffer.from('{"a":1}')), { a: 1 });
  assert.throws(() => interpretarJson(Buffer.from('{x')), (e) => e instanceof ErroHttp && e.status === 400 && e.erro === 'json_invalido');
});

test('verificarTamanho: o limite exato passa e um byte a mais dá 413 corpo_grande', () => {
  assert.doesNotThrow(() => verificarTamanho(MAX_CORPO));
  assert.throws(() => verificarTamanho(MAX_CORPO + 1), (e) => e instanceof ErroHttp && e.status === 413 && e.erro === 'corpo_grande');
});

test('respostaDeErro: ErroHttp mantém status, erro, mensagem e extras', () => {
  let erro;
  try { falhar('campos_pendentes', 'Faltam campos.', { jornada: { id: 'j1' } }); } catch (e) { erro = e; }
  assert.deepEqual(respostaDeErro(erro), {
    status: 422,
    corpo: { erro: 'campos_pendentes', mensagem: 'Faltam campos.', jornada: { id: 'j1' } },
  });
});

test('respostaDeErro: erro desconhecido vira 500 erro_interno sem vazar detalhe', () => {
  const log = console.error;
  console.error = () => {};
  try {
    assert.deepEqual(respostaDeErro(new Error('segredo interno')), {
      status: 500,
      corpo: { erro: 'erro_interno', mensagem: 'Algo deu errado. Tente de novo em instantes.' },
    });
  } finally { console.error = log; }
});

test('criarCors: cabeçalhos iguais aos capturados antes da refatoração', () => {
  const lambda = golden.lambda.respostas.options.headers;
  assert.deepEqual(criarCors('GET,POST,PUT,PATCH,DELETE,OPTIONS'), lambda);
  const servidor = golden.servidor.respostas.options.headers;
  const esperado = {
    'Access-Control-Allow-Origin': servidor['access-control-allow-origin'],
    'Access-Control-Allow-Methods': servidor['access-control-allow-methods'],
    'Access-Control-Allow-Headers': servidor['access-control-allow-headers'],
    'Access-Control-Max-Age': servidor['access-control-max-age'],
  };
  assert.deepEqual(criarCors('GET,POST,PUT,PATCH,OPTIONS'), esperado);
});

test('cabecalhosJson: Content-Type e Cache-Control mais o CORS do ambiente', () => {
  const cors = criarCors('GET,OPTIONS');
  assert.deepEqual(cabecalhosJson(cors), { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors });
});

// ---- Integração: servidor local de verdade, em porta efêmera ----

const portaLivre = () => new Promise((resolve, reject) => {
  const s = net.createServer();
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
  s.on('error', reject);
});

let filho; let tmp; let base;
before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'http-comum-'));
  fs.copyFileSync(DERIVADOS, path.join(tmp, 'derivados.json'));
  const porta = await portaLivre();
  base = `http://127.0.0.1:${porta}`;
  filho = spawn(process.execPath, ['src/api/server.js'], { cwd: BACKEND, env: { ...process.env, PORT: String(porta), DATA_DIR: tmp }, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('servidor não subiu em 90 s')), 90000);
    filho.stdout.on('data', (b) => { if (String(b).includes('ouvindo na porta')) { clearTimeout(t); resolve(); } });
    filho.on('exit', (c) => { clearTimeout(t); reject(new Error('servidor saiu com código ' + c)); });
  });
}, { timeout: 100000 });
after(() => {
  if (filho && filho.exitCode === null) filho.kill('SIGKILL');
  fs.rmSync(tmp, { recursive: true, force: true });
});

const postJson = (p, corpo) => fetch(base + p, { method: 'POST', body: corpo, headers: { 'content-type': 'application/json' } });

test('servidor local: GET / devolve o índice e GET /health responde ok', async () => {
  const indice = await fetch(base + '/', { headers: { accept: 'application/json' } });
  assert.equal(indice.status, 200);
  assert.match(indice.headers.get('content-type'), /application\/json/);
  assert.equal(indice.headers.get('cache-control'), 'no-store');
  assert.ok((await indice.json()).motor_de_dados);
  const saude = await fetch(base + '/health');
  assert.equal(saude.status, 200);
  assert.equal((await saude.json()).ok, true);
});

test('servidor local: OPTIONS responde 204 só com CORS (sem DELETE)', async () => {
  const r = await fetch(base + '/health', { method: 'OPTIONS' });
  assert.equal(r.status, 204);
  assert.equal(r.headers.get('access-control-allow-methods'), 'GET,POST,PUT,PATCH,OPTIONS');
  assert.equal(await r.text(), '');
});

test('servidor local: GET /painel serve HTML', async () => {
  const r = await fetch(base + '/painel');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /text\/html/);
});

test('servidor local: corpo acima de 100 KB é rejeitado (413 ou queda de conexão)', async () => {
  let rejeitado;
  try {
    const r = await postJson('/dados/eventos', JSON.stringify({ lixo: 'a'.repeat(101 * 1024) }));
    rejeitado = r.status === 413 ? (await r.json()).erro === 'corpo_grande' : false;
  } catch { rejeitado = true; }
  assert.equal(rejeitado, true);
});

test('servidor local: JSON inválido dá 400 json_invalido', async () => {
  const r = await postJson('/dados/eventos', '{x');
  assert.equal(r.status, 400);
  assert.equal((await r.json()).erro, 'json_invalido');
});

test('servidor local: % inválido no caminho dá 400 caminho_invalido', async () => {
  const r = await fetch(base + '/dados/cidadaos/%E0%A4%A');
  assert.equal(r.status, 400);
  const corpo = await r.json();
  assert.equal(corpo.erro, 'caminho_invalido');
  assert.ok(corpo.mensagem);
});

// ---- Lambda: % inválido pelo handler ----

test('Lambda: % inválido no caminho dá 400 caminho_invalido pelo handler', { timeout: 120000 }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'http-comum-lambda-'));
  const antes = { DATA_DIR: process.env.DATA_DIR, DERIVADOS_SEMENTE: process.env.DERIVADOS_SEMENTE };
  process.env.DATA_DIR = path.join(dir, 'data');
  process.env.DERIVADOS_SEMENTE = DERIVADOS;
  try {
    const { handler } = await import('../src/api/lambda.js');
    const r = await handler({ requestContext: { http: { method: 'GET' } }, rawPath: '/dados/cidadaos/%E0%A4%A' });
    assert.equal(r.statusCode, 400);
    const corpo = JSON.parse(r.body);
    assert.equal(corpo.erro, 'caminho_invalido');
    assert.ok(corpo.mensagem);
  } finally {
    for (const [k, v] of Object.entries(antes)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
