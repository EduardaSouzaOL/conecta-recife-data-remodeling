import { dados, normalizarId, CAMPOS_SAUDE, CAMPOS_ACESSIBILIDADE } from './carga.js';
import { FINALIDADE_ACESSIBILIDADE, resumoConsentimento, temConsentimentoSaude, temConsentimentoAcessibilidade } from './consentimento.js';
import { dataBR } from './servicos.js';
import { DEMO_ID, VISITANTE_ID, nomeParaExibir, resumoConsentimentoVisitante } from './demo.js';

// Motor de dados: "entrar como" um cidadão e cenários de demonstração.

/** As 8 personas oficiais do Guia dos dados. */
export const PERSONAS = [
  ['C007938', 'Idosa'], ['C068579', 'Microempreendedora'], ['C059592', 'Pessoa com deficiência'], ['C036462', 'Jovem estudante'],
  ['C039227', 'Família no Cadastro Único'], ['C076260', 'Família com criança'], ['C006566', 'Gestante'], ['C062244', 'Doença crônica'],
];

/** Procura o cidadão. Devolve `{ id, reg }`, ou `{ erro: 'id_invalido' | 'cidadao_nao_encontrado', id? }`. */
export function buscarCidadao(bruto) {
  const id = normalizarId(bruto);
  if (!id) return { erro: 'id_invalido' };
  const reg = dados.cidadaos.get(id);
  if (!reg) return { erro: 'cidadao_nao_encontrado', id };
  return { id, reg };
}

export function descreverPerfil(p) {
  const partes = [`${p.sexo === 'F' ? 'Mulher' : 'Homem'}, ${p.idade} anos`, `mora na RPA ${p.rpa}`];
  const marcas = [
    [p.empreendedor, 'tem negócio próprio'], [p.mei, 'é MEI'], [p.servidor_publico, 'é servidor municipal'],
    [p.proprietario_imovel, 'tem imóvel'], [p.tutor_animal, 'cuida de animal'], [p.estudante, 'estuda'],
    [p.cadastro_unico, 'está no Cadastro Único'], [p.bolsa_familia, 'recebe Bolsa Família'],
    [p.usuario_compaz, 'usa o Compaz'], [p.microcredito, 'usa microcrédito'],
  ];
  for (const [ok, txt] of marcas) if (ok) partes.push(txt);
  const cr = { primeira_infancia: 'tem criança pequena na família', crianca: 'tem criança na família', adolescente: 'tem adolescente na família' }[p.criancas_na_familia];
  if (cr) partes.push(cr);
  return partes.join(', ') + '.';
}

/** Perfil do cidadão. Saúde e deficiência só saem com o consentimento da respectiva finalidade. */
export function entrarComo(id, reg) {
  const hist = dados.historico.get(id) || [];
  const recente = [];
  for (let i = hist.length - 1; i >= 0 && recente.length < 10; i--) {
    const s = dados.servicos.get(hist[i][2]);
    recente.push({ data: hist[i][0], data_br: dataBR(hist[i][0]), hora: hist[i][1], servico_id: hist[i][2], servico: s?.nome ?? null });
  }
  const consentiu = temConsentimentoSaude(id);
  const consentiuAcessibilidade = temConsentimentoAcessibilidade(id);
  return {
    cidadao_id: id,
    nome_exibicao: nomeParaExibir(id) ?? rotuloPersona(id),
    saudacao: `Você entrou como ${id} (dados fictícios).`,
    perfil: { ...reg.perfil },
    perfil_resumo: descreverPerfil(reg.perfil),
    saude_liberada: consentiu,
    saude: consentiu ? Object.fromEntries(CAMPOS_SAUDE.map((k) => [k, reg.saude[k]])) : null,
    // Deficiência tem consentimento próprio: o consentimento de saúde não libera este campo.
    acessibilidade_liberada: consentiuAcessibilidade,
    acessibilidade: consentiuAcessibilidade ? Object.fromEntries(CAMPOS_ACESSIBILIDADE.map((k) => [k, reg.acessibilidade[k]])) : null,
    tem_historico: hist.length > 0,
    total_acessos: hist.length,
    historico_recente: recente,
    consentimento: resumoConsentimento(id),
    consentimento_acessibilidade: resumoConsentimento(id, FINALIDADE_ACESSIBILIDADE),
  };
}

