import { montarVitrine } from '../../recomendacao/vitrine.js';
import { registrarEvento, preferencias, salvar } from '../../dados/store.js';
import { dados } from '../../dados/carga.js';
import { falhar } from '../erros.js';
import { identificarCidadao, lerLimite, lerCampo } from '../entrada.js';

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

  // "Não me interessa": o serviço some das sugestões deste cidadão.
  rota(['POST'], '/recomendacao/:id/dispensar', ({ p, corpo, consulta }) => {
    const { id } = identificarCidadao(p.id);
    const sv = Number(lerCampo(corpo, consulta, 'servico_id'));
    if (!dados.servicos.has(sv)) falhar('servico_nao_encontrado', 'Não encontramos este serviço.');
    const pref = (preferencias[id] ||= {});
    pref.dispensados = [...new Set([...(pref.dispensados || []), sv])];
    salvar();
    registrarEvento(id, 'servico_dispensado', { servico_id: sv });
    return { ok: true, cidadao_id: id, dispensados: pref.dispensados };
  }, {
    area: 'motor_de_recomendacao',
    descricao: '"Não me interessa": {"servico_id":34} tira o serviço das sugestões',
  });

  // "Não usar meus dados para sugestões": sem histórico e sem dados sensíveis, só sugestões pelo perfil geral.
  rota(['POST'], '/recomendacao/:id/personalizacao', ({ p, corpo, consulta }) => {
    const { id } = identificarCidadao(p.id);
    const v = lerCampo(corpo, consulta, 'ativa');
    if (v !== true && v !== false && v !== 'true' && v !== 'false') falhar('valor_invalido', 'Informe "ativa": true ou false.');
    const ativa = v === true || v === 'true';
    (preferencias[id] ||= {}).personalizar = ativa;
    salvar();
    registrarEvento(id, ativa ? 'personalizacao_ligada' : 'personalizacao_desligada');
    return { ok: true, cidadao_id: id, personalizacao_ativa: ativa };
  }, {
    area: 'motor_de_recomendacao',
    descricao: '"Não usar meus dados para sugestões": {"ativa":false} desliga o uso de histórico e dados sensíveis',
  });
}
