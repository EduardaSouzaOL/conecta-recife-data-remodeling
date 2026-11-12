import { CANAIS, MOTIVOS } from './opcoes.js';

// ---------- configuração das telas por serviço ----------

const campoUnidade = { nome: 'unidade', rotulo: 'Onde você quer ser atendido?', tipo: 'select', obrigatorio: true };
const campoData = { nome: 'data', rotulo: 'Dia', tipo: 'select', obrigatorio: true };
const campoHora = { nome: 'hora', rotulo: 'Horário', tipo: 'select', obrigatorio: true };
const campoCanal = { nome: 'canal_aviso', rotulo: 'Como quer receber avisos?', tipo: 'select', obrigatorio: true, opcoes: () => CANAIS };
const campoObs = {
  nome: 'observacao', rotulo: 'Quer acrescentar algo? (opcional)', tipo: 'texto', obrigatorio: false, max: 200,
  ajuda: 'Não escreva CPF, nome completo, telefone, e-mail ou endereço.',
};

const telaLocal = { id: 'local', titulo: 'Escolha o local', campos: [campoUnidade] };
const telaDataHora = { id: 'data_hora', titulo: 'Escolha dia e horário', campos: [campoData, campoHora] };
const telaContato = { id: 'contato', titulo: 'Avisos sobre o seu pedido', campos: [campoCanal] };
const telaRevisar = {
  id: 'revisar', titulo: 'Revise e confirme', revisao: true,
  descricao: 'Confira os dados. O pedido só é feito quando você tocar em confirmar.',
  campos: [],
};

const OVERRIDES = {
  352: { antes: [{
    id: 'sobre', titulo: 'Sobre o atendimento',
    campos: [
      { nome: 'tipo_atendimento', rotulo: 'O que você precisa?', tipo: 'select', obrigatorio: true, opcoes: () => [
        { valor: 'inscricao', rotulo: 'Fazer a primeira inscrição' },
        { valor: 'atualizacao', rotulo: 'Atualizar meu cadastro' },
        { valor: 'comprovante', rotulo: 'Pedir comprovante' },
      ] },
      { nome: 'pessoas_na_familia', rotulo: 'Quantas pessoas moram com você?', tipo: 'numero', obrigatorio: true, min: 1, max: 20 },
    ],
  }] },
  923: { antes: [{
    id: 'sobre', titulo: 'Sobre o documento',
    campos: [
      { nome: 'tipo_via', rotulo: 'Qual via você precisa?', tipo: 'select', obrigatorio: true, opcoes: () => [
        { valor: 'primeira', rotulo: 'Primeira via' },
        { valor: 'segunda', rotulo: 'Segunda via' },
      ] },
    ],
  }] },
  633: { antes: [{
    id: 'sobre', titulo: 'Seu interesse no Compaz',
    campos: [
      { nome: 'atividade', rotulo: 'O que quer fazer?', tipo: 'select', obrigatorio: true, opcoes: () => [
        { valor: 'esporte', rotulo: 'Esporte e lazer' },
        { valor: 'curso', rotulo: 'Cursos e oficinas' },
        { valor: 'cultura', rotulo: 'Cultura' },
        { valor: 'juridico', rotulo: 'Orientação jurídica e social' },
      ] },
    ],
  }] },
};

const DOCUMENTOS = {
  id: 'documentos', titulo: 'Leve estes documentos',
  campos: [{ nome: 'ciente_documentos', rotulo: 'Estou ciente dos documentos necessários', tipo: 'booleano', obrigatorio: true, exigir_verdadeiro: true }],
};

export function telasDoServico(servico) {
  const extra = OVERRIDES[servico.servico_id] || {};
  const antes = extra.antes || [];
  if (servico.natureza === 'Agendamento') {
    const docs = servico.requisitos.length && extra.antes ? [DOCUMENTOS] : [];
    return [...antes, ...docs, telaLocal, telaDataHora, telaContato, telaRevisar];
  }
  const pedido = {
    id: 'pedido', titulo: 'Sobre o seu pedido',
    campos: [
      { nome: 'motivo', rotulo: 'Qual é o motivo?', tipo: 'select', obrigatorio: true, opcoes: () => MOTIVOS },
      campoObs,
    ],
  };
  return [...antes, pedido, telaContato, telaRevisar];
}
