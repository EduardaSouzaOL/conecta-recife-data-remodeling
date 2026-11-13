// Gera data/recomendacoes.csv: 10 sugestões de serviço NOVO para cada um dos cidadãos de cidadaos.csv.
// Uso: node scripts/gerar-recomendacoes.js
import fs from 'node:fs';
import path from 'node:path';
import { carregarDados, dados, DIR_DATA } from '../src/dados/carga.js';
import { carregarDerivados } from '../src/recomendacao/derivados.js';
import { construirRanking } from '../src/recomendacao/ranking-arquivo.js';

// Texto neutro: nunca cita saúde nem o serviço de origem (sem consentimento, LGPD art. 11).
const MOTIVO = 'Pessoas com um perfil parecido com o seu também usam este serviço.';

await carregarDados();
const derivados = await carregarDerivados();
const rk = construirRanking(derivados);

const ids = [...dados.cidadaos.keys()].sort();
const linhas = ['cidadao_id,posicao,servico_id,motivo'];
for (const id of ids) {
  rk.sugerir(id, 10).forEach((sv, i) => linhas.push(`${id},${i + 1},${sv},"${MOTIVO}"`));
}
const arq = path.join(DIR_DATA, 'recomendacoes.csv');
fs.writeFileSync(arq, linhas.join('\n') + '\n', 'utf8');

// validação
const por = new Map();
for (const l of linhas.slice(1)) {
  const [id, pos, sv] = l.split(',');
  if (!dados.servicos.has(Number(sv))) throw new Error(`servico_id inexistente: ${sv}`);
  const a = por.get(id) || { pos: new Set(), sv: new Set() };
  if (a.pos.has(pos) || a.sv.has(sv)) throw new Error(`repetição para ${id}`);
  if (Number(pos) < 1 || Number(pos) > 10) throw new Error(`posicao inválida: ${pos}`);
  a.pos.add(pos); a.sv.add(sv); por.set(id, a);
}
const semLinha = ids.filter((id) => !por.has(id));
if (por.size !== dados.cidadaos.size || semLinha.length) throw new Error(`faltam cidadãos: ${semLinha.length}`);
console.log(`[recomendacoes] ${por.size} cidadãos, ${linhas.length - 1} linhas -> ${arq}`);
