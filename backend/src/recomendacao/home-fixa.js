import { dados } from '../dados/carga.js';
import { curto } from '../dados/servicos.js';
import { temConsentimentoSaude } from '../dados/consentimento.js';
import { tipoSimples } from '../dados/catalogo.js';
import { acaoDoServico } from './home-visitante.js';

// Home com blocos definidos pela equipe para duas personas da apresentação (C076260 e C062244).
// Todos os servico_id conferidos em BD/servicos.csv. Título de bloco e motivo_curto nunca citam
// condição de saúde; isso só aparece em por_que_vejo.texto e só com consentimento de saúde.

const DADO = {
  historico: { id: 'historico', rotulo: 'Seu histórico no app' },
  perfil: { id: 'perfil', rotulo: 'Seu cadastro' },
  pedidos: { id: 'pedidos', rotulo: 'Seus pedidos no app' },
  saude: { id: 'saude', rotulo: 'Informações de saúde que você autorizou' },
};

// [servico_id, descricao, motivo_curto, por_que_vejo.texto, dados_usados]
const C076260 = [
  { id: 'atalhos', grupo: 'atalhos', titulo: 'Seus atalhos', itens: [
    [942, 'Marque consulta, preventivo ou dentista no posto de saúde.', 'Você usa sempre', 'Você já agendou consultas pelo app. Deixamos este atalho no topo para ganhar tempo.', ['historico']],
    [1210, 'Veja qual é o posto de saúde da sua família.', 'Seu posto de saúde', 'Para agendar consulta, ajuda saber qual é o seu posto. Este serviço mostra isso pelo seu cadastro.', ['historico']],
  ] },
  { id: 'acompanhe', grupo: 'acompanhamento', titulo: 'Acompanhe', itens: [
    [519, 'Veja o resultado dos exames feitos na rede municipal.', 'Seu exame está em andamento', 'Você tem um pedido de resultado de exame em andamento. Aqui você acompanha.', ['pedidos']],
    [1475, 'Veja os encaminhamentos para especialistas.', 'Seu encaminhamento está em andamento', 'Você tem um encaminhamento em andamento. Aqui você vê em que etapa ele está.', ['pedidos']],
  ] },
  { id: 'familia', grupo: 'recomendados', titulo: 'Para sua família', itens: [
    [1240, 'Veja vacinas e o crescimento da criança no celular.', 'Para a criança da família', 'Seu cadastro informa que há criança na família. A caderneta guarda vacinas e consultas dela.', ['perfil']],
    [290, 'Saiba como o Mãe Coruja apoia mães e crianças.', 'Apoio para mães e crianças', 'Seu cadastro informa que há criança na família. O Mãe Coruja é um programa da Prefeitura para mães e crianças.', ['perfil']],
  ] },
  { id: 'beneficios', grupo: 'recomendados', titulo: 'Benefícios', itens: [
    [910, 'Mantenha seus dados em dia para marcar consultas e exames.', 'Mantenha seus dados em dia', 'Você já está no Cadastro Único e recebe o Bolsa Família. Manter os dados em dia evita problemas para marcar consultas e exames.', ['perfil']],
  ] },
];

const C062244_BASE = [
  { id: 'atalhos', grupo: 'atalhos', titulo: 'Seus atalhos', itens: [
    [953, 'Veja dia, hora e local das suas consultas.', 'Você usa sempre', 'Você costuma ver seus agendamentos pelo app. Deixamos este atalho no topo.', ['historico']],
  ] },
  { id: 'acompanhe', grupo: 'acompanhamento', titulo: 'Acompanhe', itens: [
    [1475, 'Veja os encaminhamentos para especialistas.', 'Seu encaminhamento está em andamento', 'Você tem um encaminhamento em andamento. Aqui você vê em que etapa ele está.', ['pedidos']],
  ] },
  { id: 'pet', grupo: 'recomendados', titulo: 'Você e seu pet', itens: [
    [34, 'Agende a castração gratuita de cães e gatos.', 'Para o seu pet', 'Seu cadastro informa que você cuida de um animal. A castração é gratuita na Prefeitura.', ['perfil']],
    [926, 'Marque consulta veterinária para cães e gatos.', 'Saúde do seu pet', 'Seu cadastro informa que você cuida de um animal. Aqui você marca consulta para ele.', ['perfil']],
  ] },
];

/** "Cuidados contínuos": só com consentimento de saúde. O texto cita a condição só se ela estiver no cadastro. */
function cuidadosContinuos(id) {
  const s = dados.cidadaos.get(id).saude; // lido apenas aqui, depois de conferir o consentimento
  const cond = [s.hipertensao && 'hipertensão', s.diabetes && 'diabetes'].filter(Boolean);
  const base = cond.length ? `Você autorizou usar seus dados de saúde, e seu cadastro indica ${cond.join(' e ')}.` : 'Você autorizou usar seus dados de saúde.';
  const itens = [
    [1102, 'Veja os remédios que você retira na rede municipal.', 'Seus remédios', `${base} Aqui você acompanha os remédios que retira.`, ['saude']],
  ];
  if (s.diabetes) itens.push([283, 'Saiba como marcar o acompanhamento no posto de saúde.', 'Acompanhamento no posto', 'Você autorizou usar seus dados de saúde, e seu cadastro indica diabetes. O posto faz o acompanhamento.', ['saude']]);
  if (s.hipertensao) itens.push([284, 'Saiba como marcar o acompanhamento no posto de saúde.', 'Acompanhamento no posto', 'Você autorizou usar seus dados de saúde, e seu cadastro indica hipertensão. O posto faz o acompanhamento.', ['saude']]);
  itens.push([1218, 'Faça atividade física com orientação, de graça.', 'Atividade física com orientação', `${base} Atividade física orientada ajuda no cuidado do dia a dia.`, ['saude']]);
  return { id: 'cuidados_continuos', grupo: 'recomendados', titulo: 'Cuidados contínuos', itens };
}

const HOMES = {
  C076260: () => C076260,
  C062244: (id) => (temConsentimentoSaude(id) ? [...C062244_BASE, cuidadosContinuos(id)] : C062244_BASE),
};

export const temHomeFixa = (id) => Object.hasOwn(HOMES, id);

function montarItem([sv, descricao, motivoCurto, texto, usados], posicao) {
  const s = dados.servicos.get(sv);
  if (!s) throw new Error(`home-fixa: serviço ${sv} não existe em servicos.csv`);
  const titulo = curto(s.nome);
  return {
    posicao,
    servico_id: sv,
    titulo,
    orgao: s.orgao_sigla,
    descricao,
    tipo_servico: tipoSimples(s.natureza),
    motivo: motivoCurto,
    motivo_curto: motivoCurto,
    por_que_vejo: { texto, dados_usados: usados.map((u) => DADO[u]) },
    rotulo_leitor: `Abrir ${titulo}`,
    acao: acaoDoServico(s),
  };
}

/** Blocos fixos da persona, já com os itens prontos para a tela. */
export function blocosFixos(id) {
  return HOMES[id](id).map((b) => ({ id: b.id, grupo: b.grupo, titulo: b.titulo, itens: b.itens.map((it, i) => montarItem(it, i + 1)) }));
}
