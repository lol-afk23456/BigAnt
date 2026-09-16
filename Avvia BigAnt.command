#!/bin/bash
cd "$(dirname "$0")" || exit 1
export PATH="$PWD/.local/runtime/bin:$PWD/.local/tooling/node_modules/.bin:$PATH"
if ! node -e 'process.exit(Number(process.versions.node.split(".")[0])===22?0:1)' 2>/dev/null || ! command -v pnpm >/dev/null; then
  echo "Servono Node 22 e pnpm 10. Segui README.md, sezione Avvio sul Mac."
  read -r -p "Premi Invio per chiudere. "
  exit 1
fi
pnpm local
read -r -p "BigAnt fermato. Premi Invio per chiudere. "
