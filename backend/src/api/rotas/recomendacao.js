import { montarVitrine } from '../../recomendacao/vitrine.js';
import { registrarEvento } from '../../dados/store.js';
import { identificarCidadao, lerLimite } from '../entrada.js';

/** Motor de recomendação: a lista personalizada, com motivo em cada item. Tudo sob `/recomendacao`. */
export function registrarRotasRecomendacao(rota, derivados) {
  // `POST` é alias legado do `GET`.
  rota(['GET', 'POST'], '/recomendacao/:id', ({ p, consulta, corpo }) => {
    const { id } = identificarCidadao(p.id);
    const limite = lerLimite(corpo, consulta);
    registrarEvento(id, 'vitrine_vista');
    return montarVitrine(id, derivados, { limite });
  }, {
    area: 'motor_de_recomendacao',
    descricao: 'serviços sugeridos com motivo, base da personalização e convites de consentimento',
    consulta: '?limite=8',
  });
}
