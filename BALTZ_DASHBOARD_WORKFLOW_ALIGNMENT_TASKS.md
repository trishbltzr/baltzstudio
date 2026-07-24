# Baltazar Studio Dashboard Workflow Alignment Tasks

Source: `BALTZ_SERVICE_WORKFLOW_MAP.md`

Target: `/dashboard` Next.js dashboard at `http://localhost:3412`

Workspace: `/Users/trishabltzr/baltazarstudio`

External surface: the landing page lives in a different repo and is previewed at `http://localhost:3411`. Do not implement landing-page UI in this repository.

Data mode for now: use dummy/mock lead, signup, payment, audit, and access data inside this dashboard repo until the external landing page and backend integrations are ready.

Central sync rule: whenever `BALTZ_SERVICE_WORKFLOW_MAP.md` changes, update this checklist in the same turn so workflow decisions and implementation tasks stay aligned.

Implementation hold: do not implement billing, AI automations, automation, or unclear workflow behavior until those details are confirmed. For now, safe implementation work is limited to static/mock workflow visibility, assignee clarity, role-safe labels, and non-automated UI polish.

## Progress Legend

- `[ ]` Not started
- `[~]` In progress or drafted, verification pending
- `[x]` Completed and verified, or completed as a planning artifact
- `[!]` Blocked or needs a decision before implementation

## Workflow

Proceed one checklist item at a time:

1. Update the workflow map first when the business logic changes.
2. Update this task checklist immediately after the workflow map changes.
3. Implement the next open dashboard item in the smallest safe slice.
4. Verify with targeted checks.
5. Update this markdown file in real time.
6. Run broader verification before marking a batch complete.

---

## Current Alignment Summary

- [x] **Workflow source created:** `BALTZ_SERVICE_WORKFLOW_MAP.md` now defines the Cocoon Consult to WIAW to In Full Flight journey.
- [x] **Current process snapshot added:** `BALTZ_SERVICE_WORKFLOW_MAP.md` now includes a plain-English website development process view with the next client and implementation stages.
- [x] **Assignees and dynamic notifications added:** `BALTZ_SERVICE_WORKFLOW_MAP.md` now specifies task owners, completion notifications, recipients, and dynamic notification requirements.
- [x] **Dashboard alignment checklist created:** this file tracks implementation tasks separately from the workflow map.
- [x] **Current dashboard surfaces inspected:** `app/dashboard/page.tsx`, `src/client/ClientTabs.tsx`, `src/admin/AdminView.tsx`, `src/types.ts`, `src/data/mockProjects.ts`, `src/components/notifications.tsx`, and `src/lib/projectMutations.ts`.
- [x] **Access model clarified:** paid Cocoon Consult includes three-month dashboard access plus a 24-hour guidance window; WIAW includes unlimited dashboard access while working with Baltazar Studio.
- [x] **Billing model clarified:** billing is manual through Wise, with payment emails and QR/payment details.
- [x] **Cocoon Console renamed:** workflow language now uses `Cocoon Consult Workspace`.
- [x] **System and AI actions added to source workflow:** white-labeled audits, Wise payment emails, notifications, access timers, dashboard creation, AI review gates, and dashboard deletion scheduling are now mapped.
- [x] **Landing page boundary clarified:** landing page lives outside this repo on `localhost:3411`; this repo should use dummy/mock signup data for now.
- [x] **Dashboard implementation alignment:** the preview dashboard now has lifecycle mock states, Cocoon audit preview behavior, Wise/access copy, shared admin/client selected-client state, and verified route/build checks. Deeper production automation remains intentionally out of scope until the full structure is finalized.
- [x] **Evidence-based SEO audit checklist:** SEO audits use 27 relevant checks across Crawlability & indexation, On-page content signals, Architecture & internal linking, Technical experience, and AIO/GEO & measurement; crawl-supported checks are evaluated automatically while qualitative or connected-data checks remain for review.
- [x] **Categorized SEO checklist presentation:** reveal the 27 checks inside five labeled category panels, with each row showing its title on the first line and evidence or a short description on the second.
- [x] **Shared audit loading state:** Website Audit and SEO Audit use one guided loading component; SEO applies it to CSV/sample processing and live sitemap crawling before opening the findings.
- [x] **SEO audit evidence and page actions:** limit crawl inputs to CSV upload or sitemap crawl, retain every imported CSV column in the report, classify every URL as Keep, Improve, No-index, Delete, Redirect, or Consolidate, and carry duplicate redirect targets and removal instructions into the roadmap in the same SEO Audit workspace.
- [x] **Client-facing SEO report:** lead with a visual health story, page-decision mix, issue-concentration chart, and plain-language next steps; show changed pages before technical evidence; keep the studio readiness gate internal and route clients directly to `Your report`.
- [x] **Evidence-based SEO readiness:** automatically evaluate only checks proved by the crawl/public site, retain the evidence source in the report, and leave backend-only requirements for client or administrator confirmation.
- [x] **Website Audit visual parity:** use readiness score and evidence coverage, separate crawl evidence, category bars, vertical audited-page and decision registers, and original checklist result cards in SEO reports.
- [x] **SEO workflow consolidation:** keep crawl, audit, report, keywords and page mapping, metadata and information architecture, and roadmap stages in one SEO Audit workspace; remove the duplicate SEO Builder navigation entry.
- [x] **SEO crawl workspace:** combine data-source controls and the site inventory on one screen so every CSV upload or sitemap crawl updates the page register automatically.
- [x] **SEO final stage order:** present Crawl & inventory, Audit findings, Keywords & pages, Report & priorities, and Action plan; Action plan contains metadata, proposed IA, and the delivery roadmap.
- [x] **Inline SEO readiness:** place readiness directly in Audit findings as a collapsed one-column checklist with a single-line explanation and clear status per item; remove separate readiness navigation and report duplication.
- [x] **Filterable crawl columns:** keep six essential Crawled pages columns visible by default, let users add or remove imported fields from an icon-only filter beside Search, provide Essential and All presets, and keep Search in its original toolbar position.
- [x] **Progressive audit evidence:** keep Pages audited collapsed by default in Report & priorities, and reveal or hide its vertical register from one button in the Crawl report card.
- [x] **Unified keyword planning:** combine keyword opportunities and page mapping in the Keywords & pages stage, with summary metrics, a visual opportunity matrix, and one vertical current-page-to-destination register.
- [x] **Audit-finding visual consistency:** stretch Crawl composition and Crawl depth to equal heights, and show finding severity as a compact flag beside the row count instead of a leading status pill.
- [x] **AIO/GEO audit coverage:** include AI crawler access, answer readiness, entity clarity, citation signals, and discovery measurement inside the 27-item SEO audit checklist, alongside the visual AI discovery score and executable Roadmap tasks.
- [x] **Guided SEO visualizations:** use a shared accessible tooltip for hover, focus, and tap across SEO graphs, with exact values and complete URL lists wherever a mark represents crawled pages.
- [x] **SEO report register alignment:** keep page, finding and next step, and action in stable desktop columns; stack the explanation beneath the page and action on mobile; use recognizable glyphs in consistent circular recommendation-card holders.
- [x] **Production AI source wiring:** use the renamed per-feature OpenAI keys for Web Audit, SEO Audit, Funnel Builder, Social Media Builder, and Chat; remove active demo login, sample crawl, and hardcoded social-plan generators while retaining only explicitly documented landing-page placeholder data.
- [x] **Service playbooks synchronized:** all Brand Audit, Website Audit, SEO Audit, Funnel Build, Website Build, Social Media, and SEO Planning manuals now reflect server-side AI generation, source preservation, studio review, approval-only standard-client delivery, and direct engine access for active In Full Flight partners.
- [x] **Canonical service process contract:** `src/portal/processDefinitions.ts` now defines the versioned service, category, ordered stages, owners, access, requirements, outputs, next actions, approval gates, final output, and typed handoff target for all seven active service playbooks. Brand, Website, Funnel, and Website Build rails read their stage IDs and labels from this shared source; SEO records its five-stage internal process and three-stage client presentation in the same definition.
- [x] **Versioned client process runs:** guided Brand, Website, Funnel, and Website Build sessions now persist a client-specific run with an immutable template snapshot; SEO and Social save the same run contract beside engine work, and Funnel plans retain the originating run. Existing records remain backward compatible and are upgraded on their next save instead of being silently rewritten.
- [x] **Shared role-safe process tracker:** Snapshot now derives current stage, progress, next owner, next action, approval blocker, due state, and destination from the process-run contract for Admin, Manager, and Client. Internal stages collapse to client-safe Studio review language, and legacy engine records remain visible through a compatibility adapter.
- [x] **Shared stage transition guard:** every versioned process run now evaluates requested movement against its frozen ordered-stage snapshot, refuses skipped or unknown stages, and exposes approval or prerequisite blockers without automating approval or advancement. Legacy engine adapters explicitly identify completed preceding stages so existing saved work remains compatible.
- [x] **Persisted Checkup-to-Lab handoffs:** completed Brand and Website Checkups now create an explicit typed handoff into Website Lab, carrying only sanitized client-supplied context plus source-run and template-version traceability. Website Lab marks the handoff accepted, links its process run to the source, and retains the old browser key only as a navigation/legacy fallback; restarting the source audit removes stale handoffs.
- [x] **Durable handoff package:** the persisted Checkup-to-Lab record now includes output version, approved scope, included recommendations, unresolved evidence, approval state, sender and receiver, timestamps, and the IDs of imported implementation To-do's. Approval and messaging remain explicit; the record traces a handoff but does not automate one.
- [x] **Standard AI review lifecycle:** use one persisted `Not generated → Draft → Needs review → Approved → Shared` contract across guided Checkups and Labs, Funnel cards, Social Media planning, and Approvals. Keep request-changes as an explicit return to Draft and keep human approval and sharing actions as the only route into Approved and Shared. Live verification confirmed `Draft`, `Needs review`, and `Not generated` across the seeded Social Media projects and `Draft` on the CreatorIQ Funnel; TypeScript and the production build pass.
- [x] **Client capability access:** use one service-derived capability profile across navigation, direct routes, Checkups, Labs, reports, and stage controls. Standard clients keep the shared Checkup skeleton, intake, tracking, approved outputs, feedback, and Approvals; collaborative and In Full Flight clients may enter selected live Lab stages; evidence, studio approval, task import, reset, proposal publishing, and output publishing remain internal. Live verification confirms CreatorIQ receives Checkups without Labs, approved action-plan access without studio controls, and a Checkup-only process tracker; Admin retains both engines. TypeScript, diff check, and the production build pass.
- [x] **Immutable process-run history:** every versioned run now records creation, stage changes, approval waits, completion, and accepted-handoff linkage as normalized append-only events. Repeated autosaves do not duplicate an unchanged event, and older saved runs receive a backward-compatible creation event when normalized.
- [x] **Builder note continuity and complete wireframes:** Website and Funnel Builders read saved client workspace notes before copy generation, conflicts stay reviewable, and Funnel Builder exposes five distinct design styles across the complete conversion-page section inventory.
- [x] **Funnel plan delivery actions:** keep the task checklist inside the final Development Plan below its actions, generate and preview an actual printable PDF, and persist shared plans into Approvals before exposing a copyable client review link.

