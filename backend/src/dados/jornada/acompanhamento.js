import { dados } from '../carga.js';

// Acompanhamento do pedido depois de confirmado: 4 etapas simuladas, com texto pronto para a tela.
// Antes de confirmar, as etapas são as telas do pedido. Nada é enviado à Prefeitura.

export const TOTAL_ETAPAS = 4;
/** Etapa em que um pedido confirmado fica até alguém avançar (simulação). */
export const ETAPA_INICIAL = 2;

const trilhaDoServico = (servico) => {
  if (servico.natureza === 'Agendamento') {
    return [
      'Pedido enviado',
      'Aguardando confirmação da unidade',
      servico.servico_id === 942 ? 'Consulta confirmada' : 'Atendimento confirmado',
      'Atendimento realizado',
    ];
  }
  return ['Pedido enviado', 'Aguardando confirmação', 'Resposta pronta', 'Pedido concluído'];
};

/** Etapa atual (1 a 4) de um pedido confirmado. */
export const etapaDoAcompanhamento = (j) => Math.min(TOTAL_ETAPAS, Math.max(1, j.acompanhamento ?? ETAPA_INICIAL));

/** Estado mostrado ao app: pedido fictício de demonstração ainda em acompanhamento aparece "em_andamento", igual à situação. */
export const estadoPublico = (j) => (j.estado === 'concluida' && String(j.jornada_id).startsWith('J-DEMO') && !acompanhamentoFinalizado(j) ? 'em_andamento' : j.estado);
/** O pedido confirmado já passou por todas as etapas? */
export const acompanhamentoFinalizado = (j) => etapaDoAcompanhamento(j) >= TOTAL_ETAPAS;

/** "seg, 16/11" a partir de "2026-11-16". */
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export function rotuloDeData(isoData) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoData));
  if (!m) return String(isoData);
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return `${DIAS[d.getUTCDay()]}, ${m[3]}/${m[2]}`;
}

const estadoDaEtapa = (i, atual, final) => (i < atual || (i === atual && final) ? 'feita' : i === atual ? 'andamento' : 'a_fazer');

/** Etapas do pedido: `{ etapas, etapa_atual, situacao, previsao }`. `telas` e `idx` vêm das telas visíveis do pedido. */
export function acompanhar(j, telas, idx) {
  const servico = dados.servicos.get(j.servico_id);
  if (j.estado === 'concluida') {
    const nomes = trilhaDoServico(servico);
    const n = etapaDoAcompanhamento(j);
    const final = n >= TOTAL_ETAPAS;
    const etapas = nomes.map((titulo, i) => ({ id: `etapa_${i + 1}`, titulo, estado: estadoDaEtapa(i + 1, n, final) }));
    let previsao = null;
    if (n === 2) previsao = 'até 2 dias úteis';
    else if (n === 3 && j.campos.data && j.campos.hora) previsao = `${rotuloDeData(j.campos.data)} às ${j.campos.hora}`;
    return {
      etapas,
      etapa_atual: { numero: n, total: TOTAL_ETAPAS, titulo: nomes[n - 1] },
      situacao: final ? 'concluido' : 'em_andamento',
      previsao,
    };
  }
  const etapas = telas.map((t, i) => ({ id: t.id, titulo: t.titulo, estado: estadoDaEtapa(i, idx, false) }));
  return {
    etapas,
    etapa_atual: { numero: idx + 1, total: telas.length, titulo: telas[idx].titulo },
    situacao: j.estado === 'cancelada' ? 'cancelado' : 'preenchendo',
    previsao: null,
  };
}
