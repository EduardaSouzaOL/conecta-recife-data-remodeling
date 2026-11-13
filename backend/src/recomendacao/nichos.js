import { dados } from '../dados/carga.js';
import { curto } from '../dados/servicos.js';

// Nichos da Home ("Seus atalhos por nicho"). Ver .kiro/specs/destravar-backend-para-kodiak/design.md

const TEMA_IGNORADO = 'conecta labs';
const SERVICOS_DE_JORNADA = new Set([942, 352]);

/**
 * Tema principal (nicho) de um serviço: o primeiro valor de `temas` que, após trim,
 * não é vazio nem "Conecta Labs" (sem diferenciar maiúsculas). Sem valor válido, devolve null.
 * `temas` vem de `dados.servicos[*].temas` como lista; aceita também texto separado por "|".
 */
export function normalizarTema(temas) {
  const valores = Array.isArray(temas) ? temas : typeof temas === 'string' ? temas.split('|') : [];
  for (const v of valores) {
    if (typeof v !== 'string') continue;
    const t = v.trim();
    if (t && t.toLowerCase() !== TEMA_IGNORADO) return t;
  }
  return null;
}

const MAX_NICHOS = 4;
const MAX_ITENS = 6;

const slug = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function textoBanner(descricao, titulo) {
  if (typeof descricao !== 'string' || !descricao.trim()) return titulo;
  const limpo = descricao.replace(/\s+/g, ' ').trim();
  const frase = limpo.split(/(?<=[.!?])\s+/)[0] || limpo;
  return curto(frase, 120);
}

function montarItemNicho(servico, fixado) {
  const titulo = curto(servico.nome || `Serviço ${servico.servico_id}`);
  const ehAgendamento = servico.natureza === 'Agendamento';
  const rotulo_botao = ehAgendamento ? 'Agende aqui' : 'Abrir serviço';
  const acao = SERVICOS_DE_JORNADA.has(servico.servico_id)
    ? { tipo: 'iniciar_jornada', servico_id: servico.servico_id }
    : { tipo: 'abrir_servico', servico_id: servico.servico_id };

  return {
    servico_id: servico.servico_id,
    titulo,
    motivo: fixado ? 'Fixado por você' : 'Você usa bastante',
    fixado,
    rotulo_fixar: fixado ? 'Remover dos atalhos' : 'Fixar nos atalhos',
    acao_fixar: {
      tipo: 'fixar_servico',
      servico_id: servico.servico_id,
      fixar: !fixado,
    },
    rotulo_leitor: fixado
      ? `${titulo}, fixado nos atalhos. Toque para remover.`
      : `${titulo}. Toque para fixar nos atalhos.`,
    logo: {
      tipo: 'sigla',
      valor: servico.orgao_sigla || '',
    },
    banner: {
      titulo,
      texto: textoBanner(servico.descricao, titulo),
      rotulo_botao,
      rotulo_leitor: `${titulo}, ${rotulo_botao.toLowerCase()}`,
      acao,
    },
  };
}

/**
 * Agrupa por tema os serviços que o cidadão já usou ou fixou. `historico` é a lista de linhas de
 * `dados.historico` (servico_id no índice 2). `podeMostrar(servico, id)` aplica consentimento.
 * Devolve `{ nichos, filtros }` ou null se não houver nichos.
 */
export function montarNichos(id, historico, podeMostrar, fixados = [], servicos = dados.servicos) {
  const usos = new Map();
  for (const h of historico || []) usos.set(h[2], (usos.get(h[2]) || 0) + 1);

  // Posição de fixação (ordem da lista); fixado pelo próprio cidadão ignora podeMostrar.
  const posFixado = new Map();
  for (const f of fixados || []) if (!posFixado.has(f)) posFixado.set(f, posFixado.size);

  const grupos = new Map(); // tema -> { total, fixados, itens: [{ servico, usos, pos }] }
  const ids = new Set([...usos.keys(), ...posFixado.keys()]);
  for (const sid of ids) {
    const s = servicos.get(sid);
    if (!s) continue;
    const tema = normalizarTema(s.temas);
    if (!tema) continue;
    const pos = posFixado.has(sid) ? posFixado.get(sid) : null;
    if (pos === null && podeMostrar && !podeMostrar(s, id)) continue;
    const n = usos.get(sid) || 0;
    let g = grupos.get(tema);
    if (!g) { g = { total: 0, fixados: 0, itens: [] }; grupos.set(tema, g); }
    g.total += n;
    if (pos !== null) g.fixados += 1;
    g.itens.push({ servico: s, usos: n, pos });
  }

  const nichos = [...grupos.entries()]
    .sort((a, b) => (b[1].fixados > 0) - (a[1].fixados > 0) || b[1].total - a[1].total || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .slice(0, MAX_NICHOS)
    .map(([tema, g], i) => ({
      id: slug(tema),
      titulo: tema,
      filtro: tema,
      rotulo_leitor: `Serviços de ${tema} que você usa`,
      aberto: i === 0,
      itens: g.itens
        .sort((a, b) => (a.pos !== null && b.pos !== null ? a.pos - b.pos : a.pos !== null ? -1 : b.pos !== null ? 1 : 0)
          || b.usos - a.usos || a.servico.servico_id - b.servico.servico_id)
        .slice(0, MAX_ITENS)
        .map(({ servico, pos }) => montarItemNicho(servico, pos !== null)),
    }))
    .filter((n) => n.itens.length > 0);

  if (!nichos.length) return null;

  const filtros = [
    { id: 'todos', rotulo: 'Todos', rotulo_leitor: 'Mostrar todos os atalhos' },
    ...nichos.map((n) => ({ id: n.id, rotulo: n.filtro, rotulo_leitor: `Filtrar por ${n.filtro}` })),
  ];

  return { nichos, filtros };
}
