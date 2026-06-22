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
- [~] Notifications exist as dashboard UI/data, but they still need to become assignee-aware and event-driven instead of feeling static.
- [~] Task assignees exist in task data and now appear in task lists/detail rows with role-safe labels; broader assignment controls and routing are still pending.

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

- [ ] Add a dashboard-facing process/status view that shows the client's current website development stage and the next stage.
- [ ] Add task assignee data for Client, Studio Admin, Superadmin, AI/System, and shared Client + Studio Admin work.
- [~] Show assignee ownership on task rows, approval gates, and admin workflow queues.
- [~] Add role-safe assignee display rules so clients never see Superadmin-only or internal AI/system ownership details.
- [!] Convert lifecycle notifications from static sample records into notifications generated from completed workflow events. Deferred because this is automation/event-generation work.
- [ ] Link each completed task type to a notification recipient, message, next action, and destination tab/section.
- [ ] Update notification badge counts when task completion, reopening, or correction events happen.
- [ ] Add stale-notification handling when a completed task is reopened or changed.
- [ ] Add tests or targeted browser checks proving a completed task changes the related notification list dynamically.
- [!] Do not implement billing, Wise sending, AI output generation, AI review automation, notification automation, or dashboard deletion automation until confirmed.

## Non-Negotiable Rules

- [ ] Landing page signup collects email, phone number, name, business name, and website in the external landing-page repo.
- [ ] Dashboard repo uses dummy/mock landing-page signup data until integration exists.
- [ ] Landing signup does not equal payment.
- [ ] Cocoon Consult link is sent after landing signup.
- [ ] Cocoon Consult contains the deeper audit form and shows audit results after completion.
- [ ] Payment is manual through Wise, with email and QR/payment details.
- [ ] Paid Cocoon Consult unlocks booking, three-month dashboard access, and a 24-hour guidance window.
- [ ] WIAW unlocks unlimited dashboard access while the client is working with Baltazar Studio.
- [ ] Clients must pass through Cocoon Consult and the required audit before WIAW.
- [ ] Clients never see Superadmin/Admin language or internal project operations.
- [ ] AI can draft and queue work, but final audit claims, payment details, scope promises, and launch instructions need studio review unless explicitly auto-approved.
- [ ] White-labeled audits must remove internal notes and expose only client-safe language.
- [~] Every actionable task has an assignee.
- [ ] Every completed task that affects the client journey creates, updates, or resolves the correct notification.
- [ ] Notification recipients come from task ownership and lifecycle stage, not one global static notification list.
- [ ] Task completion updates milestone/phase progress, access state where relevant, and notification badge count together.
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
- [ ] Confirm the intended preview remains `http://localhost:3412` before implementation.
- [ ] Record the full dirty worktree before implementation.
- [ ] Confirm each implementation pass targets the current Next.js dashboard, not the older Vite surface.

### Fail-Proof Checks

- [x] Planning stays in this file instead of being scattered across sidecar files.
- [x] Workflow source stays in `BALTZ_SERVICE_WORKFLOW_MAP.md`.
- [x] Landing-page work is kept out of this repo until explicit integration work begins.
- [ ] No unrelated files are reverted or reset during implementation.
- [ ] Dashboard/homepage scopes remain separate.

## Recommended Starting Batch

Given the current restrictions, start with **Batch 1 plus the mock-data slice of Batch 2**.

Do not start with landing-page UI, real backend wiring, Wise automation, or email sending. The landing page is external on `localhost:3411`, and this dashboard repo is still using dummy information. The safest first implementation is to teach the dashboard the real workflow states using mock data, then render those states in the existing dashboard.

### First Implementation Slice

