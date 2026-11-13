import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerCsv } from './csv.js';

const aqui = path.dirname(fileURLToPath(import.meta.url));
export const RAIZ = path.resolve(aqui, '..', '..');
const dirBdPadrao = path.resolve(RAIZ, '..', 'BD');
export const DIR_BD = process.env.BD_DIR || (fs.existsSync(dirBdPadrao) ? dirBdPadrao : path.resolve(RAIZ, '..', 'dados'));
export const DIR_DATA = process.env.DATA_DIR || path.resolve(RAIZ, 'data');

// Campos de saúde: ficam num atributo separado e só saem do módulo com consentimento.
export const CAMPOS_SAUDE = ['hipertensao', 'diabetes', 'saude_mental', 'gestante'];
// Pessoa com deficiência tem consentimento próprio (finalidade "acessibilidade_personalizacao"),
// para quem quer sugestões de acessibilidade sem liberar dados de saúde.
export const CAMPOS_ACESSIBILIDADE = ['pessoa_com_deficiencia'];
export const FLAGS_PERFIL = [
  'empreendedor', 'mei', 'servidor_publico', 'proprietario_imovel', 'tutor_animal', 'estudante',
  'cadastro_unico', 'bolsa_familia', 'usuario_compaz', 'microcredito', 'aceita_notificacao',
];

const internar = (() => {
  const m = new Map();
  return (s) => { let v = m.get(s); if (v === undefined) { m.set(s, s); v = s; } return v; };
})();

const bool = (v) => v === 'true';

/**
 * Ordem dos acessos: data, hora, sessão e ordem_na_sessao.
 * A hora tem precisão de minuto (91% das visitas repetem a mesma hora), então só ordem_na_sessao
 * garante a sequência dentro da sessão.
 */
export function compararAcessos(a, b) {
  if (a[0] !== b[0]) return a[0] < b[0] ? -1 : 1;
  if (a[1] !== b[1]) return a[1] < b[1] ? -1 : 1;
  if (a[3] !== b[3]) return a[3] < b[3] ? -1 : 1;
  return a[4] - b[4];
}

export const dados = {
  cidadaos: new Map(), // id -> { perfil, saude, acessibilidade }
  historico: new Map(), // id -> [[data, hora, servico_id, sessao_id, ordem_na_sessao]] em ordem cronológica
  servicos: new Map(), // id -> serviço normalizado
  usoSemanal: [], // linhas de uso_semanal.csv
};

const lista = (s) => (s ? s.split('|').map((x) => x.trim()).filter(Boolean) : []);
const itensLista = (s) => (s ? s.split('\n').map((l) => l.replace(/^\s*[-•]\s*/, '').trim()).filter(Boolean) : []);

export function normalizarId(bruto) {
  const demo = /^\s*demo\s*0*(\d{1,3})\s*$/i.exec(String(bruto ?? ''));
  if (demo) return 'DEMO' + demo[1].padStart(3, '0'); // cidadão fictício de demonstração (DEMO001)
  const m = /^\s*[cC]?\s*0*(\d{1,6})\s*$/.exec(String(bruto ?? ''));
  if (!m) return null;
  return 'C' + m[1].padStart(6, '0');
}

export async function carregarDados() {
  const t0 = Date.now();
  await lerCsv(path.join(DIR_BD, 'cidadaos.csv'), (r) => {
    const saude = {};
    for (const k of CAMPOS_SAUDE) saude[k] = bool(r[k]);
    const acessibilidade = {};
    for (const k of CAMPOS_ACESSIBILIDADE) acessibilidade[k] = bool(r[k]);
    const perfil = {
      cidadao_id: r.cidadao_id,
      idade: Number(r.idade),
      faixa_etaria: internar(r.faixa_etaria),
      sexo: internar(r.sexo),
      rpa: Number(r.rpa),
      situacao_renda: r.situacao_renda || null,
      criancas_na_familia: r.criancas_na_familia || null, // vazio = desconhecido (não assumir "nenhuma")
    };
    for (const k of FLAGS_PERFIL) perfil[k] = bool(r[k]);
    dados.cidadaos.set(r.cidadao_id, { perfil, saude, acessibilidade });
  });

  await lerCsv(path.join(DIR_BD, 'historico.csv'), (r) => {
    let l = dados.historico.get(r.cidadao_id);
    if (!l) { l = []; dados.historico.set(r.cidadao_id, l); }
    l.push([internar(r.data), r.hora, Number(r.servico_id), r.sessao_id, Number(r.ordem_na_sessao)]);
  });
  for (const l of dados.historico.values()) l.sort(compararAcessos);

  await lerCsv(path.join(DIR_BD, 'servicos.csv'), (r) => {
    const id = Number(r.servico_id);
    dados.servicos.set(id, {
      servico_id: id,
      nome: r.nome || r.item_nome,
      nome_resumido: r.nome_resumido || r.nome,
      orgao: r.orgao_nome,
      orgao_sigla: r.orgao_sigla,
      temas: lista(r.temas),
      grupos: lista(r.grupos),
      publicos: lista(r.publicos_alvo),
      palavras_chave: lista(r.palavras_chave),
      natureza: r.natureza,
      descricao: r.descricao,
      requisitos: itensLista(r.requisitos),
      passos: itensLista(r.passos),
      gratuito: r.gratuito === 'true',
      canal_web: r.canal_web || null,
      canal_app: r.canal_app || null,
      nivel_digital: r.nivel_digital_atual === '' ? null : Number(r.nivel_digital_atual),
      cliques: Number(r.cliques_historico || 0),
      pessoas_unicas: Number(r.pessoas_unicas_historico || 0),
      nota_media: r.nota_media === '' ? null : Number(r.nota_media),
      tem_historico: r.tem_historico === 'true',
    });
  });

  await lerCsv(path.join(DIR_BD, 'uso_semanal.csv'), (r) => {
    dados.usoSemanal.push({ semana: r.semana, servico_id: Number(r.servico_id), cliques: Number(r.cliques) });
  });

  console.log(`[dados] ${dados.cidadaos.size} cidadãos, ${dados.historico.size} com histórico, ` +
    `${dados.servicos.size} serviços em ${Date.now() - t0} ms`);
}
