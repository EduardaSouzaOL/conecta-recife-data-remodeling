import fs from 'node:fs';
import readline from 'node:readline';

// Quebra um registro CSV (que pode ter aspas e vírgulas dentro das aspas).
function parseRegistro(texto) {
  const campos = [];
  let atual = '';
  let dentroAspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (dentroAspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') { atual += '"'; i++; } else dentroAspas = false;
      } else atual += c;
    } else if (c === '"') dentroAspas = true;
    else if (c === ',') { campos.push(atual); atual = ''; }
    else atual += c;
  }
  campos.push(atual);
  return campos;
}

/**
 * Lê um CSV em streaming. Chama onLinha(objeto) por registro, usando o cabeçalho como chaves.
 * Suporta campos com quebra de linha dentro de aspas (servicos.csv). Caminho rápido para linhas sem aspas.
 */
export async function lerCsv(caminho, onLinha) {
  const rl = readline.createInterface({
    input: fs.createReadStream(caminho, { encoding: 'utf8', highWaterMark: 1 << 20 }),
    crlfDelay: Infinity,
  });
  let cab = null;
  let pendente = null;
  const emitir = (campos) => {
    if (!cab) { cab = campos.map((c) => c.replace(/^\uFEFF/, '').trim()); return; }
    const obj = {};
    for (let i = 0; i < cab.length; i++) obj[cab[i]] = campos[i] ?? '';
    onLinha(obj);
  };
  for await (const linha of rl) {
    if (pendente !== null) {
      pendente += '\n' + linha;
      if (((pendente.match(/"/g) || []).length & 1) === 0) { emitir(parseRegistro(pendente)); pendente = null; }
      continue;
    }
    if (linha.indexOf('"') === -1) {
      if (linha === '') continue;
      emitir(linha.split(','));
    } else if (((linha.match(/"/g) || []).length & 1) === 0) {
      emitir(parseRegistro(linha));
    } else pendente = linha;
  }
  if (pendente !== null) emitir(parseRegistro(pendente));
}
