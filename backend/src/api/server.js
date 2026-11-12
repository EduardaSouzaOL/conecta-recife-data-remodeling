import fs from 'node:fs';
import http from 'node:http';
import { carregarDados } from '../dados/carga.js';
import { carregarDerivados } from '../recomendacao/derivados.js';
import { carregarEstado, salvarLogo } from '../dados/store.js';
import { criarApp } from './app.js';
import { cabecalhosJson, criarCors, interpretarJson, METODOS_COM_CORPO, respostaDeErro, verificarTamanho } from './http-comum.js';

const PORTA = Number(process.env.PORT || 8080);
const PAINEL = fs.readFileSync(new URL('../../tools/painel.html', import.meta.url), 'utf8');
const CORS = criarCors('GET,POST,PUT,PATCH,OPTIONS');

/** Lê o corpo em pedaços, respeitando o limite; rejeita com o `ErroHttp` do problema. */
function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    const partes = [];
    let tam = 0;
    req.on('data', (c) => {
      tam += c.length;
      try { verificarTamanho(tam); } catch (e) { reject(e); req.destroy(); return; }
      partes.push(c);
    });
    req.on('end', () => {
      try { resolve(interpretarJson(Buffer.concat(partes))); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function responder(res, status, corpo) {
  const txt = JSON.stringify(corpo);
  res.writeHead(status, cabecalhosJson(CORS));
  res.end(txt);
}

async function main() {
  await carregarDados();
  carregarEstado();
  const derivados = await carregarDerivados();
  const tratar = criarApp(derivados);

  const servidor = http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
    try {
      const url = new URL(req.url, 'http://x');
      // painel de teste para navegador (a API em si continua só JSON)
      if (req.method === 'GET' && (url.pathname === '/painel' || (url.pathname === '/' && (req.headers.accept || '').includes('text/html')))) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        return res.end(PAINEL);
      }
      const consulta = Object.fromEntries(url.searchParams);
      const corpo = METODOS_COM_CORPO.includes(req.method) ? await lerCorpo(req) : {};
      const { status, corpo: saida } = await tratar({ metodo: req.method, caminho: url.pathname, consulta, corpo });
      responder(res, status, saida);
    } catch (e) {
      const { status, corpo } = respostaDeErro(e);
      responder(res, status, corpo);
    }
  });
  servidor.listen(PORTA, '0.0.0.0', () => console.log(`[servidor] ouvindo na porta ${PORTA}`));

  const sair = () => { try { salvarLogo(); } catch { /* ignora */ } process.exit(0); };
  process.on('SIGINT', sair);
  process.on('SIGTERM', sair);
}

main().catch((e) => { console.error(e); process.exit(1); });
