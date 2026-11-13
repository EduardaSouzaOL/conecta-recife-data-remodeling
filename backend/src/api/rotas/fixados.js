import { dados } from '../../dados/carga.js';
import { definirFixado, listarFixados, registrarEvento, FIXADOS_MAX } from '../../dados/store.js';
import { falhar } from '../erros.js';
import { identificarCidadao, exigirLogin } from '../entrada.js';

const resposta = (id, fixados) => ({ cidadao_id: id, fixados, limite: FIXADOS_MAX });

/** Serviços fixados nos atalhos. Só GET e POST, sob `/dados/fixados`. */
export function registrarRotasFixados(rota) {
  rota(['GET'], '/dados/fixados/:id', ({ p }) => {
    const { id } = identificarCidadao(p.id);
    return resposta(id, listarFixados(id));
  }, {
    area: 'motor_de_dados',
    descricao: 'serviços fixados nos atalhos do cidadão',
  });
  rota(['POST'], '/dados/fixados/:id', ({ p, corpo }) => {
    const { id } = exigirLogin(identificarCidadao(p.id));
    if (typeof corpo.fixar !== 'boolean') falhar('fixar_invalido', 'Informe "fixar" como true ou false.');
    const bruto = corpo.servico_id;
    const servicoId = typeof bruto === 'number' || (typeof bruto === 'string' && /^\d+$/.test(bruto.trim())) ? Number(bruto) : NaN;
    if (!Number.isInteger(servicoId)) falhar('fixar_invalido', 'Informe o número do serviço em "servico_id".');
    if (!dados.servicos.has(servicoId)) falhar('servico_nao_encontrado', `Não encontramos o serviço ${servicoId}.`);
    const r = definirFixado(id, servicoId, corpo.fixar);
    if (r.limite_atingido) falhar('limite_de_fixados', `Você já fixou ${FIXADOS_MAX} serviços. Remova um para fixar outro.`);
    if (r.mudou) registrarEvento(id, corpo.fixar ? 'servico_fixado' : 'servico_desafixado', { servico_id: servicoId });
    return resposta(id, r.fixados);
  }, {
    area: 'motor_de_dados',
    descricao: '{"servico_id":216,"fixar":true} fixa (ou desafixa com false) um serviço nos atalhos, até 6',
  });
}
