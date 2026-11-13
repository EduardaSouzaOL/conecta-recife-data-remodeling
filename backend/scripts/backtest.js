// Backtest do motor real (montarVitrine): treino até 31/08/2026, teste em setembro.
// Métrica: acerto@10 do primeiro serviço NOVO usado em setembro (serviço já usado não conta).
// Uso: node scripts/backtest.js [amostra=4000] ['{"hist":0.5,"pop":2}' ...]  (cada JSON é uma variante de pesos)
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'bt-')); // não sobrescreve data/derivados.json
const { carregarDados, dados } = await import('../src/dados/carga.js');
const { construirDerivados } = await import('../src/recomendacao/derivados.js');
const { montarVitrine } = await import('../src/recomendacao/vitrine.js');
const { ajusteDePesos } = await import('../src/recomendacao/vitrine/pontuacao.js');

const CORTE = '2026-08-31';
const amostra = Number(process.argv[2] || 4000);
const variantes = process.argv.slice(3).map((s) => JSON.parse(s));
if (!variantes.length) variantes.push({});

await carregarDados();

// separa treino e teste
const alvo = new Map(); // id -> primeiro serviço novo em setembro
const treino = new Map();
for (const [id, reg] of dados.historico) {
  const tr = reg.filter((r) => r[0] <= CORTE);
  const te = reg.filter((r) => r[0] > CORTE);
  if (tr.length) treino.set(id, tr);
  const usados = new Set(tr.map((r) => r[2]));
  const novo = te.find((r) => !usados.has(r[2]));
  if (novo) alvo.set(id, novo[2]);
}
dados.historico = treino;
const derivados = await construirDerivados({ incluirVisitas: false });

// amostra determinística de quem usou serviço novo em setembro
const ids = [...alvo.keys()].sort();
const passo = Math.max(1, Math.floor(ids.length / amostra));
const teste = ids.filter((_, i) => i % passo === 0).slice(0, amostra);
console.log(`[backtest] com alvo: ${ids.length}; amostra: ${teste.length}`);

// variante "ranking do arquivo": passe '{"arquivo":true,"k":20,"beta":0.3}'
const { construirRanking } = await import('../src/recomendacao/ranking-arquivo.js');
for (const v of variantes) {
  if (v.arquivo) {
    const rk = construirRanking(derivados, v);
    let ac = 0;
    for (const id of teste) if (rk.sugerir(id, 10).includes(alvo.get(id))) ac++;
    console.log(`[backtest] arquivo ${JSON.stringify(v)} acerto@10=${((100 * ac) / teste.length).toFixed(1)}%`);
    continue;
  }
  Object.assign(ajusteDePesos, { regra: 1, hist: 1, pop: 1, dem: 1, rep: 1, glob: 1 }, v);
  let acertos = 0; let acertosSemHist = 0; let semHist = 0;
  for (const id of teste) {
    const usados = new Set((dados.historico.get(id) || []).map((r) => r[2]));
    const vit = montarVitrine(id, derivados, { limite: 30 });
    const top = vit.itens.filter((i) => !usados.has(i.servico_id)).slice(0, 10).map((i) => i.servico_id);
    const ok = top.includes(alvo.get(id));
    if (ok) acertos++;
    if (usados.size <= 2) { semHist++; if (ok) acertosSemHist++; }
  }
  const pct = (a, b) => (b ? ((100 * a) / b).toFixed(1) : '-');
  console.log(`[backtest] pesos=${JSON.stringify(v)} acerto@10=${pct(acertos, teste.length)}% ` +
    `(pouco histórico: ${pct(acertosSemHist, semHist)}% de ${semHist})`);
}
fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true });
