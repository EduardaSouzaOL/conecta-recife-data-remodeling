import { iniciarJornada, obterJornada, preencherJornada, confirmarJornada } from '../../dados/jornada/index.js';
import { desembrulhar } from '../erros.js';
import { identificarCidadao, lerCampo, lerCampos, lerTela, lerConfirmar } from '../entrada.js';

/** Jornadas: pedido por etapas até o protocolo fictício. Tudo sob `/dados/jornadas`. */
export function registrarRotasJornadas(rota) {
  rota(['POST'], '/dados/jornadas', ({ corpo, consulta }) => {
    const { id } = identificarCidadao(lerCampo(corpo, consulta, 'cidadao_id'));
    const r = iniciarJornada(id, lerCampo(corpo, consulta, 'servico_id'));
    const j = desembrulhar(r);
    return r.retomada ? { ...j, retomada: true } : j;
  }, {
    area: 'motor_de_dados',
    descricao: '{"cidadao_id":"C000003","servico_id":352}',
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
}