## Current Dashboard Snapshot

- [x] Client/admin role switching is removed from `/dashboard`; role access is controlled by login session.
- [x] Client Cocoon onboarding flow exists with saved form progress.
- [x] Generated audit placeholder exists.
- [x] Guided Cocoon audit call booking UI exists inside the Cocoon flow.
- [x] WIAW-style milestones, phases, tasks, files, gates, and approvals exist.
- [x] Admin project overview, reviews, assets, audit, notes, users, and notifications exist.
- [x] Client billing tab exists.
- [x] Client notification center exists.
- [x] Client locked-state logic exists for pre-Cocoon and non-WIAW collaboration states.
- [x] Admin/client sidebar parity patterns exist.
- [x] Admin and Client plan restrictions now read from one shared `planAccess(project)` contract.
- [x] Client-facing lifecycle samples are consolidated into Cocoon Consult and WIAW paths; Paid Cocoon is reached through the payment handoff, not a visible dev tab.
- [x] Notifications are assignee-aware and event-driven. Current task/lifecycle state derives role-targeted events with stable source versions, deep links, review gates, and read reconciliation instead of a global sample list.
- [x] Current notification trigger logic is documented in `BALTZ_SERVICE_WORKFLOW_MAP.md`: workflow records, gate statuses, and completed phases currently derive the visible notifications at render time.
- [x] Task assignees use a backward-compatible structured assignment contract and appear in task lists/detail rows with role-safe labels. Staff can assign Client, Studio Admin, Superadmin, Manager, Baltz AI, or shared Client + Studio Admin ownership from the task modal.

## Portal Stabilization Pass

- [x] Admin, manager, and client roles now share one permission source in `src/lib/rolePermissions.ts`.
- [x] Manager keeps the admin shell layout but no longer sees plan-change controls or global configuration/settings controls.
- [x] Admin shell navigation remains dashboard-first: `Launch Pad`, `Notifications`, `Manage > Clients`, and admin-only `Manage > Configurations`.
- [x] Project navigation remains project-specific: `Overview`, `Milestones`, and `Files`.
- [x] Heavy dashboard surfaces are lazy-loaded: milestones, files, brand guidelines, notifications, contract modal, and portfolio task panels.
- [x] Old landing/copy reference files are archived under `docs/archive/landing-copy` instead of living beside dashboard source.
- [x] No billing tables, AI automation tables, automation execution logic, or new public API routes were added in this pass.
- [x] Verification passed with `tsc --noEmit`, `next build --webpack`, and local `200 OK` checks for `/login` and `/dashboard`.

## Recent Website Development Updates To Implement

Source: recent updates added to `BALTZ_SERVICE_WORKFLOW_MAP.md` under **Current Website Development Process Snapshot** and **Assignees And Dynamic Notifications**.

### Process Stages

- [x] Document Stage 1: Lead Capture in the external landing-page repo at `localhost:3411`.
- [x] Document Stage 2: Cocoon Consult Intake in the dashboard workflow.
- [x] Document Stage 3: Audit Review with first AI pass, second AI pass, human review, and client-safe results.
- [x] Document Stage 4: Paid Cocoon Consult with Wise payment, booking unlock, three-month dashboard access, and 24-hour guidance window.
- [x] Document Stage 5: Strategy Handoff into workflow, dashboard path, booking link, funnel structure, or website build plan.
- [x] Document Stage 6: Winged In A Week as the implementation/build stage after Cocoon.
- [x] Document Stage 7: In Full Flight as the post-launch support layer.
- [x] Document Stage 8: Nurture and access end as lifecycle/system behavior, not a visible client tab.

### Dashboard Work Still Needed From Those Updates

- [x] Add a dashboard-facing process/status view that shows the client's current website development stage and the next stage. Snapshot process cards and the staff lifecycle record expose current stage, next stage, owner, blocker, and next action.
- [x] Add task assignee data for Client, Studio Admin, Superadmin, Manager, AI/System, and shared Client + Studio Admin work.
- [x] Show assignee ownership on task rows, approval gates, and admin workflow queues.
- [x] Add role-safe assignee display rules so clients never see Superadmin-only or internal AI/system ownership details. To-do boards, filters, calendar details, and task modals use `Your task`, `Studio task`, and `Shared review` in Client mode.
- [x] Convert lifecycle notifications from static sample records into notifications generated from task and workflow events. The shared portal shell derives typed, assignee-aware events from persisted state; external background sends remain deliberately separate from the in-app notification contract.
- [x] Link each completed task type to a notification recipient, message, next action, and destination tab/section in the shared portal digest.
  - Current documentation added under `BALTZ_SERVICE_WORKFLOW_MAP.md` > **Current Dashboard Notification Triggers** and **Notification Push Decision Rules**.
- [x] Update the shared portal update count when task completion, reopening, or correction events happen.
- [x] Reconcile stale shared-portal task notifications at render time when a completed task is reopened or changed.
- [x] Add a targeted browser check proving a completed task changes the related notification list dynamically. Evidence: Admin 0 → 1 → 0 for a CreatorIQ client-owned task completion and reopening; Manager stayed at 0 outside its assigned-client scope; CreatorIQ Client displayed its 9 current actions in a bounded digest.
- [!] Do not implement billing, Wise sending, AI output generation, AI review automation, notification automation, or dashboard deletion automation until confirmed.

## Non-Negotiable Rules

- [ ] Landing page signup collects email, phone number, name, business name, and website in the external landing-page repo.
- [x] Dashboard repo uses dummy/mock landing-page signup data until integration exists. Admin Client Details labels the intake preview as mock data and does not call the external landing-page repo.
- [x] Landing signup does not equal payment. Lead intake, Cocoon delivery, Wise review, transfer matching, and confirmation are independent persisted states.
- [x] Cocoon Consult link is sent only after landing signup. The staff lifecycle rejects `link_sent` until a landing-page or lead-signup event is recorded, timestamps the manual send, and derives the client notification from that verified state.
- [x] Cocoon Consult contains the deeper audit form and shows audit results after completion. Checkup intake and the client-safe report/plan are separate guided stages with a completed-output empty state.
- [x] Payment is manual through Wise, with email and QR/payment details. The dashboard records reviewed delivery and manual matching states; it does not initiate or auto-confirm a transfer.
- [x] Paid Cocoon Consult unlocks booking and the configured three-month dashboard window when payment is confirmed; guided-call completion opens the separate 24-hour guidance window. The access start trigger remains configurable per client.
- [x] WIAW unlocks unlimited dashboard access while the client is working with Baltazar Studio. The client access card switches to the WIAW workspace state only after confirmed WIAW lifecycle/payment gates.
- [x] Clients must pass through Cocoon Consult and the required audit before WIAW. Client Lab access requires an approved accepted Cocoon-to-WIAW handoff plus confirmed WIAW state.
- [x] Clients never see Superadmin/Admin language or internal project operations. Client assignees are role-safe, and server projection strips internal notes, AI records, audit trails, traces, and other-client state.
- [x] AI can draft and queue work, but final audit claims, payment details, scope promises, and launch instructions need studio review unless explicitly auto-approved. The review queue and notification factory enforce these gates.
- [x] White-labeled audits must remove internal notes and expose only client-safe language. Export and client-workspace projection use the same safe boundary.
- [x] Every actionable task has an assignee. Legacy free-text assignees are normalized to structured ownership at read time, while new edits persist the explicit assignment role and safe display label.
- [x] Every completed task that affects the client journey creates, updates, or resolves the correct notification. Imported/new tasks created in Done, direct status edits, board moves, drag/drop, bulk completion, reopening, and recompletion all use the same append-only lifecycle helper.
- [x] Notification recipients come from structured task ownership and lifecycle stage, not one global static notification list. Focused tests prove Manager-only, Superadmin/Admin, shared Client + Studio, and client-safe routing.
- [x] Task completion updates milestone/phase progress, access state where relevant, and notification badge count together. Applicable tasks now carry explicit reversible workflow effects for a Journey gate, service project stage/progress, deliverable state, dashboard access state, and next action. Every direct, board, drag/drop, bulk, and edit-driven status transition applies those effects in the same workspace-state update; reopening applies the declared recovery projection. The shared notification badge remains derived from that same resulting task/workspace snapshot. `scripts/test-portal-task-workflow.ts` proves done and reopened projections plus a side-effect-free ordinary task.
- [!] Billing, AI automation, and workflow automation are intentionally paused until the business rules are confirmed.

---

## Batch 0: Planning, Source Sync, And Safety

Goal: keep the workflow map and dashboard task checklist synchronized before touching implementation.

### Checklist

- [x] Create the workflow source map.
- [x] Add the System And AI Actions section to the workflow map.
- [x] Create this dashboard alignment checklist as a separate implementation artifact.
- [x] Add memory rule: workflow map updates must also update this task checklist.
- [x] Match this checklist structure to `DASHBOARD_UX_COMMENTS_PLAN.md`.
- [x] Note that landing-page implementation belongs to the external `localhost:3411` repo, not this dashboard repo.
- [x] Note that this dashboard repo should use dummy/mock information for now.
- [x] Confirm the intended preview remains `http://localhost:3412` before implementation. Browser verification and both smoke suites used the canonical Next.js preview.
- [x] Record the full dirty worktree before implementation. The existing modified/untracked worktree was inspected and preserved; no reset or checkout was used.
- [x] Confirm each implementation pass targets the current Next.js dashboard, not the older Vite surface. All implementation and build evidence targets `app/dashboard`, `src/portal`, and the Next.js App Router.

### Fail-Proof Checks

- [x] Planning stays in this file instead of being scattered across sidecar files.
- [x] Workflow source stays in `BALTZ_SERVICE_WORKFLOW_MAP.md`.
- [x] Landing-page work is kept out of this repo until explicit integration work begins.
- [x] No unrelated files are reverted or reset during implementation.
- [x] Dashboard/homepage scopes remain separate. This pass changed the dashboard, persistence, tests, and workflow documentation only.

## Recommended Starting Batch

Given the current restrictions, start with **Batch 1 plus the mock-data slice of Batch 2**.

Do not start with landing-page UI, real backend wiring, Wise automation, or email sending. The landing page is external on `localhost:3411`, and this dashboard repo is still using dummy information. The safest first implementation is to teach the dashboard the real workflow states using mock data, then render those states in the existing dashboard.

### First Implementation Slice

