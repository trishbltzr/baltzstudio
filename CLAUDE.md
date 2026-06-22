# CLAUDE.md — Claude Code adapter

This file is the **Claude-facing adapter** for the Baltazar Studio dashboard.
It does **not** restate everything; the canonical project knowledge lives in
[`AGENTS.md`](AGENTS.md) (originally written for Codex). Read `AGENTS.md` first
for the authoritative **Project Shape**, **Verification**, and **Guardrails**.
This file only adds the Claude-specific map, commands, and pointers.

> Source of truth: `AGENTS.md`. Quick Codex landing page: `.codex/session-handoff.md`.
> When project facts change, update `AGENTS.md` — keep this adapter thin.

## Project map

```
app/                       Next.js App Router routes
  layout.tsx               root layout
  page.tsx                 root route
  dashboard/page.tsx       main dashboard entry
  login/page.tsx           login route
src/
  admin/
    AdminTabs.tsx          admin dashboard tabs   ⚠ large migrated file
    AdminView.tsx          admin shell/sidebar
  client/
    ClientTabs.tsx         client dashboard tabs  ⚠ large migrated file
  components/              widgets, notifications, modals, sidebar, login,
                          file hub, task center, legal, mobile nav, etc.
  data/mockProjects.ts     mock project data
  hooks/use-mobile.ts      responsive hook
  lib/
    projectUtils.ts        progress/lifecycle helpers
    projectMutations.ts    state mutation helpers
  styles/*.css             domain stylesheets (split from the old monolith)
  index.css                thin @import entrypoint for src/styles/*
  types.ts                 shared types
scripts/dev.sh             starts Next dev on port 3412 (handles node-on-PATH)
public/                    static assets
```

Planning / spec docs (treat as central, update in the same pass as the work):
`DASHBOARD_UX_COMMENTS_PLAN.md`, `BALTZ_DASHBOARD_WORKFLOW_ALIGNMENT_TASKS.md`,
`BALTZ_SERVICE_WORKFLOW_MAP.md`.

## Commands

Preview target is always `http://localhost:3412` (do not silently switch ports).

```sh
./scripts/dev.sh                                   # dev server on :3412
pnpm run typecheck                                 # tsc --noEmit
pnpm run build                                      # next build --webpack
```

If `node` is not on PATH (common here), `scripts/dev.sh` already prefers a
bundled runtime. For raw `tsc`/`next` calls, prefix the runtime path — see
`AGENTS.md` → **Verification** and `.claude/skills/verify-build/` for the
exact incantations.

## Guardrails (Claude-specific reminders)

These mirror `AGENTS.md` → **Guardrails**; read that section for the full list.

- Keep changes **scoped**. `src/client/ClientTabs.tsx` and
  `src/admin/AdminTabs.tsx` are large; avoid broad refactors unless the task is
  specifically about them. Note: some UI (e.g. phase cards) renders from **more
  than one block** in these files — change every relevant block.
- Keep the current **Next.js App Router** structure (don't restore the old Vite app).
- The working tree may be dirty. **Do not reset or revert** user/Claude changes
  unless explicitly asked.
- Use Claude Code's preview tools against `:3412` to verify visible changes;
  prefer DOM/inspect checks over screenshots for exact values.
- CSS lives in `src/styles/*.css` (imported by `src/index.css`), not in one
  monolith — edit the relevant domain file.

## Skills & agents

- `.claude/skills/` — reusable Claude skills scaffolded from project knowledge.
- `.claude/agents/` — Claude subagents (Markdown) scaffolded from project knowledge.

These were authored from `AGENTS.md` + `.codex/session-handoff.md` (this repo has
no `.agents/skills/` or `.codex/agents/*.toml` to copy from). If real Codex skills/
agents are added later, mirror them here and keep each `SKILL.md` with its support
files.
