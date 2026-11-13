import { buscar, listarCategorias, categoriaPorId, servicosDaCategoria, idsDeTemas } from '../../dados/catalogo.js';
import { eventos, preferencias, registrarEvento, salvar } from '../../dados/store.js';
import { falhar } from '../erros.js';
import { identificarCidadao, exigirLogin, lerCampo } from '../entrada.js';

const lerQuantidade = (corpo, consulta, padrao) => Math.min(50, Math.max(1, Number(lerCampo(corpo, consulta, 'limite') ?? padrao) || padrao));

// Contagens para o slide de Medição. Só tipos de evento, sem texto livre nem dado pessoal.
const METRICAS = [
  ['pedidos_criados', 'jornada_iniciada', 'Pedidos criados'],
  ['pedidos_confirmados', 'jornada_concluida', 'Pedidos confirmados'],
  ['pedidos_cancelados', 'jornada_cancelada', 'Pedidos cancelados'],
  ['pedidos_alterados', 'jornada_alterada', 'Pedidos alterados'],
  ['avaliacoes', 'avaliacao_registrada', 'Avaliações'],
  ['telas_puladas', 'tela_pulada', 'Telas puladas com dados do perfil'],
  ['erros_de_preenchimento', 'erro_entendimento', 'Erros de preenchimento'],
  ['homes_vistas', 'home_vista', 'Home vista (com login)'],
  ['homes_visitante', 'home_visitante_vista', 'Home vista (sem login)'],
  ['personalizacao_desligada', 'personalizacao_desligada', 'Sugestões desligadas'],
  ['buscas', 'busca_feita', 'Buscas'],
];

/** Busca, categorias, interesses do onboarding e métricas. Tudo sob `/dados`. */
export function registrarRotasCatalogo(rota) {
  rota(['GET'], '/dados/busca', ({ consulta }) => {
    const q = typeof consulta.q === 'string' ? consulta.q.trim().slice(0, 80) : '';
    const r = buscar(q, lerQuantidade({}, consulta, 20));
    registrarEvento(null, 'busca_feita', { resultados: r.total });
    return {
      q,
      total: r.total,
      mensagem: r.total ? null : q ? 'Não encontramos serviços com essas palavras. Tente outra palavra.' : 'Digite o que você procura.',
      itens: r.itens,
    };
  }, {
    area: 'motor_de_dados',
    descricao: 'busca por texto no título e na descrição dos serviços',
    consulta: '?q=termo&limite=20',
  });

  rota(['GET'], '/dados/categorias', () => ({
    total: listarCategorias().length,
    categorias: listarCategorias().map(({ categoria_id, rotulo, total_servicos }) => ({ categoria_id, rotulo, total_servicos })),
  }), {
    area: 'motor_de_dados',
    descricao: 'categorias (temas do catálogo) com a quantidade de serviços',
  });

  rota(['GET'], '/dados/categorias/:categoria_id/servicos', ({ p, consulta }) => {
    const cat = categoriaPorId(p.categoria_id);
    if (!cat) falhar('categoria_nao_encontrada', 'Não encontramos essa categoria. Veja a lista em /dados/categorias.');
    return {
      categoria_id: cat.categoria_id,
      rotulo: cat.rotulo,
      total: cat.total_servicos,
      itens: servicosDaCategoria(cat, lerQuantidade({}, consulta, 50)),
    };
  }, {
    area: 'motor_de_dados',
    descricao: 'serviços de uma categoria, mais procurados primeiro',
    consulta: '?limite=50',
  });

  rota(['GET'], '/dados/cidadaos/:id/interesses', ({ p }) => {
    const { id, visitante } = identificarCidadao(p.id);
    return { cidadao_id: id, interesses: visitante ? [] : (preferencias[id]?.interesses || []) };
  }, {
    area: 'motor_de_dados',
    descricao: 'temas escolhidos no onboarding',
  });

  rota(['PUT'], '/dados/cidadaos/:id/interesses', ({ p, corpo }) => {
    const { id } = exigirLogin(identificarCidadao(p.id));
    const lista = corpo.interesses;
    if (!Array.isArray(lista)) falhar('tema_invalido', 'Envie "interesses" como uma lista de temas, por exemplo ["saude","educacao"].');
    const validos = idsDeTemas();
    const ids = [...new Set(lista.map((x) => String(x).trim().toLowerCase()))];
    const ruins = ids.filter((x) => !validos.has(x));
    if (ruins.length) falhar('tema_invalido', `Tema desconhecido: ${ruins.slice(0, 3).join(', ')}. Veja a lista em /dados/categorias.`);
    (preferencias[id] ||= {}).interesses = ids;
    salvar();
    registrarEvento(id, 'interesses_salvos', { quantidade: ids.length });
    return { ok: true, cidadao_id: id, interesses: ids };
  }, {
    area: 'motor_de_dados',
    descricao: '{"interesses":["saude","educacao"]} guarda os temas escolhidos no onboarding (ids de /dados/categorias)',
  });

  rota(['GET'], '/dados/metricas', () => {
    const conta = Object.fromEntries(METRICAS.map(([k]) => [k, 0]));
    const porDia = {};
    const notas = [];
    const resolvido = { sim: 0, em_parte: 0, nao: 0 };
    let naoConsegui = 0;
    const tipoParaChave = new Map(METRICAS.map(([k, t]) => [t, k]));
    for (const e of eventos) {
      const k = tipoParaChave.get(e.tipo);
      if (!k) continue;
      conta[k]++;
      const dia = String(e.ts).slice(0, 10);
      (porDia[dia] ||= Object.fromEntries(METRICAS.slice(0, 5).map(([c]) => [c, 0])));
      if (k in porDia[dia]) porDia[dia][k]++;
      if (e.tipo === 'avaliacao_registrada') {
        if (Number.isInteger(e.nota)) notas.push(e.nota);
        if (e.nao_consegui) naoConsegui++;
        if (e.resolvido in resolvido) resolvido[e.resolvido]++;
      }
    }
    const desde = eventos.length ? eventos[0].ts : null;
    return {
      desde,
      ate: eventos.length ? eventos[eventos.length - 1].ts : null,
      ...conta,
      taxa_de_conclusao: conta.pedidos_criados ? Math.round((conta.pedidos_confirmados / conta.pedidos_criados) * 100) / 100 : null,
      nota_media: notas.length ? Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) * 10) / 10 : null,
      nao_consegui: naoConsegui,
      resolvido,
      rotulos: Object.fromEntries(METRICAS.map(([k, , r]) => [k, r])),
      por_dia: Object.entries(porDia).sort(([a], [b]) => a.localeCompare(b)).map(([dia, v]) => ({ dia, ...v })),
      aviso: 'Contagens do protótipo, com dados fictícios. Os números zeram quando o servidor reinicia.',
    };
  }, {
    area: 'motor_de_dados',
    descricao: 'contagens de uso (pedidos criados, confirmados, avaliados) para a Medição',
  });
}
