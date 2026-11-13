import { montarVitrine } from '../../recomendacao/vitrine.js';
import { montarHome, controles } from '../../recomendacao/home.js';
import { montarHomeVisitante, montarVitrineVisitante } from '../../recomendacao/home-visitante.js';
import { registrarEvento, preferencias, salvar } from '../../dados/store.js';
import { dados } from '../../dados/carga.js';
import { falhar } from '../erros.js';
import { identificarCidadao, lerLimite, lerCampo, exigirLogin } from '../entrada.js';
import { FINALIDADE_SAUDE, temConsentimentoSaude, resumoConsentimento, registrarDecisao, statusConsentimento } from '../../dados/consentimento.js';

/** Estado da personalização de um cidadão (ou visitante). Sem dado sensível: só ligado/desligado e a autorização de saúde. */
function estadoDaPersonalizacao({ id, visitante }) {
  if (visitante) {
    return {
      cidadao_id: id,
      personalizacao_ativa: false,
      autorizou_dados_de_saude: false,
      rotulo: 'Entre na sua conta para receber sugestões feitas com os seus dados.',
      consentimento_saude: null,
      controle: null,
    };
  }
  const ativa = (preferencias[id] || {}).personalizar !== false;
  return {
    cidadao_id: id,
    personalizacao_ativa: ativa,
    autorizou_dados_de_saude: temConsentimentoSaude(id),
    rotulo: ativa ? 'Sugestões feitas com os seus dados: ligadas' : 'Sugestões feitas com os seus dados: desligadas',
    consentimento_saude: resumoConsentimento(id, FINALIDADE_SAUDE),
    controle: controles(id, ativa)[0],
  };
}

/** Motor de recomendação: a lista personalizada, com motivo em cada item. Tudo sob `/recomendacao`. */
export function registrarRotasRecomendacao(rota, derivados) {
  // Home simplificada de quem não entrou. Sem cidadão: nada de perfil, histórico ou saúde.
  rota(['GET'], '/recomendacao/visitante/home', ({ consulta }) => {
    registrarEvento(null, 'home_visitante_vista');
    return montarHomeVisitante({ q: consulta.q });
  }, {
    area: 'motor_de_recomendacao',
    descricao: 'Home simplificada para visitante sem login: mais usados e atalhos de 1 toque',
    consulta: '?q=texto',
  });

  // Home em blocos de quem está logado. Reagrupa a lista da vitrine; a lista plana não muda.
  rota(['GET'], '/recomendacao/:id/home', ({ p, consulta }) => {
    const { id } = identificarCidadao(p.id);
    registrarEvento(id, 'home_vista');
    return montarHome(id, derivados, consulta);
  }, {
    area: 'motor_de_recomendacao',
    descricao: 'Home em blocos: atalhos, recomendados com "Por que vejo isto?" e controles de personalização',
  });

  // `POST` é alias legado do `GET`.
  rota(['GET', 'POST'], '/recomendacao/:id', ({ p, consulta, corpo }) => {
    const { id, visitante } = identificarCidadao(p.id);
    const limite = lerLimite(corpo, consulta);
    registrarEvento(visitante ? null : id, 'vitrine_vista');
    if (visitante) return montarVitrineVisitante(derivados, { limite });
    return montarVitrine(id, derivados, { limite });
  }, {
    area: 'motor_de_recomendacao',
    descricao: 'serviços sugeridos com motivo, base da personalização e convites de consentimento',
    consulta: '?limite=8',
  });

  // "Não me interessa": o serviço some das sugestões deste cidadão.
  rota(['POST'], '/recomendacao/:id/dispensar', ({ p, corpo, consulta }) => {
    const { id } = exigirLogin(identificarCidadao(p.id));
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

  // Situação da personalização: sugestões ligadas ou desligadas e autorização de dados de saúde.
  rota(['GET'], '/recomendacao/:id/personalizacao', ({ p }) => estadoDaPersonalizacao(identificarCidadao(p.id)), {
    area: 'motor_de_recomendacao',
    descricao: 'situação da personalização: sugestões ligadas e autorização de dados de saúde, com o botão para mudar',
  });

  // Liga ou desliga as sugestões feitas com os dados da pessoa e/ou registra a autorização de saúde.
  // Aceita só o campo escolhido: {"ativa":false} ou {"consentimento_saude":"concedido|recusado|revogado"}.
  rota(['POST'], '/recomendacao/:id/personalizacao', ({ p, corpo, consulta }) => {
    const ident = exigirLogin(identificarCidadao(p.id));
    const { id } = ident;
    const v = lerCampo(corpo, consulta, 'ativa');
    const decisao = lerCampo(corpo, consulta, 'consentimento_saude');
    const autoriza = lerCampo(corpo, consulta, 'autorizar_saude');
    const temAtiva = v !== undefined && v !== null;
    const temSaude = (decisao !== undefined && decisao !== null) || (autoriza !== undefined && autoriza !== null);
    if (!temAtiva && !temSaude) falhar('valor_invalido', 'Informe "ativa": true ou false.');
    if (temAtiva && v !== true && v !== false && v !== 'true' && v !== 'false') falhar('valor_invalido', 'Informe "ativa": true ou false.');
    if (temSaude && (decisao === undefined || decisao === null)) {
      if (autoriza !== true && autoriza !== false && autoriza !== 'true' && autoriza !== 'false') falhar('valor_invalido', 'Informe "autorizar_saude": true ou false.');
    }
    if (temAtiva) {
      const ativa = v === true || v === 'true';
      (preferencias[id] ||= {}).personalizar = ativa;
      salvar();
      registrarEvento(id, ativa ? 'personalizacao_ligada' : 'personalizacao_desligada');
    }
    if (temSaude) {
      let d = decisao;
      if (d === undefined || d === null) {
        const sim = autoriza === true || autoriza === 'true';
        const atual = statusConsentimento(id, FINALIDADE_SAUDE);
        d = sim ? 'concedido' : atual === 'concedido' ? 'revogado' : atual === 'pendente' ? 'recusado' : null;
      }
      if (d !== null) {
        const r = registrarDecisao(id, d, FINALIDADE_SAUDE);
        if (r.erro) falhar(r.erro, r.mensagem);
      }
    }
    return { ok: true, ...estadoDaPersonalizacao(ident) };
  }, {
    area: 'motor_de_recomendacao',
    descricao: '{"ativa":false} desliga o uso de histórico e dados sensíveis; {"consentimento_saude":"concedido|recusado|revogado"} registra a autorização de saúde',
  });
}
