import { dados } from '../../dados/carga.js';
import { categoriasSensiveis } from '../regras.js';

// Serviços restritos a um público que o cidadão precisa ter para fazer sentido na vitrine.
const PUBLICOS_RESTRITOS = {
  'Servidor público municipal': (p) => p.servidor_publico,
  'Taxista': () => false,
  'Permissionário': () => false,
  'Condutor de transporte complementar': () => false,
  'Condutor de transporte coletivo escolar': () => false,
  'Profissional de saúde': () => false,
  'Organização do terceiro setor': () => false,
  'Investidor': () => false,
  'Turista': () => false,
  'Folião': () => false,
};

function publicoCompativel(servico, perfil) {
  const pubs = servico.publicos;
  if (!pubs.length || pubs.includes('População em geral')) return true;
  const generico = pubs.filter((x) => !(x in PUBLICOS_RESTRITOS));
  if (generico.length) return true;
  return pubs.some((x) => PUBLICOS_RESTRITOS[x](perfil));
}

// Multiplicadores dos pesos (padrão 1). Usados pelo backtest para calibrar; a API não os altera.
export const ajusteDePesos = { regra: 1, hist: 1, pop: 1, dem: 1, rep: 1, glob: 1 };

const JA_TEM_CADUNICO = new Set([1032]);
const JA_TEM_BOLSA = new Set([995, 1032]);

// Aplica pesos e filtros (público, Cadastro Único, Bolsa Família, categorias sensíveis) e ordena por pontuação.
export function pontuar(cand, ctx) {
  const { perfil, hist } = ctx;

  // normalizações e pesos
  let maxPop = 0;
  for (const x of cand.values()) maxPop = Math.max(maxPop, x.c.pop);
  const wh = Math.min(1, hist.length / 6);
  const a = ajusteDePesos;
  const pesos = {
    regra: 1.0 * a.regra, hist: 0.9 * wh * a.hist, pop: 0.55 * (1 - 0.4 * wh) * a.pop,
    dem: 0.25 * a.dem, rep: (wh > 0 ? 0.45 : 0) * a.rep, glob: 0.18 * a.glob,
  };

  const pontuados = [];
  for (const [sv, x] of cand) {
    const s = dados.servicos.get(sv);
    if (!s) continue;
    // saúde e deficiência só via regra, com o consentimento da respectiva categoria
    const categorias = categoriasSensiveis(s);
    if (categorias.length && !categorias.some((c) => x.liberadas?.has(c))) continue;
    if (!x.c.regra && !publicoCompativel(s, perfil)) continue;
    if (JA_TEM_CADUNICO.has(sv) && perfil.cadastro_unico) continue; // não sugerir inscrição a quem já está inscrito
    if (JA_TEM_BOLSA.has(sv) && perfil.bolsa_familia) continue;
    if (s.natureza === 'Informativo' && !x.c.regra && !x.c.hist && !x.c.rep) continue;
    const comp = { regra: x.c.regra, hist: x.c.hist, pop: maxPop ? Math.min(1, x.c.pop / maxPop) : 0, dem: x.c.dem, rep: x.c.rep, glob: x.c.glob };
    let total = 0; let melhor = null; let melhorV = -1;
    const contrib = {};
    for (const k of Object.keys(comp)) {
      const v = comp[k] * pesos[k];
      contrib[k] = v; total += v;
      if (v > melhorV) { melhorV = v; melhor = k; }
    }
    if (total <= 0) continue;
    if (x.liberadas?.size) total += 0.3; // autorizado pelo cidadão: aparece entre os primeiros
    else if (s.nivel_digital === null || s.nivel_digital <= 1) total *= 0.8;
    if (s.natureza === 'A classificar') total *= 0.85;
    pontuados.push({ sv, s, x, total, melhor, contrib });
  }
  pontuados.sort((a, b) => b.total - a.total);
  return pontuados;
}
