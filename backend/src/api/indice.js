const CHAVE_DA_AREA = ['motor_de_dados', 'motor_de_recomendacao'];

/** Chave do índice: método principal + caminho com `{id}` + sufixo de consulta do `doc`. */
const chaveDaRota = (r) => `${r.metodos[0]} ${r.padrao.replace(/:(\w+)/g, '{$1}')}${r.doc.consulta ?? ''}`;

/**
 * Gera o índice de `GET /` a partir das rotas registradas (`criarRoteador().rotas()`).
 * Só entram rotas com `doc` (aliases legados, `/health` e `/` ficam de fora), na ordem de registro.
 */
export function gerarIndice(rotas) {
  const indice = { nome: 'API do protótipo Conecta Recife (dados fictícios)' };
  for (const area of CHAVE_DA_AREA) indice[area] = {};
  const documentadas = rotas.filter((r) => r.doc).sort((a, b) => a.ordem - b.ordem);
  for (const r of documentadas) {
    indice[r.doc.area] ??= {};
    indice[r.doc.area][chaveDaRota(r)] = r.doc.descricao;
  }
  indice.saude_da_api = 'GET /health';
  return indice;
}
