import {
  iniciarJornada, obterJornada, preencherJornada, confirmarJornada,
  canaisDeProblema, cancelarJornada, alterarJornada, avaliarJornada, aplicarValorDigitado, avancarPedido,
} from '../../dados/jornada/index.js';
import { desembrulhar, falhar } from '../erros.js';
import { semearPedidosDemo, DEMO_ID, PEDIDO_DEMO_ANDAMENTO, PEDIDO_DEMO_CONCLUIDO } from '../../dados/demo.js';
import { identificarCidadao, lerCampo, lerCampos, lerTela, lerConfirmar, exigirLogin } from '../entrada.js';

/** Lança o erro de domínio ou devolve `resultado[chave]`. */
const valor = (resultado, chave) => (resultado.erro ? falhar(resultado.erro, resultado.mensagem) : resultado[chave]);

/** Jornadas: pedido por etapas até o protocolo fictício. Tudo sob `/dados/jornadas`. */
export function registrarRotasJornadas(rota) {
  rota(['POST'], '/dados/jornadas', ({ corpo, consulta }) => {
    const { id } = exigirLogin(identificarCidadao(lerCampo(corpo, consulta, 'cidadao_id')));
    const r = iniciarJornada(id, lerCampo(corpo, consulta, 'servico_id'), { idempotency_key: lerCampo(corpo, consulta, 'idempotency_key') });
    let j = desembrulhar(r);
    // O que a pessoa digitou: `valor_campo` (texto ou objeto) ou `campos` (objeto). Opcional: `campo` diz qual campo recebe o texto.
    const digitado = aplicarValorDigitado(j.jornada_id, {
      campos: lerCampos(corpo),
      valor_campo: lerCampo(corpo, consulta, 'valor_campo'),
      campo: lerCampo(corpo, consulta, 'campo'),
    });
    if (digitado) j = desembrulhar(digitado);
    return r.retomada ? { ...j, retomada: true } : j;
  }, {
    area: 'motor_de_dados',
    descricao: '{"cidadao_id":"C000003","servico_id":352,"valor_campo":"texto digitado (opcional)","idempotency_key":"chave-unica (opcional)"}',
  });
  rota(['GET'], '/dados/jornadas/:id', ({ p, consulta }) => desembrulhar(obterJornada(p.id, { tela: lerTela({}, consulta) })), {
    area: 'motor_de_dados',
    descricao: 'etapa atual do pedido',
  });
  // `POST` é alias legado do `PATCH` (fora do índice por vir depois do método principal).
  rota(['PATCH', 'POST'], '/dados/jornadas/:id', ({ p, corpo, consulta }) => {
    const campos = lerCampos(corpo);
    return desembrulhar(preencherJornada(p.id, campos, { tela: lerTela(corpo, consulta) }));
  }, {
    area: 'motor_de_dados',
    descricao: '{"campos":{...}}',
  });
  rota(['POST'], '/dados/jornadas/:id/confirmar', ({ p, corpo, consulta }) => desembrulhar(confirmarJornada(p.id, lerConfirmar(corpo, consulta))), {
    area: 'motor_de_dados',
    descricao: '{"confirmar":true}',
  });
  // Relatar problema: nesta versão o app encaminha ao canal certo (serviço e Ouvidoria).
  rota(['GET'], '/dados/jornadas/:id/problema', ({ p }) => valor(canaisDeProblema(p.id), 'canais'), {
    area: 'motor_de_dados',
    descricao: 'canais para relatar problema: do serviço e da Ouvidoria',
  });
  rota(['POST'], '/dados/jornadas/:id/cancelar', ({ p }) => ({ ok: true, jornada: valor(cancelarJornada(p.id), 'jornada') }), {
    area: 'motor_de_dados',
    descricao: 'cancela o pedido em andamento (simulado)',
  });
  rota(['POST'], '/dados/jornadas/:id/alterar', ({ p }) => ({ ok: true, jornada: valor(alterarJornada(p.id), 'jornada') }), {
    area: 'motor_de_dados',
    descricao: 'reabre um pedido concluído dos serviços 352 e 942 (simulado)',
  });
  rota(['POST'], '/dados/jornadas/:id/avaliar', ({ p, corpo, consulta }) => ({
    ok: true,
    avaliacao: valor(avaliarJornada(p.id, {
      nota: lerCampo(corpo, consulta, 'nota'),
      nao_consegui: lerCampo(corpo, consulta, 'nao_consegui'),
      resolvido: lerCampo(corpo, consulta, 'resolvido'),
      comentario: lerCampo(corpo, consulta, 'comentario'),
    }), 'avaliacao'),
  }), {
    area: 'motor_de_dados',
    descricao: '{"nota":5,"resolvido":"sim|em_parte|nao","comentario":"opcional"} ou {"nao_consegui":true}, uma vez, depois de concluir',
  });

  // Demonstração ao vivo: não faz parte do fluxo real, só avança a etapa de um pedido já confirmado.
  rota(['POST'], '/demo/jornadas/:id/avancar', ({ p }) => {
    const j = desembrulhar(avancarPedido(p.id));
    return { ok: true, etapa_atual: j.etapa_atual, jornada: j };
  }, {
    area: 'demo',
    descricao: 'passa o pedido confirmado para a próxima etapa (simulado)',
  });
  // Volta os pedidos de exemplo da cidadã DEMO001 ao início, para repetir a apresentação.
  rota(['POST'], '/demo/reiniciar', () => {
    semearPedidosDemo({ refazer: true });
    return { ok: true, cidadao_id: DEMO_ID, pedidos: [PEDIDO_DEMO_ANDAMENTO, PEDIDO_DEMO_CONCLUIDO] };
  }, {
    area: 'demo',
    descricao: 'recria os 2 pedidos de exemplo da DEMO001',
  });
}
