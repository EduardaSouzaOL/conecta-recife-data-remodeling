import { dados } from '../dados/carga.js';
import { FINALIDADE_SAUDE, FINALIDADE_ACESSIBILIDADE, finalidadeValida } from '../dados/consentimento.js';
import { buscarCidadao } from '../dados/perfil.js';
import { falhar } from './erros.js';

/**
 * Funções de entrada: o único lugar que diz de onde cada parâmetro pode vir
 * (`corpo`, `consulta` ou os dois, nesta ordem) e como é validado.
 */

/** Lê `nome` do corpo e, se ausente, da consulta. */
export function lerCampo(corpo, consulta, nome) {
  return corpo?.[nome] ?? consulta?.[nome];
}

/** Resolve o `cidadao_id` ou lança o erro claro que o Kodiak mostra na tela de erro. Devolve `{ id, reg }`. */
export function identificarCidadao(bruto) {
  const r = buscarCidadao(bruto);
  if (r.erro === 'id_invalido') falhar('id_invalido', 'Código inválido. Use o formato C000001 (ou só o número, como 1).');
  if (r.erro) falhar(r.erro, `Não encontramos o cidadão ${r.id}. Os códigos vão de C000001 a C${String(dados.cidadaos.size).padStart(6, '0')}.`);
  return r;
}

/** Finalidade do consentimento (corpo, depois consulta). Padrão: saúde. */
export function lerFinalidade(corpo, consulta) {
  const f = lerCampo(corpo, consulta, 'finalidade') ?? FINALIDADE_SAUDE;
  if (!finalidadeValida(f)) falhar('finalidade_invalida', `A finalidade deve ser "${FINALIDADE_SAUDE}" ou "${FINALIDADE_ACESSIBILIDADE}".`);
  return f;
}

/** Quantidade de itens da vitrine (corpo, depois consulta). Padrão 8, de 1 a 20. */
export function lerLimite(corpo, consulta) {
  return Math.min(20, Math.max(1, Number(lerCampo(corpo, consulta, 'limite') ?? 8) || 8));
}

/** `campos` da jornada (só no corpo). Aceita objeto ou texto JSON. */
export function lerCampos(corpo) {
  let campos = corpo?.campos;
  if (typeof campos === 'string') {
    try { campos = JSON.parse(campos); } catch { falhar('campos_invalidos', 'Os campos devem ser um objeto.'); }
  }
  return campos;
}

/** Tela pedida na jornada (corpo, depois consulta). Opcional. */
export function lerTela(corpo, consulta) {
  return lerCampo(corpo, consulta, 'tela');
}

/** Valor bruto de `confirmar` (corpo, depois consulta). Quem compara com `true` é o domínio. */
export function lerConfirmar(corpo, consulta) {
  return lerCampo(corpo, consulta, 'confirmar');
}

/** Tipo de evento (só no corpo), validado contra a lista de tipos permitidos. */
export function lerTipoDeEvento(corpo, permitidos) {
  if (!permitidos.has(corpo?.tipo)) falhar('evento_invalido', 'Tipo de evento não permitido.');
  return corpo.tipo;
}
