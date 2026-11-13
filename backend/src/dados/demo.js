import { dados, FLAGS_PERFIL, CAMPOS_SAUDE, compararAcessos } from './carga.js';
import { jornadas, fixados, salvar } from './store.js';
import { proximosDiasUteis } from './jornada/opcoes.js';

// Cidadã fictícia de demonstração (DEMO001, "Ana") e o visitante (sem login).
// Nada aqui vem de pessoa real. Existe só na memória da API; os CSVs de BD/ não são alterados.

export const DEMO_ID = 'DEMO001';
export const VISITANTE_ID = 'visitante';
export const NOME_DEMO = 'Ana';
export const PEDIDO_DEMO_ANDAMENTO = 'J-DEMO0001';
export const PEDIDO_DEMO_CONCLUIDO = 'J-DEMO0002';

export const ehVisitante = (bruto) => typeof bruto === 'string' && bruto.trim().toLowerCase() === VISITANTE_ID;

/** Quantos cidadãos fictícios foram acrescentados aos 89.046 reais (para contagens da API). */
export const quantosDemo = () => (dados.cidadaos.has(DEMO_ID) ? 1 : 0);

/** Nome para exibir. Só a cidadã de demonstração e o visitante têm; os demais cadastros não têm nome. */
export function nomeParaExibir(id) {
  if (id === DEMO_ID) return NOME_DEMO;
  if (id === VISITANTE_ID) return 'Visitante';
  return null;
}

// Acessos fictícios da Ana: os serviços que ela mais usa viram "Seus atalhos".
const ACESSOS = [
  ['2026-09-02', '08:10', 953], ['2026-09-02', '08:11', 942],
  ['2026-09-09', '09:30', 953], ['2026-09-09', '09:32', 519],
  ['2026-09-16', '18:05', 953], ['2026-09-16', '18:07', 942],
  ['2026-09-23', '07:50', 519], ['2026-09-23', '07:52', 1475],
  ['2026-09-26', '10:15', 953],
];

/** Acrescenta a cidadã de demonstração aos dados em memória. Pode chamar de novo sem efeito. */
export function registrarDemo() {
  if (dados.cidadaos.has(DEMO_ID)) return;
  const perfil = {
    cidadao_id: DEMO_ID, idade: 34, faixa_etaria: '25-34', sexo: 'F', rpa: 3,
    situacao_renda: null, criancas_na_familia: 'crianca',
  };
  for (const k of FLAGS_PERFIL) perfil[k] = false;
  perfil.tutor_animal = true;
  perfil.aceita_notificacao = true;
  const saude = Object.fromEntries(CAMPOS_SAUDE.map((k) => [k, false]));
  dados.cidadaos.set(DEMO_ID, { perfil, saude, acessibilidade: { pessoa_com_deficiencia: false } });
  const hist = ACESSOS.map(([data, hora, sv], i) => [data, hora, sv, `DEMO-S${Math.floor(i / 2)}`, (i % 2) + 1]);
  hist.sort(compararAcessos);
  dados.historico.set(DEMO_ID, hist);
}

const iso = (d) => d.toISOString();

/** Os dois pedidos de exemplo da Ana. */
function pedidosDeExemplo() {
  const dias = proximosDiasUteis(4);
  const agora = new Date();
  const ha = (h) => iso(new Date(agora.getTime() - h * 3600e3));
  return {
    // Em andamento: etapa 2 de 4 ("Aguardando confirmação da unidade").
    [PEDIDO_DEMO_ANDAMENTO]: {
      jornada_id: PEDIDO_DEMO_ANDAMENTO, cidadao_id: DEMO_ID, servico_id: 942, estado: 'concluida',
      campos: { canal_aviso: 'app', unidade: 'U3A', data: dias[2].valor, hora: '09:00' }, auto: ['canal_aviso'],
      criada_em: ha(5), atualizada_em: ha(4), concluida_em: ha(4), protocolo: 'CNX-2026-000123', acompanhamento: 2,
    },
    // Concluído e ainda sem avaliação (dá para mostrar a nota na apresentação).
    [PEDIDO_DEMO_CONCLUIDO]: {
      jornada_id: PEDIDO_DEMO_CONCLUIDO, cidadao_id: DEMO_ID, servico_id: 352, estado: 'concluida',
      campos: { tipo_atendimento: 'atualizacao', pessoas_na_familia: 4, canal_aviso: 'app', unidade: 'U3B', data: dias[0].valor, hora: '14:00' },
      auto: ['canal_aviso'],
      criada_em: ha(96), atualizada_em: ha(72), concluida_em: ha(72), protocolo: 'CNX-2026-000087', acompanhamento: 4,
    },
  };
}

/** Cria os pedidos de exemplo que faltam. Com `refazer`, volta os dois ao estado inicial. */
export function semearPedidosDemo({ refazer = false } = {}) {
  if (!dados.cidadaos.has(DEMO_ID)) return;
  for (const [id, j] of Object.entries(pedidosDeExemplo())) {
    if (refazer || !jornadas[id]) jornadas[id] = j;
  }
  if (refazer || !fixados[DEMO_ID]) fixados[DEMO_ID] = [942, 953];
  salvar();
}

/** Liga a demonstração: cadastro da Ana e pedidos de exemplo. Chamado na partida do servidor e do Lambda. */
export function iniciarDemo() {
  registrarDemo();
  semearPedidosDemo();
}

/** Resumo de consentimento para quem não entrou: não há o que autorizar. */
export function resumoConsentimentoVisitante(finalidade) {
  return {
    finalidade, status: 'indisponivel', usa_dados: false, usa_dados_de_saude: false,
    mensagem: 'Entre na sua conta para escolher. Enquanto isso, não usamos nenhuma informação sua.',
    deve_pedir_agora: false, acoes_disponiveis: [], atualizado_em: null,
  };
}
