import { eventos, registrarEvento } from '../../dados/store.js';
import { identificarCidadao, lerTipoDeEvento } from '../entrada.js';

// Eventos que o cliente (Kodiak) pode registrar. Os da jornada e da vitrine o servidor registra sozinho.
export const EVENTOS_PERMITIDOS = new Set(['tela_pulada', 'erro_entendimento', 'vitrine_vista', 'servico_aberto']);

/** Eventos de uso para medir o protótipo. Tudo sob `/dados/eventos`. */
export function registrarRotasEventos(rota) {
  rota(['POST'], '/dados/eventos', ({ corpo }) => {
    const { id } = identificarCidadao(corpo.cidadao_id);
    const tipo = lerTipoDeEvento(corpo, EVENTOS_PERMITIDOS);
    registrarEvento(id, tipo, corpo.servico_id ? { servico_id: Number(corpo.servico_id) } : {});
    return { ok: true };
  }, {
    area: 'motor_de_dados',
    descricao: '{"cidadao_id":"C000003","tipo":"servico_aberto","servico_id":352}',
  });
  rota(['GET'], '/dados/eventos/resumo', () => {
    const porTipo = {};
    for (const e of eventos) porTipo[e.tipo] = (porTipo[e.tipo] || 0) + 1;
    return { total: eventos.length, por_tipo: porTipo };
  }, {
    area: 'motor_de_dados',
    descricao: 'contagem por tipo',
  });
}
