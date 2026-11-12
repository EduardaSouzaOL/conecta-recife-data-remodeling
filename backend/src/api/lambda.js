import fs from 'node:fs';
import path from 'node:path';
import { carregarDados, DIR_DATA } from '../dados/carga.js';
import { carregarEstado, salvarLogo } from '../dados/store.js';
import { carregarDerivados } from '../recomendacao/derivados.js';
import { criarApp } from './app.js';
import { cabecalhosJson, criarCors, interpretarJson, METODOS_COM_CORPO, respostaDeErro, verificarTamanho } from './http-comum.js';

/**
 * Adaptador AWS Lambda (Function URL, payload 2.0). Usa o mesmo roteador do servidor HTTP.
 * Fase 1: o estado (consentimentos, pedidos, eventos) fica em DATA_DIR (/tmp/data) e some quando a instância é trocada.
 */

const CORS = criarCors('GET,POST,PUT,PATCH,DELETE,OPTIONS');

let pronto = null;

/** Prepara a pasta de estado e copia os derivados do pacote. Nunca regera derivados (leria as visitas). */
function prepararDados() {
  fs.mkdirSync(DIR_DATA, { recursive: true });
  const destino = path.join(DIR_DATA, 'derivados.json');
  if (!fs.existsSync(destino)) {
    const raiz = process.env.LAMBDA_TASK_ROOT || process.cwd();
    const semente = process.env.DERIVADOS_SEMENTE || path.join(raiz, 'data-seed', 'derivados.json');
    if (!fs.existsSync(semente)) {
      throw new Error(`derivados.json não encontrado em ${semente}. Rode "npm run derivar" e empacote de novo.`);
    }
    fs.copyFileSync(semente, destino);
  }
}

/** Inicialização única (guardada em cache). Se falhar, a próxima chamada tenta de novo. */
function iniciar() {
  if (!pronto) {
    pronto = (async () => {
      prepararDados();
      await carregarDados();
      carregarEstado();
      const derivados = await carregarDerivados();
      return criarApp(derivados);
    })().catch((e) => { pronto = null; throw e; });
  }
  return pronto;
}

function resposta(statusCode, corpo) {
  return { statusCode, headers: cabecalhosJson(CORS), body: JSON.stringify(corpo) };
}

function lerCorpo(evento) {
  if (!evento.body) return {};
  const bruto = evento.isBase64Encoded ? Buffer.from(evento.body, 'base64') : Buffer.from(evento.body, 'utf8');
  verificarTamanho(bruto.length);
  return interpretarJson(bruto);
}

export async function handler(evento) {
  const metodo = (evento.requestContext?.http?.method || evento.httpMethod || 'GET').toUpperCase();
  if (metodo === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  try {
    const tratar = await iniciar();
    const caminho = (evento.rawPath || evento.path || '/').replace(/\/+$/, '');
    const consulta = evento.queryStringParameters || {};
    const corpo = METODOS_COM_CORPO.includes(metodo) ? lerCorpo(evento) : {};
    const { status, corpo: saida } = await tratar({ metodo, caminho, consulta, corpo });
    // O Lambda pode congelar a instância antes do timer de 500 ms do store: grava na hora.
    if (metodo !== 'GET') salvarLogo();
    return resposta(status, saida);
  } catch (e) {
    const { status, corpo } = respostaDeErro(e);
    return resposta(status, corpo);
  }
}
