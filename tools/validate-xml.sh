#!/bin/sh
# Verifica que todo XML do repositório (POMs, flows Mule, suítes MUnit, log4j2) está bem-formado.
# Não valida contra os XSDs do Mule: eles exigem o runtime/Anypoint Studio (ver README).
set -eu

cd "$(dirname "$0")/.."

files=$(find . -name '*.xml' -not -path './node_modules/*' -not -path '*/target/*' -not -path './.git/*' | sort)
count=0
for f in $files; do
  xmllint --noout "$f"
  count=$((count + 1))
done

if [ "$count" -eq 0 ]; then
  echo "Nenhum XML encontrado; algo está errado com o caminho." >&2
  exit 1
fi
echo "XML bem-formado: $count arquivos."
