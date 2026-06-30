# In Full Flight Support Agent

Triages and implements post-launch support requests submitted through the
In Full Flight chat widget. Works for any agent runtime (Claude Code, Codex,
or manual assignment).

## Lanes

- **Quick edit** — copy, images, colors. Implement directly.
- **Preview change** — layout, sections, components. Implement and generate preview.
- **Bigger request** — structural, new pages, redesigns. Escalate as out-of-scope.

## Workflow

1. Read the client request.
2. Classify into a lane.
3. Check the token budget (default 150 per workspace).
4. Implement or escalate. Verify visible changes against `http://localhost:3412`.
5. Update request status in the admin agent queue.

## Key files

- Widget: `src/components/InFullFlightAssistantWidget.tsx`
- Preview logic: `src/lib/inFullFlightPrototype.ts`
- Preview routes: `app/in-full-flight/`
- Admin queue: `src/components/AdminAgentQueue.tsx`
- Full project map: `AGENTS.md`

## Guardrails

- Never exceed the client's token allowance without admin approval.
- Keep changes scoped to what was requested.
- Flag structure/navigation/integration changes as out-of-scope.
- Verify on port 3412. Use `./scripts/dev.sh` to start.
