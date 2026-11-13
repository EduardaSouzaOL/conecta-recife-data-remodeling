import {
  textoDaFinalidade,
  resumoConsentimento, resumoTodos, registrarDecisao, historicoConsentimento,
} from '../../dados/consentimento.js';
import { falhar } from '../erros.js';
import { identificarCidadao, lerCampo, lerFinalidade, exigirLogin } from '../entrada.js';
import { resumoConsentimentoVisitante } from '../../dados/demo.js';
import { FINALIDADES } from '../../dados/consentimento.js';

const respostaVisitante = (finalidade) => ({
  cidadao_id: 'visitante',
  ...resumoConsentimentoVisitante(finalidade),
  historico: [],
  finalidades: Object.fromEntries(FINALIDADES.map((f) => [f, resumoConsentimentoVisitante(f)])),
});

const respostaConsentimento = (id, finalidade) => ({
  cidadao_id: id,
  ...resumoConsentimento(id, finalidade),
  historico: historicoConsentimento(id, finalidade),
  finalidades: resumoTodos(id),
});

/** Consentimentos por finalidade (saúde e acessibilidade, independentes). Tudo sob `/dados/consentimentos`. */
export function registrarRotasConsentimentos(rota) {
  // `texto` é fixa: o roteador a resolve antes de `:id`, em qualquer ordem de registro.
  rota(['GET'], '/dados/consentimentos/texto', ({ consulta }) => textoDaFinalidade(lerFinalidade({}, consulta)), {
    area: 'motor_de_dados',
    descricao: 'texto de cada consentimento',
    consulta: '?finalidade=',
  });
  rota(['GET'], '/dados/consentimentos/:id', ({ p, consulta }) => {
    const { id, visitante } = identificarCidadao(p.id);
    if (visitante) return respostaVisitante(lerFinalidade({}, consulta));
    return respostaConsentimento(id, lerFinalidade({}, consulta));
  }, {
    area: 'motor_de_dados',
    descricao: 'situação do consentimento',
    consulta: '?finalidade=',
  });
  rota(['POST'], '/dados/consentimentos/:id', ({ p, corpo, consulta }) => {
    const { id } = exigirLogin(identificarCidadao(p.id));
    const f = lerFinalidade(corpo, consulta);
    const r = registrarDecisao(id, lerCampo(corpo, consulta, 'decisao'), f);
    if (r.erro) falhar(r.erro, r.mensagem);
    return respostaConsentimento(id, f);
  }, {
    area: 'motor_de_dados',
    descricao: '{"decisao":"concedido|recusado|revogado","finalidade":"saude_personalizacao|acessibilidade_personalizacao"}',
  });
}
