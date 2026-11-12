import fs from 'node:fs';
import path from 'node:path';
import { lerCsv } from '../dados/csv.js';
import { dados, compararAcessos, DIR_BD, DIR_DATA, FLAGS_PERFIL } from '../dados/carga.js';

const ARQ = path.join(DIR_DATA, 'derivados.json');
const VERSAO = 2;

/** Segmentos "não sensíveis" de um cidadão. Saúde NUNCA entra aqui. */
export function segmentosDe(p) {
  const s = [`faixa:${p.faixa_etaria}`, `sexo:${p.sexo}`, `rpa:${p.rpa}`];
  for (const k of FLAGS_PERFIL) if (k !== 'aceita_notificacao' && p[k]) s.push(`flag:${k}`);
  if (p.situacao_renda) s.push(`renda:${p.situacao_renda}`);
  if (p.criancas_na_familia && p.criancas_na_familia !== 'nenhuma') s.push(`criancas:${p.criancas_na_familia}`);
  return s;
}

function somar(mapa, a, b, peso) {
  let m = mapa.get(a);
  if (!m) { m = new Map(); mapa.set(a, m); }
  m.set(b, (m.get(b) || 0) + peso);
}

function topK(mapa, k) {
  const out = {};
  for (const [a, m] of mapa) {
    out[a] = [...m.entries()].sort((x, y) => y[1] - x[1]).slice(0, k).map(([b, w]) => [b, Math.round(w * 10) / 10]);
  }
  return out;
}

/** Pré-calcula próximo serviço, populares por segmento e picos de demanda. */
export async function construirDerivados({ incluirVisitas = true } = {}) {
  const t0 = Date.now();
  const trans = new Map();
  const par = (a, b, mesmaSessao, peso) => { if (a !== b) somar(trans, a, b, mesmaSessao ? peso : peso * 0.5); };

  // 1) sequências de quem tem login
  for (const reg of dados.historico.values()) {
    for (let i = 1; i < reg.length; i++) par(reg[i - 1][2], reg[i][2], reg[i - 1][3] === reg[i][3], 1);
  }
  // 2) sequências sem login (apenas agregado, nunca ligado a um cidadão)
  let visitas = 0;
  if (incluirVisitas) {
    const arq = path.join(DIR_BD, 'visitas_sem_login.csv');
    if (fs.existsSync(arq)) {
      // O arquivo vem agrupado por visitante, mas a ordem dentro do grupo não é confiável:
      // cada visitante é ordenado por data, hora, sessão e ordem_na_sessao antes de formar os pares.
      let atual = null;
      let grupo = [];
      const vistos = new Set();
      const fechar = () => {
        grupo.sort(compararAcessos);
        for (let i = 1; i < grupo.length; i++) par(grupo[i - 1][2], grupo[i][2], grupo[i - 1][3] === grupo[i][3], 1);
        grupo = [];
      };
      await lerCsv(arq, (r) => {
        if (r.visitante_id !== atual) {
          fechar();
          if (vistos.has(r.visitante_id)) throw new Error(`visitas_sem_login.csv: ${r.visitante_id} aparece em mais de um trecho. O arquivo precisa vir agrupado por visitante.`);
          vistos.add(r.visitante_id);
          atual = r.visitante_id;
        }
        grupo.push([r.data, r.hora, Number(r.servico_id), r.sessao_id, Number(r.ordem_na_sessao)]);
        visitas++;
      });
      fechar();
    }
  }

  // 3) populares por segmento (pessoas únicas por serviço) e lift
  const global = new Map();
  const porSeg = new Map();
  const tamSeg = new Map();
  for (const [id, reg] of dados.historico) {
    const c = dados.cidadaos.get(id);
    if (!c) continue;
    const unicos = new Set(reg.map((x) => x[2]));
    const segs = segmentosDe(c.perfil);
    for (const sv of unicos) global.set(sv, (global.get(sv) || 0) + 1);
    for (const sg of segs) {
      tamSeg.set(sg, (tamSeg.get(sg) || 0) + 1);
      for (const sv of unicos) somar(porSeg, sg, sv, 1);
    }
  }
  const N = dados.historico.size;
  const populares = {};
  for (const [sg, m] of porSeg) {
    const n = tamSeg.get(sg);
    const itens = [];
    for (const [sv, cont] of m) {
      if (cont < 15) continue;
      const lift = (cont / n) / (global.get(sv) / N);
      if (lift < 1.4) continue;
      itens.push([sv, Math.round((cont / n) * (lift - 1) * 1000) / 1000, Math.round(lift * 100) / 100]);
    }
    itens.sort((a, b) => b[1] - a[1]);
    populares[sg] = itens.slice(0, 30);
  }

  // 4) demanda: últimas 4 semanas vs. 8 anteriores
  const semanas = [...new Set(dados.usoSemanal.map((u) => u.semana))].sort();
  const rec = new Set(semanas.slice(-4));
  const ant = new Set(semanas.slice(-12, -4));
  const acRec = new Map(); const acAnt = new Map();
  for (const u of dados.usoSemanal) {
    if (rec.has(u.semana)) acRec.set(u.servico_id, (acRec.get(u.servico_id) || 0) + u.cliques);
    else if (ant.has(u.semana)) acAnt.set(u.servico_id, (acAnt.get(u.servico_id) || 0) + u.cliques);
  }
  const demanda = {};
  for (const [sv, r] of acRec) {
    const a = (acAnt.get(sv) || 0) / 2; // 8 semanas -> equivalente a 4
    if (r < 40) continue;
    const razao = a > 0 ? r / a : 3;
    if (razao >= 1.25) demanda[sv] = Math.round(Math.min(razao, 3) * 100) / 100;
  }

  const out = {
    versao: VERSAO,
    gerado_em: new Date().toISOString(),
    semana_ref: semanas[semanas.length - 1] || null,
    proximo: topK(trans, 12),
    populares,
    demanda,
    stats: { visitas_lidas: visitas, cidadaos_com_historico: N },
  };
  fs.mkdirSync(DIR_DATA, { recursive: true });
  fs.writeFileSync(ARQ, JSON.stringify(out));
  console.log(`[derivados] gerados em ${Date.now() - t0} ms (visitas lidas: ${visitas})`);
  return out;
}

export async function carregarDerivados() {
  if (fs.existsSync(ARQ)) {
    try {
      const d = JSON.parse(fs.readFileSync(ARQ, 'utf8'));
      if (d.versao === VERSAO) return d;
    } catch { /* regenera */ }
  }
  return construirDerivados();
}
