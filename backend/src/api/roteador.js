import { falhar } from './erros.js';

const segmentos = (padrao) => padrao.split('/').filter(Boolean);
const ehParam = (s) => s.startsWith(':');

/** Ordem de especificidade: menos segmentos primeiro; no mesmo tamanho, segmento literal antes de `:param`. Empate = 0. */
function compararEspecificidade(a, b) {
  if (a.segs.length !== b.segs.length) return a.segs.length - b.segs.length;
  for (let i = 0; i < a.segs.length; i++) {
    const pa = ehParam(a.segs[i]);
    const pb = ehParam(b.segs[i]);
    if (pa !== pb) return pa ? 1 : -1;
  }
  return 0;
}

/** Decodifica um trecho do caminho; `%` inválido vira 400 `caminho_invalido` (nunca 500). */
function decodificar(valor) {
  try {
    return decodeURIComponent(valor);
  } catch (e) {
    if (e instanceof URIError) falhar('caminho_invalido', 'O endereço tem um trecho inválido. Confira o caminho e tente de novo.');
    throw e;
  }
}

/**
 * Roteador mínimo. `rota(['GET'], '/x/:id', fn)` registra; `tratar({metodo, caminho, consulta, corpo})`
 * devolve `{ status, corpo }` ou lança ErroHttp (via falhar) (404 rota, 405 método, 400 caminho inválido).
 *
 * O resultado não depende da ordem de registro: rotas fixas vêm antes das parametrizadas; empate mantém
 * a ordem de registro. Padrões equivalentes (mesma forma) com método em comum lançam erro ao registrar.
 */
export function criarRoteador() {
  const rotas = [];
  let ordem = 0;
  const rota = (metodos, padrao, fn, doc) => {
    const segs = segmentos(padrao);
    const forma = segs.map((s) => (ehParam(s) ? ':' : s)).join('/');
    const repetida = rotas.find((r) => r.forma === forma && r.metodos.some((m) => metodos.includes(m)));
    if (repetida) throw new Error(`Rota duplicada: "${padrao}" equivale a "${repetida.padrao}" com método em comum.`);
    const chaves = [];
    const re = new RegExp('^' + padrao.replace(/:(\w+)/g, (_, k) => { chaves.push(k); return '([^/]+)'; }) + '/?$');
    const nova = { metodos, padrao, segs, forma, re, chaves, fn, doc, ordem: ordem++ };
    // Inserção estável: depois de todas as rotas que não são mais específicas que a nova.
    let i = rotas.length;
    while (i > 0 && compararEspecificidade(nova, rotas[i - 1]) < 0) i--;
    rotas.splice(i, 0, nova);
  };
  async function tratar({ metodo, caminho, consulta = {}, corpo }) {
    let caminhoExiste = false;
    for (const r of rotas) {
      const m = r.re.exec(caminho);
      if (!m) continue;
      caminhoExiste = true;
      if (!r.metodos.includes(metodo)) continue;
      const p = {};
      r.chaves.forEach((k, i) => { p[k] = decodificar(m[i + 1]); });
      return { status: 200, corpo: await r.fn({ p, consulta, corpo: corpo || {} }) };
    }
    if (caminhoExiste) falhar('metodo_nao_permitido', 'Método não permitido nesta rota.');
    falhar('rota_nao_encontrada', 'Rota não encontrada.');
  }
  /** Rotas registradas, na ordem de resolução. `ordem` é a posição de registro (usada para ordenar o índice). */
  const listar = () => rotas.map(({ metodos, padrao, doc, ordem }) => ({ metodos, padrao, doc, ordem }));
  return { rota, tratar, rotas: listar };
}