- [ ] Add lifecycle/access/payment/audit/AI review types in `src/types.ts`.
- [ ] Add dummy/mock workflow data in `src/data/mockProjects.ts`.
- [x] Add dev-selectable states for Cocoon, paid Cocoon, WIAW, and In Full Flight.
- [x] Do not add a visible deleted dashboard tab; deletion means the dashboard is gone, not archived for client browsing.
- [ ] Keep all landing-page fields as mock data in this repo.
- [ ] Do not connect to the external `localhost:3411` landing page yet.
- [ ] Do not send real Wise emails or notifications yet.
- [ ] Use the new lifecycle state only to drive dashboard labels, locks, access cards, and visible next steps.

### First Slice Success Criteria

- [x] Dashboard can show the active dummy states: Cocoon audit, paid Cocoon, WIAW active, and In Full Flight.
- [x] Deleted/no-action clients are represented in workflow rules, not as a visible client dashboard state.
- [ ] Three-month Cocoon dashboard access and 24-hour guidance window are represented separately.
- [ ] WIAW shows unlimited dashboard access while active.
- [ ] No real external integration is required.
- [ ] TypeScript passes.
- [ ] Existing admin/client dashboard still loads.

## Batch 1: Lifecycle And Access State Model

Goal: replace the simple `cocoon` / `diy-dfy` / `wiaw` view-mode logic with an explicit lifecycle model.

### Checklist

- [x] Add `ClientLifecycleStage`.
- [ ] Add `PaymentStatus`.
- [ ] Add `DashboardAccessStatus` or `AccessWindow`.
- [ ] Add `GuidanceWindowStatus`.
- [ ] Add `AuditStatus`.
- [ ] Add `WorkflowDeliverableStatus`.
- [ ] Add `WhiteLabelStatus`.
- [ ] Add `AutomationReviewStatus`.
- [ ] Replace view-mode-only logic where it incorrectly implies payment, booking, access, or audit status.

### Required Lifecycle States

- [ ] `lead_signup_submitted`
- [ ] `consult_link_sent`
- [ ] `consult_form_started`
- [ ] `consult_form_completed`
- [ ] `audit_generated`
- [ ] `audit_review_ready`
- [ ] `paid_cocoon_offered`
- [ ] `wise_payment_pending`
- [ ] `paid_cocoon_confirmed`
- [ ] `guided_call_booked`
- [ ] `guided_call_complete`
- [ ] `strategy_handoff_ready`
- [ ] `wiaw_recommended`
- [ ] `wiaw_confirmed`
- [ ] `wiaw_active`
- [ ] `wiaw_complete`
- [ ] `in_full_flight_offered`
- [ ] `in_full_flight_active`
- [x] `deleted` as an internal terminal state only, not a visible tab

### Fail-Proof Checks

- [ ] Three-month dashboard access cannot be confused with the 24-hour guidance window.
- [ ] WIAW unlimited access cannot appear before WIAW confirmation.
- [x] Deleted clients cannot see active support/workspace actions because the dashboard is removed.
- [ ] Dashboard access is derived from explicit dates/status, not visible copy labels.

## Batch 2: Project Data Model And Mock States

Goal: make the current mock project data capable of representing the real workflow.

### Checklist

- [ ] Add lead signup fields: name, email, phone number, business name, website.
- [ ] Add current website development stage field.
- [ ] Add next website development stage field.
- [ ] Add next required action field.
- [ ] Track Cocoon Consult link sent status and timestamp.
- [ ] Track form started/completed timestamps.
- [ ] Track audit generated/reviewed/approved timestamps.
- [ ] Track Wise payment email sent status.
- [ ] Track Wise QR/payment details as admin-only fields.
- [ ] Track payment status and confirmation reference.
- [ ] Track booking link status.
- [ ] Track guided call schedule.
- [ ] Track 24-hour guidance window start/end.
- [ ] Track three-month Cocoon dashboard access start/end.
- [ ] Track WIAW unlimited access status.
- [ ] Track white-labeled audit status.
- [ ] Track AI outputs and human approval status.
- [ ] Track task assignee role and visible assignee label.
- [ ] Track task completion event metadata for notification generation.
- [x] Add mock project states for Cocoon, paid Cocoon, WIAW, and In Full Flight.
- [x] Keep deleted/no-action state out of the visible dashboard switcher.

