import { dados } from '../dados/carga.js';

const rendaBaixa = (p) => p.situacao_renda === 'pobreza' || p.situacao_renda === 'extrema_pobreza';

/**
 * Regras de perfil e momento de vida (sem saúde). Cada regra aponta serviços reais de servicos.csv.
 * A ordem dos ids dentro da regra é a ordem de prioridade.
 */
export const REGRAS = [
  { id: 'cadunico_entrar', origem: 'perfil', ids: [1032, 352],
    cond: (p) => !p.cadastro_unico && rendaBaixa(p),
    motivo: 'Pelo seu cadastro, você pode ter direito a programas sociais. Este serviço ajuda a entrar no Cadastro Único.' },
  { id: 'cadunico_tem', origem: 'perfil', ids: [1034, 1033, 352],
    cond: (p) => p.cadastro_unico,
    motivo: 'Você já está no Cadastro Único. Aqui você consulta ou atualiza seus dados.' },
  { id: 'bolsa_familia', origem: 'perfil', ids: [997],
    cond: (p) => p.bolsa_familia,
    motivo: 'Você faz parte do Bolsa Família. Este serviço é ligado aos benefícios da sua família.' },
  { id: 'primeira_infancia', origem: 'momento', ids: [1240, 839],
    cond: (p) => p.criancas_na_familia === 'primeira_infancia',
    motivo: 'Há uma criança pequena na sua família. Este serviço ajuda no acompanhamento e na vaga em creche.' },
  { id: 'crianca', origem: 'momento', ids: [839, 1240, 1148, 633],
    cond: (p) => p.criancas_na_familia === 'crianca',
    motivo: 'Há uma criança na sua família. Este serviço é útil para escola, atividades e acompanhamento.' },
  { id: 'adolescente', origem: 'momento', ids: [1148, 954, 1292, 62],
    cond: (p) => p.criancas_na_familia === 'adolescente',
    motivo: 'Há um adolescente na sua família. Este serviço ajuda em estudos, documentos e primeiros cursos.' },
  { id: 'mei', origem: 'perfil', ids: [1065, 798, 565, 988],
    cond: (p) => p.mei,
    motivo: 'Você é microempreendedor. Este serviço ajuda a manter o seu MEI em dia.' },
  { id: 'empreendedor', origem: 'perfil', ids: [565, 222, 1077, 564],
    cond: (p) => p.empreendedor,
    motivo: 'Você tem negócio próprio. Este serviço ajuda na sua atividade.' },
  { id: 'microcredito', origem: 'perfil', ids: [222],
    cond: (p) => p.microcredito,
    motivo: 'Você já usa microcrédito. Este serviço do Crédito Popular pode te interessar.' },
  { id: 'servidor', origem: 'perfil', ids: [568, 569, 450, 785, 1096],
    cond: (p) => p.servidor_publico,
    motivo: 'Você é servidor público municipal. Este serviço é do seu dia a dia de trabalho.' },
  { id: 'proprietario', origem: 'perfil', ids: [494, 763, 493, 558, 559],
    cond: (p) => p.proprietario_imovel,
    motivo: 'Você tem imóvel no seu cadastro. Este serviço trata de IPTU e documentos do imóvel.' },
  { id: 'tutor', origem: 'perfil', ids: [34, 37, 926, 956, 1152],
    cond: (p) => p.tutor_animal,
    motivo: 'Você cuida de um animal. Este serviço ajuda com saúde e bem-estar do seu bichinho.' },
  { id: 'estudante', origem: 'momento', ids: [1148, 819, 954, 1094, 627],
    cond: (p) => p.estudante,
    motivo: 'Você está estudando. Este serviço ajuda na sua vida escolar.' },
  { id: 'compaz', origem: 'perfil', ids: [633, 435],
    cond: (p) => p.usuario_compaz,
    motivo: 'Você usa o Compaz. Este serviço ajuda a aproveitar as atividades da rede.' },
  { id: 'idoso', origem: 'momento', ids: [908, 435, 1359, 1427],
    cond: (p) => p.idade >= 60,
    motivo: 'Este serviço é voltado a pessoas com 60 anos ou mais.' },
  { id: 'jovem', origem: 'momento', ids: [1292, 62, 954, 1359, 1427],
    cond: (p) => p.idade >= 16 && p.idade <= 29,
    motivo: 'Este serviço é pensado para jovens, como estudos, primeiro emprego e documentos.' },
  { id: 'trabalho', origem: 'momento', ids: [458, 1068, 62, 770],
    cond: (p) => p.idade >= 18 && p.idade < 60 && rendaBaixa(p) && !p.servidor_publico && !p.empreendedor && !p.mei,
    motivo: 'Para quem busca trabalho ou qualificação, este serviço mostra vagas e cursos.' },
  { id: 'mulher_prevencao', origem: 'momento', ids: [1309],
    cond: (p) => p.sexo === 'F' && p.idade >= 40 && p.idade <= 69,
    motivo: 'Cuidado preventivo indicado para mulheres da sua faixa de idade.' },
  { id: 'mulher', origem: 'perfil', ids: [1257, 192],
    cond: (p) => p.sexo === 'F',
    motivo: 'Este serviço é voltado a mulheres.' },
];

