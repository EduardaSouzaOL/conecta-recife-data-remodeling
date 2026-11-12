import { dados } from '../../dados/carga.js';
import { segmentosDe } from '../derivados.js';
import { candidatosPorRegra, categoriasSensiveis, rotuloSegmento } from '../regras.js';
import { dataBR, curto } from '../../dados/servicos.js';

// Usado no lugar do nome do serviço de origem quando ele é de saúde e o cidadão não consentiu (LGPD, art. 11).
const MOTIVO_HISTORICO_GENERICO = 'Pessoas com um perfil parecido com o seu também costumam acessar este serviço.';

function novo() {
  return { c: { regra: 0, hist: 0, pop: 0, dem: 0, rep: 0, glob: 0 }, m: {} };
}

// Etapas 1 a 4: reúne os candidatos (serviço -> pontuações parciais e motivos).
// O mapa devolvido e seus objetos são lidos e alterados depois por `pontuar` e `montarItem`.
export function reunirCandidatos(ctx, derivados) {
  const { perfil, saude, acessibilidade, consentimentoDe, hist } = ctx;

  const cand = new Map();
  const get = (sv) => { let x = cand.get(sv); if (!x) { x = novo(); cand.set(sv, x); } return x; };
  const motivo = (x, tipo, texto, peso) => { if (!x.m[tipo] || x.m[tipo].peso < peso) x.m[tipo] = { texto, peso }; };

  // 1) perfil, momento de vida e (com consentimento) saúde
  for (const r of candidatosPorRegra(perfil, saude, acessibilidade)) {
    const x = get(r.servico_id);
    if (r.score > x.c.regra) { x.c.regra = r.score; x.origemRegra = r.origem; }
    if (r.origem === 'saude' || r.origem === 'acessibilidade') (x.liberadas ||= new Set()).add(r.origem);
    motivo(x, r.origem, r.motivo, r.score);
  }

  // 2) histórico: próximo serviço provável + continuar de onde parou
  const distintos = [];
  for (let i = hist.length - 1; i >= 0 && distintos.length < 5; i--) {
    if (!distintos.some((d) => d.sv === hist[i][2])) distintos.push({ sv: hist[i][2], data: hist[i][0] });
  }
  distintos.forEach((d, i) => {
    const s = dados.servicos.get(d.sv);
    if (!s) return;
    const x = get(d.sv);
    x.c.rep = Math.max(x.c.rep, 1 - i * 0.18);
    motivo(x, 'repetir', `Você acessou este serviço em ${dataBR(d.data)}. Continue de onde parou.`, x.c.rep);
    const lista = derivados.proximo[d.sv] || [];
    const max = lista.length ? lista[0][1] : 1;
    const decaimento = [1, 0.6, 0.35][i];
    if (decaimento === undefined) return;
    // origem de saúde sem consentimento: o nome dela não pode aparecer em nenhum texto do item
    const textoHistorico = categoriasSensiveis(s).some((c) => !consentimentoDe[c])
      ? MOTIVO_HISTORICO_GENERICO
      : `Quem acessou "${curto(s.nome, 60)}" também costuma acessar este serviço.`;
    for (const [dest, w] of lista) {
      const y = get(dest);
      const parte = decaimento * (w / max);
      y.c.hist = Math.min(1, y.c.hist + parte);
      motivo(y, 'historico', textoHistorico, parte);
    }
  });

  // 3) o que pessoas parecidas mais usam (funciona sem nenhum histórico)
  const segs = segmentosDe(perfil);
  for (const sg of segs) {
    for (const [sv, score] of derivados.populares[sg] || []) {
      const x = get(sv);
      x.c.pop += score;
      if (!x.m.popular || x.m.popular.peso < score) {
        x.m.popular = { texto: `Pessoas como você também usam. É muito acessado por ${rotuloSegmento(sg)}.`, peso: score };
      }
    }
  }

  // 4) demanda em alta e base geral (para nunca ficar sem candidatos)
  for (const [sv, razao] of Object.entries(derivados.demanda)) {
    const x = get(Number(sv));
    x.c.dem = Math.min(1, (razao - 1) / 1.5);
    motivo(x, 'demanda', 'Muita gente está procurando este serviço nas últimas semanas.', x.c.dem);
  }
  const populares = [...dados.servicos.values()].filter((s) => s.nivel_digital >= 3).sort((a, b) => b.pessoas_unicas - a.pessoas_unicas).slice(0, 25);
  populares.forEach((s, i) => {
    const x = get(s.servico_id);
    x.c.glob = Math.max(x.c.glob, 1 - i * 0.03);
    motivo(x, 'geral', 'É um dos serviços mais usados no Conecta Recife.', x.c.glob * 0.3);
  });

  return cand;
}