### Fail-Proof Checks

- [ ] Wise payment details never expose in client UI until approved/sent.
- [ ] Internal notes and admin-only payment data cannot leak into client views.
- [ ] Mock data includes at least one project in each critical state.
- [ ] Mock data includes at least one completed task event that generates a dynamic client notification.
- [ ] Mock data includes at least one completed task event that generates a dynamic admin notification.
- [ ] TypeScript catches missing lifecycle fields in dashboard surfaces.

## Batch 3: Cocoon Consult Workspace

Goal: make the Cocoon area match the real Cocoon Consult journey.

### Checklist

- [ ] Rename visible `Onboarding` language where it should say Cocoon Consult or audit language.
- [ ] Replace DIY/DFY wording where it conflicts with the workflow map.
- [ ] Add audit results screen after form completion.
- [ ] Add client-safe audit result sections: finding, impact, recommended action, next step.
- [ ] Add paid guided call prompt after audit results.
- [ ] Add Wise payment pending state.
- [ ] Add Wise payment confirmed state.
- [ ] Add booking link unlock state.
- [ ] Add 24-hour guidance window display.
- [ ] Add three-month dashboard access display.
- [ ] Add strategy handoff section for workflow, dashboard path, custom booking link, or full funnel structure.
- [ ] Add WIAW recommended next step that feels earned by audit findings.

### Fail-Proof Checks

- [ ] Client can see audit results after completing Cocoon Consult.
- [ ] Client cannot book the guided call until payment is confirmed or manually unlocked.
- [ ] Client can distinguish three-month dashboard access from 24-hour studio guidance.
- [ ] Cocoon does not look like a generic package comparison.
- [ ] Cocoon area never exposes admin-only AI reasoning or internal tasks.

## Batch 4: Wise Billing And Payment Flow

Goal: align billing with manual Wise payment emails and QR details.

### Checklist

- [ ] Rename generic invoice language where it should say Wise payment.
- [ ] Add Wise payment email status.
- [ ] Add QR/payment detail placeholder controlled by admin approval.
- [ ] Add payment states: pending, sent, confirmed, failed, manual review.
- [ ] Add admin review before payment details are sent.
- [ ] Add client-friendly Wise payment instructions after studio approval.
- [ ] Add payment confirmation tracking.
- [ ] Add escalation path when payment cannot be matched automatically.

### Fail-Proof Checks

- [ ] No Stripe checkout language appears in Cocoon or billing flow.
- [ ] Client never sees draft payment instructions.
- [ ] Admin can verify payment recipient/client match.
- [ ] Payment confirmation unlocks the correct access state only.

## Batch 5: AI/System Actions And Human Review Gates

Goal: make AI useful without letting drafts leak into client-facing output.

### Checklist

- [ ] Add AI action records for audit draft generation.
- [ ] Add AI action records for audit summarization.
- [ ] Add AI action records for white-labeled report generation.
- [ ] Add AI action records for Wise payment email drafting.
- [ ] Add AI action records for notification drafting.
- [ ] Add AI action records for strategy handoff drafting.
- [ ] Add AI action records for WIAW recommendation drafting.
- [ ] Add AI action records for launch handoff drafting.
- [ ] Add approval controls before AI outputs become client-facing.
- [ ] Add client-safe preview for each AI output before publishing.

### Fail-Proof Checks

- [ ] AI-generated audit findings cannot publish without approval.
- [ ] White-labeled reports remove internal notes.
- [ ] Payment emails cannot send without approval.
- [ ] Scope promises cannot publish without approval.
- [ ] Launch/handoff instructions cannot publish without approval.
- [ ] Notifications use helpful language, not pressure language.

