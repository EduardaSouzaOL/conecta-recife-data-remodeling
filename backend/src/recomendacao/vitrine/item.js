import { temJornada, curto } from '../../dados/servicos.js';
import { TAGS } from './textos.js';

export function montarItem(p, posicao) {
  const m = p.x.m;
  let tipo;
  if (p.melhor === 'regra') tipo = p.x.origemRegra;
  else if (p.melhor === 'hist') tipo = 'historico';
  else if (p.melhor === 'rep') tipo = 'repetir';
  else if (p.melhor === 'pop') tipo = 'popular';
  else if (p.melhor === 'dem') tipo = 'demanda';
  else tipo = 'geral';
  const principal = m[tipo] || m.geral;
  const outros = Object.entries(m)
    .filter(([k]) => k !== tipo && k !== 'geral' && (p.x.c.regra || k !== 'geral'))
    .sort((a, b) => b[1].peso - a[1].peso).slice(0, 1).map(([, v]) => v.texto);
  return {
    posicao,
    servico_id: p.sv,
    titulo: curto(p.s.nome),
    nome: p.s.nome,
    orgao: p.s.orgao_sigla,
    tema: p.s.temas[0] || null,
    tipo_servico: p.s.natureza,
    digital: p.s.nivel_digital !== null && p.s.nivel_digital >= 3,
    jornada_disponivel: temJornada(p.s),
    origem: tipo,
    tag: TAGS[tipo],
    motivo: principal.texto,
    outros_motivos: outros,
  };
}
