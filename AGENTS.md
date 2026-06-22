# Baltazar Studio Codex Handoff

This is a Claude-origin project that has been migrated into a Next.js App Router dashboard. Keep Claude files in `.claude/` intact, but use these notes when opening or handing over a Codex session.

## Project Shape

- App routes live in `app/`.
- Dashboard code lives in `app/dashboard/page.tsx`.
- Login route lives in `app/login/page.tsx`.
- Shared dashboard components live in `src/`.
- Global styles live in `src/index.css`.

## Local Preview

- Preferred preview URL: `http://localhost:3412`.
- Start preview with `./scripts/dev.sh`.
- If `node` is missing from PATH, `scripts/dev.sh` will prefer Codex's bundled Node runtime at `~/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin`.

## Verification

Run these before handoff when possible:

```sh
./scripts/dev.sh
node node_modules/typescript/bin/tsc --noEmit
node node_modules/next/dist/bin/next build --webpack
```

If the plain `node` command is unavailable, prefix the bundled runtime path:

```sh
PATH="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" node node_modules/typescript/bin/tsc --noEmit
PATH="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" node node_modules/next/dist/bin/next build --webpack
```

## Guardrails

- The repo may already be dirty. Do not reset or revert user/Claude changes unless explicitly asked.
- Keep the current Next.js route structure unless the user asks to restore the older Vite app.
- Use `localhost:3412` when the user asks to preview this project.
- Keep changes scoped; `src/client/ClientTabs.tsx` and `src/admin/AdminTabs.tsx` are large migrated files, so avoid broad refactors unless the task is specifically about them.