## Batch 6: Admin Workflow Command Center

Goal: give Admin/Superadmin the operational view needed to manage the full workflow without exposing it to clients.

### Checklist

- [ ] Add admin workflow stage overview.
- [ ] Add current stage, next stage, and next action summary per client.
- [ ] Add lead signup details.
- [ ] Add Cocoon Consult link delivery status.
- [ ] Add audit review queue.
- [ ] Add AI output approval queue.
- [ ] Add Wise payment email/QR approval queue.
- [ ] Add payment confirmation/matching status.
- [ ] Add booking status.
- [ ] Add access window status.
- [ ] Add white-label audit controls.
- [ ] Add developer assignment controls if not already covered by Users.
- [ ] Add assignee controls for Client, Studio Admin, Superadmin, AI/System, and shared work.
- [ ] Add completed-task event history for notification/audit traceability.
- [ ] Add nurture status and dashboard deletion scheduling.

### Fail-Proof Checks

- [ ] Superadmin/Admin-only information stays admin-only.
- [ ] Assigned developers see only projects/tools assigned to them.
- [ ] Admin can identify the next required action in under one screen.
- [ ] Every client-visible action has an admin/audit trail.
- [ ] Admin can see which notification was sent or drafted after each completed task.

## Batch 7: Client Views And Lock Reasons

Goal: make every client state explain exactly what is happening and what happens next.

### Checklist

- [ ] Make locked states explain the exact next step.
- [ ] Add client view for `consult_link_sent`.
- [ ] Add client view for `consult_form_started`.
- [ ] Add client view for `audit_generated`.
- [ ] Add client view for `wise_payment_pending`.
- [ ] Add client view for `paid_cocoon_confirmed`.
- [ ] Add client view for `guided_call_booked`.
- [ ] Add client view for `strategy_handoff_ready`.
- [ ] Add client view for `wiaw_confirmed`.
- [ ] Add client view for `in_full_flight_offered`.
- [ ] Add client-safe process tracker showing current stage, next stage, and what is needed next.
- [ ] Add client-safe assignee labels such as `Your task`, `Studio task`, and `Shared review`.
- [x] Do not add client view for deleted dashboards.

### Fail-Proof Checks

- [ ] Client copy says what is happening now, what is needed from them, what is waiting on the studio, and what happens next.
- [ ] Client never sees Admin, Superadmin, internal cost notes, internal AI notes, or raw task operations.
- [ ] Client does not see WIAW build workspace before WIAW confirmation.
- [ ] Dashboard deletion removes portal access after the no-action window; if the client returns, require a new paid Cocoon Consult because the old audit may be stale.

## Batch 8: Notifications

Goal: make notifications dynamic, assignee-aware, and generated from completed workflow events instead of static sample messages.

### Checklist

