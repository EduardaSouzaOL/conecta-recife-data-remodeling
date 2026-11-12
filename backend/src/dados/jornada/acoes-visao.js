// Quais ações o cidadão pode tocar em um pedido, já com texto e destino prontos. A tela só mostra.

/** Serviços em que "Alterar" é permitido (jornada acompanhada no card). */
export const SERVICOS_ALTERAVEIS = new Set([352, 942]);

const api = (metodo, j, parte) => ({ tipo: 'api', metodo, caminho: `/dados/jornadas/${j.jornada_id}/${parte}` });

/** Ações permitidas pelo estado do pedido. Sem chat. */
export function acoesDisponiveis(j) {
  const acoes = [{ id: 'problema', rotulo: 'Relatar problema', rotulo_leitor: 'Relatar um problema com este pedido', acao: api('GET', j, 'problema') }];
  if (j.estado === 'em_andamento') {
    acoes.push({ id: 'cancelar', rotulo: 'Cancelar pedido', rotulo_leitor: 'Cancelar este pedido', acao: api('POST', j, 'cancelar') });
  }
  if (j.estado === 'concluida') {
    if (SERVICOS_ALTERAVEIS.has(j.servico_id)) {
      acoes.push({ id: 'alterar', rotulo: 'Alterar pedido', rotulo_leitor: 'Alterar este pedido', acao: api('POST', j, 'alterar') });
    }
    if (!j.avaliacao) {
      acoes.push({
        id: 'avaliar', rotulo: 'Avaliar o serviço', rotulo_leitor: 'Dar uma nota para este serviço', acao: api('POST', j, 'avaliar'),
        opcoes: [1, 2, 3, 4, 5].map((n) => ({ nota: n, rotulo: String(n), rotulo_leitor: `Nota ${n} de 5` }))
          .concat([{ nao_consegui: true, rotulo: 'Não consegui', rotulo_leitor: 'Não consegui usar o serviço' }]),
      });
    }
  }
  return acoes;
}
