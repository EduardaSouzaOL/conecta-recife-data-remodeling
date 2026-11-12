import { HORAS, ocupado, proximosDiasUteis, unidadesDaRpa } from './opcoes.js';

// ---------- validação ----------

const PADRAO_SENSIVEL = /\d{3}\.?\d{3}\.?\d{3}-?\d{2}|\b\d{8,}\b|\(?\d{2}\)?\s?9?\d{4}-?\d{4}|\S+@\S+\.\S+|\b(rua|avenida|av\.|travessa)\s/i;

export function opcoesDoCampo(campo, ctx) {
  if (campo.nome === 'unidade') return unidadesDaRpa(ctx.rpa);
  if (campo.nome === 'data') return proximosDiasUteis(10);
  if (campo.nome === 'hora') {
    if (!ctx.campos.unidade || !ctx.campos.data) return [];
    return HORAS.filter((h) => !ocupado(ctx.campos.unidade, ctx.campos.data, h)).map((h) => ({ valor: h, rotulo: h }));
  }
  return campo.opcoes ? campo.opcoes(ctx) : undefined;
}

/** Retorna { valor } normalizado ou { erro }. */
export function validar(campo, bruto, ctx) {
  if (bruto === undefined || bruto === null || bruto === '') {
    return campo.obrigatorio ? { erro: `Preencha: ${campo.rotulo}` } : { valor: undefined };
  }
  switch (campo.tipo) {
    case 'select': {
      const ops = opcoesDoCampo(campo, ctx) || [];
      const ok = ops.find((o) => o.valor === String(bruto));
      return ok ? { valor: ok.valor } : { erro: campo.nome === 'hora' ? 'Esse horário não está disponível. Escolha outro.' : 'Escolha uma das opções da lista.' };
    }
    case 'numero': {
      const n = Number(bruto);
      if (!Number.isInteger(n) || n < campo.min || n > campo.max) return { erro: `Informe um número de ${campo.min} a ${campo.max}.` };
      return { valor: n };
    }
    case 'booleano': {
      const v = bruto === true || bruto === 'true';
      if (campo.exigir_verdadeiro && !v) return { erro: 'Para continuar, marque que está ciente.' };
      return { valor: v };
    }
    case 'texto': {
      const t = String(bruto).trim();
      if (t.length > campo.max) return { erro: `Use no máximo ${campo.max} caracteres.` };
      if (PADRAO_SENSIVEL.test(t)) return { erro: 'Por segurança, não escreva CPF, nome completo, telefone, e-mail ou endereço aqui.' };
      return { valor: t };
    }
    default:
      return { erro: 'Campo inválido.' };
  }
}

export function todosValidos(tela, ctx) {
  return tela.campos.every((c) => {
    const v = ctx.campos[c.nome];
    if (v === undefined) return !c.obrigatorio;
    return !validar(c, v, ctx).erro;
  });
}
