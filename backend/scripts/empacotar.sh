#!/usr/bin/env bash
# Gera backend/build/conecta-api.zip para o AWS Lambda.
# Inclui: src/, package.json, 4 CSVs em bd/ e derivados.json em data-seed/.
# Nunca inclui: visitas_sem_login.csv, estado.json, tools/painel.html.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BD="$RAIZ/../BD"
SAIDA="$RAIZ/build"
PKG="$SAIDA/pkg"

[ -f "$RAIZ/data/derivados.json" ] || { echo "Falta data/derivados.json. Rode: npm run derivar" >&2; exit 1; }
for f in cidadaos historico servicos uso_semanal; do
  [ -f "$BD/$f.csv" ] || { echo "Falta BD/$f.csv" >&2; exit 1; }
done
VERSAO="$(node -e "console.log(JSON.parse(require('fs').readFileSync('$RAIZ/data/derivados.json','utf8')).versao)")"
[ "$VERSAO" = "2" ] || { echo "derivados.json com versão $VERSAO (esperado 2). Rode: npm run derivar" >&2; exit 1; }

rm -rf "$SAIDA"
mkdir -p "$PKG/bd" "$PKG/data-seed"
cp -r "$RAIZ/src" "$PKG/src"
cp "$RAIZ/package.json" "$PKG/package.json"
for f in cidadaos historico servicos uso_semanal; do cp "$BD/$f.csv" "$PKG/bd/$f.csv"; done
cp "$RAIZ/data/derivados.json" "$PKG/data-seed/derivados.json"

( cd "$PKG" && zip -qr -9 "$SAIDA/conecta-api.zip" . )

# Conferências
if unzip -l "$SAIDA/conecta-api.zip" | grep -Eq 'visitas_sem_login|estado\.json|painel\.html'; then
  echo "ERRO: arquivo proibido dentro do pacote" >&2; exit 1
fi
echo "Pacote: $SAIDA/conecta-api.zip"
du -h "$SAIDA/conecta-api.zip" | cut -f1 | sed 's/^/Tamanho do zip: /'
du -sh "$PKG" | cut -f1 | sed 's/^/Tamanho descompactado: /'
