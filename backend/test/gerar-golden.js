// Gera os golden em test/fixtures/ a partir do código ATUAL. Não faz nada em `npm run teste`
// (o runner carrega todo arquivo de test/, mas sem GERAR_GOLDEN este sai logo).
//
//   GERAR_GOLDEN=1 node test/gerar-golden.js vitrine
//   GERAR_GOLDEN=1 node test/gerar-golden.js http
//   GERAR_GOLDEN=1 node test/gerar-golden.js adaptadores   (ver preservacao-adaptadores.test.js)
//
// Um processo por golden, porque o estado (consentimentos, eventos) é global do processo.
// Só regrave os golden com o código original. Durante a refatoração eles NÃO podem ser regravados.
if (process.env.GERAR_GOLDEN === '1') {
  const alvo = process.argv[2];
  const g = await import('./golden-comum.js');
  if (alvo === 'vitrine' || alvo === 'http') {
    const amb = await g.prepararAmbiente();
    try {
      if (alvo === 'vitrine') {
        const hashes = await g.calcularHashesDaVitrine(amb);
        g.gravarFixture('golden-vitrine.json', { gerado_com: 'código anterior à refatoração', total: Object.keys(hashes).length, hashes });
        console.log(`golden-vitrine.json: ${Object.keys(hashes).length} hashes`);
      } else {
        const entradas = await g.executarCenarioHttp(amb);
        g.gravarFixture('golden-http.json', { gerado_com: 'código anterior à refatoração', total: entradas.length, entradas });
        console.log(`golden-http.json: ${entradas.length} chamadas`);
      }
    } finally { amb.limpar(); }
  } else if (alvo === 'adaptadores') {
    const a = await import('./adaptadores-comum.js');
    const saida = await a.capturarAdaptadores();
    g.gravarFixture('golden-adaptadores.json', { gerado_com: 'código anterior à refatoração', ...saida });
    console.log('golden-adaptadores.json gravado');
  } else {
    console.error('Informe: vitrine | http | adaptadores');
    process.exit(1);
  }
  process.exit(0);
}
