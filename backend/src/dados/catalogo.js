import { dados } from './carga.js';
import { curto } from './servicos.js';

// Busca por texto e categorias (temas do catálogo). Só lê servicos.csv; nenhum dado de cidadão.

/** Tema que existe no catálogo mas não é categoria para o cidadão (área de testes da Prefeitura). */
const TEMA_FORA = 'conecta labs';

const semAcento = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** "Licenças, Alvarás e Permissões" vira "licencas-alvaras-e-permissoes". */
export const idDoTema = (t) => semAcento(t).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const SOLICITACAO = new Set(['Peticionador (formulário)', 'Inscrição', 'Emissão de documentos', 'Alteração Cadastral', 'Reserva de espaço público']);

/** Tipo simples para a tela: Agendamento, Solicitacao ou Informacao. */
export function tipoSimples(natureza) {
  if (natureza === 'Agendamento') return 'Agendamento';
  if (SOLICITACAO.has(natureza)) return 'Solicitacao';
  return 'Informacao';
}

/** Item de lista para a tela (busca e categoria). */
export function itemDeServico(s) {
  return {
    id: s.servico_id,
    titulo: curto(s.nome, 90),
    descricao: curto(String(s.descricao || '').replace(/\s+/g, ' ').trim() || 'Sem descrição na Carta de Serviços.', 140),
    tipo: tipoSimples(s.natureza),
    orgao: s.orgao_sigla,
  };
}

let categorias = null;
/** Categorias que existem de verdade no catálogo, com a contagem de serviços (cada serviço conta uma vez por tema). */
export function listarCategorias() {
  if (!categorias) {
    const mapa = new Map();
    for (const s of dados.servicos.values()) {
      for (const t of new Set(s.temas.map((x) => x.trim()).filter(Boolean))) {
        if (semAcento(t) === TEMA_FORA) continue;
        const id = idDoTema(t);
        if (!mapa.has(id)) mapa.set(id, { categoria_id: id, rotulo: t, servicos: [] });
        mapa.get(id).servicos.push(s);
      }
    }
    categorias = [...mapa.values()]
      .map((c) => ({ ...c, total_servicos: c.servicos.length }))
      .sort((a, b) => b.total_servicos - a.total_servicos || a.rotulo.localeCompare(b.rotulo, 'pt-BR'));
  }
  return categorias;
}

export const categoriaPorId = (id) => listarCategorias().find((c) => c.categoria_id === String(id ?? '').trim().toLowerCase()) || null;

/** Ids válidos de tema (para os interesses do onboarding). */
export const idsDeTemas = () => new Set(listarCategorias().map((c) => c.categoria_id));

/** Serviços mais procurados primeiro; empate pelo nome. */
const porProcura = (a, b) => b.pessoas_unicas - a.pessoas_unicas || a.nome.localeCompare(b.nome, 'pt-BR');

/** Serviços de uma categoria, mais procurados primeiro. */
export function servicosDaCategoria(cat, limite) {
  return [...cat.servicos].sort(porProcura).slice(0, limite).map(itemDeServico);
}

/** Busca simples: todas as palavras do termo aparecem no título ou na descrição (sem acento, sem maiúsculas). Título conta mais. */
export function buscar(q, limite) {
  const palavras = semAcento(q).split(/\s+/).filter((p) => p.length >= 2);
  if (!palavras.length) return { total: 0, itens: [] };
  const achados = [];
  for (const s of dados.servicos.values()) {
    const titulo = semAcento(s.nome);
    const texto = `${titulo} ${semAcento(s.descricao)}`;
    if (!palavras.every((p) => texto.includes(p))) continue;
    const noTitulo = palavras.filter((p) => titulo.includes(p)).length;
    achados.push({ s, noTitulo });
  }
  achados.sort((a, b) => b.noTitulo - a.noTitulo || porProcura(a.s, b.s));
  return { total: achados.length, itens: achados.slice(0, limite).map((x) => itemDeServico(x.s)) };
}