- [x] Add lifecycle/access/payment/audit/AI review types. The migrated portal keeps these contracts in the domain-specific persistence and review modules rather than the legacy `src/types.ts`.
- [x] Add dummy/mock workflow data in `src/data/mockProjects.ts`. The migrated Next.js portal keeps equivalent typed fixtures in `src/portal/data.ts`, `src/portal/clients.ts`, and `src/lib/creatorIqDemoWorkspace.ts`; no obsolete parallel data file was introduced.
- [x] Add dev-selectable states for Cocoon, paid Cocoon, WIAW, and In Full Flight.
- [x] Do not add a visible deleted dashboard tab; deletion means the dashboard is gone, not archived for client browsing.
- [x] Keep all landing-page fields as mock data in this repo. The Admin intake preview is explicitly marked mock.
- [x] Do not connect to the external `localhost:3411` landing page yet. No dashboard code calls that surface.
- [x] Do not send real Wise emails or notifications yet. The dashboard records reviewed states and in-app events only; no external send provider is invoked.
- [x] Use the new lifecycle state only to drive dashboard labels, locks, access cards, and visible next steps.

### First Slice Success Criteria

- [x] Dashboard can show the active dummy states: Cocoon audit, paid Cocoon, WIAW active, and In Full Flight.
- [x] Deleted/no-action clients are represented in workflow rules, not as a visible client dashboard state.
- [x] Three-month Cocoon dashboard access and 24-hour guidance window are represented separately.
- [x] WIAW shows unlimited dashboard access only after WIAW confirmation.
- [x] No real external integration is required for the mock lifecycle slice; email, Wise, QR, and landing-page actions remain reviewed/recorded states rather than speculative external sends.
- [x] TypeScript passes.
- [x] Existing admin/client dashboard still loads. Admin lifecycle controls and the client status surface were verified in-browser without an error overlay or desktop overflow; the 20-route mobile smoke suite also passed.

## Batch 1: Lifecycle And Access State Model

Goal: replace the simple `cocoon` / `diy-dfy` / `wiaw` view-mode logic with an explicit lifecycle model.

### Checklist

- [x] Add `ClientLifecycleStage`.
- [x] Add `PaymentStatus`. `PortalPaymentLifecycleState` distinguishes draft, sent, pending, confirmed, failed, and manual review.
- [x] Add `DashboardAccessStatus` or `AccessWindow`. Dashboard access has independent start/end timestamps.
- [x] Add `GuidanceWindowStatus`. Guidance has independent start/end timestamps and its own notifications.
- [x] Add `AuditStatus`. `PortalAuditLifecycleState` distinguishes collection, generated, review-ready, approved, and shared output.
- [x] Add `WorkflowDeliverableStatus`. `PortalDeliverableLifecycleState` distinguishes draft, review, approval, and delivery.
- [x] Add `WhiteLabelStatus`. The versioned `PortalAuditExportStatus` distinguishes draft, reviewed, ready, and sent.
- [x] Add `AutomationReviewStatus`. `PortalAutomationReviewState` distinguishes draft, required review, approval, and rejection.
- [x] Replace view-mode-only logic where it incorrectly implies payment, booking, or access status. The client status surface and notification producers read the persisted service lifecycle rather than the selected view.

### Required Lifecycle States

- [x] `lead_signup_submitted`
- [x] `consult_link_sent`
- [x] `consult_form_started`
- [x] `consult_form_completed`
- [x] `audit_generated`
- [x] `audit_review_ready` through the explicit `review_ready` audit lifecycle state.
- [x] `paid_cocoon_offered` as a review-required, client-safe operational event.
- [x] `wise_payment_pending`
- [x] `paid_cocoon_confirmed`
- [x] `guided_call_booked`
- [x] `guided_call_complete`
- [x] `strategy_handoff_ready`
- [x] `wiaw_recommended`
- [x] `wiaw_confirmed`
- [x] `wiaw_active`
- [x] `wiaw_complete` as an explicit terminal service state with a role-safe completion event and separate dashboard-access status.
- [x] `in_full_flight_offered`
- [x] `in_full_flight_active`
- [x] `deleted` as an internal terminal state only, not a visible tab

### Fail-Proof Checks

- [x] Three-month dashboard access cannot be confused with the 24-hour guidance window.
- [x] WIAW unlimited access cannot appear before WIAW confirmation.
- [x] Deleted clients cannot see active support/workspace actions because the dashboard is removed.
- [x] Dashboard access is derived from explicit dates/status, not visible copy labels.

## Batch 2: Project Data Model And Mock States

Goal: make the current mock project data capable of representing the real workflow.

### Checklist

- [x] Add lead signup fields: name, email, phone number, business name, website.
- [x] Add current website development stage field.
- [x] Add next website development stage field.
- [x] Add next required action field.
- [x] Track Cocoon Consult link sent status and timestamp.
- [x] Track form started/completed timestamps.
- [x] Track audit generated/reviewed/approved timestamps.
- [x] Track Wise payment email sent status and timestamp.
- [x] Track Wise recipient and QR/payment asset references as admin-only, review-gated fields.
- [x] Track payment status, confirmation timestamp, and confirmation reference.
- [x] Track booking link status.
- [x] Track guided call schedule.
- [x] Track 24-hour guidance window start/end.
- [x] Track three-month Cocoon dashboard access start/end.
- [x] Track WIAW unlimited access status.
- [x] Track white-labeled audit status through one persisted, versioned export profile per client.
- [x] Track AI outputs and human approval status in the per-client AI review ledger.
- [x] Track task assignee role and visible assignee label.
- [x] Track task completion event metadata for notification generation, including imports and tasks initially created as Done.
- [x] Add mock project states for Cocoon, paid Cocoon, WIAW, and In Full Flight.
- [x] Keep deleted/no-action state out of the visible dashboard switcher.

### Fail-Proof Checks

- [x] Wise payment details never expose in client UI until approved/sent. Draft details are not stored in the client workspace; the client sees only a safe state label, and prepared-email notifications remain staff-only.
- [x] Internal notes and admin-only payment data cannot leak into client views. The authenticated workspace and Checkup routes project client-safe data server-side; the focused notification/projection test proves notes, AI actions, generation payloads, process traces, payment recipient/QR/reference fields, unreviewed events, other clients, and internal chat state are removed.
- [x] Mock data includes at least one project in each critical state. Typed fixtures cover Cocoon intake, paid Cocoon, WIAW active, In Full Flight active, and deleted access without pre-seeding them into every real workspace.
- [x] Mock data includes at least one completed task event that generates a dynamic client notification. The fixture and notification test cover a completed studio foundation task.
- [x] Mock data includes at least one completed task event that generates a dynamic admin notification. The fixture and notification test cover a completed client approval task.
- [x] TypeScript catches missing lifecycle fields in dashboard surfaces. Lifecycle and preference records use required typed contracts, and `pnpm typecheck` passes after projection and UI integration.

## Batch 3: Cocoon Consult Workspace

Goal: make the Cocoon area match the real Cocoon Consult journey.

### Checklist

- [x] Rename visible `Onboarding` language where it should say Cocoon Consult or audit language. Quick actions and empty assignments now use `client intake`; the internal route key remains stable for compatibility.
- [x] Replace DIY/DFY wording where it conflicts with the workflow map. The remaining workflow offer surface uses `Website Lab sprint` and `Checkup` terminology.
- [x] Add audit results screen after form completion. Shared Checkup output opens in the Client report surface with category scores, findings, recommendations, and the approved next-service handoff.
- [x] Add client-safe audit result sections: finding, impact, recommended action, next step. The Client report cards expose only report summaries, findings, recommendation plans, score impact, and a specific next step.
- [x] Add paid guided call prompt after audit results. The client report now shows a concise guided strategy-call step tied to the reviewed Wise and booking lifecycle rather than an invented checkout.
- [x] Add Wise payment pending state. The client lifecycle surface distinguishes approved details, pending confirmation, confirmed, and studio review without exposing internal matching fields.
- [x] Add Wise payment confirmed state. Confirmation requires recipient/reference matching and records a timestamp.
- [x] Add booking link unlock state. Guided-call status distinguishes locked, manually unlocked, booked, and completed; booking cannot skip the unlocked state.
- [x] Add 24-hour guidance window display. Guidance dates are rendered independently in the client service status.
- [x] Add three-month dashboard access display. Dashboard access has its own state and date range rather than reusing the guidance window.
- [x] Add strategy handoff section for workflow, dashboard path, custom booking link, or full funnel structure. The client report shows the persisted next stage/action and routes into Journey while the handoff is pending, ready, recommended, or confirmed.
- [x] Add WIAW recommended next step that feels earned by audit findings. The client audit recommendation surface derives the sprint framing, priority-fix count, score lift, and handoff from the report.

### Fail-Proof Checks

- [x] Client can see audit results after completing Cocoon Consult. Completed/shared client Checkups open the client-safe audit plan and report dialog; unfinished clients receive the explicit no-completed-audit state.
- [x] Client cannot book the guided call until payment is confirmed or manually unlocked. The client sees a locked state; recording a booking is rejected until staff explicitly unlocks it, and completion cannot skip the booked state.
- [x] Client can distinguish three-month dashboard access from 24-hour studio guidance. Separate timestamps and status copy are rendered in one lifecycle surface.
- [x] Cocoon does not look like a generic package comparison. The experience is a diagnostic report and service journey, with the next service framed from the findings.
- [x] Cocoon area never exposes admin-only AI reasoning or internal tasks. Server-side client projection strips AI actions, internal audit trails, notes, generation payloads, traces, and other-client records.

## Batch 4: Wise Billing And Payment Flow

Goal: align billing with manual Wise payment emails and QR details.

### Checklist

- [x] Rename generic invoice language where it should say Wise payment. Cocoon lifecycle, client instructions, notification copy, and the command center say `Wise payment`; `invoice` remains only for actual accounting records.
- [x] Add Wise payment email status.
- [x] Add QR/payment detail placeholder controlled by admin approval. Client details store the verified recipient and QR asset as internal fields; the client projection strips both until a separately approved/sent state is represented.
- [x] Add payment states: prepared, sent, pending, confirmed, failed, and manual review.
- [x] Add admin review before payment details are sent. Draft Wise details and Wise email AI drafts enter the human review queue, and the lifecycle transition rejects `sent` until details were approved.
- [x] Add client-friendly Wise payment instructions after studio approval. Instructions appear only after the approved email is marked sent/pending and direct the client to the reviewed email link/QR and exact transfer reference.
- [x] Add payment confirmation tracking with an explicit timestamp and matched-transfer reference.
- [x] Add escalation path when payment cannot be matched automatically. `manual_review` and `failed` rows route staff to the exact client lifecycle record instead of allowing a one-click confirmation.

### Fail-Proof Checks

