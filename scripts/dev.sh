#!/bin/bash
set -euo pipefail

CODEX_NODE="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin"
LOCAL_NODE="$HOME/.local/node/bin"

if [ -x "$CODEX_NODE/node" ]; then
  export PATH="$CODEX_NODE:$PATH"
elif [ -x "$LOCAL_NODE/node" ]; then
  export PATH="$LOCAL_NODE:$PATH"
fi

cd "$(dirname "$0")/.."
exec node node_modules/next/dist/bin/next dev --port "${PORT:-3412}"
