// Captura o comportamento dos dois adaptadores HTTP: o Lambda (em processo) e o servidor local (processo filho).
// Usado por `gerar-golden.js adaptadores` e por `preservacao-adaptadores.test.js`.
// Só usa interfaces estáveis: `handler` de src/api/lambda.js e o processo `node src/api/server.js`.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { BACKEND, DERIVADOS } from './golden-comum.js';

const CABECALHOS_DO_SERVIDOR = ['access-control-allow-origin', 'access-control-allow-methods', 'access-control-allow-headers', 'access-control-max-age', 'content-type', 'cache-control'];

const portaLivre = () => new Promise((resolve, reject) => {
  const s = net.createServer();
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
  s.on('error', reject);
});

/** Lambda: roda eventos no formato da Function URL e guarda statusCode, headers e body. */
async function capturarLambda() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'golden-lambda-'));
  process.env.DATA_DIR = path.join(tmp, 'data');
  process.env.DERIVADOS_SEMENTE = DERIVADOS;
  const { handler } = await import('../src/api/lambda.js');
  const ev = (metodo, rawPath, extra = {}) => ({ requestContext: { http: { method: metodo } }, rawPath, queryStringParameters: undefined, ...extra });
  const arquivoEstado = path.join(tmp, 'data', 'estado.json');
  const saida = { respostas: {}, estado_gravado: {} };
  const r = async (nome, evento) => { saida.respostas[nome] = await handler(evento); };
  await r('options', ev('OPTIONS', '/health'));
  await r('health', ev('GET', '/health'));
  await r('health com barra', ev('GET', '/health/'));
  await r('rota inexistente', ev('GET', '/nada'));
  await r('metodo nao permitido', ev('DELETE', '/dados/cidadaos/C000001'));
  await r('entrar como', ev('GET', '/dados/cidadaos/C007938'));
  await r('vitrine com consulta', ev('GET', '/recomendacao/C007938', { queryStringParameters: { limite: '2' } }));
  saida.estado_gravado.depois_de_get = fs.existsSync(arquivoEstado);
  await r('json invalido', ev('POST', '/dados/eventos', { body: '{x' }));
  await r('corpo grande', ev('POST', '/dados/eventos', { body: JSON.stringify({ lixo: 'a'.repeat(101 * 1024) }) }));
  await r('corpo vazio em post', ev('POST', '/dados/eventos'));
  await r('evento em base64', ev('POST', '/dados/eventos', {
    isBase64Encoded: true, body: Buffer.from(JSON.stringify({ cidadao_id: 'C007938', tipo: 'servico_aberto', servico_id: 352 })).toString('base64'),
  }));
  saida.estado_gravado.depois_de_post = fs.existsSync(arquivoEstado);
  fs.rmSync(tmp, { recursive: true, force: true });
  return saida;
}

/** Servidor local: processo filho numa porta livre. Devolve o que o cliente enxerga. */
async function capturarServidor() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'golden-server-'));
  fs.copyFileSync(DERIVADOS, path.join(tmp, 'derivados.json'));
  const porta = await portaLivre();
  const filho = spawn(process.execPath, ['src/api/server.js'], { cwd: BACKEND, env: { ...process.env, PORT: String(porta), DATA_DIR: tmp }, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('servidor não subiu em 90 s')), 90000);
      filho.stdout.on('data', (b) => { if (String(b).includes('ouvindo na porta')) { clearTimeout(t); resolve(); } });
      filho.on('exit', (c) => { clearTimeout(t); reject(new Error('servidor saiu com código ' + c)); });
    });
    const url = (p) => `http://127.0.0.1:${porta}${p}`;
    const saida = { respostas: {}, estado_gravado_ao_sair: null };
    const cab = (res) => Object.fromEntries(CABECALHOS_DO_SERVIDOR.filter((k) => res.headers.has(k)).map((k) => [k, res.headers.get(k)]));
    const r = async (nome, p, init = {}, { html = false } = {}) => {
      try {
        const res = await fetch(url(p), init);
        const txt = await res.text();
        const extra = html ? { html: txt.includes('<html') || txt.includes('<!DOCTYPE') } : { corpo: txt ? JSON.parse(txt) : null };
        saida.respostas[nome] = { status: res.status, headers: cab(res), ...extra };
      } catch (e) {
        saida.respostas[nome] = { falha_de_conexao: true };
      }
    };
    await r('options', '/health', { method: 'OPTIONS' });
    await r('health', '/health');
    await r('indice', '/', { headers: { accept: 'application/json' } });
    await r('painel', '/painel', {}, { html: true });
    await r('raiz para navegador', '/', { headers: { accept: 'text/html' } }, { html: true });
    await r('rota inexistente', '/nada');
    await r('metodo nao permitido', '/dados/cidadaos/C000001', { method: 'DELETE' });
    await r('json invalido', '/dados/eventos', { method: 'POST', body: '{x', headers: { 'content-type': 'application/json' } });
    // O servidor derruba a conexão ao passar do limite; o cliente vê 413 ou uma queda de conexão, conforme o momento.
    await r('corpo grande', '/dados/eventos', { method: 'POST', body: JSON.stringify({ lixo: 'a'.repeat(101 * 1024) }), headers: { 'content-type': 'application/json' } });
    const g = saida.respostas['corpo grande'];
    saida.respostas['corpo grande'] = { rejeitado: g.falha_de_conexao === true || g.status === 413 };
    await r('evento', '/dados/eventos', { method: 'POST', body: JSON.stringify({ cidadao_id: 'C007938', tipo: 'servico_aberto', servico_id: 352 }), headers: { 'content-type': 'application/json' } });
    // SIGTERM: o servidor grava o estado ao sair
    await new Promise((resolve) => { filho.on('exit', resolve); filho.kill('SIGTERM'); });
    saida.estado_gravado_ao_sair = fs.existsSync(path.join(tmp, 'estado.json'));
    return saida;
  } finally {
    if (filho.exitCode === null) filho.kill('SIGKILL');
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

export async function capturarAdaptadores() {
  return { lambda: await capturarLambda(), servidor: await capturarServidor() };
}
