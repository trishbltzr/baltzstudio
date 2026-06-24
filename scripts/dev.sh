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

PORT="${PORT:-3412}"

if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Port $PORT is already in use."
  echo "Local preview is likely already running at http://localhost:$PORT"
  echo "Set PORT=3413 ./scripts/dev.sh to start another copy."
  exit 0
fi

exec node node_modules/next/dist/bin/next dev --port "$PORT"
