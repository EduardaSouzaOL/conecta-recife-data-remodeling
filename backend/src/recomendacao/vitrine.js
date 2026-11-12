import { dados } from '../dados/carga.js';
import { preferencias } from '../dados/store.js';
import { temConsentimentoSaude, temConsentimentoAcessibilidade } from '../dados/consentimento.js';
import { reunirCandidatos } from './vitrine/candidatos.js';
import { pontuar } from './vitrine/pontuacao.js';
import { diversificar, garantirServicoNovo } from './vitrine/diversidade.js';
import { montarItem } from './vitrine/item.js';
import { baseDaPersonalizacao, montarAvisosEConvites } from './vitrine/textos.js';

// Perfil, consentimentos e histórico. `saude` e `acessibilidade` só são lidos com consentimento concedido.
function lerContexto(id) {
  const reg = dados.cidadaos.get(id);
  const perfil = reg.perfil;
  const pref = preferencias[id] || {};
  const personalizar = pref.personalizar !== false; // "Não usar meus dados": só sugestões universais
  const consentiu = personalizar && temConsentimentoSaude(id);
  const consentiuAcessibilidade = personalizar && temConsentimentoAcessibilidade(id);
  const saude = consentiu ? reg.saude : null; // sem consentimento, o atributo de saúde nem é lido
  const acessibilidade = consentiuAcessibilidade ? reg.acessibilidade : null; // idem para pessoa com deficiência
  const consentimentoDe = { saude: consentiu, acessibilidade: consentiuAcessibilidade };
  const hist = personalizar ? dados.historico.get(id) || [] : [];
  const dispensados = new Set(pref.dispensados || []);
  return { id, dispensados, perfil, consentiu, consentiuAcessibilidade, saude, acessibilidade, consentimentoDe, hist };
}

export function montarVitrine(id, derivados, { limite = 8 } = {}) {
  const ctx = lerContexto(id);
  const candidatos = reunirCandidatos(ctx, derivados);
  const pontuados = pontuar(candidatos, ctx).filter((p) => !ctx.dispensados.has(p.sv)); // "Não me interessa"
  const escolhidos = diversificar(pontuados, limite);
  garantirServicoNovo(escolhidos, pontuados, ctx, limite);
  const itens = escolhidos.map((p, i) => montarItem(p, i + 1));

  const n = ctx.hist.length;
  const base = baseDaPersonalizacao(n);
  const t = montarAvisosEConvites(ctx, base);
  return {
    cidadao_id: id,
    base_da_personalizacao: base,
    explicacao_geral: t.explicacao_geral,
    aviso_saude: t.aviso_saude,
    aviso_acessibilidade: t.aviso_acessibilidade,
    total_acessos_historico: n,
    semana_de_referencia_da_demanda: derivados.semana_ref,
    itens,
    consentimento: t.consentimento,
    convite_consentimento: t.convite_consentimento,
    consentimento_acessibilidade: t.consentimento_acessibilidade,
    convite_acessibilidade: t.convite_acessibilidade,
  };
}