- [x] No Stripe checkout language appears in Cocoon or billing flow. Billing reads the persisted Wise lifecycle; unrelated Funnel Lab checkout questions remain product-discovery inputs.
- [x] Client never sees draft payment instructions. Client projections strip recipient, QR, and confirmation fields; prepared-email notifications remain staff-only.
- [x] Admin can verify payment recipient/client match. Confirming payment requires both a verified recipient label and matched transfer reference, and the confirmation timestamp is recorded automatically.
- [x] Payment confirmation remains a distinct state, while the follow-on effects are explicit and policy-driven: it unlocks booking; the three-month access window starts from the configured payment, booking, guided-call, or manual trigger; and the 24-hour guidance window starts when the guided call is completed.

## Batch 5: AI/System Actions And Human Review Gates

Goal: make AI useful without letting drafts leak into client-facing output.

### Checklist

- [x] Add AI action records for audit draft generation.
- [x] Add AI action records for audit summarization.
- [x] Add AI action records for white-labeled report generation.
- [x] Add AI action records for Wise payment email drafting.
- [x] Add AI action records for notification drafting.
- [x] Add AI action records for strategy handoff drafting.
- [x] Add AI action records for WIAW recommendation drafting.
- [x] Add AI action records for launch handoff drafting.
- [x] Add approval controls before AI outputs become client-facing. Each durable record starts in `review_required` and supports explicit approval or rejection with reviewer/timestamp history.
- [x] Add client-safe preview for each AI output before publishing. Recording an AI draft requires non-empty client-safe preview text; the ledger itself has no publish action.

### Fail-Proof Checks

- [x] AI-generated audit findings cannot publish without approval. Generated output enters `needs_review`; only a staff-only explicit `Approve and send to client` action marks it shared.
- [x] White-labeled reports remove internal notes. Client report/export projection contains client-safe sections and strips internal notes, AI actions, evidence payloads, and tool traces.
- [x] Payment emails cannot send without approval. The lifecycle transition rejects `email_sent` until Wise details are approved, and draft emails stay in the staff review queue.
- [x] Scope promises cannot publish without approval. Builder outputs use the same `needs_review` queue and explicit staff share action as audit outputs.
- [x] Launch/handoff instructions cannot publish without approval. Launch and handoff types are review-required notifications, and final output sharing is staff-only.
- [x] Notifications use helpful language, not pressure language. The central event factory rejects a defined pressure-language set into neutral workspace copy, and focused tests cover the safeguard.

## Batch 6: Admin Workflow Command Center

Goal: give Admin/Superadmin the operational view needed to manage the full workflow without exposing it to clients.

### Checklist

- [x] Add a role-scoped studio workflow stage overview to Snapshot.
- [x] Add current stage, next visible stage, next owner, blocker, and next-action context to every visible process card.
- [x] Add clearly labeled mock lead signup details to Admin Client Details.
- [x] Add manual Cocoon Consult link delivery status to Admin Client Details without enabling an external send.
- [x] Add a role-scoped human review queue for Checkup outputs, process approval gates, review-stage To-do's, escalations, and unread client replies.
- [x] Add generated-output review states to the explicit client-sharing queue; final delivery still requires the existing `Send to client` action.
- [x] Add Wise payment email/QR approval queue. Draft payment details and review-required Wise email actions appear as high-priority items in the role-scoped human review command center and open the exact client record.
- [x] Add payment confirmation/matching status.
- [x] Add booking status.
- [x] Add access window status.
- [x] Add white-label audit controls to the shared Brand, Website, and SEO Checkup report footer.
- [x] Add developer assignment controls if not already covered by Users. The shared To-do editor exposes Manager assignment and stores a structured role plus safe label instead of relying only on a free-text name.
- [x] Add assignee controls for Client, Studio Admin, Superadmin, AI/System, and shared work. Staff can choose Client, Studio Admin, Superadmin, Manager, Baltz AI, or Client + Studio Admin; notification routing tests cover Manager-only, Superadmin/Admin, and shared recipients.
- [x] Add completed-task event history for notification/audit traceability. Every transition into Done appends a versioned, actor-aware completion record; reopening preserves history while removing the stale current notification.
- [x] Add nurture status and dashboard deletion scheduling. Nurture completion is a typed task event; dashboard access has explicit ending, expired, deletion-scheduled, and deleted states. Automatic deletion remains intentionally disabled.

### Fail-Proof Checks

- [x] Superadmin/Admin-only information stays admin-only. Production client sessions receive only the server-side client projection; private notes, AI ledgers, raw engine payloads/process runs, payment references/assets, and staff-only service events are stripped before the response leaves the server.
- [x] Assigned developers see only review items for clients assigned to them.
- [x] Admin can identify the next required review action in under one screen.
- [x] Every client-visible action has an admin/audit trail. The per-client workspace now retains a bounded append-only action ledger for lifecycle changes, workflow events, AI review decisions, queued/shared outputs, proposals, collaborator invitations, file uploads, and escalations. Client Details shows the latest records to staff with client-visible/internal classification, while the authenticated client projection strips the ledger. Tasks retain their separate immutable completion history and conversations retain their thread record.
- [x] Admin can see which notification was sent or drafted after each completed task. Explicit completion-event types feed the same review-gated notification digest.

## Batch 7: Client Views And Lock Reasons

Goal: make every client state explain exactly what is happening and what happens next.

### Checklist

- [x] Make locked states explain the exact next step. The adaptive client service-status panel distinguishes not started, ready, in progress, studio review, locked, and active access states with a short next action.
- [x] Add client view for `consult_link_sent`.
- [x] Add client view for `consult_form_started`.
- [x] Add client view for `audit_generated`.
- [x] Add client view for `wise_payment_pending`.
- [x] Add client view for `paid_cocoon_confirmed`.
- [x] Add client view for `guided_call_booked`.
- [x] Add client view for `strategy_handoff_ready`. Reviewed strategy-handoff events enter the client digest and deep-link to Approvals; unreviewed ones remain hidden.
- [x] Add client view for `wiaw_confirmed`.
- [x] Add client view for `in_full_flight_offered`.
- [x] Add client-safe process tracker showing current stage, next visible stage, and what is needed next without exposing internal stages.
- [x] Add client-safe assignee labels such as `Your task`, `Studio task`, and `Shared review`.
- [x] Do not add client view for deleted dashboards.

### Fail-Proof Checks

- [x] Client copy says what is happening now, what is needed from them, what is waiting on the studio, and what happens next. The compact lifecycle cells pair each verified state with one client-safe next step.
- [x] Client never sees Admin, Superadmin, internal cost notes, internal AI notes, or raw task operations. Role-safe labels are used in client To-do surfaces and the authenticated server projection removes internal workspace records, engine payloads, AI actions, payment details, and cross-client state.
- [x] Client does not see WIAW build workspace before WIAW confirmation. Client Lab capability now requires both the approved accepted-or-linked Cocoon handoff and persisted `wiawState: confirmed`; an accepted handoff alone shows the exact remaining confirmation prerequisite. `scripts/test-portal-access.ts` proves the locked and unlocked states.
- [x] Dashboard deletion removes portal access after the no-action window; if the client returns, require a new paid Cocoon Consult because the old audit may be stale. A hydrated Client portal whose persisted dashboard access is `deleted` now renders only a closed-access surface with the new paid Cocoon requirement and sign-out; Admin client preview receives the same closed-state proof with an exit-preview action.

## Batch 8: Notifications

Goal: make notifications dynamic, assignee-aware, and generated from completed workflow events instead of static sample messages.

### Checklist

- [x] Define `NotificationEventType` values from the completion notification matrix. The shared contract includes all matrix events plus current task, review, journey, escalation, and inbox events.
- [x] Define notification recipient roles: Client, Studio Admin, Superadmin, assigned developer, and shared recipients. Events are filtered through the active portal role rather than a global feed.
- [x] Define notification source fields: completed task, assignee, client/project, lifecycle stage, next action, destination tab, and review state. The event contract also versions the source and records lifecycle, source kind, exact deep-link context, and review requirement.
- [x] Add notification type for landing page signup received.
- [x] Add notification type for Cocoon Consult link sent.
- [x] Add notification type for Cocoon intake started.
- [x] Add notification type for Cocoon intake completed.
- [x] Add notification type for form reminders.
- [x] Add notification type for first AI audit pass completed.
- [x] Add notification type for second AI audit pass completed.
- [x] Add notification type for audit results ready.
- [x] Add notification type for Wise payment email prepared.
- [x] Add notification type for Wise payment email sent.
- [x] Add notification type for Wise payment confirmed.
- [x] Add notification type for booking unlocked.
- [x] Add notification type for guided Cocoon call booked.
- [x] Add notification type for guided Cocoon call completed.
- [x] Add notification type for guided call reminders.
- [x] Add notification type for 24-hour guidance window starting/ending.
- [x] Add notification type for three-month dashboard access ending soon.
- [x] Add notification type for WIAW recommendation.
- [x] Add notification type for WIAW workspace unlocked.
- [x] Add notification type for client asset upload completed.
- [x] Add notification type for studio foundation task completed.
- [x] Add notification type for design preview sent.
- [x] Add notification type for client approval completed.
- [x] Add notification type for client revision notes submitted.
- [x] Add notification type for build QA completed.
- [x] Add notification type for launch prep completed.
- [x] Add notification type for handoff package sent.
- [x] Add notification type for In Full Flight offer.
- [x] Add notification type for In Full Flight task completed.
- [x] Add notification type for no-action nurture step sent.
- [x] Generate notification copy from event data instead of hardcoded message rows. Typed producers now derive role-safe copy, next action, source version, and destination from the persisted lifecycle, task, approval, file, and project records.
- [x] Route each currently produced notification to the correct recipient role instead of one global notification feed. Client, Manager, and Admin task/journey/escalation/inbox events are role scoped; future producers must declare recipients through the same contract.
- [x] Deep-link each currently produced notification to the correct dashboard tab, modal, or workflow section. Task events open the exact task modal, threads can select an exact conversation, and durable Checkup events support an exact `serviceRunId`.
- [x] Update notification badge counts when an event is created, read, resolved, or corrected. Read event IDs persist with the workspace snapshot; inactive events disappear with their source and changed source versions create a new unread event.
- [x] Reconcile stale notifications when the source task is reopened or changed. Event identity includes the source status/version, so the obsolete version drops out and the reopened task receives a current event rather than retaining stale copy.
- [x] Keep AI-generated notifications in draft/review state when they mention audit claims, payment details, scope promises, launch instructions, or client-facing commitments. The central event factory automatically changes those event types from Unread to Draft until reviewed.
- [x] Add notification type for dashboard deletion notice.

### Fail-Proof Checks

