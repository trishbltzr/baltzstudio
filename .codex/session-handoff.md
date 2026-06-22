# Codex Session Handoff

Use this file as the quick landing page for future Codex sessions.

## Current State

- Framework: Next.js App Router.
- Package manager files: `pnpm-lock.yaml` and `bun.lock` both exist; use the existing install unless the user asks to refresh dependencies.
- Preview target: `http://localhost:3412`.
- Startup command: `./scripts/dev.sh`.

## Useful Commands

```sh
PATH="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" ./scripts/dev.sh
PATH="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" node node_modules/typescript/bin/tsc --noEmit
PATH="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" node node_modules/next/dist/bin/next build --webpack
```

## Notes For The Next Agent

- `localhost:3412` was requested explicitly; do not silently switch to `127.0.0.1` or another port.
- TypeScript should pass with `tsc --noEmit`.
- Use webpack for production builds in this environment. Turbopack can fail when it cannot spawn `node` from PATH.
- Existing `.claude/` files are part of the project history and should remain.