- [ ] Define `NotificationEventType` values from the completion notification matrix.
- [ ] Define notification recipient roles: Client, Studio Admin, Superadmin, assigned developer, and shared recipients.
- [ ] Define notification source fields: completed task, assignee, client/project, lifecycle stage, next action, destination tab, and review state.
- [ ] Add notification type for landing page signup received.
- [ ] Add notification type for Cocoon Consult link sent.
- [ ] Add notification type for Cocoon intake started.
- [ ] Add notification type for Cocoon intake completed.
- [ ] Add notification type for form reminders.
- [ ] Add notification type for first AI audit pass completed.
- [ ] Add notification type for second AI audit pass completed.
- [ ] Add notification type for audit results ready.
- [ ] Add notification type for Wise payment email prepared.
- [ ] Add notification type for Wise payment email sent.
- [ ] Add notification type for Wise payment confirmed.
- [ ] Add notification type for booking unlocked.
- [ ] Add notification type for guided Cocoon call booked.
- [ ] Add notification type for guided Cocoon call completed.
- [ ] Add notification type for guided call reminders.
- [ ] Add notification type for 24-hour guidance window starting/ending.
- [ ] Add notification type for three-month dashboard access ending soon.
- [ ] Add notification type for WIAW recommendation.
- [ ] Add notification type for WIAW workspace unlocked.
- [ ] Add notification type for client asset upload completed.
- [ ] Add notification type for studio foundation task completed.
- [ ] Add notification type for design preview sent.
- [ ] Add notification type for client approval completed.
- [ ] Add notification type for client revision notes submitted.
- [ ] Add notification type for build QA completed.
- [ ] Add notification type for launch prep completed.
- [ ] Add notification type for handoff package sent.
- [ ] Add notification type for In Full Flight offer.
- [ ] Add notification type for In Full Flight task completed.
- [ ] Add notification type for no-action nurture step sent.
- [ ] Generate notification copy from event data instead of hardcoded message rows.
- [ ] Route each notification to the correct recipient role instead of one global notification feed.
- [ ] Deep-link each notification to the correct dashboard tab, modal, or workflow section.
- [ ] Update notification badge counts when an event is created, read, resolved, or corrected.
- [ ] Reconcile stale notifications when the source task is reopened or changed.
- [ ] Keep AI-generated notifications in draft/review state when they mention audit claims, payment details, scope promises, launch instructions, or client-facing commitments.
- [x] Add notification type for dashboard deletion notice.

### Fail-Proof Checks

- [ ] Notifications respect role and lifecycle locks.
- [ ] Notifications deep-link to the correct tab/section.
- [ ] Notifications do not imply payment is complete unless confirmed.
- [ ] Notifications do not pressure clients with scarcity language.
- [ ] Notification settings still work after new types are added.
- [ ] Completing a task changes the correct notification feed without manually editing static notification data.
- [ ] Reopening a task updates or corrects the related notification instead of leaving stale copy visible.
- [ ] Client notification copy always starts with the client action when client action is required.
- [ ] Admin notification copy includes operational context and review needs.
- [ ] Superadmin notifications only appear for system, access, permission, template, or deletion events.

## Batch 9: WIAW And In Full Flight

Goal: gate WIAW behind Cocoon strategy and make In Full Flight feel like support continuity.

### Checklist

- [ ] Require Cocoon audit completion before WIAW recommendation.
- [ ] Require strategy handoff completion before WIAW confirmation.
- [ ] Add WIAW payment/confirmation state.
- [ ] Switch dashboard access to unlimited while working together.
- [ ] Generate WIAW workspace from Cocoon findings.
- [ ] Generate milestones from implementation scope.
- [ ] Preserve approval gates: Design Preview, Full Site Preview, Handoff Package.
- [ ] Add In Full Flight offer after WIAW completion.
- [ ] Add In Full Flight workspace state for ongoing support.

### Fail-Proof Checks

- [ ] WIAW cannot start without Cocoon audit and strategy context.
- [ ] WIAW access state does not expire while active.
- [ ] Approval gates remain the main decision points.
- [ ] In Full Flight feels like continued support, not forced upgrade pressure.

## Batch 10: White-Labeled Audit And Export Hardening

Goal: support white-labeled audit output safely.

### Checklist

- [ ] Add white-label toggle or status in admin audit tools.
- [ ] Add client/partner branding fields.
- [ ] Add export status: draft, reviewed, ready, sent.
- [ ] Add PDF/page export placeholder.
- [ ] Add internal-notes stripping check.
- [ ] Add client-safe content preview.
- [ ] Add audit version history.

### Fail-Proof Checks

- [ ] White-labeled reports never include admin notes.
- [ ] White-labeled reports show approved brand/client details only.
- [ ] Exports are versioned so old reports can be recovered.
- [ ] Client-safe report uses finding, impact, recommended action, next step.

## Verification Checklist