- [x] Notifications respect role and lifecycle locks. Draft payment claims stay staff-only, client messages require a recorded sent/confirmed state, and role visibility is covered by the notification test.
- [x] Notifications deep-link to the correct tab/section. Focused tests assert task IDs and targets for To-do's, service-run IDs for Activity, approval IDs for Approvals, Journey gate sections, Files handoffs, and role-scoped Manager assignments.
- [x] Notifications do not imply payment is complete unless confirmed. Prepared, sent, pending, failed/manual-review, and confirmed are distinct durable states; the test asserts the confirmed client copy only for `confirmed`.
- [x] Notifications do not pressure clients with scarcity language.
- [x] Notification settings still work after new types are added. Email/digest and five in-app categories persist with the shared workspace snapshot; every notification event is classified through the same preference gate, including newly added lifecycle types.
- [x] Completing a task changes the correct notification feed without manually editing static notification data.
- [x] Reopening a task updates or corrects the related notification instead of leaving stale copy visible. The notification test covers the Done-to-reopened lifecycle while completion history remains intact.
- [x] Client notification copy always starts with the client action when client action is required.
- [x] Admin notification copy includes operational context and review needs.
- [x] Superadmin notifications only appear for system, access, permission, template, or deletion events. The central event factory strips Superadmin from ordinary task/review recipients while preserving system/access/deletion delivery; focused tests cover both paths.

## Batch 9: WIAW And In Full Flight

Goal: gate WIAW behind Cocoon strategy and make In Full Flight feel like support continuity.

### Playbook Source-Of-Truth Coverage

- [x] Put Brand Audit, Website Audit, and SEO Audit under Cocoon Consult.
- [x] Put Funnel Build and Website Build under Winged In A Week.
- [x] Add Social Media Operations and SEO Planning And Execution under In Full Flight.
- [x] Enumerate each function's live inputs, stages, controls, decisions, outputs, handoffs, and fail-safe rules in the Playbooks library.
- [x] Add source-reference records that expose the canonical workflow map and relevant implementation files to the playbook reader and AI source endpoint.
- [x] Document the rule that product changes and their playbook instructions must be updated in the same implementation turn.
- [x] Consolidate the Playbooks library to the seven sold service functions instead of separate cards for shared operating steps.
- [x] Fold Cocoon intake, guided consult, and proposal rules into each audit; fold WIAW gates and handoff into each build; fold IFF requests, upkeep, scope controls, and offboarding into each retained service.
- [x] Enumerate every live questionnaire, accepted source, audit test or produced area, scoring or readiness rule, missing-evidence state, and data-processing step across all seven service manuals.
- [x] Tie Website Audit documentation directly to the canonical questionnaire and complete checklist, including pass/fail scoring, evidence coverage, confidence, targets, and Lighthouse separation.
- [x] Document the SEO Audit crawl-health, coverage, AI-readiness, 27-check status, and deterministic page-decision calculations.
- [x] Remove name-seeded and self-assessment fallback scores from active audit cards and completion; keep unverified work Pending until an evidence-backed report exists.
- [x] Use fixed completeness and approval gates for Brand Audit, Funnel Build, Website Build, Social Media Operations, and SEO Planning And Execution wherever an evidence-valid numeric quality score does not exist.

### Checklist

- [x] Require a completed Cocoon source plus an approved accepted-or-linked strategy handoff before WIAW live Labs access.
- [x] Require strategy handoff completion before WIAW confirmation.
- [x] Add WIAW payment/confirmation state. The persisted service lifecycle now distinguishes not requested, pending confirmation, confirmed, and manual review, with an optional confirmation timestamp. Staff can update it from Client Details and clients see only the safe status/next step; no charge, email, matching, or QR automation is enabled.
- [x] Keep WIAW and In Full Flight Lab access active while the qualifying service and persisted handoff/delivery state remain active; no expiry timer is applied.
- [x] Generate WIAW workspace from Cocoon findings. Opening an approved Website/Brand Checkup handoff in Website Lab now accepts the handoff and atomically pre-seeds the client-independent implementation workspace, tasks, gates, service stage, active access, and exact handoff-to-task traceability.
- [x] Generate milestones from implementation scope. `generatePortalImplementationWorkspace` converts each approved handoff's own scope and recommendations into five bounded milestones and stable, idempotent task sources without using CreatorIQ or another named-client fallback. `scripts/test-portal-implementation-workspace.ts` proves the result with an arbitrary client/domain handoff.
- [x] Preserve approval gates: Design Preview, Full Site Preview, Handoff Package. The generated workspace always includes these three reversible Journey gates and links each client approval task to its gate and project/lifecycle projection.
- [x] Make completed WIAW delivery or an accepted retained-service handoff the prerequisite for In Full Flight live Labs.
- [x] Add In Full Flight workspace access state for ongoing support.

### Fail-Proof Checks

- [x] WIAW cannot start without Cocoon audit and strategy context.
- [x] WIAW access state does not expire while active.
- [x] Approval gates remain the main decision points. The generated implementation path cannot represent design approval, full-site approval, or completed handoff through generic build tasks; each decision is a dedicated client-owned task linked to the named Journey gate.
- [x] In Full Flight feels like continued support, not forced upgrade pressure. Client Journey copy no longer says a completed WIAW handoff is automatically “moving into” retained care; it says ongoing support is available only if selected. Proposal and Checkup continuation surfaces label it optional, while active lifecycle panels continue to describe an ongoing care plan.

## Batch 11: Template Governance And Exception Operations

Goal: make reusable Playbooks publishable, make process failure states recoverable, and measure operational quality from the same persisted run history.

### Checklist

- [x] Add Draft, Published, and Archived lifecycle states, version, change summary, owner, last-reviewed date, usage count, and active-run count to Playbooks.
- [x] Separate locked core steps from editable client fields and define required inputs with validation.
- [x] Add approval requirements, role preview, and sample-data preview to every governed Playbook.
- [x] Persist custom governed Playbooks locally and preserve safe defaults for existing built-in templates.
- [x] Define missing access/assets, failed crawl/generation, unsupported evidence, inactivity, rejected approval, scope change, reopened stage, failed handoff, and overdue-work policies for every process.
- [x] Require an owner and recovery action on every open process exception.
- [x] Block stage movement while an exception is open and retain resolved exception/event history.
- [x] Derive time in stage, blocked time, approval turnaround, revisions, handoff success, recommendation-to-task conversion, task completion, inactivity, and automation failures from process runs.
- [x] Use Checkup, Lab, Playbook, Approval, and Journey consistently in the governed template surface.

### Fail-Proof Checks

- [x] Publishing a custom Playbook is explicit and does not start or modify client work.
- [x] Archived Playbooks remain recoverable in the internal library.
- [x] A blocked process names both its owner and recovery action instead of remaining generically In Progress.
- [x] Resolving an exception preserves its history and returns only the affected stage to active work.
- [x] Existing process snapshots without governance/exception metadata receive safe defaults during normalization.

## Batch 12: Targeted Rechecks And Reusable Service Agents

Goal: replace repeated full runs and pre-seeded outputs with evidence-targeted background work executed by governed, reusable agents that retain approved instructions and scoped memory.

Source: Checkup/Lab accuracy, client-creation baseline, selective recheck, and reusable-agent discussions captured July 23, 2026.

Target: `http://localhost:3412/dashboard` across client creation, Brand/Website/SEO Checkups, Funnel/Website/Social/SEO Labs, Playbooks, Approvals, Snapshot, and background processing.

### Consolidated Scope

This batch is the implementation plan for the connected changes discussed across the dashboard:

| Workstream | Planned outcome |
| --- | --- |
| Client and source truth | Real clients and validated domains/assets replace implicit CreatorIQ or other seeded fallbacks. |
| Checkup execution | One evidence-backed baseline is created, then only Failed, Unverified, stale, changed, or newly required checks are revisited. |
| Durable processing | Long-running crawl, render, Lighthouse, and analysis work runs in resumable background steps with retries and explicit recovery. |
| Reusable agents | A governed service agent reuses published instructions, narrow tools, and approved client-scoped memory without relying on unlimited chat history. |
| Human control | Claims, scope changes, publication, handoffs, approvals, and durable learning retain configured human gates. |
| Checkup and Lab UI | Adaptive cards and columns show real stage, completed/total targets, elapsed time, estimated completion range, evidence freshness, and concise blockers. |
| Template governance | Playbooks support Draft, Published, and Archived states; version/change history; locked and editable fields; validation; previews; ownership; approval; and usage data. |
| Exception handling | Missing access/assets, failed evidence collection, inactivity, rejection, scope change, reopened stages, failed handoffs, and overdue work produce an owned blocker and recovery action. |
| Shared language | Checkup means diagnostic service, Lab means planning/build workspace, Playbook means reusable internal method, Approval means client decision, and Journey means client progress. |
| Operational quality | Stage time, blocked time, approval turnaround, revisions, handoff success, recommendation conversion/completion, inactivity, and automation failure are measured. |
| Migration and release | Existing valid URLs/history are preserved while synchronous generation and production seed dependencies are retired behind a tested pilot and rollback path. |

### Progress Legend

- `[ ]` Not started.
- `[~]` Implemented but not fully verified.
- `[x]` Implemented and verified against the acceptance criteria.

### Locked Product Decisions

- [x] Production work uses real client sources and stored evidence; seeded/demo outputs are never an implicit fallback or source of truth.
- [x] Client creation launches one idempotent baseline-evidence workflow after the real source record is saved.
- [x] The baseline remains immutable comparison evidence; current Checkup state is a projection of the latest verified per-check revisions.
- [x] Routine maintenance rechecks Failed, Unverified, stale, changed, and newly required checks—not the whole Checkup.
- [x] A full refresh requires a documented trigger: source replacement, material structural change, major checklist version, expired evidence, significant regression, explicit studio request, or required recovery.
- [x] One governed service agent is the default; specialist agents or handoffs are added only after a measured need.
- [x] Published Agent Definitions and Playbooks change only through explicit versioning and approval.
- [x] Conversation state is not business memory. Only approved, scoped, attributable facts enter durable Client Memory.
- [x] Deterministic checks stay deterministic. AI may classify qualitative evidence but cannot fabricate crawl, DOM, Lighthouse, analytics, or integration results.
- [x] Client-facing claims, scope changes, approvals, publication, paid handoffs, and destructive actions retain human gates.

### Delivery Roadmap

### Plain-English Workflow

1. Save the real client and validated domain, sitemap, assets, and connected sources.
2. Commit one idempotent baseline event only after the client record succeeds.
3. Start a durable background run with frozen Playbook, checklist, source, and Agent Definition versions.
4. Select the work:
   - A first baseline checks every applicable requirement.
   - A routine run checks only Failed, Unverified, stale, changed, newly required, or dependency-affected requirements.
5. Collect only the evidence needed by those selected checks.
6. Run deterministic checks first; use the governed agent only for qualitative interpretation.
7. Validate evidence coverage, provenance, confidence, contradictions, and policy requirements.
8. Append immutable evidence and check-result revisions, then update the current Checkup projection.
9. Pause on owned blockers or configured human approvals instead of remaining indefinitely In progress.
10. Share an approved client-safe result through Approvals or create a versioned handoff into the relevant Lab.
11. Run lightweight sentinels between full Checkups; escalate to a full refresh only when a documented trigger justifies it.
12. Record corrections as Learning Events for review. Published instructions and approved Client Memory never change themselves.