const MOTIVO_SAUDE = 'Indicado para o seu cuidado com a saúde. Aparece porque você autorizou o uso dessas informações.';

/** Regras que dependem de dados de saúde. Só rodam com consentimento "concedido". */
export const REGRAS_SAUDE = [
  { id: 'saude_hipertensao', campo: 'hipertensao', ids: [284] },
  { id: 'saude_diabetes', campo: 'diabetes', ids: [283] },
  { id: 'saude_mental', campo: 'saude_mental', ids: [1197, 1193] },
  { id: 'saude_gestante', campo: 'gestante', ids: [892, 295, 1362, 271] },
];

const MOTIVO_ACESSIBILIDADE = 'Pode ajudar com acessibilidade. Aparece porque você autorizou o uso dessa informação.';

/** Regras de acessibilidade (pessoa com deficiência). Só rodam com consentimento próprio, separado do de saúde. */
export const REGRAS_ACESSIBILIDADE = [
  { id: 'acessibilidade_pcd', campo: 'pessoa_com_deficiencia', ids: [299, 357, 271, 1239, 1175, 317] },
];

const REGEX_SAUDE = /diabet|hipertens|sa[uú]de mental|psicossocial|psicol[oó]gic|\bCAPS\b|gestante|gesta[cç][aã]o|gr[aá]vid|pr[eé]-natal|obst[eé]tric|pu[eé]rper/i;
const REGEX_ACESSIBILIDADE = /defici[eê]ncia|\bPCD\b|\bsurdos?\b|\bcegos?\b/i;
const IDS_SAUDE = new Set(REGRAS_SAUDE.flatMap((r) => r.ids));
const IDS_ACESSIBILIDADE = new Set(REGRAS_ACESSIBILIDADE.flatMap((r) => r.ids));

/**
 * Categorias sensíveis de um serviço: 'saude' e/ou 'acessibilidade'. Cada uma depende de um consentimento próprio.
 * Um serviço pode estar nas duas (ex.: 271); nesse caso, qualquer um dos dois consentimentos o libera por regra.
 */
export function categoriasSensiveis(servico) {
  const out = [];
  if (!servico) return out;
  if (IDS_SAUDE.has(servico.servico_id) || REGEX_SAUDE.test(servico.nome)) out.push('saude');
  if (IDS_ACESSIBILIDADE.has(servico.servico_id) || REGEX_ACESSIBILIDADE.test(servico.nome)) out.push('acessibilidade');
  return out;
}

/**
 * Candidatos por regra. `saude` e `acessibilidade` só devem ser passados quando há consentimento concedido
 * da respectiva finalidade; com `null` as regras da categoria nem são avaliadas.
 */
export function candidatosPorRegra(perfil, saude, acessibilidade = null) {
  const out = [];
  for (const r of REGRAS) {
    if (!r.cond(perfil)) continue;
    r.ids.forEach((id, i) => {
      if (dados.servicos.has(id)) out.push({ servico_id: id, score: 1 - i * 0.12, origem: r.origem, regra: r.id, motivo: r.motivo });
    });
  }
  if (saude) {
    for (const r of REGRAS_SAUDE) {
      if (!saude[r.campo]) continue;
      r.ids.forEach((id, i) => {
        if (dados.servicos.has(id)) out.push({ servico_id: id, score: 1.1 - i * 0.12, origem: 'saude', regra: r.id, motivo: MOTIVO_SAUDE });
      });
    }
  }
  if (acessibilidade) {
    for (const r of REGRAS_ACESSIBILIDADE) {
      if (!acessibilidade[r.campo]) continue;
      r.ids.forEach((id, i) => {
        if (dados.servicos.has(id)) out.push({ servico_id: id, score: 1.1 - i * 0.12, origem: 'acessibilidade', regra: r.id, motivo: MOTIVO_ACESSIBILIDADE });
      });
    }
  }
  return out;
}

/** Rótulo em linguagem simples para um segmento (usado no motivo de "pessoas parecidas"). */
export function rotuloSegmento(seg) {
  const [tipo, valor] = seg.split(':');
  const flags = {
    empreendedor: 'quem tem negócio', mei: 'microempreendedores', servidor_publico: 'servidores municipais',
    proprietario_imovel: 'quem tem imóvel', tutor_animal: 'quem cuida de animais', estudante: 'estudantes',
    cadastro_unico: 'quem está no Cadastro Único', bolsa_familia: 'quem recebe Bolsa Família',
    usuario_compaz: 'quem frequenta o Compaz', microcredito: 'quem usa microcrédito',
  };
  if (tipo === 'flag') return flags[valor] || 'pessoas com perfil parecido';
  if (tipo === 'faixa') return `pessoas de ${valor} anos`;
  if (tipo === 'sexo') return valor === 'F' ? 'mulheres' : 'homens';
  if (tipo === 'rpa') return `quem mora na região ${valor} (RPA ${valor})`;
  if (tipo === 'renda') return 'famílias com renda baixa';
  if (tipo === 'criancas') return 'famílias com crianças';
  return 'pessoas com perfil parecido';
}