- [x] `PATH="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" node node_modules/typescript/bin/tsc --noEmit`
- [x] `PATH="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" node node_modules/next/dist/bin/next build --webpack`
- [ ] Start preview with `./scripts/dev.sh`.
- [ ] Verify `http://localhost:3412/dashboard`.
- [ ] Verify admin view.
- [x] Verify client Cocoon Consult state.
- [x] Verify paid Cocoon Consult state.
- [x] Verify WIAW active state.
- [x] Verify In Full Flight state.
- [x] Confirm there is no visible deleted/archived tab in the dashboard switcher.
- [ ] Verify mobile width around 390px.
- [ ] Verify desktop width.
- [ ] Verify no horizontal overflow.
- [ ] Verify locked tabs have useful explanations.
- [ ] Verify notifications deep-link to the correct area.
- [ ] Verify no client view exposes admin-only copy.

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
| AI output is reviewed | AI output has approval status | Draft audit/payment/scope goes straight to client | [ ] |
| White-label report is safe | Internal notes stripped and preview reviewed | Admin notes leak to client/partner | [ ] |
| Client views are client-safe | No Admin/Superadmin/internal notes in client UI | Internal delivery work appears in portal | [ ] |
| Notifications match lifecycle | Dynamic notification events are generated from completed tasks, assignees, lifecycle stage, and next action | Client misses payment, booking, access, approval, or dashboard deletion updates | [~] |
| Dashboard deletes after no action | Deletion rule exists in the workflow map and mock deleted state; no visible deleted tab appears in the preview switcher | Expired clients keep using a stale audit/dashboard | [x] |

## Implementation Order Recommendation

| Order | Status | Task | Depends On |
| --- | --- | --- | --- |
| 1 | [x] | Add lifecycle, access, payment, and AI review types | Batch 1 |
| 2 | [x] | Add mock project states for Cocoon, paid Cocoon, WIAW, and In Full Flight | Batch 2 |
| 3 | [x] | Update sidebar and locked-state logic to read lifecycle state | Batches 1-2 |
| 4 | [x] | Update Cocoon Consult Workspace for the current preview structure | Batches 1-3 |
| 5 | [x] | Update billing and Wise payment states | Batches 1-4 |
| 6 | [ ] | Update admin automation and review queues | Batches 1-6 |
| 7 | [~] | Replace static sample notifications with dynamic assignee-aware notification events | Batches 1-8 |
| 8 | [x] | Update WIAW and In Full Flight access behavior | Batches 1-2, 9 |
| 9 | [ ] | Add white-label audit export controls | Batches 5, 10 |
| 10 | [x] | Run current preview verification pass | Batches 1-10 |

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
  - [~] Notifications include lifecycle sample events for Cocoon link, audit, Wise payment, access, WIAW, In Full Flight, and dashboard deletion state, but they still need to be generated dynamically from task completion events.
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

- [ ] Confirm whether the paid Cocoon Consult should be called only `Cocoon Consult` or if another package label should appear in admin-only fields.
- [ ] Confirm exact Wise payment email copy and QR handling.
- [ ] Confirm whether payment confirmation is manual-only or can be matched automatically later.
- [ ] Confirm the exact three-month access start date: payment confirmation, booking date, or guided call completion.
- [x] Client should not retain dashboard access after the no-action window; restarting later requires a new paid Cocoon Consult.
- [ ] Confirm what “unlimited” means if a WIAW project is paused or cancelled.
- [ ] Confirm In Full Flight access rules.
- [ ] Confirm whether white-label branding is for clients, partners, or both.
- [ ] Confirm the visible assignee labels clients should see: for example `Your task`, `Studio task`, `Shared review`, or named people.
- [ ] Confirm whether AI/System should ever appear as an assignee to admins, or only as an internal source on automation records.
- [ ] Confirm whether completed client tasks should notify both Admin and assigned developer, or Admin only.
- [ ] Confirm whether task completion notifications should be immediate, batched, or configurable by notification settings.
