import { dados } from '../carga.js';
import { jornadas, registrarEvento, salvar } from '../store.js';
import { visao } from './visao.js';
import { SERVICOS_ALTERAVEIS, podeCancelar } from './acoes-visao.js';
import { PADRAO_SENSIVEL } from './validacao.js';
import { etapaDoAcompanhamento, acompanhamentoFinalizado } from './acompanhamento.js';

// Ações simuladas sobre um pedido: canais de problema, cancelar, alterar e avaliar.
// Nada é enviado à Prefeitura. Cada ação grava um evento sem texto livre.

const naoEncontrada = { erro: 'jornada_nao_encontrada', mensagem: 'Não encontramos esse pedido.' };
const agora = () => new Date().toISOString();

const OUVIDORIA = [
  { id: 'ouvidoria_link', rotulo: 'Ouvidoria: registrar online', detalhe: 'Registre sua manifestação no site da Ouvidoria.', acao: { tipo: 'abrir_link', url: 'https://ouvidoria.recife.pe.gov.br/registre-sua-manifestacao' } },
  { id: 'ouvidoria_telefone', rotulo: 'Ouvidoria: ligar 0800 281 0040', detalhe: 'Segunda a sexta, das 07h às 17h.', acao: { tipo: 'discar', numero: '08002810040' } },
  { id: 'ouvidoria_email', rotulo: 'Ouvidoria: enviar e-mail', detalhe: 'ouvidoria@recife.pe.gov.br', acao: { tipo: 'abrir_email', endereco: 'ouvidoria@recife.pe.gov.br' } },
  { id: 'ouvidoria_presencial', rotulo: 'Ouvidoria: ir à Prefeitura', detalhe: 'Sede da Prefeitura, Av. Cais do Apolo, 925. Segunda a sexta, das 08h às 17h.', acao: { tipo: 'nenhuma' } },
];

/** Canais do próprio serviço (de servicos.csv) e, depois, a Ouvidoria Geral. Sem dado pessoal nos links. */
export function canaisDeProblema(id) {
  const j = jornadas[id];
  if (!j) return naoEncontrada;
  const s = dados.servicos.get(j.servico_id);
  const canais = [];
  if (s.canal_web) canais.push({ id: 'servico_web', rotulo: 'Site do serviço', detalhe: 'Fale com a equipe do serviço pelo site.', acao: { tipo: 'abrir_link', url: s.canal_web } });
  if (s.canal_app) canais.push({ id: 'servico_app', rotulo: 'Aplicativo do serviço', detalhe: `Código do canal: ${s.canal_app}.`, acao: { tipo: 'abrir_app', codigo: s.canal_app } });
  canais.push(...OUVIDORIA);
  registrarEvento(j.cidadao_id, 'canais_vistos', { servico_id: j.servico_id });
  return { canais: { jornada_id: j.jornada_id, servico: s.nome, texto: 'Se algo deu errado, fale com um destes canais. Eles resolvem o seu caso.', canais } };
}

export function cancelarJornada(id) {
  const j = jornadas[id];
  if (!j) return naoEncontrada;
  if (!podeCancelar(j)) return { erro: 'jornada_encerrada', mensagem: 'Este pedido já foi encerrado e não pode ser cancelado.' };
  j.estado = 'cancelada';
  j.cancelada_em = j.atualizada_em = agora();
  salvar();
  registrarEvento(j.cidadao_id, 'jornada_cancelada', { servico_id: j.servico_id });
  return { jornada: visao(j) };
}

/** Reabre um pedido concluído para o cidadão mudar dados. Mantém os campos; o protocolo anterior fica guardado. */
export function alterarJornada(id) {
  const j = jornadas[id];
  if (!j) return naoEncontrada;
  if (!SERVICOS_ALTERAVEIS.has(j.servico_id)) return { erro: 'alteracao_indisponivel', mensagem: 'Este serviço não permite alterar o pedido pelo app.' };
  if (j.estado !== 'concluida') return { erro: 'jornada_encerrada', mensagem: 'Só dá para alterar um pedido já concluído.' };
  j.protocolo_anterior = j.protocolo;
  delete j.protocolo;
  delete j.concluida_em;
  delete j.avaliacao;
  delete j.acompanhamento;
  j.estado = 'em_andamento';
  j.alterada_em = j.atualizada_em = agora();
  salvar();
  registrarEvento(j.cidadao_id, 'jornada_alterada', { servico_id: j.servico_id });
  return { jornada: visao(j) };
}

/** Nota de 1 a 5 ou "não consegui", uma vez só, em pedido concluído. */
const RESOLVIDO = ['sim', 'em_parte', 'nao'];

export function avaliarJornada(id, { nota, nao_consegui, resolvido, comentario } = {}) {
  const j = jornadas[id];
  if (!j) return naoEncontrada;
  if (j.estado !== 'concluida') return { erro: 'jornada_nao_concluida', mensagem: 'Você pode avaliar depois de concluir o pedido.' };
  if (j.avaliacao) return { erro: 'ja_avaliada', mensagem: 'Você já avaliou este pedido. Obrigado.' };
  const semNota = nao_consegui === true || nao_consegui === 'true';
  const n = Number(nota);
  if (!semNota && !(Number.isInteger(n) && n >= 1 && n <= 5)) return { erro: 'nota_invalida', mensagem: 'Escolha uma nota de 1 a 5 ou toque em "Não consegui".' };
  if (resolvido !== undefined && resolvido !== null && !RESOLVIDO.includes(resolvido)) {
    return { erro: 'avaliacao_invalida', mensagem: 'Diga se resolveu: "sim", "em_parte" ou "nao".' };
  }
  let texto = null;
  if (comentario !== undefined && comentario !== null && comentario !== '') {
    texto = String(comentario).trim();
    if (texto.length > 200) return { erro: 'avaliacao_invalida', mensagem: 'O comentário pode ter até 200 caracteres.' };
    if (PADRAO_SENSIVEL.test(texto)) return { erro: 'avaliacao_invalida', mensagem: 'Por segurança, não escreva CPF, nome completo, telefone, e-mail ou endereço aqui.' };
  }
  const extra = { ...(resolvido ? { resolvido } : {}), ...(texto ? { comentario: texto } : {}) };
  j.avaliacao = semNota ? { nao_consegui: true, ...extra, ts: agora() } : { nota: n, ...extra, ts: agora() };
  j.atualizada_em = j.avaliacao.ts;
  salvar();
  registrarEvento(j.cidadao_id, 'avaliacao_registrada', { servico_id: j.servico_id, ...(semNota ? { nao_consegui: true } : { nota: n }), ...(resolvido ? { resolvido } : {}) });
  return { avaliacao: { jornada_id: j.jornada_id, ...j.avaliacao, mensagem: 'Obrigado por avaliar.' } };
}

/** Demonstração: passa o pedido confirmado para a próxima etapa (por exemplo, de "Aguardando confirmação da unidade" para "Consulta confirmada"). */
export function avancarPedido(id) {
  const j = jornadas[id];
  if (!j) return naoEncontrada;
  if (j.estado !== 'concluida') return { erro: 'jornada_nao_concluida', mensagem: 'Só dá para avançar um pedido que já foi confirmado.' };
  if (acompanhamentoFinalizado(j)) return { erro: 'etapa_final', mensagem: 'Este pedido já está na última etapa.' };
  j.acompanhamento = etapaDoAcompanhamento(j) + 1;
  j.atualizada_em = agora();
  salvar();
  registrarEvento(j.cidadao_id, 'pedido_avancado', { servico_id: j.servico_id, etapa: j.acompanhamento });
  return { jornada: visao(j) };
}
