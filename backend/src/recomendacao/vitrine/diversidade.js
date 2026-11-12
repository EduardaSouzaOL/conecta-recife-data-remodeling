// diversidade: no máximo 2 do mesmo órgão nos 5 primeiros, 3 nos demais, 2 repetições do histórico
export function diversificar(pontuados, limite) {
  const escolhidos = [];
  const porOrgao = new Map();
  let repeticoes = 0;
  for (const p of pontuados) {
    if (escolhidos.length >= limite) break;
    const org = p.s.orgao_sigla;
    const max = escolhidos.length < 5 ? 2 : 3;
    if ((porOrgao.get(org) || 0) >= max) continue;
    const ehRepeticao = p.melhor === 'rep';
    if (ehRepeticao && repeticoes >= 1) continue;
    if (ehRepeticao) repeticoes++;
    porOrgao.set(org, (porOrgao.get(org) || 0) + 1);
    escolhidos.push(p);
  }
  return escolhidos;
}

// garante ao menos 1 serviço novo (fora do histórico) com o motivo "Pessoas como você também usam".
// Altera `escolhidos` (e o `melhor` do serviço inserido) no próprio lugar, como antes.
export function garantirServicoNovo(escolhidos, pontuados, ctx, limite) {
  const { hist } = ctx;
  const jaUsados = new Set(hist.map((h) => h[2]));
  const ehNovoPopular = (p) => !jaUsados.has(p.sv) && p.x.m.popular && p.melhor !== 'regra';
  if (limite > 1 && !escolhidos.some((p) => ehNovoPopular(p) && p.melhor === 'pop')) {
    const alvo = pontuados.find((p) => !escolhidos.includes(p) && !jaUsados.has(p.sv) && p.x.m.popular && p.contrib.pop > 0);
    if (alvo) { alvo.melhor = 'pop'; escolhidos[Math.min(escolhidos.length, limite) - 1 >= 0 && escolhidos.length >= limite ? limite - 1 : escolhidos.length] = alvo; }
  }
  return escolhidos;
}
