import fs from 'node:fs';
import path from 'node:path';
import { DIR_DATA } from './carga.js';

// Estado do protótipo (consentimentos, jornadas, eventos). Arquivo JSON simples, sem dado pessoal real.
const ARQ = path.join(DIR_DATA, 'estado.json');

// Os quatro objetos abaixo são criados uma vez e NUNCA trocados: o resto do código guarda a referência
// deles, e `salvarLogo` serializa os mesmos objetos. Recarregar o arquivo só preenche o conteúdo.
// Sem protótipo: ids como "constructor" ou "toString" não acham propriedades herdadas.
const estado = { consentimentos: Object.create(null), jornadas: Object.create(null), preferencias: Object.create(null), fixados: Object.create(null), eventos: [] };
let timer = null;

const ehObjetoSimples = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function esvaziar(alvo) {
  for (const k of Object.keys(alvo)) delete alvo[k];
}

export function carregarEstado() {
  let texto;
  try {
    texto = fs.readFileSync(ARQ, 'utf8');
  } catch {
    return; // primeira execução: arquivo ausente
  }
  carregarEstadoDeTexto(texto);
}

/** Estado serializado (o mesmo conteúdo de estado.json). Usado para compartilhar entre instâncias do Lambda. */
export const estadoComoTexto = () => JSON.stringify(estado);

/** Recarrega o estado a partir do texto JSON, no lugar (as referências exportadas continuam valendo). */
export function carregarEstadoDeTexto(texto) {
  if (!texto || !texto.trim()) return; // arquivo vazio
  let lido;
  try {
    lido = JSON.parse(texto);
  } catch (e) {
    console.warn(`[store] ${path.basename(ARQ)} inválido, iniciando com estado vazio: ${e.message}`);
    return;
  }
  if (!ehObjetoSimples(lido)) {
    console.warn(`[store] ${path.basename(ARQ)} com formato inesperado, iniciando com estado vazio.`);
    return;
  }
  // Recarga no lugar. Campo com tipo errado vira vazio.
  esvaziar(estado.consentimentos);
  esvaziar(estado.jornadas);
  esvaziar(estado.preferencias);
  esvaziar(estado.fixados);
  estado.eventos.length = 0;
  if (ehObjetoSimples(lido.consentimentos)) Object.assign(estado.consentimentos, lido.consentimentos);
  if (ehObjetoSimples(lido.jornadas)) Object.assign(estado.jornadas, lido.jornadas);
  if (ehObjetoSimples(lido.preferencias)) Object.assign(estado.preferencias, lido.preferencias);
  if (ehObjetoSimples(lido.fixados)) Object.assign(estado.fixados, lido.fixados);
  if (Array.isArray(lido.eventos)) for (const e of lido.eventos) estado.eventos.push(e); // laço: evita estourar a pilha com spread
}

export function salvarLogo() {
  clearTimeout(timer);
  timer = null;
  fs.mkdirSync(DIR_DATA, { recursive: true });
  fs.writeFileSync(ARQ + '.tmp', JSON.stringify(estado));
  fs.renameSync(ARQ + '.tmp', ARQ);
}

export function salvar() {
  if (timer) return;
  timer = setTimeout(() => { timer = null; try { salvarLogo(); } catch (e) { console.error('[store]', e.message); } }, 500);
  timer.unref?.();
}

export const consentimentos = estado.consentimentos; // { [cidadao_id]: [{finalidade,status,ts}] }
export const jornadas = estado.jornadas; // { [jornada_id]: {...} }
export const preferencias = estado.preferencias; // { [cidadao_id]: { personalizar?: false, dispensados?: [servico_id] } }
export const fixados = estado.fixados; // { [cidadao_id]: [servico_id] } em ordem de fixação, até FIXADOS_MAX
export const eventos = estado.eventos; // [{cidadao_id,tipo,ts,...}]

export const FIXADOS_MAX = 6;

/** Fixados do cidadão (cópia), em ordem de fixação. Só ids de serviço, sem dado sensível. */
export function listarFixados(cidadao_id) {
  const l = fixados[cidadao_id];
  return Array.isArray(l) ? l.filter((n) => Number.isInteger(n)) : [];
}

/**
 * Fixa ou desafixa. Idempotente: só muda o estado (e só então devolve `mudou: true`) quando necessário.
 * Com FIXADOS_MAX fixados, fixar outro devolve `{ limite_atingido: true }` sem alterar nada.
 */
export function definirFixado(cidadao_id, servico_id, fixar) {
  const atual = listarFixados(cidadao_id);
  const pos = atual.indexOf(servico_id);
  if (fixar) {
    if (pos >= 0) return { mudou: false, fixados: atual };
    if (atual.length >= FIXADOS_MAX) return { limite_atingido: true, mudou: false, fixados: atual };
    atual.push(servico_id);
  } else {
    if (pos < 0) return { mudou: false, fixados: atual };
    atual.splice(pos, 1);
  }
  fixados[cidadao_id] = atual;
  salvar();
  return { mudou: true, fixados: atual.slice() };
}

const EVENTOS_MAX_PADRAO = 50000;

/** Limite de eventos guardados. Lido a cada chamada (EVENTOS_MAX); valor ausente ou inválido usa o padrão. */
export function limiteEventos() {
  const n = Number(process.env.EVENTOS_MAX);
  return Number.isInteger(n) && n > 0 ? n : EVENTOS_MAX_PADRAO;
}

let avisouLimite = false;
export function registrarEvento(cidadao_id, tipo, extra = {}) {
  eventos.push({ cidadao_id, tipo, ts: new Date().toISOString(), ...extra });
  const max = limiteEventos();
  if (eventos.length > max) {
    if (!avisouLimite) {
      avisouLimite = true;
      console.warn(`[store] limite de ${max} eventos atingido; os mais antigos serão descartados (EVENTOS_MAX).`);
    }
    eventos.splice(0, eventos.length - max);
  }
  salvar();
}
