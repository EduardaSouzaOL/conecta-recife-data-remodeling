// Quais ações o cidadão pode tocar em um pedido, já com texto e destino prontos. A tela só mostra.

/** Serviços em que "Alterar" é permitido (jornada acompanhada no card). */
export const SERVICOS_ALTERAVEIS = new Set([352, 942]);

const api = (metodo, j, parte) => ({ tipo: 'api', metodo, caminho: `/dados/jornadas/${j.jornada_id}/${parte}` });

import { acompanhamentoFinalizado } from './acompanhamento.js';

/**
 * Cancelar vale para pedido em andamento. Pedido confirmado só pode ser cancelado se estiver em
 * acompanhamento (etapa definida pela demonstração) e ainda não tiver chegado ao fim.
 */
export const podeCancelar = (j) => j.estado === 'em_andamento'
  || (j.estado === 'concluida' && j.acompanhamento !== undefined && !acompanhamentoFinalizado(j));

/** Ações permitidas pelo estado do pedido. Sem chat. */
export function acoesDisponiveis(j) {
  const acoes = [{ id: 'problema', rotulo: 'Relatar problema', rotulo_leitor: 'Relatar um problema com este pedido', acao: api('GET', j, 'problema') }];
  if (podeCancelar(j)) {
    acoes.push({ id: 'cancelar', rotulo: 'Cancelar pedido', rotulo_leitor: 'Cancelar este pedido', acao: api('POST', j, 'cancelar') });
  }
  if (j.estado === 'concluida') {
    if (SERVICOS_ALTERAVEIS.has(j.servico_id)) {
      acoes.push({ id: 'alterar', rotulo: 'Alterar pedido', rotulo_leitor: 'Alterar este pedido', acao: api('POST', j, 'alterar') });
    }
    // Pedido em acompanhamento só pode ser avaliado quando chegar à última etapa.
    if (!j.avaliacao && (j.acompanhamento === undefined || acompanhamentoFinalizado(j))) {
      acoes.push({
        id: 'avaliar', rotulo: 'Avaliar o serviço', rotulo_leitor: 'Dar uma nota para este serviço', acao: api('POST', j, 'avaliar'),
        opcoes: [1, 2, 3, 4, 5].map((n) => ({ nota: n, rotulo: String(n), rotulo_leitor: `Nota ${n} de 5` }))
          .concat([{ nao_consegui: true, rotulo: 'Não consegui', rotulo_leitor: 'Não consegui usar o serviço' }]),
      });
    }
  }
  return acoes;
}
