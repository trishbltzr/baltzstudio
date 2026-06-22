# Runtime notes — node on PATH

In this environment the plain `node` command is sometimes unavailable. The dev
script resolves it automatically; raw tool calls do not.

## How `scripts/dev.sh` resolves node

It prefers, in order:

1. Codex bundled runtime:
   `~/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin`
2. Local install: `~/.local/node/bin`

…then runs `node node_modules/next/dist/bin/next dev --port ${PORT:-3412}`.

## Raw commands when `node` is missing from PATH

Prefix the bundled runtime path:

```sh
PATH="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node node_modules/typescript/bin/tsc --noEmit

PATH="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  node node_modules/next/dist/bin/next build --webpack
```

If the Codex runtime is absent, substitute `~/.local/node/bin`.

> Source: `AGENTS.md` → Verification, and `.codex/session-handoff.md` → Useful Commands.
