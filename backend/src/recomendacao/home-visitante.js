import { dados } from '../dados/carga.js';
import { temJornada, curto } from '../dados/servicos.js';
import { TAGS } from './vitrine/textos.js';

// Home simplificada: sem login, sem desligar a personalização. Não lê perfil, histórico, saúde nem acessibilidade.

const MOTIVO = 'É um dos serviços mais usados no Conecta Recife.';
const LIMITE_MAIS_USADOS = 6;
const LIMITE_ATALHOS = 3;

const semAcento = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Os mais usados, calculados uma vez (mesmo critério da base geral da vitrine). */
let maisUsados = null;
function lerMaisUsados() {
  maisUsados ||= [...dados.servicos.values()]
    .filter((s) => s.nivel_digital !== null && s.nivel_digital >= 3)
    .sort((a, b) => b.pessoas_unicas - a.pessoas_unicas || a.servico_id - b.servico_id);
  return maisUsados;
}

/** Destino pronto de um serviço: pedido pelo app quando há jornada, senão o detalhe. */
export const acaoDoServico = (s) => (temJornada(s)
  ? { tipo: 'iniciar_jornada', servico_id: s.servico_id }
  : { tipo: 'abrir_servico', servico_id: s.servico_id });

/** Serviços digitais mais usados (mesma ordem da Home do visitante). */
export const servicosMaisUsados = () => lerMaisUsados();

export function item(s, posicao) {
  const titulo = curto(s.nome);
  const acao = acaoDoServico(s);
  return {
    posicao,
    servico_id: s.servico_id,
    titulo,
    orgao: s.orgao_sigla,
    motivo: MOTIVO,
    rotulo_leitor: `Abrir ${titulo}`,
    acao,
  };
}

/** Home do visitante. `q` filtra pelo nome do serviço. Bloco sem item não é enviado. */
export function montarHomeVisitante({ q } = {}) {
  const busca = typeof q === 'string' ? semAcento(q.trim()) : '';
  let lista = lerMaisUsados();
  if (busca) lista = lista.filter((s) => semAcento(s.nome).includes(busca));
  const escolhidos = lista.slice(0, LIMITE_MAIS_USADOS);

  const blocos = [];
  if (escolhidos.length) {
    blocos.push({
      id: 'mais_usados',
      grupo: 'recomendados',
      titulo: busca ? 'Resultado da busca' : 'Mais usados',
      itens: escolhidos.map((s, i) => item(s, i + 1)),
    });
    blocos.push({
      id: 'atalhos',
      grupo: 'atalhos',
      titulo: 'Atalhos de 1 toque',
      itens: escolhidos.slice(0, LIMITE_ATALHOS).map((s, i) => item(s, i + 1)),
    });
  }
  return {
    perfil: 'visitante',
    explicacao_geral: 'Você não entrou na sua conta. Mostramos os serviços mais usados por todas as pessoas.',
    mensagem_busca: busca && !escolhidos.length ? 'Não encontramos serviços com esse nome. Tente outra palavra.' : null,
    blocos,
  };
}

/** Lista plana (mesmo formato da vitrine) para quem não entrou: só os serviços mais usados. */
export function montarVitrineVisitante(derivados, { limite = 8 } = {}) {
  const itens = lerMaisUsados().slice(0, limite).map((s, i) => ({
    posicao: i + 1,
    servico_id: s.servico_id,
    titulo: curto(s.nome),
    nome: s.nome,
    orgao: s.orgao_sigla,
    tema: s.temas[0] || null,
    tipo_servico: s.natureza,
    digital: true,
    jornada_disponivel: temJornada(s),
    origem: 'geral',
    tag: TAGS.geral,
    motivo: MOTIVO,
    outros_motivos: [],
  }));
  return {
    cidadao_id: 'visitante',
    base_da_personalizacao: 'geral',
    explicacao_geral: 'Você não entrou na sua conta. Mostramos os serviços mais usados por todas as pessoas.',
    aviso_saude: 'Não usamos nenhuma informação de saúde nesta lista.',
    aviso_acessibilidade: 'Não usamos nenhuma informação de acessibilidade nesta lista.',
    total_acessos_historico: 0,
    semana_de_referencia_da_demanda: derivados.semana_ref,
    itens,
    consentimento: null,
    convite_consentimento: null,
    consentimento_acessibilidade: null,
    convite_acessibilidade: null,
  };
}
