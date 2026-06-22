---
name: verify-build
description: Verify the Baltazar Studio dashboard before handoff — typecheck, production build, and a live preview on port 3412. Use when asked to verify changes, confirm a fix builds, or before committing/handing off.
---

# Verify Build

Run the project's verification gate the way `AGENTS.md` prescribes. Use this
before declaring work done, before a handoff, or whenever the user asks to
confirm changes compile and render.

## Steps

1. **Typecheck** (must pass):
   ```sh
   pnpm run typecheck
   ```
2. **Production build** (use webpack — Turbopack can fail when it cannot spawn
   `node` from PATH in this environment):
   ```sh
   pnpm run build
   ```
3. **Live preview** on the canonical port and confirm the change renders:
   ```sh
   ./scripts/dev.sh          # serves http://localhost:3412
   ```
   Prefer Claude Code's preview tools (snapshot / inspect / console logs) over
   screenshots for verifying exact text, colors, and values.

## If `node` is not on PATH

`scripts/dev.sh` already handles this. For **raw** `tsc` / `next` calls, see
[`runtime-notes.md`](runtime-notes.md) for the PATH-prefixed forms.

## Guardrails

- Always preview on `http://localhost:3412` — do not switch to `127.0.0.1` or
  another port.
- Report results honestly: if typecheck or build fails, surface the output;
  do not claim success.
- Do not reset or revert a dirty tree to make a build pass.
