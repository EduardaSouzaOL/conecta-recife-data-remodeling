import { detalheServico } from '../../dados/servicos.js';
import { falhar } from '../erros.js';

/** Serviços: detalhe de um serviço do catálogo. Tudo sob `/dados/servicos`. */
export function registrarRotasServicos(rota) {
  rota(['GET'], '/dados/servicos/:id', ({ p }) => {
    const d = detalheServico(p.id);
    if (!d) falhar('servico_nao_encontrado', 'Não encontramos esse serviço.');
    return d;
  }, {
    area: 'motor_de_dados',
    descricao: 'detalhe do serviço',
  });
}