Visible run states:

`Queued → Validating → Discovering → Capturing → Checking → Reviewing → Ready`

`Current` means a targeted run found no work. `Partial`, `Blocked`, `Failed`, and `Cancelled` must always show an owner, reason, and recovery action.

### Delivery Sequence And Gates

| Order | Deliverable | Exit gate |
| --- | --- | --- |
| 1 | Durable data foundation | Real clients, sources, evidence, results, runs, agents, and memory are tenant-isolated and idempotent. |
| 2 | Background workflow runtime | Runs survive normal reloads/deployments, persist checkpoints, and convert page failures into partial evidence or owned blockers. |
| 3 | Authoritative baseline | An arbitrary domain produces cited, versioned results without seeded or cross-client facts. |
| 4 | Sentinel and targeted rechecks | No-change runs are true no-ops; changed dependencies expand only the affected checks. |
| 5 | Governed reusable agent | The agent reuses published instructions and approved scoped memory without approving, publishing, or remembering on its own. |
| 6 | Adaptive operational UI | Admin sees real stage, target count, ETA, evidence freshness, approvals, and concise recovery actions; Client sees only safe progress and approved output. |
| 7 | Migration | Valid history and deep links survive while production seed fallbacks and synchronous evidence collection are retired. |
| 8 | Pilot and release | Evals, security, observability, shadow parity, rollback, desktop/mobile checks, and one real-client pilot pass. |

#### Phase 1 — Durable client, evidence, and agent data

- [x] Create normalized `clients` and `client_sources` records with source version, normalized domain, sitemap, connected-data references, asset references, validation state, and timestamps.
- [x] Create `evidence_snapshots` and `evidence_items` with source kind, provenance, fingerprint, capture time, coverage, freshness, status, and immutable payload references.
- [x] Create versioned `check_definitions`, `check_dependencies`, and append-only `check_result_revisions`.
- [x] Create `service_runs` and `run_events` that reference baseline/current evidence, parent run, Playbook/checklist version, trigger, workflow ID, state, owner, blocker, and timestamps.
- [x] Create `agent_definitions`, `agent_runs`, `agent_memory`, and `agent_learning_events` with explicit client/service/stage scope and versioning.
- [x] Add tenant/client isolation, role-aware RLS, retention rules, encrypted secret references, and generated Supabase TypeScript types.
- [x] Add idempotency uniqueness for client baseline creation, evidence capture, check revision, exception, task import, and handoff creation.

Acceptance gate:

- [x] A real client and source can be created, loaded, and isolated without reading `STUDIO_CLIENTS` or CreatorIQ demo data. Evidence: live rolled-back RLS proof on July 23, 2026 returned one visible client for each of two authenticated tenants and zero cross-tenant rows.
- [x] Replaying the same create-client event produces one baseline workflow and no duplicate side effects. Evidence: live rolled-back transaction returned the same client/source/run IDs, `first_created=true`, `replay_created=false`, and counts of exactly one client, one source, and one run.

#### Phase 2 — Durable background workflow runtime

- [x] Add a server-side durable workflow runner with explicit steps for validation, discovery, capture, deterministic analysis, qualitative analysis, coverage validation, persistence, review routing, and completion. The workflow now invokes the governed agent only for the selected qualitative targets and persists its bounded output and review state.
- [x] Trigger the baseline workflow from the committed client-created event—not directly from an uncommitted browser form.
- [x] Add bounded page concurrency, shorter navigation/idle fallbacks, per-page timeouts, retry classes, partial-evidence support, cancellation, and resumable checkpoints. Stale runs now become an owned `workflow_stalled` blocker and can be explicitly redispatched from the retained checkpoint.
- [x] Store step-level progress and events so the UI can show Queued, Validating, Discovering, Capturing, Checking, Reviewing, Ready, Partial, Blocked, Failed, or Cancelled.
- [x] Keep workflow retries idempotent and ensure a deployment or browser reload cannot lose the run. Evidence: the July 23 forced-restart drill killed the live Next.js worker while the arbitrary-domain baseline was Checking, restarted the app, detected the stale workflow, redispatched a new workflow ID, reused the same five-item snapshot, replayed all 149 deterministic revisions without duplicates, and finished Ready with the qualitative review gate intact.

Acceptance gate:

- [x] Killing and restarting a worker resumes from the last durable checkpoint. Evidence: run `d6be3cf2-dae8-411d-a119-df254434cb1b` resumed from its preserved `checking` checkpoint and snapshot after the worker process was terminated; the recovery event retained the previous workflow ID and the restarted run completed with a new workflow ID.
- [x] A slow or failed page becomes partial evidence or a named blocker instead of leaving the run indefinitely In progress.

#### Phase 3 — Authoritative initial baseline

- [x] Validate the domain and required sources before collection begins. Public protocol, credentials, port, local/private host, and DNS checks now run before discovery; the exact versioned source records its validation outcome.
- [x] Discover the representative page set and record why every page was included. Evidence: the restart-proof run persisted `https://example.com/` with `selectionRank=0` and `selectionReason="Primary source URL"` in its durable checkpoint and evidence snapshot.
- [x] Capture desktop/mobile evidence only where the published checklist requires it. Evidence: the published 149-check Website profile requested desktop/mobile rendered evidence and desktop/mobile Lighthouse evidence, persisted exactly two rendered-page and two Lighthouse items plus one technical source item, and reused those five items during recovery.
- [x] Run deterministic checks first and mark unsupported requirements Unverified rather than guessing. The arbitrary-domain proof produced 149 immutable revisions; 63 unsupported checks remained Unverified and 87 findings cited captured evidence.
- [x] Invoke the governed service agent only for checks that require qualitative interpretation.
- [x] Enforce coverage and provenance gates before publishing the baseline projection.
- [x] Route material contradictions, unsupported client-facing claims, and low-confidence qualitative findings to human review.

Acceptance gate:

- [x] A new arbitrary client domain produces an evidence-backed baseline with no seeded result, cross-client fact, or unsupported score. Evidence: the arbitrary-domain workflow produced 149 immutable revisions, left 63 unsupported checks Unverified, and cited captured evidence for 87 findings.
- [x] Every persisted check revision identifies its evidence IDs/fingerprint, capture snapshot, checklist definition, verifier, confidence, and limitations.

#### Phase 4 — Sentinel and targeted rechecks

- [x] Implement `get_recheck_targets` as a deterministic selector over Failed, Unverified, stale, changed, and newly required checks.
- [x] Implement the lightweight sentinel for source version, sitemap, robots, response health, structural fingerprints, connected-data freshness, and known integration availability.
- [x] Maintain a dependency graph so a sentinel flag expands only to affected checks.
- [x] Append result revisions atomically, retain prior outcomes, and recalculate the current Checkup projection and score only from applicable verified results.
- [x] Open a regression blocker with owner and recovery action when a previously passed check fails.
- [x] Return a true no-op when no check requires work. A current selective run exits before discovery/capture and creates no duplicate revision.
- [x] Let a Lab request a targeted dependency recheck without automatically refreshing unrelated Checkup evidence.

Acceptance gate:

- [x] A routine run evaluates only Failed/Unverified/stale/newly-required targets unless the sentinel identifies an affected dependency.
- [x] A no-change run performs no full crawl, creates no duplicate revision, and reports that evidence remains current. Evidence: the rolled-back sentinel proof returned zero targets for an unchanged fingerprint and one `dependency_changed` target after a source-fingerprint change.

#### Phase 5 — Governed reusable agent

- [x] Add the TypeScript OpenAI Agents SDK behind a server-only agent service and service-specific credential boundary.
- [x] Load one published Agent Definition plus its bound Playbook/checklist version for each run.
- [x] Implement narrow typed tools for target lookup, scoped evidence listing/retrieval, and human-review proposals; keep persistence, exceptions, revisions, and handoffs in deterministic server/database boundaries.
- [x] Require structured outputs with check IDs, evidence citations, confidence, limitations, and recommended next action.
- [x] Add resumable human approval for claims and corrections; publication, scope, and handoff gates remain deterministic actions outside the model.
- [x] Retrieve only approved memory matching the active client, service, stage, role, and access policy.
- [x] Save the agent run output, concise run summary, and tool trace separately from durable Client Memory.
- [x] Convert human corrections into reviewable Learning Events that may propose—but never publish—an Agent Definition revision.

Acceptance gate:

- [x] Starting a new run reuses the published instructions and approved scoped memory without replaying an unlimited transcript.
- [x] The agent cannot write durable memory, publish a definition, approve its own output, or access another client's context through an unrestricted tool. Evidence: the live smoke/eval suite returned scoped evidence tools only; cross-client citations, duplicate findings, evidence-free claims, and unconfigured tools are rejected.

#### Phase 6 — Checkup, Lab, Playbook, and operations UI

- [x] Show baseline status, evidence freshness, coverage, source version, last targeted recheck, target count, and next scheduled sentinel on Checkup cards and reports. Evidence: the shared `OperationalCheckupMeta` is used by Brand, Website, and SEO cards and active reports; browser proof on July 23 showed the Website card adapting to two columns at 299 px and the active report expanding the same seven facts across 1,053 px.
- [x] Replace generic loading percentages with real workflow stage, completed/total targets, elapsed time, estimated completion range, and recoverable failure state. Authenticated Activity proof on July 23 rendered two durable runs with true state, `2/2` targets, elapsed time, evidence coverage/freshness, agent state, and checkpoint recovery support at desktop and 390 px without overflow or console errors.
- [x] Label actions precisely: `Check failed items`, `Check unverified items`, `Refresh changed evidence`, or `Run full refresh`. All four controls rendered on authenticated Activity cards at desktop and 390 px.
- [x] Explain which trigger justified a full refresh before it starts. Authenticated Activity rendered the documented-trigger selector and kept full refresh unavailable until a trigger explains the complete recollection.
- [x] Add Playbook Agent controls for Draft/Published version, instructions, tools, memory policy, approval gates, samples, eval status, owner, and change summary. Authenticated governance proof loaded the published Agent Definition and its admin-only version controls; the governed Playbook detail rendered the bound Agent, eval state, ownership, lifecycle, approval gates, and sample-data preview at desktop and 390 px.
- [x] Add an Admin memory inspector that shows source, scope, reviewer, confidence, expiry, usage, edit history, and revoke action. The authenticated staff surface rendered the inspector and correctly showed that no approved durable memory exists; conversation history was not treated as business memory.
- [x] Show agent runs and blockers in Snapshot/Activity with owner, recovery action, tool/evidence trace, and deep link. Authenticated Activity exposed the governed agent review state and 47-call trace summary, exact-run deep links, and the owned workflow-stalled alert/recovery surface; the client session received none of these internal fields.
- [x] Let Approvals present only reviewed client-safe outputs while keeping internal evidence, prompts, memory, and traces hidden. Staff now previews the exact sanitized client card and must explicitly approve and send; client-safe APIs omit checkpoints, workflow tokens, event metadata, prompts, memory, and traces.
- [x] Show Labs the exact approved Checkup version and evidence dependencies they consume. Website Lab identifies the approved Checkup output version and approval date and exposes the exact evidence scope, included recommendations, and unresolved dependencies.

