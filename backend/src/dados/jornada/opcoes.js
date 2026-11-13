import crypto from 'node:crypto';

// ---------- dados de apoio (todos fictícios) ----------

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Próximos dias úteis a partir de amanhã. */
export function proximosDiasUteis(qtd = 10, base = new Date()) {
  const out = [];
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  while (out.length < qtd) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    out.push({ valor: iso(d), rotulo: `${DIAS[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}` });
  }
  return out;
}

export const HORAS = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];

export function ocupado(unidade, data, hora) {
  const h = crypto.createHash('md5').update(`${unidade}|${data}|${hora}`).digest()[0];
  return h % 5 === 0; // ~20% dos horários aparecem como indisponíveis, de forma estável
}

const BAIRROS_RPA = {
  1: 'Centro', 2: 'Beberibe', 3: 'Casa Amarela', 4: 'Madalena', 5: 'Afogados', 6: 'Boa Viagem',
};

export function unidadesDaRpa(rpa) {
  const b = BAIRROS_RPA[rpa] || 'Centro';
  return [
    { valor: `U${rpa}A`, rotulo: `Unidade Demo ${b} (RPA ${rpa})` },
    { valor: `U${rpa}B`, rotulo: `Unidade Demo ${b} II (RPA ${rpa})` },
    { valor: 'UONLINE', rotulo: 'Atendimento online (demo)' },
  ];
}

/** Endereço fictício da unidade (valor como "U3A", "UONLINE"). Nenhum endereço real. */
export function enderecoDaUnidade(valor) {
  if (valor === 'UONLINE') return 'Atendimento pela internet, sem precisar ir ao local.';
  const m = /^U(\d)([AB])$/.exec(String(valor));
  if (!m) return null;
  const b = BAIRROS_RPA[Number(m[1])] || 'Centro';
  return `Rua da Demonstração, ${m[2] === 'A' ? 100 : 200}, ${b}, Recife (endereço fictício).`;
}
export const CANAIS = [
  { valor: 'app', rotulo: 'Avisar pelo app' },
  { valor: 'nenhum', rotulo: 'Não quero avisos' },
];
export const MOTIVOS = [
  { valor: 'primeira_vez', rotulo: 'É a primeira vez' },
  { valor: 'atualizacao', rotulo: 'Atualizar informações' },
  { valor: 'segunda_via', rotulo: 'Segunda via' },
  { valor: 'outro', rotulo: 'Outro motivo' },
];
