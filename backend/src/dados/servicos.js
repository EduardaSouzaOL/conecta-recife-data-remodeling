import { dados } from './carga.js';

// Motor de dados: leituras do catálogo de serviços e pequenos formatadores compartilhados.

const NATUREZAS_COM_JORNADA = new Set(['Agendamento', 'Peticionador (formulário)', 'Inscrição', 'Emissão de documentos']);

/** O serviço pode ser pedido pelo app no protótipo (tem jornada com etapas)? */
export const temJornada = (servico) => !!servico && NATUREZAS_COM_JORNADA.has(servico.natureza);

/** "2026-06-03" vira "03/06/2026". */
export const dataBR = (iso) => iso.split('-').reverse().join('/');

/** Encurta um texto sem cortar no meio da palavra final. */
export const curto = (s, n = 80) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

/** Detalhe do serviço para a tela de detalhe (sem dado pessoal). */
export function detalheServico(id) {
  const s = dados.servicos.get(Number(id));
  if (!s) return null;
  return {
    servico_id: s.servico_id, nome: s.nome, orgao: s.orgao, orgao_sigla: s.orgao_sigla, temas: s.temas,
    tipo_servico: s.natureza, descricao: s.descricao, requisitos: s.requisitos, passos: s.passos,
    gratuito: s.gratuito, nota_media: s.nota_media, jornada_disponivel: temJornada(s),
  };
}