Acceptance gate:

- [x] Admin can understand what is running, why it is running, what it will recheck, and what requires review without opening server logs. Evidence: authenticated desktop/mobile Activity proof rendered two runs, trigger/run kind, current state, targets, elapsed time, evidence, agent review, maintenance scopes, alerts, and deep links with no console error or overflow.
- [x] Client sees progress and approved outcomes without internal agent, prompt, trace, or cross-client information. Evidence: a temporary authenticated Client received a staff-governance `403`; the client service-run payload contained only safe progress fields and omitted workflow IDs/tokens, checkpoints, prompt, memory, and tool trace. Both temporary identities and memberships were then deleted and verified at zero rows.

#### Phase 7 — Migration away from seeds and synchronous generation

- [x] Import real clients into normalized records and tag all existing demo fixtures with `source_kind=demo`. Staff now have a responsive production-client intake that validates the real public domain, same-domain sitemap, primary contact, first Checkup, and an idempotency key before creating the normalized client/source/baseline. Durable production clients are merged into the Clients surface and their latest Brand, Website, or SEO service run is rendered as the canonical Checkup card with an exact Activity deep link; any same-name seeded card is suppressed rather than used as a fallback. Demo fixtures remain tagged and isolated. July 24 proof created the production pilot `Trisha Baltazar` from `trishabaltazar.com`, retained the supplied contact only on the client record, and produced a domain-derived Website Checkup without inheriting CreatorIQ data.
- [x] Never promote a demo snapshot or inferred/fabricated domain into a production client baseline. All current legacy audit fixtures are explicitly tagged `source_kind=demo`; the migration scan skips or queues them for explicit review, and production client creation requires a validated normalized domain.
- [~] Link valid persisted `portal_audit_runs` and workspace engine records to normalized service runs while preserving their URL restoration behavior. The explicit reviewed-link workflow and URL-preserving link table are implemented; no real production client/run pair exists in the connected project yet, so a production link cannot be completed honestly.
- [x] Move crawl/render/Lighthouse work out of synchronous `/api/ai/generate-stage` report requests into durable evidence workflows. Report generation now requires a durable service-run ID and loads the persisted evidence snapshot instead of crawling.
- [x] Keep generation routes focused on reviewed evidence and structured output rather than recollecting the same site during every stage. The generation route rejects incomplete durable evidence and consumes reviewed check revisions plus the saved evidence bundle.
- [x] Provide an explicit migration review queue for ambiguous or incomplete historical records. The staff governance surface scans legacy Checkups, never guesses a production client, and requires an explicit link or reject decision while preserving the historical URL.

Acceptance gate:

- [x] Removing the CreatorIQ fallback does not remove its explicitly selected demo, and no arbitrary new client inherits it. Evidence: the audit-run API excludes CreatorIQ by default and returns it only for an explicit CreatorIQ client/demo request; the portal store follows the same opt-in rule.
- [x] Existing valid Checkup URLs still restore the correct run after migration. Browser proof on July 23 opened `auditReportRun=audit-creator-iq-demo`, retained that run ID, resolved `auditReport=creator-iq`, and rendered the correct CreatorIQ report and Original Audit Checklist. The exact-run API lookup does not re-enable CreatorIQ as a global fallback.

#### Phase 8 — Evals, observability, security, and rollout

- [x] Add unit tests for target selection, dependency expansion, freshness, score projection, idempotency, memory eligibility, and full-refresh triggers. The focused TypeScript suite covers capture-target planning, dependency expansion, score projection, deterministic analysis replay, memory eligibility/expiry, and the complete full-refresh trigger contract. The rolled-back live SQL suite additionally proved failed-only selection, dependency expansion, and stale-evidence selection (`1` failed target versus `2` all-actionable targets).
- [x] Add integration tests for client creation through baseline publication, targeted recovery, approval pause/resume, and Checkup-to-Lab handoff. Evidence: `supabase/tests/workflow_lifecycle_integration.sql` passed live inside a rolled-back transaction on July 23, proving idempotent client/baseline creation, current baseline publication, checkpoint-preserving recovery, approval pause/resume, and exact source-run handoff. `workflow_pilot_enrollment_integration.sql` additionally proves atomic pilot enrollment, idempotent replay, collision rejection, and isolation from a second production client.
- [x] Add agent eval cases for unsupported claims, weak evidence, cross-client isolation, prompt injection in crawled content, tool misuse, duplicate delivery, and evidence-free material claims. The live six-case eval passes on `gpt-5.6-luna`.
- [x] Record workflow duration, stage duration, page/check throughput, retries, coverage, token/tool cost, approval turnaround, regressions, no-op rate, and failure class. Evidence: the live `service_run_operational_metrics` view now exposes all fields; a July 23 query returned per-stage timings, five evidence items, 8.33 page-evidence items/minute, 3.33 checks/minute, and the bounded failure/no-op fields for the restart proof run.
- [x] Add alerts for stuck runs, repeated tool failure, abnormal full-refresh rate, low coverage, memory leakage attempts, and cost anomalies. Evidence: `workflow_alerts` and `raise_workflow_alerts()` cover each class and the staff governance surface exposes owned, resolvable alerts.
- [x] Enforce the client boundary at the HTTP and persistence layers, not only in hidden UI. The shared workspace API now requires signed membership in production, projects client reads to one workspace, strips staff notes/plans/chat/AI records/traces/payment references/unreviewed events, and rejects client full-snapshot writes. Legacy audit reads are client-scoped and return resumable intake without internal scores, findings, notes, review metadata, or process traces; client audit replacement/deletion and cross-client file uploads are rejected. Legacy dashboard state and costly AI/crawl/PDF endpoints now require verified access, studio-only generators reject clients, durable evidence queries include the actor client ID, production ignores quick-login headers, and local quick login uses a signed HttpOnly same-site development cookie. On July 24 the production project applied `harden_legacy_portal_storage` and `create_secure_portal_workspace_storage`: all five shared tables have RLS enabled, anon/authenticated have no table privileges, service-role read/write remains, `portal-uploads` exists as a private bucket, and no public workspace/storage policies remain. The previously omitted access-request schema was also applied and hardened; a live API insert succeeded, the temporary verification row was removed, and anon/authenticated can insert but cannot read, update, or delete. The server credential is now installed in the ignored, mode-`0600` local environment and as a Sensitive production variable. `pnpm verify:supabase-hardening` passes, authenticated localhost workspace and audit reads both return `200`, the webpack production build passes, and the resulting Vercel deployment is live at `dashboard.trishabaltazar.com` with a direct `200` response. The follow-up `lock_workflow_transport_to_server` migration removed publishable-key execution from all 15 durable workflow RPCs, retained the per-run token as a second boundary, and added covering indexes for both rollout-client foreign keys. The verifier proves public denial plus server-role invalid-token rejection; post-migration advisors report zero public workflow-RPC warnings and zero rollout-client foreign-key warnings. The remaining RLS-without-policy notices are informational for intentionally server-only legacy tables.
- [~] Roll out behind internal/admin scope first, then one real pilot client, then controlled production cohorts. The database and staff governance surface now model explicit `internal`, `pilot`, `cohort`, and `general` stages; production inserts are enforced by the stage trigger, and `supabase/tests/workflow_rollout_integration.sql` proved all four gates live inside a rolled-back transaction. The previous first-pilot deadlock is removed: an explicit admin-only transaction now creates the production client/source, changes the gate to that single pilot, leaves client output on legacy, and creates the baseline atomically. Its live rolled-back integration proof passed. The connected tenant is now intentionally in `pilot` for Trisha Baltazar only; client projection remains `legacy`, no production cohort is enabled, and `general` stays off until reviewed shadow parity and a controlled cohort pass.
- [~] Run the old and new result projections in shadow mode and require reviewed parity before switching the client-facing source of truth. The staff governance surface now runs deterministic comparisons only for explicitly reviewed legacy-to-normalized Website Checkup links, compares stable checklist keys and the client-visible score, records fingerprints and concise discrepancies, and resets approval whenever either projection changes. The API rejects approval of mismatches, ignores demo parity for release, and requires every real rollout client to have reviewed matching parity with no unresolved comparison before selecting normalized output. `scripts/test-shadow-projection.ts` proves matching, mismatch, latest-revision, and not-comparable behavior. A real production link and human review are still required to complete this item.
- [x] Define a rollback that stops new workflows while preserving completed evidence, revisions, approvals, and historical URLs. Evidence: `workflow_release_controls.new_workflows_enabled` gates only new production runs; the rollback control never deletes completed runs, snapshots, revisions, approvals, legacy links, or migration rows.

Acceptance gate:

- [x] The pilot proves accurate arbitrary-domain evidence, selective recheck behavior, resumability, memory isolation, human gates, and no seeded fallback. July 24 evidence: `trishabaltazar.com` validated as a public WordPress domain, discovered four same-origin pages, persisted 11 evidence items with full coverage and mobile/desktop Lighthouse evidence, and produced 149 deterministic plus two governed baseline revisions. The accepted targeted recheck selected exactly 84 Failed/Unverified checks and a later one-check probe selected only `website.content-01`; the probe retrieved exactly one approved Trisha-scoped memory and produced one Manager-owned review exception in 6.5 seconds. A forced 10-second governed-review failure preserved the rendered-evidence checkpoint as `partial`; Resume reused that saved snapshot without another crawl or Lighthouse run and returned the same run to `ready` with nine open human-review exceptions. A temporary authenticated Client saw only the Trisha pilot and safe progress, received `403` from staff governance, and exposed no workflow ID, checkpoint, agent trace, staff recovery data, or another client; the temporary identity was deleted afterward. CreatorIQ remained explicit demo data and was never used as the pilot source.
- [x] TypeScript, focused data tests, agent evals, engine smoke tests, `git diff --check`, production build, and desktop/mobile browser verification pass before general release. July 24 evidence: `tsc --noEmit`, workflow, notification/client-projection, and shadow-projection suites, exact Admin/Client engine routes, all 20 mobile routes, `git diff --check`, and `next build --webpack` passed. Live API checks additionally returned `401` for unauthenticated workspace/audit/file/generation/dashboard access, a one-client sanitized audit/workspace projection, `403` for client full-snapshot/audit replacement and cross-client upload, and staff-only full records. The production deployment completed successfully and `https://dashboard.trishabaltazar.com/dashboard` returns `200`. These checks do not advance the tenant beyond internal rollout without the separate real-client pilot gate.

