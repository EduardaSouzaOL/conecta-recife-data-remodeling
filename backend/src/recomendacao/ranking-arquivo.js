import { dados } from '../dados/carga.js';

// Ranqueador do recomendacoes.csv, otimizado para "primeiro serviço NOVO entre as 10 sugestões".
// Usa só marcadores não sensíveis (faixa, sexo, Cadastro Único, pet). Saúde nunca entra.
const chaveDe = (p) => `${p.faixa_etaria}|${p.sexo}|${p.cadastro_unico ? 1 : 0}|${p.tutor_animal ? 1 : 0}`;
const chaveLarga = (p) => `${p.faixa_etaria}`;

export function construirRanking(derivados, { k = 20, beta = 2, kLarga = 50 } = {}) {
  const glob = new Map(); const seg = new Map(); const larga = new Map(); const tam = new Map(); const tamL = new Map();
  let N = 0;
  const inc = (m, a, b) => { let x = m.get(a); if (!x) { x = new Map(); m.set(a, x); } x.set(b, (x.get(b) || 0) + 1); };
  for (const [id, reg] of dados.historico) {
    const c = dados.cidadaos.get(id);
    if (!c) continue;
    N++;
    const ks = chaveDe(c.perfil); const kl = chaveLarga(c.perfil);
    tam.set(ks, (tam.get(ks) || 0) + 1); tamL.set(kl, (tamL.get(kl) || 0) + 1);
    for (const sv of new Set(reg.map((r) => r[2]))) {
      glob.set(sv, (glob.get(sv) || 0) + 1);
      inc(seg, ks, sv); inc(larga, kl, sv);
    }
  }
  const pGlob = (sv) => (glob.get(sv) || 0) / N;
  const candidatos = [...glob.keys()];

  function sugerir(id, limite = 10) {
    const c = dados.cidadaos.get(id);
    const p = c.perfil;
    const hist = dados.historico.get(id) || [];
    const usados = new Set(hist.map((r) => r[2]));
    const ks = chaveDe(p); const kl = chaveLarga(p);
    const n = tam.get(ks) || 0; const nl = tamL.get(kl) || 0;
    const sm = seg.get(ks); const lm = larga.get(kl);
    const pontos = new Map();
    for (const sv of candidatos) {
      if (usados.has(sv)) continue;
      const base = pGlob(sv);
      const pl = ((lm?.get(sv) || 0) + kLarga * base) / (nl + kLarga);
      const ps = ((sm?.get(sv) || 0) + k * pl) / (n + k);
      pontos.set(sv, ps);
    }
    if (beta > 0 && hist.length) {
      const ultimos = []; // últimos serviços distintos, mais recente primeiro
      for (let i = hist.length - 1; i >= 0 && ultimos.length < 3; i--) if (!ultimos.includes(hist[i][2])) ultimos.push(hist[i][2]);
      ultimos.forEach((sv0, i) => {
        const lista = derivados.proximo[sv0] || [];
        const max = lista.length ? lista[0][1] : 1;
        for (const [dest, w] of lista) {
          if (!pontos.has(dest)) continue;
          pontos.set(dest, pontos.get(dest) + beta * 0.1 * [1, 0.6, 0.35][i] * (w / max));
        }
      });
    }
    return [...pontos.entries()].sort((a, b) => b[1] - a[1]).slice(0, limite).map(([sv]) => sv);
  }
  return { sugerir };
}