/** "Entrar como" visitante: sem perfil, sem histórico e sem consentimento. */
export function entrarComoVisitante() {
  return {
    cidadao_id: VISITANTE_ID,
    visitante: true,
    nome_exibicao: nomeParaExibir(VISITANTE_ID),
    saudacao: 'Você está como visitante. Entre na sua conta para ver sugestões feitas para você.',
    perfil: null,
    perfil_resumo: null,
    saude_liberada: false,
    saude: null,
    acessibilidade_liberada: false,
    acessibilidade: null,
    tem_historico: false,
    total_acessos: 0,
    historico_recente: [],
    consentimento: resumoConsentimentoVisitante('saude_personalizacao'),
    consentimento_acessibilidade: resumoConsentimentoVisitante(FINALIDADE_ACESSIBILIDADE),
  };
}

// Nomes da apresentação (não são nomes de pessoas: são rótulos de perfil).
const NOMES_APRESENTACAO = { C076260: 'Família com criança', C062244: 'Idoso com cuidado contínuo' };
const rotuloPersona = (id) => NOMES_APRESENTACAO[id] ?? PERSONAS.find((p) => p[0] === id)?.[1] ?? null;

let cache = null;
function cenarios() {
  const out = [];
  const add = (rotulo, id, curto) => {
    if (!id || out.some((o) => o.cidadao_id === id)) return;
    const nome = NOMES_APRESENTACAO[id] || curto || rotulo;
    out.push({ cidadao_id: id, cenario: rotulo, rotulo: nome, nome_curto: nome, nome_exibicao: nome });
  };
  let semHist, longo = ['', 0], emp, prop, infancia, idoso, jovem, saudeComHist, cadu, tutor, pcd;
  for (const [id, { perfil: p, saude, acessibilidade }] of dados.cidadaos) {
    const n = (dados.historico.get(id) || []).length;
    if (!semHist && n === 0) semHist = id;
    if (n > longo[1]) longo = [id, n];
    if (!emp && p.empreendedor && p.mei && n >= 2) emp = id;
    if (!prop && p.proprietario_imovel && n >= 2) prop = id;
    if (!infancia && p.criancas_na_familia === 'primeira_infancia' && n === 0) infancia = id;
    if (!idoso && p.idade >= 65 && n >= 3) idoso = id;
    if (!jovem && p.idade <= 22 && p.estudante && n >= 2) jovem = id;
    if (!tutor && p.tutor_animal && n >= 3) tutor = id;
    if (!cadu && p.cadastro_unico && p.bolsa_familia && n >= 3) cadu = id;
    if (!pcd && acessibilidade.pessoa_com_deficiencia && CAMPOS_SAUDE.every((k) => !saude[k]) && n >= 3) pcd = id;
    if (!saudeComHist && (saude.gestante || saude.diabetes) && saude.hipertensao && n >= 3) saudeComHist = id;
  }
  for (const [id, rotulo] of PERSONAS) if (dados.cidadaos.has(id)) add(`Persona oficial: ${rotulo}`, id, rotulo);
  if (dados.cidadaos.has(DEMO_ID)) add('Demonstração: Ana, cidadã fictícia com pedidos de exemplo', DEMO_ID, 'Ana');
  add('Sem nenhum histórico', semHist, 'Sem histórico');
  add('Com muito histórico', longo[0], 'Muito histórico');
  add('Família com criança pequena e sem histórico', infancia, 'Criança pequena');
  add('Empreendedor (MEI)', emp, 'Empreendedor MEI');
  add('Proprietário de imóvel', prop, 'Proprietário');
  add('Pessoa idosa', idoso, 'Pessoa idosa');
  add('Jovem estudante', jovem, 'Jovem estudante');
  add('Quem cuida de animal', tutor, 'Tutor de pet');
  add('Cadastro Único e Bolsa Família', cadu, 'Cadastro Único');
  add('Demonstração do consentimento de dados de saúde', saudeComHist, 'Consentimento de saúde');
  add('Demonstração do consentimento de acessibilidade (sem dado de saúde)', pcd, 'Consentimento de acessibilidade');
  return out;
}

/** Cidadãos prontos para demonstração (personas oficiais primeiro). Calculado uma vez. */
export const cidadaosDemo = () => (cache ||= cenarios());
