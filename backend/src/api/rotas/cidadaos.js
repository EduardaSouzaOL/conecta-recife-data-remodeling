import { listarJornadas } from '../../dados/jornada/index.js';
import { entrarComo, cidadaosDemo } from '../../dados/perfil.js';
import { registrarEvento } from '../../dados/store.js';
import { identificarCidadao } from '../entrada.js';

/** Cidadãos: personas de demonstração, "entrar como" e pedidos do cidadão. Tudo sob `/dados/cidadaos`. */
export function registrarRotasCidadaos(rota) {
  // `demo` é fixa: o roteador a resolve antes de `:id`, em qualquer ordem de registro.
  rota(['GET'], '/dados/cidadaos/demo', () => ({ cidadaos: cidadaosDemo() }), {
    area: 'motor_de_dados',
    descricao: 'personas oficiais e cenários para "entrar como"',
  });
  rota(['GET'], '/dados/cidadaos/:id', ({ p }) => {
    const { id, reg } = identificarCidadao(p.id);
    registrarEvento(id, 'entrou_como');
    return entrarComo(id, reg);
  }, {
    area: 'motor_de_dados',
    descricao: 'entrar como (perfil; saúde e deficiência só com consentimento)',
  });
  rota(['GET'], '/dados/cidadaos/:id/jornadas', ({ p }) => {
    const { id } = identificarCidadao(p.id);
    return { cidadao_id: id, jornadas: listarJornadas(id) };
  }, {
    area: 'motor_de_dados',
    descricao: 'pedidos do cidadão',
  });
}