### Execution Rule

Proceed phase by phase. Within each phase:

1. Implement one unchecked item.
2. Run the closest unit, integration, data, or browser proof.
3. Mark it `[~]` if code exists but the acceptance gate is not proven.
4. Mark it `[x]` only after its acceptance evidence is recorded.
5. Do not begin the next phase until the current acceptance gate passes, except for isolated test scaffolding that does not change production behavior.

## Batch 10: White-Labeled Audit And Export Hardening

Goal: support white-labeled audit output safely.

### Checklist

- [x] Add white-label toggle or status in admin audit tools.
- [x] Add client/partner branding fields.
- [x] Add export status: draft, reviewed, ready, sent.
- [x] Add working PDF/page export preparation.
- [x] Add internal-notes stripping check.
- [x] Add client-safe, read-only content preview.
- [x] Add recoverable audit export version history.

### Fail-Proof Checks

- [x] White-labeled reports never include controls, internal report content, or admin-only content.
- [x] White-labeled reports show the saved brand name, accent, status, client, and version.
- [x] Exports are versioned so old profiles can be restored as a new draft.
- [x] Client-safe report retains the existing finding, impact, recommended action, and next-step structure.

## Verification Checklist

- [x] `PATH="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" node node_modules/typescript/bin/tsc --noEmit`
- [x] `PATH="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" node node_modules/next/dist/bin/next build --webpack`
- [x] Preview is running at `http://localhost:3412` and returned 200 during the July 23 verification pass.
- [x] Verify `http://localhost:3412/dashboard`.
- [x] Verify admin view.
- [x] Verify client Cocoon Consult state.
- [x] Verify paid Cocoon Consult state.
- [x] Verify WIAW active state.
- [x] Verify In Full Flight state.
- [x] Confirm there is no visible deleted/archived tab in the dashboard switcher.
- [x] Verify mobile width around 390px.
- [x] Verify desktop width.
- [x] Verify no horizontal overflow.
- [x] Verify locked tabs have useful explanations.
- [~] Verify notifications deep-link to the correct area. Automated notification tests cover exact task, approval, files, billing, client, journey, inbox, and service-run destinations; a full click-through matrix still needs representative real events.
- [x] Verify no client view exposes admin-only copy. The shared workspace endpoint performs a server-side client projection and the focused test proves other clients, internal notes/plans, AI review records, engine payloads/traces, unreviewed events, payment references, staff chat history, and staff notification state are removed before delivery. A July 24 Client-mode browser sweep covered Snapshot, Journey, To-do's, Approvals, Checkups, Labs, Inbox, Activity, and Files with no Superadmin, staff-only lifecycle, AI-review, Wise recipient/QR, internal-note, or payment-reference copy exposed.

## Triple-Check Matrix

| Requirement | Dashboard Evidence Needed | Failure To Catch | Status |
| --- | --- | --- | --- |
| Landing signup fields exist | Email, phone, name, business name, website are modeled | Website/contact details missing from lead record | [~] |
| Cocoon link is sent after signup | Link delivery status and notification/email state exist | Client gets dashboard before consult flow | [~] |
| Audit results visible after form completion | Cocoon audit result screen exists | Client submits form but has no result | [x] |
| Paid Cocoon Consult uses Wise | Wise payment email/QR state exists | Stripe/checkout/invoice language appears | [x] |
| Paid Cocoon unlocks three-month dashboard access | Access start/end dates exist | Three-month access attached to WIAW by mistake | [x] |
| 24-hour guidance window is separate | Guidance start/end timer exists | 24-hour access confused with dashboard access | [x] |
| WIAW has unlimited dashboard access | WIAW access state exists | Active WIAW client gets expired/limited access | [x] |
| AI output is reviewed | AI output has approval status | Draft audit/payment/scope goes straight to client | [x] |
| White-label report is safe | Internal notes stripped and preview reviewed | Admin notes leak to client/partner | [x] |
| Client views are client-safe | No Admin/Superadmin/internal notes in client UI | Internal delivery work appears in portal | [x] |
| Notifications match lifecycle | Dynamic notification events are generated from completed tasks, assignees, lifecycle stage, and next action | Client misses payment, booking, access, approval, or dashboard deletion updates | [x] |
| Dashboard deletes after no action | Deletion rule exists in the workflow map and mock deleted state; no visible deleted tab appears in the preview switcher | Expired clients keep using a stale audit/dashboard | [x] |

## Implementation Order Recommendation

| Order | Status | Task | Depends On |
| --- | --- | --- | --- |
| 1 | [x] | Add lifecycle, access, payment, and AI review types | Batch 1 |
| 2 | [x] | Add mock project states for Cocoon, paid Cocoon, WIAW, and In Full Flight | Batch 2 |
| 3 | [x] | Update sidebar and locked-state logic to read lifecycle state | Batches 1-2 |
| 4 | [x] | Update Cocoon Consult Workspace for the current preview structure | Batches 1-3 |
| 5 | [x] | Update billing and Wise payment states | Batches 1-4 |
| 6 | [~] | Add the role-scoped human review command center; automatic approval, payment, email, publishing, reminder, and deletion actions remain intentionally deferred | Batches 1-6 |
| 7 | [x] | Replace shared portal shell placeholders with dynamic assignee-aware notification events; keep external sends deferred | Batches 1-8 |
| 8 | [x] | Update WIAW and In Full Flight access behavior | Batches 1-2, 9 |
| 9 | [x] | Add white-label audit export controls | Batches 5, 10 |
| 10 | [x] | Run current preview verification pass | Batches 1-10 |

## Active Implementation Batch: Domain-Neutral Checkups And Adaptive Containers

- [x] Keep CreatorIQ as selectable demo data without using it as the fallback Client identity.
- [x] Start every studio-created unassigned Website Checkup with a clean intake rather than reopening hidden demo-derived work.
- [x] Replace source-derived answers and generated stages when an unassigned Checkup switches domains.
- [x] Derive the unassigned draft label from the active domain.
- [x] Let shared Checkup/Lab indexes select 1-3 card columns from available width and collapse constrained report/workspace columns early.
- [x] Verify a non-CreatorIQ domain, five responsive widths, zero page overflow, TypeScript, diff check, and the webpack build.

## Active Implementation Batch: Full Information Ecosystem Audit

Source: user-approved plan from 2026-06-21.
Target: `http://localhost:3412/dashboard`

- [x] **Lifecycle source of truth**
  - [x] Add typed lifecycle stages for Cocoon Audit, Paid Cocoon, WIAW Active, In Full Flight, and internal Deleted.
  - [x] Add typed Wise payment status, dashboard access, guidance window, audit snapshot, and lifecycle notification fields.
  - [x] Replace the old `diy-dfy` dev state with `paid-cocoon`.

- [x] **Coherent dummy client set**
  - [x] Add one sample client for Cocoon Audit.
  - [x] Add one sample client for Paid Cocoon Consult.
  - [x] Add one sample client for WIAW Active.
  - [x] Add one sample client for In Full Flight.
  - [x] Removed deleted/no-action clients from the visible dashboard switcher.
  - [x] Remove Cocoon Consult Free from admin workspaces; admin only manages Premium Cocoon and WIAW clients.
  - [x] Treat no-upgrade Cocoon accounts as automatic archive/delete candidates after the follow-up window.

- [x] **Shared audit model**
  - [x] Use the same audit categories for Milestones Foundation and Audit Thematic Reports.
  - [x] Use the same audit item priority data for health score, top issues, and category counts.
  - [x] Use the same page crawl data in the audit results screen.

- [x] **Lifecycle-aware client surfaces**
  - [x] Sidebar plan label reads from the selected project lifecycle.
  - [x] Sidebar nudge title/body/button read from the selected project lifecycle.
  - [x] Overview next steps and audit percentage read from the selected project lifecycle/audit.
  - [x] Milestones audit mode reads from the selected project audit snapshot.
  - [x] Billing shows Wise payment, dashboard access, and 24-hour guidance window.
  - [x] Notifications are generated from persisted lifecycle, operational-event, approval, file, project, and versioned task-completion records for Cocoon link/intake, audit review, Wise payment, booking, access, WIAW, In Full Flight, and dashboard deletion notice states.
  - [x] In Full Flight sample activates the third milestone instead of leaving the dashboard on the WIAW build milestone.
  - [x] Milestones tab re-expands the active milestone when switching lifecycle samples.
  - [x] WIAW Design & Build shows both review gates; Full Site Preview remains locked/inactive until QA & Polish is ready.

- [x] **Verification**
  - [x] `tsc --noEmit` passes.
  - [x] `next build --webpack` passes.
  - [x] Server route returns 200 for Cocoon Audit state.
  - [x] Server route returns 200 for Paid Cocoon state.
  - [x] Server route returns 200 for WIAW Active state.
  - [x] Server route returns 200 for In Full Flight state.
  - [x] Deleted dashboard is not exposed as a visible dev tab.
  - [x] Browser preview verification completed for the current local preview scope; no deeper production functionality was added.

## Open Decisions

- [x] Paid Cocoon defaults to `Cocoon Consult`; staff can set a per-client package label without changing the public service taxonomy.
- [x] Wise email subject/body and QR handling are explicit, editable staff-only policy fields. The approved default uses `{client_name}` and `{transfer_reference}` tokens and an approved QR asset; reviewed copy reaches the client projection only after details are marked sent.
- [x] Payment confirmation defaults to manual-only and can be changed to manual-or-verified-match for a future integration. Both paths still require a verified recipient and transfer reference before confirmation.
- [x] Three-month access defaults to payment confirmation and can be configured per client to start at booking, guided-call completion, or a manual date.
- [x] Client should not retain dashboard access after the no-action window; restarting later requires a new paid Cocoon Consult.
- [x] WIAW “unlimited” means no fixed expiry while the engagement is confirmed. Pause behavior is configurable (`continue` or `suspend`); cancellation defaults to ending access immediately, with an explicit manual-end override.
- [x] In Full Flight Labs require a completed WIAW/approved care handoff plus either an active care plan or explicit manual access, according to the recorded per-client policy. Paused/cancelled care no longer leaves Labs silently available.
- [x] White-label audience is explicit and configurable per client: clients, partners, or both. The default remains clients.
- [x] Confirm the visible assignee labels clients should see: `Your task`, `Studio task`, and `Shared review`; internal named roles remain staff-only.
- [x] Confirm whether AI/System should ever appear as an assignee to admins, or only as an internal source on automation records. Admins can explicitly assign `Baltz AI`; clients see the role-safe work label, while automation records retain System as the internal source.
- [x] Completed client to-do routing is configurable in Settings: `Admin + assignee` or `Admin only`.
- [x] Completed client to-do delivery is configurable in Settings: individual immediate updates or one grouped daily-digest update.
