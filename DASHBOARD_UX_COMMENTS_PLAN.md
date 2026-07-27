# Dashboard UX Comments Plan

Source: browser comments and internal cleanup notes for `http://localhost:3412/dashboard` and `http://localhost:3412/login`, including the seven-comment dashboard polish batch captured on June 21, 2026

Target: `/dashboard` client/admin surfaces plus `/login` shared styling

Workspace: `/Users/trishabltzr/baltazarstudio`

Central file rule: keep dashboard annotation planning in this file only. When a workflow or dashboard requirement changes, update this checklist in the same pass.

## Progress Legend

- `[ ]` Not started
- `[~]` Implemented in code, verification pending
- `[x]` Implemented and verified

Note: use `[~]` only when code has landed but TypeScript/build/browser verification is still pending.

## Workflow

1. Add new browser comments to the Active Batch.
2. Implement one focused batch at a time.
3. Verify with TypeScript, build, and targeted browser checks when applicable.
4. Mark checklist items complete only after verification.
5. Reset this file after a completed comment cycle so the next batch starts clean.

---

## Active Workflow Improvement: Durable Handoffs

Source: highest-value process improvement item 4, continued July 23, 2026.

- [x] Expand the existing persisted Checkup-to-Lab handoff into a durable record with source/output versions, approved scope, included recommendations, unresolved items, approval state, sender, receiver, and timestamps.
- [x] Link implementation To-do IDs back to the originating handoff when Website Lab imports its task plan.
- [x] Show a compact Website Lab handoff summary without adding automatic approvals, notifications, or publishing.
- [x] Verify TypeScript, production build, persistence compatibility, and the CreatorIQ Website Lab surface. Evidence: TypeScript, diff check, and webpack build pass; CreatorIQ displays Trish Baltazar → Website Lab, output v1, 8 scope items, 4 recommendations, approved status, and 9 task IDs after import with no 1280px horizontal overflow.

---

## Active Workflow Improvement: Standard AI Review States

Source: highest-value process improvement item 5, continued July 23, 2026.

- [x] Define one shared `Not generated → Draft → Needs review → Approved → Shared` lifecycle with deterministic forward transitions and an explicit Needs review → Draft revision path.
- [x] Persist review state in guided Checkup and Lab sessions while deriving safe states for older saved sessions.
- [x] Replace local AI-output status variants across generated stages, Funnel cards, Social Media planning, and Approvals.
- [x] Verify TypeScript, production build, backwards compatibility, and representative live states without enabling automatic approval or publishing.
  - Live evidence: seeded Social Media cards render `Draft`, `Needs review`, and `Not generated`; the current CreatorIQ Funnel renders `Draft`.

---

## Active Workflow Improvement: Client Capability Access

Source: highest-value process improvement item 6, continued July 23, 2026.

- [x] Define one central capability profile for Studio, standard Client, collaborative Client, and In Full Flight Client access.
- [x] Keep the shared Brand, Website, and SEO Checkup skeleton available to standard clients while limiting them to intake, process tracking, approved outputs, feedback, and Approvals.
- [x] Expose live Lab stages only to collaborative and In Full Flight clients; keep evidence, studio approvals, proposal publishing, resets, and task imports internal.
- [x] Verify Admin/Manager continuity, standard Client navigation and direct-route guards, approved-output presentation, and responsive behavior. Evidence: the standard CreatorIQ Client nav contains Checkups but no Labs; its Snapshot shows Checkups plus Approvals and only three Checkup process cards; the Website Checkup retains the shared three-stage rail and approved action plan while rendering zero Generate, Approve, Start over, task-import, or Website Lab controls. Admin retains Checkups and Labs. TypeScript, diff check, and the webpack production build pass.

---

## Active Workflow Improvement: Assignee-aware Notification Events

Source: highest-value process improvement item 7, continued July 23, 2026.

- [x] Define a typed, role-scoped notification event derived from existing task ownership and lifecycle state.
- [x] Replace static placeholder update counts with actionable task, review, escalation, inbox, and client-journey events.
- [x] Reconcile task completion and reopening at render time so stale task notifications disappear without enabling background sends or unapproved automation.
- [x] Verify task completion/reopening changes the correct Admin, Manager, and Client notification digest; then run TypeScript, diff check, and the production build. Browser evidence: Admin changed from 0 updates to `CreatorIQ completed Approve the master platform narrative`, then returned to 0 when the task reopened; Manager remained at 0 because the task is outside its assigned clients; CreatorIQ Client received 9 client-owned actions in a bounded five-row digest with `+4 more updates`. TypeScript, diff check, and the webpack production build pass.

---

## Active Workflow Improvement: White-label Checkup Exports

Source: highest-value process improvement item 9, continued July 23, 2026. The reusable profile supports Baltazar Studio, direct-client, and partner branding; Baltazar Studio remains the safe default.

- [x] Add one persisted export profile per client with branding mode, approved display name, accent, review status, current version, and recoverable version history.
- [x] Reuse one compact export control across Brand, Website, and SEO Checkup reports while keeping Client access read-only.
- [x] Render the approved profile and version in the printable document, strip controls and internal-only content, and never mark an export sent automatically.
- [x] Verify Admin configuration, Client-safe preview, PDF/print preparation, persistence compatibility, TypeScript, diff check, and the production build. Evidence: Admin reloads `CreatorIQ · v1 · ready` and exposes branding, display-name, status, and accent controls; CreatorIQ Client sees the same profile as a non-interactive label with zero settings; the print document renders a CreatorIQ-branded cover and removes all buttons/internal controls; TypeScript, diff check, and the webpack build pass.

---

## Active Batch: Domain-Neutral Checkups And Adaptive Containers

Source: Website Checkup browser comments and multi-client readiness request, captured July 23, 2026.

- [x] Remove the provisional-score badge and make current/projected card scores the same size. Evidence: current, arrow, and projected value all compute to 18.88px; report text contains no Provisional score badge.
- [x] Treat CreatorIQ as seeded, selectable demo data only: it is no longer the fallback Client context; Start checkup creates a clean unassigned intake, while changing an unassigned Checkup domain replaces the previous source-review memory and derives the visible identity from the new domain. Evidence: the fallback Client role opens Blue Ribbon with no CreatorIQ context; a new unassigned run contains no CreatorIQ report text and changes its visible source label to `example.org` after entering `https://example.org`.
- [x] Make shared Checkup/Lab card grids choose their column count from available width without stretching a sparse card set edge-to-edge. Evidence: the shared grid renders 3/2/2/2/1 columns at 1357/1142/1000/760/390px with one card occupying a reserved track rather than bleeding across the workspace.
- [x] Collapse constrained guided-workspace and report-summary columns before their content becomes cramped. Evidence: report summary renders two 489px columns at 1357px, then one 775px/633px column at 1142px/1000px and one fluid column on mobile.
- [x] Verify a non-CreatorIQ URL, desktop/tablet/mobile column behavior, no horizontal page overflow, TypeScript, diff check, and the production build. Evidence: every measured viewport reports zero horizontal page overflow; TypeScript, diff check, and the webpack build pass.
- [x] Adapt Website Checkup card content to lifecycle state: intake cards prioritize progress and the next action, while scored cards retain the category snapshot.
- [x] Add a live audit overview module that occupies the spare wide-screen track, becomes a horizontal summary at medium widths, and condenses into a compact mobile module.
- [x] Verify the composition—not only dimensions—changes across wide, medium, and mobile containers without overflow or lost actions. Evidence: at 1357px the overview shares the three-track row; at 760px it spans above the two-card grid; at 390px the actionable client cards lead and the overview follows. All three measurements reported zero horizontal overflow, overlays, or console errors; TypeScript, diff check, and the webpack production build pass.

---

## Active Workflow Improvement: Studio Review Command Center

Source: remaining implementation-order item 6, continued July 23, 2026. This pass is deliberately review-only: it does not add automatic approval, payment, email, publishing, reminder, or deletion actions.

- [x] Derive one role-scoped review queue from pending outputs, process approval gates, review-stage To-do's, escalations, and unread client threads.
- [x] Replace the placeholder Approvals notes panel with an at-a-glance command center showing queue counts, urgency, client context, ownership, and the exact destination for each item.
- [x] Keep the existing explicit Send to client action for reviewed outputs while ensuring Manager only sees assigned clients and Client retains the current read-only approvals page.
- [x] Verify Admin, Manager, and Client behavior at desktop and mobile widths, then run TypeScript, diff check, and the production build. Evidence: Admin opens `?view=review` directly with one pending CreatorIQ output and the explicit Send action; Manager opens the command center with no CreatorIQ leakage; Client keeps `Final work ready for you` with no studio queue; Admin at 390 px and all desktop role checks report zero document/main horizontal overflow. `tsc --noEmit`, `git diff --check`, and `next build --webpack` pass.

---

## Active Workflow Improvement: Explicit Process Stage Overview

Source: next safe unfinished Batch 6 workflow item, continued July 23, 2026. This pass reads the existing persisted process state and does not advance stages or trigger automation.

- [x] Derive a role-safe next-stage label for every process tracker item while keeping internal client-hidden stages private.
- [x] Show explicit Current stage and Next stage context on each process card alongside owner, blocker, and next action.
- [x] Preserve the adaptive bounded carousel and deep-link behavior for Admin, Manager, and Client.
- [x] Verify role scoping, client-safe labels, desktop/mobile layout, TypeScript, diff check, and the production build. Evidence: Admin renders six process cards with paired Current/Next labels and deep-links the first Website Checkup to its source; Manager renders the correct empty assigned-process state without CreatorIQ fallback; Client renders three own-process cards, replaces an internal SEO stage with `Studio review`, skips the hidden Website report stage, and deep-links safely. Admin desktop/mobile and Client desktop report zero document, main, or tracker overflow. `tsc --noEmit`, `git diff --check`, and `next build --webpack` pass.
- [x] Keep blocker pills concise, such as `Overdue`, while preserving the owner and recovery action in the process record and an accessible hover label.
- [x] Verify blocker labels remain compact across Snapshot desktop and mobile cards without losing the full recovery detail. Evidence: desktop and 390 px render only `Overdue` in the pill, retain the full owner/recovery copy in `title` and `aria-label`, report no console errors or framework overlay, and have zero document overflow.

---

## Active Workflow Improvement: Admin Lead Intake Visibility

Source: next safe unfinished Batch 6 workflow items, continued July 23, 2026. Data remains clearly marked preview/mock data; no landing-page integration, email send, or link automation is enabled.

- [x] Add typed mock lead contact, business, website, capture, and Cocoon-link delivery metadata to the shared client roster.
- [x] Show the lead-intake and Cocoon-link status in Client Details for Admin only.
- [x] Keep Manager and Client from receiving the Admin lead panel, and provide no automatic send control.
- [x] Verify multiple clients, Admin desktop/mobile, Manager isolation, TypeScript, diff check, and the production build. Evidence: CreatorIQ renders `Consult completed`, Blue Ribbon renders `Link sent`, and Concertina renders `Not sent` plus `Manual action required` with no send-link button. Admin desktop, 1000 px, and 390 px report zero document/main overflow. Manager Client Details contains no lead panel, its roster contains 12 assigned clients and no CreatorIQ, while Client direct access to `?view=clients` redirects to Snapshot. `tsc --noEmit`, `git diff --check`, and `next build --webpack` pass.

---

## Active Workflow Improvement: Item 8 WIAW And In Full Flight Access Gates

Source: implementation-order item 8 / Batch 9, continued July 23, 2026. This pass enforces persisted prerequisites and explains locked access; it does not confirm payment, accept a handoff, or start a service automatically.

- [x] Require an approved, accepted-or-linked Cocoon strategy handoff before a WIAW Client can enter live Labs.
- [x] Require completed WIAW delivery or an accepted retained-service handoff before an In Full Flight Client can enter live Labs.
- [x] Keep locked Labs hidden from Client navigation while allowing a direct URL to show a useful, client-safe prerequisite explanation.
- [x] Keep Checkups and approved outputs available under the existing capability rules.
- [x] Verify eligible and ineligible WIAW/IFF clients, desktop/mobile locked states, navigation, TypeScript, diff check, and the production build. Browser evidence: eligible CreatorIQ WIAW/IFF sessions retain Labs and render the builder; ineligible Blue Ribbon WIAW/IFF sessions hide Labs, retain Checkups, and show the approved-output recovery route. Desktop and 390 px report zero horizontal overflow. `tsc --noEmit`, `git diff --check`, and `next build --webpack` pass.

---

## Active Workflow Improvement: Template Governance And Exception Operations

Source: process and template governance request captured July 23, 2026. This pass adds explicit metadata, recovery ownership, and operational measurement without auto-publishing templates or advancing live client work.

### Template governance

- [x] Add Draft, Published, and Archived lifecycle states to reusable Playbooks.
- [x] Add version, change summary, owner, last-reviewed date, usage count, and active-run metadata.
- [x] Distinguish locked core steps from editable client fields.
- [x] Define required inputs, validation rules, approval requirements, role preview, and sample-data preview.
- [x] Keep existing saved/custom Playbooks backwards compatible through safe defaults.

### Exception operations

- [x] Model missing access/assets, failed crawl/generation, unsupported evidence, client inactivity, rejected approval, scope change, reopened stage, failed handoff, and overdue work.
- [x] Require every open exception to name an owner and recovery action.
- [x] Surface exceptions as blockers instead of allowing indefinite generic In Progress states.
- [x] Preserve an exception and recovery history when work resumes.

### Shared terminology

- [x] Use Checkup for diagnostic client services.
- [x] Use Lab for implementation planning/building workspaces.
- [x] Use Playbook for internal reusable operating templates.
- [x] Use Approval for client decision surfaces.
- [x] Use Journey for client-facing progress and milestones.

### Operational quality

- [x] Derive time in stage, blocked time, approval turnaround, revision count, and handoff success from process events.
- [x] Track recommendations converted to tasks, tasks completed from recommendations, client inactivity, and automation failures.
- [x] Show operational-quality signals in the Playbook/process surfaces without replacing diagnostic scores or completion percentages.
- [x] Verify lifecycle editing, role/sample previews, exception recovery, metrics, responsive behavior, TypeScript, diff check, and the production build. Evidence: the seven built-in Playbooks render governed metadata; a custom Playbook persists Draft → Published; role and sample-data previews open; all nine recovery policies and operational metrics render; desktop and 390 px report no console error, framework overlay, or horizontal overflow. `tsc --noEmit`, `git diff --check`, and `next build --webpack` pass.

---

## Active Batch: Snapshot, Client Cards, and Inbox Polish

Source: browser comments captured July 23, 2026.

Target: `http://localhost:3412/dashboard` across Snapshot, Clients, and Inbox.

### Comment Checklist

- [x] **1. Simplify Snapshot client rows**
  - [x] Remove the duplicated project/service subtitle beneath the client name.
  - [x] Make client initials circular in populated and empty rows.
  - [x] Verify the Snapshot table remains aligned and readable. Evidence: the first five live rows have one-line name cells and 32px square initials with a 50% radius.

- [x] **2. Standardize Clients cards**
  - [x] Make every leading client initial circular.
  - [x] Split the Admin card footer into two equal-width actions.
  - [x] Verify all visible cards use consistent geometry. Evidence: the first three live cards have 31.2px circular initials and footer actions within 1px of equal width.

- [x] **3. Simplify Snapshot-created Inbox transcripts**
  - [x] Remove the User and Baltz AI label pills.
  - [x] Preserve readable question/response spacing and supported bold text.
  - [x] Verify ordinary Inbox messages remain unchanged. Evidence: the ticket renders two label-free regions, the response retains four semantic bold spans, and non-transcript messages still use their original rendering path.

- [x] **4. Make Snapshot stats adaptive**
  - [x] Keep the stat cards on one line when they fit.
  - [x] Switch to a horizontally scrollable strip before the cards would wrap.
  - [x] Apply the shared behavior to Admin, Manager, and Client stat strips.
  - [x] Verify desktop, constrained desktop/tablet, and mobile behavior. Evidence: six cards occupy one row at every width; 1331px fits without overflow, 1142px scrolls within 790px, and 390px scrolls within 314px with zero page overflow.

### Verification Checklist

- [x] `tsc --noEmit`, `git diff --check`, and `next build --webpack` pass.
- [x] Snapshot, Clients, and Inbox load without new runtime errors.
- [x] The revised surfaces remain readable without unintended page overflow.

### July 23 adaptive engine follow-up

- [x] Make Checkup and Lab index grids respond to their own available container width and card count: one bounded card, two balanced columns, or an auto-fitting multi-card grid.
- [x] Stack the engine overview inside the hero when its container becomes constrained instead of stretching sparse content edge to edge.
- [x] Keep CreatorIQ demo data explicit while allowing arbitrary client/domain records to render through the same card and workflow skeleton.
- [x] Verify the engine surfaces at 1357, 1024, 768, and 390 px with zero horizontal page overflow; the card grid changes 3 → 2 → 2 → 1 columns and the hero overview stacks before it collides.
- [x] Verify production and focused checks: TypeScript, diff check, webpack build, mobile smoke, all six Admin/Client engine routes, governed-agent smoke, and six-case agent eval.

### Execution Rules

Proceed one checklist item at a time: implement, verify, update this section, then continue.

---

## Active Batch: Compact Checkup Results and Shared Client Skeletons

Source: browser comments on the CreatorIQ Website report plus the Client-role parity request, captured July 23, 2026.

Target: `http://localhost:3412/dashboard?view=audits&auditType=website&auditReport=creator-iq&auditReportRun=audit-creator-iq-demo` and the Client Brand, Website, and SEO Checkup routes.

### Comment Checklist

- [x] **1. Move category specifics into a popup**
  - [x] Keep each checklist category as a compact score-and-status summary.
  - [x] Open the full passed, failed, unverified, and N/A evidence list in an accessible modal.
  - [x] Verify opening, closing, keyboard dismissal, and page-length reduction. Evidence: six compact summaries render; Content opens seven checks, focuses its close control, closes with Escape, and reduces the report body to about 1,956px before the handoff.
  - [x] Render the popup at the document root so report-card containment cannot clip or reposition it. Evidence: the dialog parent is `BODY` and its overlay covers the full 1331×878 viewport.
  - [x] Ensure opening one category closes any previously open category popup. Evidence: category cards broadcast one shared active-dialog key, and the full-screen overlay prevents interaction with underlying category triggers.
  - [x] Re-verify centered desktop and mobile geometry against the viewport. Evidence: desktop centers a 736px panel; mobile renders a 358px panel with 16px gutters inside 390px, zero page overflow, working Escape dismissal, and no console errors.

- [x] **2. Remove the redundant score formula**
  - [x] Remove the `passed ÷ ... × 100` line from category summaries.
  - [x] Keep the Passed, Failed, Unverified, and N/A pills as the score breakdown. Evidence: Content renders `6 Passed`, `1 Failed`, `0 Unverified`, and `0 N/A` with no category formula line.

- [x] **3. Improve the next-service handoff**
  - [x] Clarify the hierarchy and benefit of continuing into Website Builder.
  - [x] Preserve the client context, no-reupload promise, and existing destination.
  - [x] Verify the handoff remains compact and responsive. Evidence: the handoff now reads findings → rebuild scope → delivery tasks, retains both context pills, and has no desktop or 390px overflow.

- [x] **4. Unify Client Checkup skeletons**
  - [x] Use the same shared Brand, Website, and SEO Checkup workspace/pipeline skeletons in Client mode.
  - [x] Preserve Client-only navigation, permissions, and client scoping.
  - [x] Verify all three Client Checkup types render the same stage structure as their studio equivalents. Evidence: Client Brand, Website, and SEO expose `Audit intake`, `Audit report`, and `Action plan`; SEO now reports a three-stage workflow and uses its Client report state.

### Verification Checklist

- [x] `tsc --noEmit`, `git diff --check`, and `next build --webpack` pass.
- [x] Admin and Client Checkup routes load without new runtime errors.
- [x] Category summaries, modal content, and handoff remain readable at desktop and mobile widths. Evidence: the mobile modal is 285px inside a 390px viewport with zero page overflow.

### Execution Rules

Proceed one checklist item at a time: implement, verify, update this section, then continue.

---

## Active Batch: Card Detail Hierarchy and Inbox Transcript Formatting

Source: browser comments on Brand and Website Checkup cards plus the Snapshot-created Inbox ticket, captured July 23, 2026.

Target: `http://localhost:3412/dashboard?view=audits` and `http://localhost:3412/dashboard?view=inbox`.

### Comment Checklist

- [x] **1. Rebalance Brand preview labels and values**
  - [x] Put Colours, Typeface, and Voice traits labels on the left and their values on the right.
  - [x] Keep overlapping colour swatches and `+n` overflow.
  - [x] Spell out the first typeface and voice trait, then retain an overflow count.
  - [x] Verify the three-row treatment matches existing portal label/value hierarchy. Evidence: the preview is 289px wide with a 287px scroll width and zero page overflow.
  - [x] Present the typeface value in a compact pill. Evidence: Proxima Nova has a 1px border and 999px radius.
  - [x] Show only the dominant voice trait in a pill, followed by a `+n` remainder. Evidence: CreatorIQ renders `Authoritative +3`.

- [x] **2. Reduce the audit score pair**
  - [x] Make the current and projected numbers smaller.
  - [x] Match the arrow size to the green projected number.
  - [x] Preserve score prominence, uplift, progress, and category bars. Evidence: the Website card renders current/projected at 20.48px and 18.88px, with the arrow also at 18.88px.

- [x] **3. Make shared client initials circular**
  - [x] Replace the nearly-circular radius with a true circle in the shared card component.
  - [x] Verify consistent geometry across all shared Checkup and Lab cards. Evidence: the shared CreatorIQ tile is a 31.2px square with a 50% radius.

- [x] **4. Format Snapshot ticket transcripts in Inbox**
  - [x] Separate User and Baltz AI transcript entries into readable blocks.
  - [x] Render supported bold Markdown without exposing raw `**` markers.
  - [x] Preserve ordinary Inbox messages, timestamps, sender alignment, and ticket behavior. Evidence: the CreatorIQ ticket exposes separate User/Baltz AI labels and semantic strong text while retaining `CreatorIQ · Now`.

- [x] **5. Move the report print action to the bottom**
  - [x] Remove the print/save action from the report header area.
  - [x] Place the same action after the complete report content.
  - [x] Preserve the existing PDF behavior and button styling. Evidence: one print button renders at y=14,060 after the checklist begins at y=1,248.

- [x] **6. Remove the duplicate overall-score tile**
  - [x] Remove the standalone `/100` score tile from the report summary.
  - [x] Keep the score explanation, reliability, evidence coverage, category scores, and checklist results. Evidence: no exact `94/100` leaf remains; the complete category and checklist sections still render.

### Verification Checklist

- [x] `tsc --noEmit`, `git diff --check`, and `next build --webpack` pass.
- [x] Brand, Website, Inbox, and Client report routes load without new runtime errors.
- [x] Revised cards, transcript, and report remain within their containers without overflow.

### Execution Rules

Proceed one checklist item at a time: implement, verify, update this section, then continue.

---

## Active Batch: Audit Card Cleanup and Checklist AI Boundary

Source: browser comments on SEO and Brand Checkup cards plus the audit-checklist AI question, captured July 23, 2026.

Target: `http://localhost:3412/dashboard?view=audits&auditType=seo` and `http://localhost:3412/dashboard?view=audits&auditType=brand`.

### Comment Checklist

- [x] **1. Simplify the SEO card header**
  - [x] Remove the sitemap source-and-date subtitle from initiated SEO cards.
  - [x] Preserve client name, crawl status, refresh action, score, and card actions.
  - [x] Verify the CreatorIQ card header remains balanced.

- [x] **2. Balance the current and projected SEO scores**
  - [x] Render both score numbers at nearly the same size while keeping the current score slightly dominant.
  - [x] Preserve the arrow, uplift, progress marker, and category evidence.
  - [x] Verify the `89 → 90` hierarchy live. Evidence: current and projected scores render at 24.8px and 22.08px; the arrow remains a quieter 12.48px.

- [x] **3. Redesign the Brand card preview as a vertical list**
  - [x] Remove the Brand system preview heading row.
  - [x] Stack Colours, Typefaces, and Voice as three compact rows.
  - [x] Use left-aligned overlapping markers, show at most three, and add `+n` for additional items.
  - [x] Verify the CreatorIQ preview retains its five colours, one typeface, and four voice traits without overflow. Evidence: three rows render at 289px wide with `+2` colours and `+1` voice traits, and a 287px internal scroll width.

- [x] **4. Document the audit-checklist AI boundary**
  - [x] Deterministic checks should run from crawl, DOM, Lighthouse, or connected data: status/indexation, redirects, titles, descriptions, headings, canonicals, link depth, structured data, performance, accessibility, analytics, and Search Console evidence.
  - [x] AI is useful only for qualitative evidence classification: clarity, tone, hierarchy, scannability, familiar interaction patterns, visual consistency, and whether content directly answers intent.
  - [x] Keep scoring deterministic as passed divided by passed plus failed; leave unsupported checks unverified or human-reviewed. The current website audit already follows this model, while SEO auto-verifies crawl-supported checks without requiring AI.

- [x] **5. Round every shared client-card initial tile**
  - [x] Make the leading client initial tile nearly circular in the shared card component.
  - [x] Apply the treatment across Website, Brand, SEO, and Lab indexes.
  - [x] Verify the CreatorIQ Website card and shared card variants retain alignment. Evidence: the shared tile is a 31.2px square with a 42% radius and the Website card has no page overflow.

### Verification Checklist

- [x] `tsc --noEmit`, `git diff --check`, and `next build --webpack` pass.
- [x] SEO, Brand, and Website cards load without new console/runtime errors.
- [x] The revised cards remain readable without horizontal overflow.

### Execution Rules

Proceed one checklist item at a time: implement, verify, update this section, then continue.

---

## Active Batch: Approval Count, Demo Labels, and Social Cards

Source: browser comments on Manager Approvals and the Social Media Lab, captured July 23, 2026.

Target: `http://localhost:3412/dashboard?view=review` and `http://localhost:3412/dashboard?view=funnels&builderType=social` across the shared portal shell.

### Comment Checklist

- [x] **1. Keep the Approvals badge accurate**
  - [x] Derive the desktop and mobile badge from the same role-scoped, unsent approval records shown in Approvals.
  - [x] Hide the badge when the current role has no work waiting for client review.
  - [x] Verify the Manager badge matches the visible Approvals queue.

- [x] **2. Rename every engine preview badge to Demo**
  - [x] Replace the shared Checkups and Labs `Beta` labels with `Demo`.
  - [x] Verify the label across shared Admin and Manager navigation surfaces.

- [x] **3. Remove social calendar summary metrics**
  - [x] Remove the Months, Planned posts, and Latest strip from every Social Media calendar card.
  - [x] Preserve the calendar preview and individual month rows.
  - [x] Verify all visible social cards use the simplified layout at desktop and mobile widths. Evidence: the shared card mapping no longer supplies the strip at any breakpoint; all three live cards retain their calendar preview and July 2026 row.

### Verification Checklist

- [x] `tsc --noEmit`, `git diff --check`, and `next build --webpack` pass.
- [x] The Manager Approvals page and badge are driven by the same filtered records.
- [x] No shared portal navigation badge still says `Beta`.
- [x] Social Media cards render without the removed summary strip or responsive overflow.
- [x] Target routes load without new console or runtime errors.

### Execution Rules

Proceed one checklist item at a time: implement, verify, update this section, then move to the next item.

---

## Active Batch: Remembered Profile Login

Source: login flow refinement requested for `http://localhost:3412/login`, captured July 16, 2026.

Target: recognize the last authenticated profile on a device and request only its password, while preserving normal authentication and account switching.

### Comment Checklist

- [x] Save only the last authenticated profile when the user opts to remember it; never store a password or authentication token.
- [x] Show the remembered name and email with a password-first `Continue as` flow on the next signed-out visit.
- [x] Let the user remove the remembered profile and return to the full email-and-password form.
- [x] Preserve Supabase password login, Google OAuth, password recovery, and development login behavior.

### Verification Checklist

- [x] Verify remembered-profile login and account switching in the live `/login` flow.
- [x] Verify TypeScript, production build, and `git diff --check`.

---

## Active Batch: Website Builder Build-Ready Brief

Source: Website Builder workflow clarification requested on `http://localhost:3412/dashboard?view=funnels&builderType=website`, captured July 16, 2026.

Target: source-flexible planning that turns the client-confirmed page list into the final sitemap, page copy briefs, and implementation-ready scope.

### Comment Checklist

- [x] Accept an existing website, uploaded brief or copy, pasted notes, or a combination as Website Builder source material.
- [x] Ask explicitly which pages should be designed and what each page must communicate or help the visitor do.
- [x] Make the confirmed page list authoritative; use a discovered current sitemap only for preservation, reuse, migration, redirects, or retirement.
- [x] Generate a concise build-ready brief with one purpose, message, action, and copy-source brief per scoped page.
- [x] Carry the approved sitemap and page briefs into implementation tasks without adding unconfirmed pages.

### Verification Checklist

- [x] Source controls and revised questions render in the live Website Builder.
- [x] Website Builder accepts a URL or uploaded/pasted material as the required Jumpstart source instead of requiring a URL specifically.
- [x] TypeScript, production build, and `git diff --check` pass.

---

## Active Batch: Consolidate SEO Into Audits

Source: navigation and workflow consolidation requested on `http://localhost:3412/dashboard?view=audits&auditType=website`, captured July 16, 2026.

Target: one SEO workflow under Audits, with evidence, reporting, keywords, page mapping, metadata, information architecture, and roadmap in the same client workspace.

### Comment Checklist

- [x] Remove SEO from the Builders submenu and Builder route handling.
- [x] Keep the complete five-stage SEO workflow inside Audits.
- [x] Replace builder handoff and preview language with same-workspace planning language.
- [x] Normalize legacy `builderType=seo` URLs to a valid Builder instead of reopening the removed SEO surface.
- [x] Show crawl-source controls and the complete site inventory together; imported CSV or sitemap rows should populate the page table automatically.
- [x] Restore Audit findings as step 2, place Report & priorities at step 4, and rename the combined metadata, IA, and roadmap stage to Action plan at step 5.
- [x] Keep readiness inside Audit findings as one collapsible, one-column checklist; show each check, a single-line explanation, and Confirmed, Done, Needs checking, Failed, or Unverified status.
- [x] Remove the separate readiness navigation and duplicate readiness scoring/checklist sections from Report & priorities.
- [x] Add an icon-only column filter beside Search so users can add or remove individual crawl fields, with Essential and All presets, without displacing the search bar.
- [x] Remove the standalone Complete technical evidence section from Report & priorities.
- [x] Keep Pages audited hidden by default in Report & priorities and reveal the vertical register from a Show pages audited button inside the Crawl report card.
- [x] Combine Keywords and Page map into one Keywords & pages workspace, removing the duplicate sub-tabs and presenting opportunity data and page decisions in one visual flow.
- [x] Keep Crawl composition and Crawl depth equal in height, and replace Findings by volume status pills with severity-colored flags beside each count.
- [x] Extend SEO with an integrated AIO/GEO discovery layer covering AI-search eligibility, citation-ready content, crawler access, structured-data evidence, and measurement tasks without changing the 27-item readiness gate.
- [x] Add one consistent hover, keyboard-focus, and tap guide to SEO data visualizations; page-based graphs must reveal every supporting URL in the tooltip.
- [x] Align the page-decision register to one stable Page, Finding & next step, and Action grid on desktop, while stacking details cleanly on mobile.
- [x] Restore the missing broken-journey chain-link glyph and use matching circular icon containers across all recommendation cards.
- [x] Replace implementation-access prerequisites with a 27-item SEO audit checklist covering crawl/indexation, on-page content, architecture/internal linking, technical experience, and AIO/GEO plus measurement.
- [x] Categorize the expanded checklist into five visible audit sections and format each check as two text lines: title first, then evidence or description below.
- [x] Reuse the Website Audit guided loading component for SEO CSV analysis and sitemap crawling, including progress, sequential checks, and final validation messages.

### Verification Checklist

- [x] Builders shows Funnel, Website, and Social Media only.
- [x] SEO remains available under Audits and opens the combined five-stage pipeline.
- [x] A legacy SEO Builder URL no longer renders a separate SEO Builder.
- [x] `tsc --noEmit`, production build, and `git diff --check` pass.
- [x] Crawl & inventory opens as one view with no separate inventory tab, and imported rows are immediately visible below the source controls.
- [x] The live sidebar follows Crawl, Audit findings, Keywords & pages, Report & priorities, then Action plan.
- [x] Audit findings has no `Review readiness` link; `Show checklist` reveals one vertical list and `Hide checklist` collapses it.
- [x] Report & priorities contains no duplicate readiness score, category scores, or original readiness checklist.
- [x] Crawled pages defaults to the six essential columns; the filter-icon menu can add or remove fields without leaving the table, while Search stays in its original toolbar position.
- [x] Report & priorities contains no standalone Complete technical evidence section.
- [x] Report & priorities initially hides Pages audited; Show pages audited reveals it and Hide pages audited collapses it again.
- [x] Keywords & pages opens directly to one responsive plan with summary metrics, readable keyword opportunities, an opportunity matrix, and a vertical keyword-to-page register.
- [x] Crawl composition and Crawl depth render at equal measured heights; finding rows show no leading severity pill and place one colored flag after the count.
- [x] Audit findings and Report & priorities show AIO/GEO readiness, AI answer gaps appear in findings, and Roadmap includes crawler, content, structured-data, and AI citation/referral tasks.
- [x] Crawl composition, crawl depth, coverage bars, issue charts, finding-volume bars, report outcome/attention charts, roadmap bars, and keyword matrix points expose exact values; URL-backed charts list all affected pages.
- [x] Page-decision findings and action pills hold the same column positions across every desktop row, while mobile keeps the action beside the page and the explanation below.
- [x] All three recommendation cards show legible glyphs inside equal circular containers, including the chain-link icon for broken journeys.
- [x] The expanded SEO audit checklist contains no CMS administrator, plugin licence, page-builder timing, tracking-snippet placement, or OneLogin prerequisites; crawl-supported checks are evaluated automatically and qualitative checks remain unverified.
- [x] The checklist reveals five labeled category panels; every check keeps its status separate from a two-line title-and-evidence treatment.
- [x] CSV upload, sample analysis, and sitemap crawl replace the source controls with the same accessible guided loading treatment used by Website Audit before revealing SEO findings.

---

## Completed Batch: SEO Evidence Audit Parity And Planning Preview

Source: SEO Audit/Builder review on `http://localhost:3412/dashboard?view=audits&auditType=seo`, captured July 16, 2026.

Target: evidence-based readiness checks, Website Audit report parity, vertical page registers, and temporary SEO planning preview access.

### Comment Checklist

- [x] Automatically verify only readiness checks supported by crawl or public-site evidence; leave CMS administration, plugin maintenance, licences, editor access, and tracking placement as explicit client/admin inputs.
- [x] Retain TLS, CMS, viewport, analytics, caching, server, robots, and metadata evidence on live sitemap crawls.
- [x] Match the Website Audit report hierarchy with a checklist score, evidence coverage, separate crawl evidence, category bars, audited-page register, and original checklist results.
- [x] Change `Pages that need a decision` from a card grid to one vertical list.
- [x] Temporarily expose the SEO planning stages for visual review while keeping a visible `Not approved for delivery` preview notice.

### Verification Checklist

- [x] Readiness distinguishes automatically passed checks, partial-evidence warnings, and access-dependent checks without promoting partial public evidence to a confirmed backend result.
- [x] SEO report opens without a runtime overlay and exposes the Website Audit-style evidence hierarchy.
- [x] The audit report continues into the full SEO planning stages and displays the temporary preview notice.
- [x] `tsc --noEmit` and `git diff --check` pass.

---

## Active Batch: Client-Facing SEO Report Visual Pass

Source: client-perspective visual review on `http://localhost:3412/dashboard?view=audits&auditType=seo`, captured July 16, 2026.

Target: SEO Audit report hierarchy, visual explanation, and client-safe workflow in `/Users/trishabltzr/baltazarstudio`.

### Comment Checklist

- [x] Lead with a plain-language health summary instead of loose metric cards.
- [x] Add a visual page-decision mix and an attention chart with readable legends.
- [x] Translate technical findings into three clear recommended workstreams.
- [x] Show changed pages first as readable recommendation cards; move full registers and raw evidence into expandable supporting sections.
- [x] Hide the internal readiness control from the client report and take clients directly to `Your report`.
- [x] Replace the disabled builder handoff with a client-facing explanation of what happens next.

### Verification Checklist

- [x] Client report is readable in the live preview and exposes no internal checklist control.
- [x] Health, page outcomes, issue concentration, and next steps are visually distinct.
- [x] Technical page decisions, redirect plan, and complete imported evidence remain available on demand.

---

## Active Batch: SEO Audit Card Metric Spacing

Source: Browser Comment 1 on `http://localhost:3412/dashboard?view=audits&auditType=seo`, captured July 16, 2026.

Target: SEO audit client-card crawl-health summary in `/Users/trishabltzr/baltazarstudio`.

### Comment Checklist

- [x] **1. Reduce spacing between crawl-health metric items**
  - [x] Tighten the vertical spacing between the score target, Index coverage, and Signal health rows.
  - [x] Apply the same spacing to ready and awaiting-crawl SEO cards.
  - [x] Preserve label, percentage, and progress-bar readability.
  - [x] Verify the compact treatment on the live SEO Audits route at desktop width.

### Verification Checklist

- [x] SEO audit cards load without console or runtime errors.
- [x] Ready and awaiting-crawl metric summaries use the same compact rhythm.
- [x] `tsc --noEmit` and `git diff --check` pass.

### Execution Rules

Proceed one checklist item at a time: implement, verify, update this batch, then move on.

---

## Active Batch: Evidence-Based Brand Audit

Source: Browser Comment 1 and Brand Audit verification request on `http://localhost:3412/dashboard?view=audits&auditType=brand`, captured July 21, 2026.

Target: the generated Brand Audit report and live website-evidence pipeline in `/Users/trishabltzr/baltazarstudio`.

### Comment Checklist

- [x] **1. Remove seeded brand visuals**
  - [x] Remove name-hashed colour generation and hard-coded font pairing from Brand Audit reports.
  - [x] Never display an invented palette, typeface, or logo when evidence is unavailable.

- [x] **2. Extract the live brand system for every supplied website**
  - [x] Capture computed colours, heading/body fonts, and an observed logo from rendered website evidence.
  - [x] Store the verified visual evidence with the generated Brand Audit result.
  - [x] Keep visual extraction deterministic and available without a model call.
  - [x] Render the report from those exact observed values and show the source URL.

- [x] **3. Shorten the Brand Audit summary**
  - [x] Keep the report introduction concise and preserve the most important verified conclusion.
  - [x] Verify existing saved reports no longer show an oversized summary block.

- [x] **4. Use circular colour swatches**
  - [x] Render every verified colour as a clean circular sample with its role and exact hex value.
  - [x] Keep light and dark swatches readable across desktop and mobile layouts.

- [x] **5. Improve the print action**
  - [x] Replace the placeholder symbol with a clear print icon.
  - [x] Enlarge the action slightly while preserving the compact report toolbar.

- [x] **6. Keep the mobile colour palette compact**
  - [x] Render verified colour swatches in three columns on mobile.
  - [x] Preserve circular samples, labels, and hex values without horizontal overflow.

- [x] **7. Lead the report with the observed logo**
  - [x] Place the verified brand logo above the report title.
  - [x] Keep the logo proportional and omit it when no verified asset is available.

- [x] **8. Remove source-status pills from the report header**
  - [x] Remove the website, social-profile, and existing-guideline pills.
  - [x] Retain source attribution beside the evidence it directly supports.

- [x] **9. Clarify positioning and messaging**
  - [x] Add a short explanatory subheading.
  - [x] Present purpose, audience, differentiator, and promise as one vertical list.

- [x] **10. Remove the asset inventory section**
  - [x] Remove the in-place and kit-deliverables inventory from the report.

- [x] **11. Remove the builder-anchor section**
  - [x] Remove the “Anchors every build” section and its builder cards.

- [x] **12. Synchronize completed audits with Clients & Projects**
  - [x] Save the verified colours, typography, and brand voice to the audited client workspace.
  - [x] Render the saved audit system in the client’s Brand system panel.
  - [x] Persist the synchronized system with the rest of the client workspace.

- [x] **13. Make Brand Audit loading states meaningful**
  - [x] Explain what evidence or report stage is currently being prepared.
  - [x] Use concise Brand Audit language instead of a generic generation message.
  - [x] Keep the loading treatment consistent with the guided audit experience.

- [x] **14. Connect Brand Audit cards to the client ecosystem**
  - [x] Replace hard-coded card status and progress with the saved guided-audit state.
  - [x] Make Open audit resume the client’s saved run.
  - [x] Make New audit explicitly start a clean run for that client.
  - [x] Store audit status, progress, and session data in the same persisted client workspace as the Brand system.
  - [x] Auto-save each guided-session change and resume it through Open audit.
  - [x] Rename the destructive secondary action to Start over and require confirmation when saved progress exists.

- [x] **15. Remove non-applicable Brand Audit category bars**
  - [x] Remove the empty Brand Foundation, Positioning, Messaging, Visual Identity, Brand System, and Improvement Priorities rows from Brand Audit cards.
  - [x] Keep the saved progress percentage, progress bar, and current workflow state.

- [x] **16. Move the print action to the report footer**
  - [x] Remove the print action from above the Brand Audit report content.
  - [x] Place the same native print action after the final report section and before stage approval controls.

- [x] **17. Make the Brand Audit action plan visual and concise**
  - [x] Use the Website Audit’s overview-first hierarchy as the visual reference.
  - [x] Replace long summary and section prose with a compact visual overview and scannable priority cards.
  - [x] Keep the action plan evidence-based without introducing a numeric brand score.
  - [x] Preserve the approved source data while presenting its priority actions in a readable grouped layout.

- [x] **18. Shorten the Brand Audit generation prompt**
  - [x] Replace the internal report instructions with a short, client-facing explanation.
  - [x] Keep the generation action and evidence requirements unchanged.

- [x] **19. Sync Voice & Tone to Client information**
  - [x] Save approved voice traits and avoid-language with the audited client workspace.
  - [x] Show the synchronized Voice & Tone in the matching client information panel.

- [x] **20. Add summary headings to positioning fields**
  - [x] Add a concise subheading above each Purpose, Audience, Differentiator, and Promise summary.
  - [x] Apply the shared field treatment to every Brand Audit rather than a seeded client.

- [x] **21. Replace redundant Brand Audit card progress with a brand-system preview**
  - [x] Remove the repeated progress percentage, saved-progress label, and duplicate status from the card body.
  - [x] Show verified colour swatches plus compact typography and voice counts when brand-system evidence exists.
  - [x] Show a concise current-stage preview for audits in progress and a simple invitation for untouched brands.
  - [x] Keep the shared Website and SEO audit-card skeleton unchanged.

### Verification Checklist

- [x] CreatorIQ reports Proxima Nova and live CreatorIQ colours instead of GT Sectra and generated green/magenta values.
- [x] Missing website evidence produces an explicit unverified state rather than seeded visuals.
- [x] Brand Audit loads without console/runtime errors.
- [x] `tsc --noEmit`, production build, and `git diff --check` pass.
- [x] The report header shows the verified logo without source-status pills.
- [x] Positioning and messaging reads as a vertical, explained list.
- [x] Asset inventory and builder anchors are absent from the report.
- [x] The mobile palette renders three columns without overflow.
- [x] The print action uses a legible icon and enlarged hit area.
- [x] Completing a Brand Audit updates the matching client Brand system in Clients & Projects.
- [x] CreatorIQ’s saved action plan renders as four compact priority cards and two assignable next actions.
- [x] The single Brand Audit print action appears after the action-plan content.
- [x] The updated Brand Audit view has no horizontal overflow or console/runtime errors.
- [x] Empty Brand Audit report copy is concise and client-facing.
- [x] Approved Voice & Tone appears in the matching client information panel.
- [x] Every positioning field includes a clear summary heading.
- [x] Brand Audit cards preview the saved brand system without repeating header status information.
- [x] Brand Audit loading screens name the work in progress and the next expected result.
- [x] Brand Audit cards reflect intake, report, action-plan, and completed states and reopen the matching saved run.
- [x] Brand Audit cards contain no empty category-score rows.
- [ ] Brand Audit print actions appear only at the bottom of the report content.
- [ ] The action plan is visually scannable and materially shorter than the current prose stack.

### Execution Rules

Proceed one checklist item at a time: implement, verify, update this batch, then move on.

---

## Active Batch: Funnel Sales-Page Hero, Layouts, and Promotions

Source: Browser Comment 1 plus funnel sales-page refinement requested on `http://localhost:3412/dashboard?view=funnels&builderType=funnel`, captured July 21, 2026.

Target: the generated Funnel development-plan wireframe in `/Users/trishabltzr/baltazarstudio`.

### Comment Checklist

- [x] **1. Remove the proof-approval placeholder strip**
  - [x] Remove “Proof to approve before launch” and its unverified-testimonial placeholder from the wireframe.
  - [x] Keep the following sales-page sections visually connected after removal.
  - [x] Verify the placeholder no longer appears in the live Funnel report.

- [x] **2. Keep hero copy concise and sales-focused**
  - [x] Constrain generated hero headlines and supporting copy to compact, readable lengths.
  - [x] Preserve the offer, audience, and primary action without truncating words mid-sentence.
  - [x] Verify the Blue Ribbon hero stays balanced across its available layout recipes.

- [x] **3. Improve independent section-layout suggestions**
  - [x] Refine section recipes so each shuffled layout has intentional hierarchy, spacing, alignment, and card treatment.
  - [x] Keep every tracked section independently shuffled rather than changing only the hero.
  - [x] Verify one shuffle changes the full-page recipe while remaining readable.

- [x] **4. Add promotional banners**
  - [x] Add sales-page promotional banners with concise offer-led copy and a clear action.
  - [x] Give banners independent layout variants that participate in page shuffling.
  - [x] Verify the banners render in the live Funnel report and remain print-safe.

- [x] **5. Remove gradient color treatments**
  - [x] Replace gradients in the promotional banners, hero, media placeholder, and final CTA with solid brand or tonal surfaces.
  - [x] Preserve enough contrast between shuffled variants without gradient effects.
  - [x] Verify the Funnel wireframe contains no gradient backgrounds.

- [x] **6. Canonicalize audit permalinks**
  - [x] Use `view=audits` as the public audit URL for every role.
  - [x] Keep legacy `view=audit` links working and rewrite them to the canonical URL.
  - [x] Preserve the selected `auditType` while canonicalizing the link.

### Verification Checklist

- [x] Funnel report loads without console or runtime errors.
- [x] Hero, shuffled layouts, and promotional banners remain responsive.
- [x] `tsc --noEmit`, production build, and `git diff --check` pass.

### Execution Rules

Proceed one checklist item at a time: implement, verify, update this batch, then move on.

---

## Active Batch: Social Media Builder Visual Refinement

Source: four browser comments and attached layout references on `http://localhost:3412/dashboard?view=funnels&builderType=social`, captured July 16, 2026.

Target: Social Media Builder brief, plan, calendar, and post-review surfaces in `/Users/trishabltzr/baltazarstudio`.

### Comment Checklist

- [x] **1. Put source selection and analysis into one clear composer**
  - [x] Keep the source choices directly attached to the input experience and make the selected source visibly changeable.
  - [x] Add an editable site selection when Website is chosen.
  - [x] Place the Analyze content button inside the composer.
  - [x] Verify each source choice changes the input and analysis still unlocks cadence.

- [x] **2. Rebuild Channels & cadence around the supplied reference**
  - [x] Use large selectable channel pills with clear selected states.
  - [x] Replace the small duration buttons with a segmented 1 week, 2 weeks, and 1 month control.
  - [x] Present per-channel cadence and a dedicated live plan-summary card.
  - [x] Keep the Build content plan action inside the card and verify totals update immediately.

- [x] **3. Clean up the Content plan summary**
  - [x] Add a monthly theme callout and prominent post, channel, and week totals.
  - [x] Show pillar mix as labeled bars with counts and percentages.
  - [x] Show the channel split as compact branded pills.
  - [x] Keep re-draft/edit and plan approval actions together and verify calendar generation still works.

- [x] **4. Upgrade the selected-post editor**
  - [x] Add post-to-post navigation with channel, date, time, and format context.
  - [x] Add an art drop zone and clickable art-format choices.
  - [x] Improve caption, hashtag, graphic-copy, link-in-bio, and art-direction editing.
  - [x] Keep regenerate, skip, approve, and final calendar confirmation functional.

- [x] **5. Match the Social Media workspace width to the other builders**
  - [x] Replace the oversized 74rem frame with the shared 60rem builder width.
  - [x] Increase desktop side padding while preserving the existing mobile gutter.
  - [x] Verify the centered 60rem frame and balanced side breathing room on the live Social Media route.

- [x] **6. Fit the calendar and use real social-platform logos**
  - [x] Make the seven-column desktop calendar fit the main builder container without horizontal clipping.
  - [x] Add one reusable vector-logo treatment for Instagram, TikTok, LinkedIn, Facebook, X, Pinterest, and YouTube.
  - [x] Replace channel abbreviations and generic dots anywhere a social brand is named.
  - [x] Verify the logo treatment across the brief, plan, calendar, selected-post editor, and schedule views.

- [x] **7. Make cross-posting explicit and editable**
  - [x] Store primary and cross-post destinations per social post.
  - [x] Add a one-click cross-post toggle in the content plan and exact channel controls in the post editor.
  - [x] Label every post as single-channel or cross-posted across plan, calendar, editor, schedule, and CSV export.
  - [x] Verify destination changes persist and update all visual summaries immediately.

- [x] **8. Support recurring monthly Social Media plans**
  - [x] Preserve existing single-calendar drafts by migrating them into a per-client month collection.
  - [x] Match Funnel client cards with compact month rows, month-level status, platform-logo summaries, open, delete, and new-month actions.
  - [x] Keep each month’s brief, content plan, calendar, approvals, cross-posting, and schedule state isolated.
  - [x] Make the workspace header, calendar dates, and CSV export follow the selected month.
  - [x] Verify creating, switching, reloading, and deleting monthly plans on the live Social Media Builder route.

### Verification Checklist

- [x] Full Brief → Content plan → Calendar → Schedule flow works on the live route.
- [x] The four annotated layouts are visually verified in the browser.
- [x] `tsc --noEmit`, `git diff --check`, and `next build --webpack` pass.
- [x] Narrow layouts remain readable without losing actions.
- [x] Recurring month creation and month switching persist independently for each client.

### Execution Rules

Proceed one checklist item at a time: implement, verify, update this batch, then move on.

---

## Active Batch: Audit Builder Final Upsell

Source: Browser Comment 1 on the legacy Cocoon Consult client final screen at `http://localhost:3412/dashboard`.

Target: `/dashboard?view=audits` audit builder completion screen in `/Users/trishabltzr/baltazarstudio`.

### Comment Checklist

- [x] **1. Carry the Cocoon Consult upgrade into the audit builder final screen**
  - [x] Reuse the existing Premium Cocoon inclusion and outcome content rather than duplicating the offer copy.
  - [x] Place the upgrade card after the audit intake completion summary without replacing the report-generation action.
  - [x] Keep the CTA preview-safe and avoid implementing payment or billing automation.
  - [x] Stabilize the audit draft autosave effect so the completed screen does not trigger a recursive render loop.
  - [x] Prevent the reused upsell panel from flex-shrinking inside the builder scroll area on narrow screens.
  - [x] Render the same shared Cocoon Consult upsell after the generated Action plan content.
  - [x] Verify the completed audit builder shows the upgrade clearly on desktop and remains readable at a narrow viewport.

- [ ] **2. Revise Prep List and Preview Audit**
  - [ ] Treat the legacy Prep List and Preview Audit as placeholders, not approved final content or behavior.
  - [ ] Confirm the revised information, actions, and destination for each control before implementation.
  - [ ] Update both surfaces together so their handoff into the final upsell remains coherent.
  - [ ] Verify the revised Prep List and Preview Audit in the Cocoon client flow and audit-builder handoff.

- [x] **3. Restyle the audit pipeline rail like the Cocoon intake checklist**
  - [x] Keep the existing Audit intake, Audit report, and Action plan stages and their current lock/approval behavior.
  - [x] Reorganize the rail into a Cocoon-style card with a distinct header, checklist-like stage body, and dedicated progress footer.
  - [x] Use the active green treatment, completed check states, and muted locked states consistently with the Cocoon intake hierarchy.
  - [x] Verify the rail remains sticky/readable on desktop and stacks cleanly above the builder on narrow screens.

- [x] **4. Remove the Action plan score-back callout**
  - [x] Remove the “areas are holding your score back” summary card from the Action plan.
  - [x] Let the remaining score summary occupy the full top row without leaving an empty column.
  - [x] Verify the Action plan recommendations and Cocoon Consult upsell remain intact.

### Verification Checklist

- [x] `tsc --noEmit` passes.
- [x] `next build --webpack` passes.
- [x] Audit builder completion screen loads without console/runtime errors.
- [x] Existing report-generation flow remains available.
- [x] No Cocoon Consult landing-page URL or iframe is reintroduced.

### Execution Rules

Proceed one checklist item at a time: implement, verify, update this batch, then move on.

---

## Active Batch: Cocoon Consult Polish + Notification Workflow

Source: five browser comments on `http://localhost:3412/dashboard` plus user request for notification trigger logic and a markdown workflow file.

Target: `/dashboard` Cocoon Consult client surface and notification documentation in `/Users/trishabltzr/baltazarstudio`.

### Comment Checklist

- [~] **1. Remove audit preview gauge strip**
  - [x] Remove the top percentage gauge row from the Audit Preview popup.
  - [x] Keep the audit category cards and detail drill-down intact.
  - [~] Verify the popup no longer shows the six circular percentage gauges.
    - Code/build verified; screenshot-level browser verification pending because browser automation was unavailable in this turn.

- [~] **2. Fix Premium CTA wrapping**
  - [x] Change sidebar CTA wording so `Premium` renders as a badge instead of wrapping onto a second button line.
  - [x] Review equivalent Premium CTAs and keep labels to a single professional line where possible.
  - [~] Verify sidebar and final-screen CTAs do not split awkwardly on desktop.
    - Code/build verified; screenshot-level browser verification pending because browser automation was unavailable in this turn.

- [~] **3. Make completed Cocoon checklist states green**
  - [x] Change completed Cocoon prep/checklist icons and progress accents from red to green.
  - [x] Apply the green completed treatment consistently across all completed checklist items.
  - [~] Verify current/incomplete states remain visually distinct.
    - Code/build verified; screenshot-level browser verification pending because browser automation was unavailable in this turn.

- [~] **4. Add complete PDF report copy**
  - [x] Update the DIY-ready strategy files inclusion to mention the complete PDF report.
  - [~] Verify the inclusion copy remains readable and does not overflow.
    - Code/build verified; screenshot-level browser verification pending because browser automation was unavailable in this turn.

- [~] **5. Add start and finish auto-fill controls**
  - [x] Add a control near the final-screen preview action to auto-fill the start and finish Cocoon states.
  - [x] Keep the auto-fill local to the dummy/preview workflow and avoid speculative automation.
  - [~] Verify both auto-fill actions update the Cocoon checklist state.
    - Code/build verified; screenshot-level browser verification pending because browser automation was unavailable in this turn.

- [x] **6. Document notification workflow**
  - [x] Create or update a markdown workflow file explaining notification triggers, recipients, push criteria, and dynamic copy rules.
  - [x] Clarify that uncertain automation/billing/AI behavior remains documented only, not implemented.
  - [x] Verify the markdown file is present and linked conceptually to the current dashboard workflow.

- [~] **7. Make Recent Activity update from project movement**
  - [x] Derive Recent Activity from workflow lifecycle records, gate movement, completed phases, and completed task groups.
  - [x] Ensure WIAW milestone progress creates visible activity even when dummy preview data lacks `completedAt`.
  - [~] Verify the admin overview no longer shows the empty activity message when the project has movement.
    - Code/build verified; screenshot-level browser verification pending.

- [~] **8. Make activity and notification dates age accurately**
  - [x] Show very recent events as `Now`.
  - [x] Show events under one hour as minutes.
  - [x] Show events under 24 hours as hours.
  - [x] Show dates after 24 hours as month and day only.
  - [x] Store new dashboard action timestamps with date and time so relative aging works.
  - [x] Stamp task movement with `updatedAt` so Recent Activity reflects when the update happened, not just the task due date.
  - [~] Verify the aging labels in browser after a live task/gate update.
    - Formatter smoke test passes; screenshot-level browser verification pending.

### Verification Checklist

- [x] `tsc --noEmit` passes.
- [x] `next build --webpack` passes.
- [x] Local `/dashboard` loads without `/api/dashboard-state` errors.
- [~] Browser verifies the five annotated Cocoon UI fixes.
  - Pending screenshot-level pass; code/build/source checks are complete.
- [x] Notification workflow markdown is created/updated.

### Execution Rules

Proceed one checklist item at a time:

1. Implement the next item.
2. Verify it with code checks or browser evidence.
3. Update this checklist.
4. Move to the next item.

---

## Active Batch: Optimization + Global Modules

Source: user request on `http://localhost:3412/dashboard` to reduce credit waste by consolidating repeated dashboard UI into global modules and tackling the work one item at a time.

Target: `/dashboard` client/admin surfaces in `/Users/trishabltzr/baltazarstudio`, with priority on repeated audit, milestone, status, modal, files, and notification UI.

Optimization rule: extract only where the same behavior or visual contract already appears in two or more places. Do not rewrite large migrated files wholesale. Each item must reduce future rework, centralize a source of truth, or remove proven duplicate logic.

### Comment Checklist

- [x] **0. Reduce mock client source of truth to two active clients**
  - [x] Remove extra selectable mock clients from `LIFECYCLE_PROJECTS`.
  - [x] Delete the Nora Studio, Maison Liora, and The Quiet Edit client identities from the mock backend data.
  - [x] Keep lifecycle preview modes functional by mapping Paid Cocoon/deleted states to Flora & Co. and In Full Flight to House of Hazel.
  - [x] Verify no removed client names remain in `src/` or `app/`.
  - [x] Verify TypeScript still passes after the data cleanup.

- [x] **1. Create a shared checklist/progress foundation**
  - [x] Inventory existing task rows, audit rows, completed-check rows, failed flags, five-circle markers, and compact progress rings.
  - [x] Extract shared primitives only for repeated contracts: `ProgressDots`, audit/task row state rendering, failed-flag display, and completed-collapse controls.
  - [x] Replace the first two highest-overlap call sites instead of every call site at once.
  - [x] Remove dead helper code or CSS made obsolete by the extraction.
  - [x] Verify milestone cards, phase detail modal, and audit preview still show the correct five-circle and failed-flag states.

- [x] **2. Consolidate status badges into one role-aware global module**
  - [x] Audit all `StatusBadge` usages for duplicated inline sizing, icon overrides, labels, and details.
  - [x] Move repeated status metadata into one status configuration map.
  - [x] Keep special cases as props only when the status meaning actually differs by surface.
  - [x] Verify Soon, Awaiting Client, In Progress, Done, Locked, and review states remain visually distinct on desktop and mobile.

- [x] **3. Extract a shared dashboard modal shell**
  - [x] Inventory modal shells and overlays: phase detail, audit preview, contract, mobile sheets, review panels where applicable.
  - [x] Create a shared shell for backdrop, card sizing, sticky header, close action, scroll body, and footer slots.
  - [x] Migrate one modal first, preferably `PhaseDetailModal`, because it is already the shared task/audit popup.
  - [x] Preserve existing data behavior and focus/close interactions.
  - [x] Verify desktop and narrow viewport modal sizing, scrolling, and close behavior.

- [x] **4. Separate feature modules out of `ClientTabs.tsx` incrementally**
  - [x] Move `ContractModal` into `src/components/ContractModal.tsx` so Admin no longer imports a shared modal from ClientTabs.
  - [x] Move `MeetingScheduler` into `src/components/MeetingScheduler.tsx` or a feature folder if no other surface uses it yet.
    - Current behavior: the Cocoon seeded final step no longer shows a standalone booking CTA before payment; booking is described as the link sent after payment confirmation.
    - Historical note: the extracted scheduler component remains available for the paid/booking flow, but the unpaid final screen should not expose that bottom CTA.
  - [x] Move Cocoon onboarding/audit preview subcomponents only after shared checklist/modal primitives exist.
    - [x] Extracted and verified `CocoonAuditPreviewPopup`: Preview Audit opens six gauges/cards, selecting a category opens the shared phase detail modal.
    - [x] Extracted and verified `CocoonPrepListPopup`: Prep List opens, shows six process cards, and closes.
    - [x] Extracted and verified `CocoonPaymentPreviewPopup`: Upgrade to Premium opens the Wise payment preview and closes.
    - [x] Extracted and verified `CocoonFinalStepPanel`: final step renders the Premium path, Prep List, Preview Audit, booking-link instructions, and three benefit rows.
    - [x] Extracted and verified `CocoonPromptForm`: Cocoon question form renders from the shared component on `/dashboard?view=cocoon`.
  - [x] Keep route wiring in `ClientTabs.tsx`; do not rewrite the whole file.
  - [x] Verify `/dashboard` client navigation still opens Cocoon, Milestones, Files, Brand Guidelines, Contract, and Notifications.
    - Verified in this pass: Cocoon final step, WIAW Overview, WIAW Milestones, Files parent expansion, Assets, Brand Guidelines, and Contract.
    - Verified Notifications through the existing `/dashboard?view=wiaw&nav=notifications` route seed because the badge-bearing nav button has an accessible name of `Notifications7`.

- [x] **5. Make audit taxonomy and task grouping fully data-driven**
  - [x] Confirm `src/data/auditTaxonomy.ts` is the only owner of audit subcategory labels and ranges.
  - [x] Ensure audit preview and milestone task modal both consume the same taxonomy helper through the shared `PhaseDetailModal` task branch path.
  - [x] Keep completed/passed items collapsed under completed checks and failed/incomplete items under canonical subcategories.
  - [x] Prevent per-audit one-off subcategory systems unless the canonical taxonomy is intentionally updated.
  - [x] Verify long lists branch only after the >10 pending item threshold and short lists stay flat.
    - Code check complete: `PhaseDetailModal` only branches when `activeTasks.length > 10`.
    - Browser verified: Design & Typography opens with 4 branches, active task rows, and a completed-checks group.

- [x] **6. Treat Cocoon Consult as a persistent dummy workflow**
  - [x] Make saved dummy workflow state win over the `?seed=onboarding-done` fallback after reload.
  - [x] Persist open step, active prompt, unsure flags, generated audit state, scheduled-call state, and selected meeting details.
  - [x] Keep blank default, scratch preview, and seeded completed preview in separate storage buckets so one preview state does not overwrite another.
  - [x] Key the Cocoon embed by storage mode so switching between blank/default, scratch, and completed previews remounts from the correct saved state.
  - [x] Verify reload keeps Cocoon workflow progress instead of restarting from the seed.
    - Browser verified on `/dashboard?view=cocoon&seed=onboarding-done`: edited the first Cocoon answer, reloaded the same seeded URL, and confirmed the edited answer stayed instead of reverting to `Dev preview answer.`.

- [~] **7. Deploy the dummy workflow preview**
  - [x] Run a successful local production build before deploying.
  - [x] Deploy the current Next.js dashboard to a Vercel preview.
  - [x] Generate a temporary share link for the protected Cocoon seeded dashboard route.
  - [x] Verify the Vercel deployment serves `/dashboard?view=cocoon&seed=onboarding-done` with `200 OK` through the Vercel connector.
  - [ ] Connect Supabase once project credentials/env vars are available.
    - Blocked: this repo currently has no `supabase/` directory, no Supabase env vars, and no local Supabase CLI.

- [x] **8. Add a scratch Cocoon preview for Flora & Co.**
  - [x] Add `seed=scratch` as an isolated dev preview state so Flora can start at Cocoon question 1 without overwriting the completed dummy workflow.
  - [x] Verify `/dashboard?view=cocoon&seed=scratch` shows Flora & Co., 0 of 6 complete, and the first Cocoon question.

- [~] **9. Consolidate lifecycle stage preview behavior**
  - [x] Make stage switching use mutable project state instead of static lifecycle templates so visual changes can propagate.
  - [x] Add a temporary milestone preview control to mark an active milestone finished and unlock the next stage of the milestone design.
  - [x] Connect audit milestone cards to the same task-status state used by the phase detail popup, so popup task changes update card counts, dots, and percentages.
  - [x] Verify Paid Cocoon foundation completion in browser: Foundation completes, Design & Build stays locked, Launch stays locked, and the WIAW upsell nudge appears.
  - [x] Verify WIAW milestone completion in browser: Design & Build completes and Launch becomes the active expanded milestone.
  - [x] Fix admin lifecycle routing so `/dashboard?view=wiaw&nav=milestones` opens the Admin project Milestones tab instead of rendering an empty workspace.
  - [x] Remove the visible client lifecycle switcher entirely; workflow actions move the client between Cocoon, Paid Cocoon, and WIAW.
  - [x] Add a temporary Wise payment confirmation button that moves the dummy workflow into Paid Cocoon / Cocoon Consult Premium until the payment gateway exists.
  - [x] Reset the WIAW lifecycle preview into its own fresh Flora & Co. build process: Foundation starts at 0/17, Design & Build and Launch start locked, and the milestone finish control advances the walkthrough.
  - [x] Use the selected lifecycle project as the shared Admin/Client source of truth instead of rendering a copied client-only project overlay.
  - [x] Add the same temporary `Mark milestone finished` preview control to Admin milestone cards.
  - [x] Browser-verify Admin → Client WIAW milestone propagation: Admin finishes Foundation, Client immediately shows Foundation 17/17 and Design & Build active.
  - [x] Browser-verify Client → Admin WIAW milestone propagation: Client finishes Design & Build, Admin immediately shows Design & Build 19/19 and Launch active.
  - [x] Keep the Flora & Co. client identity unchanged; no `Flora and Chloe` rename remains in the dashboard data.
  - [x] Restore Cocoon as part of the single Client surface without extra Unpaid/Paid sub-tabs.
  - [x] Remove In Full Flight from the visible client switcher so WIAW carries the build/full-site walkthrough internally.
  - [x] Make the no-query default client entry open blank Cocoon Consult instead of WIAW.
  - [x] Browser-verify the combined Client surface: only Admin/Client tabs are visible, Cocoon final-screen payment handoff lands in Paid Cocoon / Cocoon Consult Premium, and no Cocoon/WIAW/In Full Flight/Unpaid/Paid lifecycle tabs are visible.
  - [x] Remove the top dev toggle after lifecycle consolidation is complete.
    - Completed: Admin and Client are now separate login-driven sessions.
  - [x] Consolidate plan restrictions into the global `planAccess(project)` helper instead of recreating separate admin/client lock logic.
  - [x] Wire Admin and Client navigation to the same access contract so Premium Cocoon, WIAW, and deleted states expose the same allowed areas everywhere.
  - [x] Keep Cocoon/Premium milestone previews on the six audit categories while WIAW stays on the build milestone workflow.

- [x] **6. Consolidate Files workspace ownership**
  - [x] Keep `src/components/fileWorkspace.ts` as the single source for Files child navigation.
  - [x] Move any remaining admin/client Files label or route duplication into shared helpers.
  - [x] Keep role-specific differences as props on shared File Hub components.
  - [x] Verify Client and Admin Files render the same layout, with only meaningful role-specific copy/counts different.
    - Verified by code path: Client and Admin both render `FileAssetHub`, with `role="client"` / `role="admin"` supplying the intended copy/count differences.

- [x] **7. Consolidate notifications row rendering**
  - [x] Inventory notification rows in the topbar popover and full Notifications page.
  - [x] Extract one `NotificationRow` renderer for avatar, unread rail, alternating background, metadata, and actions.
  - [x] Remove duplicate row markup paths so popover and full-page notifications share the same renderer.
  - [x] Verify popover and full-page notification lists remain visually aligned and readable.
    - Verified in browser: `/dashboard?view=wiaw&nav=notifications` renders 7 full-page rows with shared avatar/body/line structure.
    - Verified in browser: topbar bell popover renders 5 rows with the same shared row renderer and no runtime error.

- [x] **8. Final cleanup and verification pass**
  - [x] Run strict TypeScript checks after the extraction batch.
  - [x] Run production build with webpack.
  - [x] Browser-verify `/dashboard` in client/admin modes and `/login` if shared shell/styles were touched.
  - [x] Confirm no temporary debug code, unused imports, dead CSS, or accidental sidecar plans remain.
    - Checked `src/` and `app/` for `console.log`, `debugger`, and temp markers; TypeScript/build covered unused imports.
  - [x] Record the completed module extractions and any intentionally deferred cleanup in this checklist.

### Verification Checklist

- [x] `tsc --noEmit` passes after each focused module extraction.
- [x] `next build --webpack` passes after the full module batch.
- [x] Browser console has no runtime errors on `http://localhost:3412/dashboard`.
- [x] Client and Admin dashboard modes still render their primary routes.
- [x] Audit preview, phase detail modal, milestone cards, Files workspace, and notifications retain their intended behavior.
- [x] The touched files have fewer duplicated UI contracts than before, without broad unrelated churn.
  - Module extraction is reduced for modal, Cocoon, Files, audit/task grouping, and notifications surfaces.

### Execution Rules

Proceed one checklist item at a time:

1. Start with the next unchecked module item.
2. Read only the files needed for that module.
3. Extract the smallest reusable primitive that removes real duplication.
4. Replace one or two call sites first, then verify.
5. Update this checklist immediately before moving to the next item.

---

## Active Batch: Dashboard Detail Polish

Product direction: Make repeated dashboard controls and summaries consistent across client/admin modes while preserving the existing route structure and data behavior. Fix the selected audit, milestone, task, modal, and account-access surfaces in small batches, then verify each affected view at `http://localhost:3412/dashboard`.

### Comment Checklist

- [x] **1. Make the passed-checks control read as a completed check button**
  - [x] Replace the current reverse-looking collapsed/expanded indicator with a check-forward visual treatment.
  - [x] Keep the completed-state icon white against its filled success background.
  - [x] Ensure the expand/collapse affordance still communicates its current state without visually reversing the completed meaning.
  - [x] Verify the control in both expanded and collapsed audit categories.

- [x] **2. Show phase-card progress as a percentage**
  - [x] Replace phase header fraction labels such as `0/5` with the corresponding percentage, such as `0%`.
  - [x] Use the same percentage calculation and formatting for every phase card.
  - [x] Keep task totals available in the detailed phase view where the exact count is useful.
  - [x] Verify empty, partial, and complete phase-card states.

- [x] **3. Remove inconsistent white gaps from phase cards**
  - [x] Inspect the phase-card grid, header, body, and footer sizing to identify why some cards show an empty white band while neighboring cards do not.
  - [x] Normalize the shared card structure so equivalent phase cards align without unexplained internal gaps.
  - [x] Apply the correction to all phase cards and milestone states that use the same layout.
  - [x] Verify mixed task counts, locked cards, and responsive one/two/three-column layouts.

- [x] **4. Synchronize phase-detail headers with their outer cards**
  - [x] Derive the detail modal title, milestone label, status, progress markers, deadline, and assignment summary from the selected phase shown on the outer card.
  - [x] Remove or correct any modal header values that disagree with the selected card or current project data.
  - [x] Apply the same source-of-truth mapping to every phase detail modal.
  - [x] Verify several phases across milestones, including complete and active states; locked cards intentionally remain non-interactive.

- [x] **5. Centralize dashboard dropdown styling**
  - [x] Inventory native `select`, task-status, account-role, and other dropdown controls across active dashboard components.
  - [x] Create or extend one shared dropdown/select visual contract for typography, border, background, icon spacing, focus, hover, disabled, and mobile states.
  - [x] Replace component-specific dropdown styling where the interaction contract is equivalent.
  - [x] Preserve specialized menu positioning and dynamic popover coordinates where required.
  - [x] Verify account access, task status, and other visible dashboard dropdowns in client/admin modes.

- [x] **6. Guarantee ellipsis for truncated dashboard text**
  - [x] Audit constrained single-line labels and titles that currently clip without a visible ellipsis.
  - [x] Ensure truncation containers have the required width constraints, overflow, `text-overflow: ellipsis`, and `white-space` behavior.
  - [x] Apply the shared truncation treatment to task titles and other equivalent dashboard labels.
  - [x] Preserve the existing full-text tooltip behavior where available.
  - [x] Verify long task, milestone, phase, file, and navigation labels at desktop and narrow widths.

- [x] **7. Subdivide long audit lists into nested categories**
  - [x] Define meaningful subcategories for audit sections with long item lists, using the existing audit data rather than purely visual grouping.
  - [x] Add a nested branch/accordion for each subcategory while retaining item status and urgency indicators.
  - [x] Show at most three specific items per expanded branch by default, with a clear control to reveal or collapse the remainder.
  - [x] Keep short audit sections direct and avoid adding unnecessary nesting.
  - [x] Verify long and short categories, nested branch interaction, passed-item grouping, and modal scrolling.

### Verification Checklist

- [x] `tsc --noEmit` passes after each focused component group.
- [x] `next build --webpack` passes after the full batch.
- [x] Client and admin dashboard modes load without console/runtime errors.
- [x] Cocoon audit preview interaction is verified for passed checks and nested long lists.
- [x] In Full Flight milestones are verified for percentage labels and gap-free cards.
- [x] Phase details are verified against their selected outer cards.
- [x] Account access and task dropdowns share the centralized styling.
- [x] Long text visibly ends with ellipses where constrained.
- [x] Desktop and narrow responsive layouts remain readable.

### Implementation Notes

- [x] Passed-check icons remain white and fixed; only the direct disclosure chevron rotates.
- [x] Long audit categories use semantic branches and reveal three findings by default.
- [x] Phase cards no longer stretch to equal row height, eliminating the empty middle band; measured header-to-footer gaps are `0px`.
- [x] Phase selection now carries both milestone and phase IDs, preventing detail views from resolving against the wrong parent dataset.
- [x] Native selects and task-status summaries share the dashboard dropdown foundation, with compact and field variants.
- [x] Task-title ellipsis was restored by removing the tooltip overflow override; full text remains available through the title/tooltip attributes.

### Execution Rules

Proceed one checklist item at a time:

1. Implement the next unchecked comment.
2. Run its targeted TypeScript and browser verification.
3. Update this checklist immediately.
4. Move to the next comment only after the current item is verified or marked `[~]` with a blocker note.

---

## Completed Batch: CSS Consolidation

Product direction: Reduce the `src/index.css` monolith safely. First make the stylesheet navigable by domain without changing selectors, then consolidate repeated primitives, then prune dead CSS only after usage checks and verification. Keep the Next.js route structure and the `http://localhost:3412` preview target intact.

### Comment Checklist

- [x] **1. Baseline low-risk cleanup already completed**
  - [x] Move `/login` inline styling into class-based CSS.
  - [x] Remove the obsolete `/dashboard` role-switching dev toggle.
  - [x] Move `AssigneeEditor` inline chip/input styles into shared CSS classes.
  - [x] Verify with TypeScript, webpack build, and targeted `/login` browser DOM check.

- [x] **2. Create domain stylesheet architecture**
  - [x] Add a `src/styles/` folder for domain-level CSS files.
  - [x] Split `src/index.css` into imported files without changing selectors or visual behavior.
  - [x] Suggested first split: `tokens.css`, `base.css`, `login.css`, `dashboard-shell.css`, `sidebar.css`, `notifications.css`, `tabs-panels.css`, `tasks.css`, `milestones.css`, `reviews.css`, `file-hub.css`, `cocoon.css`, `mobile-nav.css`, and `contract.css`.
  - [x] Keep `src/index.css` as the import entrypoint.
  - [x] Verify `tsc --noEmit`, `next build --webpack`, `/login`, and `/dashboard` still load.

- [x] **3. Consolidate repeated UI primitives**
  - [x] Identify the first exact duplicate rules for modal shells, modal labels, close buttons, and unread notification rails.
  - [x] Create shared primitive CSS only where existing selectors clearly repeat the same visual contract.
  - [x] Continue candidate review for panels/cards, popovers/dropdowns, form fields, badges/pills, empty states, toolbar rows, and responsive stacked layouts.
  - [x] Update touched JSX class names in the smallest possible batches.
  - [x] Remove duplicate CSS for the first primitive group after replacement.
  - [x] Verify key client dashboard paths after the first group.

- [x] **4. Audit selector usage before deleting CSS**
  - [x] Build a usage list from `app/**/*.tsx` and `src/**/*.tsx`.
  - [x] Treat dynamic classes such as `is-${status}` and status-specific modifiers as used unless proven otherwise.
  - [x] Flag likely dead selectors in a temporary audit note inside this checklist before deletion.
  - [x] Remove only selectors tied to deleted Vite/home surfaces or confirmed unused dashboard code.
  - [x] Verify TypeScript, webpack build, and targeted browser routes after pruning.

- [x] **5. Reduce inline style debt in active dashboard components**
  - [x] Prioritize small shared components before large migrated files.
  - [x] Convert repeated inline layout/spacing objects into classes when they recur in two or more places.
  - [x] Leave data-driven dynamic styles inline where CSS variables or component props are clearer, such as progress widths, popover coordinates, and gauge dimensions.
  - [x] Run typecheck after each touched component group.

- [x] **6. Final cleanup and handoff**
  - [x] Record final `src/index.css` line count and total `src/styles/*.css` line count.
  - [x] Confirm no temporary audit/debug notes remain outside this centralized plan.
  - [x] Confirm `/login` and `/dashboard` render in the in-app browser.
  - [x] Confirm `tsc --noEmit` and `next build --webpack` pass.
  - [x] Summarize what changed, what was intentionally left global, and any remaining cleanup candidates.

### Verification Checklist

- [x] `tsc --noEmit` passes.
- [x] `next build --webpack` passes.
- [x] Targeted `/login` browser verification is complete for the baseline cleanup.
- [x] `/dashboard` browser verification is complete after stylesheet splitting.
- [x] CSS line-count notes are updated after the stylesheet architecture phase.
- [x] Selector audit notes are recorded for the dead CSS pass.

### Architecture Phase Notes

- [x] `src/index.css` is now a 19-line import entrypoint.
- [x] `src/styles/*.css` totaled 6,275 lines across 18 domain files after the architecture split.
- [x] After the first shared-primitive consolidation, `src/index.css` plus `src/styles/*.css` totals 6,252 lines across 20 CSS files.
- [x] Verified `/login` has the login page, card, demo button, and two inputs after imports.
- [x] Verified `/dashboard` has the dashboard shell, sidebar, workspace, topbar, grid shell display, and dashboard main padding after imports.
- [x] Restarted the `http://localhost:3412` dev server after Turbopack cached the old CSS import graph; fresh dev preview verified with no build error.

### Selector Audit Notes

- [x] Audited 21 TSX files and 20 CSS files, comparing static class names and template-literal class families.
- [x] Retained dynamic `is-*` and `has-*` modifiers, including milestone, task, gate, notification, and navigation status families.
- [x] Confirmed and removed CSS-only families for the retired audit preview, Cocoon report, phase-task, action-alert, client milestone/overview, upload destination, old file row/icon, Cocoon sequence, and obsolete premium-benefit surfaces.
- [x] Kept active premium UI selectors such as `cocoon-premium-name`, `cocoon-premium-badge`, `cocoon-unlimited-label`, `cocoon-premium-outcome`, and `cocoon-inclusions*`.
- [x] Re-ran the source search after pruning; none of the removed selector families remain.

### Final Cleanup Notes

- [x] Final line count: `src/index.css` is 19 lines and `src/styles/*.css` totals 5,886 lines (5,905 CSS lines combined).
- [x] Consolidated exact duplicate modal, label, close-button, notification-rail, status-pill, mobile-nav, account-setup, and audit-toggle contracts into shared selectors.
- [x] Moved the active gate editor and client stage summary static layout from `src/components/widgets.tsx` into domain classes; only state-driven cursor/color and progress-width styles remain inline there.
- [x] Intentionally left component-specific panel/card variants in their domain files where merging would weaken ownership or require broad JSX churn.
- [x] Large migrated files `src/client/ClientTabs.tsx` and `src/admin/AdminTabs.tsx` remain candidates for later, component-by-component inline-style cleanup rather than a broad refactor.
- [x] Final verification: TypeScript and webpack production build pass; `/dashboard` and `/login` render with no browser console errors.

### Execution Rules

Proceed one checklist item at a time:

1. Implement the next unchecked item only.
2. Run the verification listed for that item.
3. Update this markdown checklist immediately.
4. Move to the next item only after the previous item is verified or marked `[~]` with a blocker note.

---

## Last Reset

- [x] Opened the Dashboard Detail Polish batch after completing CSS consolidation.
- [x] Reset after completing the audit preview, milestone dot, task dropdown, and focus-client lifecycle preview batches.

---

## Active Batch: Cocoon Premium + Files Navigation Polish

Source: browser comments captured on `http://localhost:3412/dashboard` for Cocoon Consult, In Full Flight milestones, and the Files/Assets sidebar area.

Target: `/dashboard` client surfaces in `/Users/trishabltzr/baltazarstudio`.

### Comment Checklist

- [x] **1. Consolidate Cocoon Consult Premium benefits**
  - [x] Rewrite the premium inclusions so the three-month dashboard access benefit explains the DIY value: hand it to an agency or use the editable dashboard to manage the project yourself.
  - [x] Remove repetitive benefits that no longer add distinct value after consolidation.
  - [x] Verify the premium list stays concise and readable in the Cocoon final step.

- [x] **2. Clarify the booking/login sequence**
  - [x] Update the final Cocoon step to state that the booking link is sent after payment confirmation.
  - [x] Remove dashboard login/access language because login access already exists once the client signs up.
  - [x] Rename the selected “Book and use your access” copy to the simpler booking-link state.
  - [x] Tighten the Wise payment popup copy so payment confirmation points to the one-on-one booking link, not dashboard login/access.

- [x] **3. Rename the premium upgrade header**
  - [x] Change “Upgrade to Premium” to “Upgrade to Cocoon Consult Premium.”
  - [x] Keep the premium badge styling where useful without fragmenting the sentence.
  - [x] Verify the highlighted step heading reads correctly.

- [x] **4. Refine the Soon status icon**
  - [x] Replace or restyle the current waiting/hourglass icon so the badge does not feel taller or heavier than neighboring dashboard icons.
  - [x] Keep status semantics and mobile tap-to-detail behavior intact.
  - [x] Verify “Soon” badges on milestone phase cards align with the surrounding icons.

- [x] **5. Add Brand Guidelines under Files**
  - [x] Add a new Files child item named “Brand Guidelines.”
  - [x] Update typed client navigation and titles so the item can be selected directly.
  - [x] Verify the sidebar child appears with Assets and Contract.

- [x] **6. Move brand-system panels into Brand Guidelines**
  - [x] Move Brand Colors, Typography, and Brand Style out of the Assets/File Hub view.
  - [x] Render those brand-system panels under the new Brand Guidelines subitem.
  - [x] Verify Assets focuses on the file hub while Brand Guidelines owns the selected brand content.

### Verification Checklist

- [x] `tsc --noEmit` passes.
- [x] `/dashboard` Cocoon Consult final step shows the revised Premium heading, benefits, and login sequence.
- [x] `/dashboard` In Full Flight milestones show the refined Soon badge icon.
- [x] `/dashboard` Files sidebar contains Brand Guidelines, Assets, and Contract.
- [x] Assets and Brand Guidelines render the correct separated content.

### Execution Rules

Proceed one checklist item at a time:

1. Implement the next unchecked comment.
2. Run targeted verification for that item.
3. Update this checklist immediately.
4. Move to the next item only after the current item is verified or marked `[~]` with a blocker note.

## Active Batch: Engine Hero At-a-Glance Consolidation

Source: Browser comments 1–10 on Website, Brand, and SEO Checkups plus Funnel, Social Media, and Website Labs, captured July 23, 2026.

- [x] Shorten the SEO card projection label and enforce equal current/projected number sizing.
- [x] Move Website Checkup metrics into a compact At a glance region inside the index hero.
- [x] Remove the separate Website Checkup overview card and its Next focus content.
- [x] Apply the same hero-level At a glance treatment to Brand and SEO Checkups.
- [x] Apply the same hero-level At a glance treatment to Funnel, Social Media, and Website Labs.
- [x] Verify all six engine indexes at desktop and mobile widths, including no overflow, lost CTA, or empty grid track. Evidence: every route rendered one hero-level At a glance block, retained its CTA, removed the old summary card, stacked cleanly at 390px, and reported zero overflow or console errors. SEO current/projected values both computed to 17.92px. TypeScript, diff check, and the webpack production build pass.

## Active Batch: Split Engine Actions From At-a-Glance Blocks

Source: Funnel Lab browser comments 1–2 with instruction to apply the correction across Labs and Checkups, captured July 23, 2026.

- [x] Restore count/status pills and primary CTA buttons to the original action row beneath the hero description.
- [x] Keep only informational metric blocks inside the hero-level At a glance region.
- [x] Apply the split consistently across Website, Brand, and SEO Checkups plus Funnel, Social Media, and Website Labs.
- [x] Verify all six indexes at desktop and mobile widths with retained actions, one At a glance region, and no overflow. Evidence: each route keeps its CTA inside the left copy/action column, keeps buttons out of the At a glance region, places the metric block to the right on desktop and below the action on mobile, and reports zero overflow or console errors. TypeScript, diff check, and the webpack production build pass.

---

## Active Batch: Snapshot History And Checkup Intake Polish

Source: Browser Comments 1–3 on `/dashboard?view=progress` and `/dashboard?view=audits&auditType=brand`, captured July 23, 2026.

Target: responsive Snapshot chat history, history control clarity, playful Audit naming, and the standalone Brand prefill header.

### Comment Checklist

- [x] **1. Make Snapshot chat history responsive**
  - [x] Keep the history heading, saved-session count, New, Clear, and close controls readable without wrapping into a cramped cluster.
  - [x] Collapse the history panel into an overlay before the desktop shell becomes too narrow.
  - [x] Verify desktop, 1024px, and 390px layouts. Evidence: 272px side panel at 1331px, 304px absolute overlay at 1024px, and a 288px overlay with no horizontal overflow at 390px.

- [x] **2. Clarify the View history icon**
  - [x] Replace the ambiguous history glyph with a recognisable panel/history-list control.
  - [x] Preserve the accessible label and active state.
  - [x] Verify the control opens and closes the history panel. Evidence: the live control exposes `View chat history` / `Hide chat history` and `aria-pressed` while toggling the panel.

- [x] **3. Tighten Brand prefill spacing and identify domain drafts**
  - [x] Reduce the gap between the prefill eyebrow, heading, helper text, and first field.
  - [x] Replace `Unassigned draft` with a domain-derived draft label as soon as a domain prefill is entered.
  - [x] Keep `Unassigned draft` only while no identifying prefill exists.
  - [x] Verify the label updates live and survives the prefill review transition. Evidence: the breadcrumb and eyebrow changed `Unassigned draft → creatoriq.com → Unassigned draft`; the display label is held by the discovery parent so the prefill child can unmount without losing it.

- [x] **4. Rename Audits to a clear, playful portal label**
  - [x] Use `Checkups` for the shared navigation, page heading, Snapshot cards, and quick actions.
  - [x] Preserve existing audit routes, persistence keys, report terminology, and workflow behavior.
  - [x] Verify Brand, Website, and SEO remain available under Checkups. Evidence: the live sidebar and page heading show Checkups, with Brand, Website, and SEO still nested below it.

### Verification Checklist

- [x] `tsc --noEmit`, `git diff --check`, and the production build pass.
- [x] Both target routes load without console or runtime errors.
- [x] All four items are verified in the local browser.

### Execution Rules

Proceed one checklist item at a time: implement, verify, update this batch, then continue.

---

## Active Batch: CreatorIQ Cross-Engine Demo Outputs

Source: Request to show pre-seeded CreatorIQ outputs across the dashboard, July 23, 2026.

### Output Checklist

- [x] Website Checkup opens a completed, scored CreatorIQ report and action plan. Evidence: the live card reports 94/100 with six category scores and opens the priority action plan.
- [x] Brand Checkup opens a completed CreatorIQ brand kit and action plan using verified live colours and Proxima Nova. Evidence: the live card shows five verified colours, one typeface, four voice traits, and a 3-of-3 completed output.
- [x] SEO Checkup opens a populated CreatorIQ crawl, findings, readiness, and planning workspace. Evidence: the live workspace shows 10 URLs, 89 SEO health, 94 discovery readiness, and four finding types.
- [x] Website Lab opens a completed CreatorIQ build-ready brief and implementation tasks. Evidence: the live output restores 3 of 3 stages at 100% with nine editable tasks.
- [x] Funnel Lab opens a completed CreatorIQ funnel plan and task plan. Evidence: the live plan uses the CreatorIQ audience, Request a demo action, four-page flow, custom platform, and Google Analytics context.
- [x] Social Media Lab opens a populated CreatorIQ monthly calendar with editable posts. Evidence: July 2026 opens with eight posts across Instagram and LinkedIn, four already approved.
- [x] Existing saved CreatorIQ work takes precedence over the fallback seed. Evidence: workspace merging preserves populated saved engine records while supplying the demo only when the saved output is absent or incomplete.

### Verification Checklist

- [x] All six CreatorIQ output routes are visible and openable in the local browser.
- [x] Desktop and 390 px layouts have no horizontal overflow. Evidence: every route measured a 390 px document width with zero page overflow.
- [x] No target route produces a console/runtime error.
- [x] `tsc --noEmit`, `git diff --check`, and `next build --webpack` pass.

### Execution Rules

Keep the demo seed centralized, evidence-based, and safe to replace with newer persisted CreatorIQ work.

---

## Active Batch: Task, Client, Social, And Funnel Polish

Source: Browser Comments 1–6 on `/dashboard?view=tasks`, `/dashboard?view=clients`, and Labs builder routes, captured July 23, 2026.

Target: bulk task actions and imports, client cards, Social Media calendar cards, and Funnel development-plan presentation.

### Comment Checklist

- [x] **1. Add bulk task deletion**
  - [x] Add a destructive Delete action beside Advance and Mark done when tasks are selected.
  - [x] Require confirmation and remove only the selected tasks.
  - [x] Clear selection after deletion and verify the remaining board state persists. Evidence: a temporary task was created, selected, deleted, and confirmed absent while the Select control returned.

- [x] **2. Add CSV task import**
  - [x] Add CSV upload to the existing task import-source menu.
  - [x] Parse a documented, forgiving task-column format and show actionable validation errors.
  - [x] Preview or confirm imported rows before adding them to the board. Evidence: a two-row fixture using Client, Medium, In progress, and a quoted comma previewed correctly, imported into the expected lanes, and was removed after verification.

- [x] **3. Remove Notes from client cards**
  - [x] Remove the Notes card action without affecting View Details or the preview control.
  - [x] Rebalance the footer actions after removal. Evidence: the live Clients route showed 0 Notes buttons while retaining 15 View Details and 15 preview controls, with the detail action expanding into the freed footer space.

- [x] **4. Fix Social Media card metrics alignment**
  - [x] Give Months, Planned posts, and Latest consistent widths, padding, and vertical alignment.
  - [x] Keep labels and values readable without truncation at desktop and mobile widths. Evidence: all three desktop metric cells measured 91.58 px by 64.46 px on each card; the 390 px layout stacked 361.2 px cards with zero horizontal overflow.

- [x] **5. Remove the funnel build-offer block**
  - [x] Remove the Done-for-you build price, sharing, draft, and build CTA block from the development plan.
  - [x] Keep the task-plan section flowing naturally after the deliverables. Evidence: the live CreatorIQ plan contained none of the offer label, price, Save as draft, or build CTA text; the task panel followed the deliverables with the standard section gap.

- [x] **6. Shorten the funnel overview copy**
  - [x] Replace the long implementation paragraph with a concise summary that preserves the plan intent.
  - [x] Verify the heading, summary, and metrics retain a compact hierarchy. Evidence: the live CreatorIQ summary is capped at 24 words and rendered in a compact three-line block above the unchanged Pages, Emails, and Days to launch metrics.

### Verification Checklist

- [x] `tsc --noEmit`, `git diff --check`, and the production build pass.
- [x] All four target routes load without console or runtime errors.
- [x] Desktop and 390px layouts remain readable.
- [x] All six items are verified in the local browser.

### Execution Rules

Proceed one checklist item at a time: implement, verify, update this batch, then continue.

---

## Active Batch: Snapshot New Menu Actions

Source: Browser Comment 1 on the open `New` action menu at `http://localhost:3412/dashboard?view=progress`.

Target: `/dashboard?view=progress` and the existing onboarding, team, inbox, to-do, and audit creation surfaces in `/Users/trishabltzr/baltazarstudio`.

### Comment Checklist

- [x] **1. Make New Client start onboarding**
  - [x] Route to the New Client onboarding surface.
  - [x] Open the client creation/onboarding state immediately instead of a passive destination.
  - [x] Verify the action is usable from the shared Snapshot quick-actions menu.

- [x] **2. Make Invite User open portal-access creation**
  - [x] Route to Team.
  - [x] Open the invite-user form immediately with name, email, and access fields.
  - [x] Verify the action is usable from the shared Snapshot quick-actions menu.

- [x] **3. Make New Message open message composition**
  - [x] Route to Inbox.
  - [x] Open the active conversation with a cleared, focused message composer immediately.
  - [x] Verify the action is usable from the shared Snapshot quick-actions menu.

- [x] **4. Make New To-do open task creation**
  - [x] Route to To-do's and synchronize the URL.
  - [x] Open the create-task form immediately.
  - [x] Verify a task can be created from the opened form (test task created and removed).

- [x] **5. Make New Audit start Cocoon Consult intake**
  - [x] Route to Audits with the Website audit type selected.
  - [x] Open the new-audit/client-selection state immediately.
  - [x] Verify all 15 client start actions are available from the shared Snapshot quick-actions menu.

- [x] **6. Mobile-optimize the audit client picker**
  - [x] Keep the audit header controls inside the mobile viewport.
  - [x] Present the client picker as a scrollable mobile sheet between the top bar and bottom navigation.
  - [x] Verify the 388px-wide picker stays within the current 412 × 915 viewport and exposes every client action.

### Verification Checklist

- [x] All five actions close the shared quick-actions menu after selection.
- [x] All five actions open the intended create/compose state, not only the destination view.
- [x] Browser verification completes without console/runtime errors.
- [x] `tsc --noEmit` passes.
- [x] `next build --webpack` passes.

### Execution Rules

Proceed one checklist item at a time: implement, verify, update this batch, then move to the next item.

---

## Active Batch: Audit Branch Accordion Parity

Source: browser comments captured on `http://localhost:3412/dashboard` for phase detail task branches and the Cocoon audit preview popup.

Target: `/dashboard` audit preview and shared phase detail modal in `/Users/trishabltzr/baltazarstudio`.

### Comment Checklist

- [x] **1. Make milestone modal branches accordion-style**
  - [x] Add open/close state to phase detail task branches.
  - [x] Ensure only one branch opens at a time.
  - [x] Verify clicking a branch heading opens that branch and closes sibling branches.

- [x] **2. Add audit-style flags to milestone modal branch items**
  - [x] Render red/yellow flags on incomplete audit-backed branch rows.
  - [x] Use the same urgency mapping as the audit popup.
  - [x] Verify Type and Visual Design branch rows show flags like the audit popup.

- [x] **3. Align Cocoon audit preview popup with the milestone modal behavior**
  - [x] Keep the audit preview popup using the same canonical taxonomy and branch behavior.
  - [x] Make audit preview category cards open the same task detail modal used by milestone phase cards.
  - [x] Verify the audit preview popup mirrors the milestone modal interaction model.

- [x] **4. Move the audit category summary into a 2x3 card grid**
  - [x] Replace the audit popup's vertical category summary list with six category cards arranged as two columns and three rows on desktop.
  - [x] Mirror the milestone category-card treatment closely enough that the audit popup and milestone cards read as the same system.
  - [x] Keep category details usable after selecting a card, without stretching the whole summary grid into uneven rows.
  - [x] Verify the 2x3 layout at the annotated dashboard viewport and fall back cleanly on narrow screens.

### Verification Checklist

- [x] `tsc --noEmit` passes.
- [x] Milestone modal task branches are one-open-at-a-time accordions.
- [x] Milestone modal branch rows show audit-style flags.
- [x] Audit preview cards open the shared task detail modal instead of rendering a second accordion.
- [x] Audit preview summary displays as a stable 2x3 card grid on desktop.
- [x] Browser console has no runtime errors on `/dashboard`.

### Implementation Notes

- [x] Audit preview cards now act as repeaters over shared audit data and open the shared `PhaseDetailModal` template.
- [x] Removed the bottom audit-popup accordion so there is one editable task surface instead of two competing checklist renderers.
- [x] `PhaseDetailModal` accepts audit categories as data, which is the next step toward proper shared/global dashboard modules for repeated widgets.
- [x] Failed audit rows now receive urgency flags in both branched and short unbranched task lists.
- [x] Audit category card percentage rings use the same compact `ProgressRing` sizing as milestone status chips.

### Execution Rules

Proceed one checklist item at a time:

1. Implement the next unchecked comment.
2. Run targeted verification for that item.
3. Update this checklist immediately.
4. Move to the next item only after the current item is verified or marked `[~]` with a blocker note.

---

## Active Batch: Audit Checklist PDF + Phase Modal Cleanup

Source: browser comments captured on `http://localhost:3412/dashboard`, plus `/Users/trishabltzr/Downloads/The Audit Checklist.pdf`.

Target: `/dashboard` client/admin milestone modal and audit workflow surfaces in `/Users/trishabltzr/baltazarstudio`.

### Comment Checklist

- [x] **1. Canonicalize audit subcategories from the PDF**
  - [x] Use the PDF checklist as the shared source of truth for audit subcategory names and item ranges.
  - [x] Replace ad hoc milestone modal subcategory labels with the PDF labels.
  - [x] Keep completed/passed items under the completed checks group.
  - [x] Verify Design & Typography branches use PDF labels such as Forms & Text Fields, Inputs & Buttons, Type, Visual Design, Iconography, Images, & Illustration, and System where applicable.

- [x] **2. Create audit workflow documentation**
  - [x] Add a markdown file documenting the audit flow from intake to double-checking with two OpenAI review passes.
  - [x] Document how passed/completed items move into completed checks and failed/incomplete items stay under canonical PDF subcategories.
  - [x] Document that the dashboard should not create per-audit custom subcategory systems.
  - [x] Verify the document references the canonical checklist categories clearly.

- [x] **3. Remove Task document from phase modal**
  - [x] Remove the Task document section and textarea from the shared phase detail modal.
  - [x] Clean up now-unused task document state.
  - [x] Verify the modal flows from Tasks directly to Attachments.

- [x] **4. Keep Cocoon Consult naming complete**
  - [x] Update guided call labels so they say Cocoon Consult instead of shortened Cocoon where the service name is intended.
  - [x] Verify the sidebar CTA says Book guided Cocoon Consult call.

- [x] **5. Add branch line to completed checks**
  - [x] Add a side connector line to expanded completed checks in the phase detail modal.
  - [x] Keep completed rows aligned with the line and existing check icons.
  - [x] Verify expanded completed checks show the line without overlapping row text.

### Verification Checklist

- [x] `tsc --noEmit` passes.
- [x] PDF-derived audit taxonomy is used by audit preview and phase modal grouping.
- [x] Phase modal no longer renders Task document.
- [x] Sidebar CTA uses Cocoon Consult naming.
- [x] Expanded completed checks show a clean connector line.
- [x] Browser console has no runtime errors on `/dashboard`.

### Execution Rules

Proceed one checklist item at a time:

1. Implement the next unchecked comment.
2. Run targeted verification for that item.
3. Update this checklist immediately.
4. Move to the next item only after the current item is verified or marked `[~]` with a blocker note.

---

## Active Batch: Milestone Progress Markers + Notification Avatars

Source: browser comments captured on `http://localhost:3412/dashboard` for milestone cards, phase detail modals, task ordering, and notification dropdown avatars.

Target: `/dashboard` client/admin milestone and notification surfaces in `/Users/trishabltzr/baltazarstudio`.

### Comment Checklist

- [x] **1. Standardize phase progress markers to five circles**
  - [x] Ensure every phase-card footer uses exactly five progress circles regardless of task count.
  - [x] Apply the same five-circle representation to client, paid Cocoon, In Full Flight, and admin milestone cards.
  - [x] Verify completed phases render all five circles filled, partial phases render proportional filled/active/empty circles, and locked phases remain visually subdued.

- [x] **2. Update phase detail modal progress markers**
  - [x] Replace task-count-based modal header dots with the same five-circle progress model.
  - [x] Apply this to Foundation, Content, Design & Typography, and Design phase detail views.
  - [x] Verify the modal header no longer creates long rows of dots for long task lists.

- [x] **3. Move completed modal tasks to the bottom and collapse them**
  - [x] Sort phase detail tasks so active/incomplete items appear first and completed items collect at the bottom.
  - [x] Collapse completed task details by default, without adding audit-style branches.
  - [x] Verify complete, in-progress, and not-started tasks still show their state clearly.

- [x] **4. Normalize notification dropdown avatars**
  - [x] Review the topbar notification dropdown avatar rendering.
  - [x] Apply one consistent avatar treatment to every notification row.
  - [x] Verify all notification rows show aligned, consistently styled avatars.

- [x] **5. Distinguish Soon from Awaiting Client icons**
  - [x] Give Soon a different icon from Awaiting Client.
  - [x] Preserve existing Soon and Awaiting Client labels, colors, and tap-to-detail behavior.
  - [x] Verify both statuses are visually distinguishable in milestone cards.

- [x] **6. Round audit subcategory branch toggles**
  - [x] Change audit subcategory toggle radius to 20px.
  - [x] Apply the radius consistently to all audit subcategory toggles.
  - [x] Verify the selected Typography branch and sibling branches share the softer radius.

- [x] **7. Fix audit branch connector overflow**
  - [x] Adjust nested audit branch connector lines so they do not overlap or overflow outside the branch.
  - [x] Keep branch item alignment readable with open and collapsed subcategories.
  - [x] Verify the Typography branch list no longer has stray line overlap.

- [x] **8. Alternate notification list colors without duplicate side lines**
  - [x] Apply alternating row colors to the notifications list.
  - [x] Remove duplicate/competing side-line treatment so each unread row has only one intentional rail.
  - [x] Verify the full notifications page and topbar dropdown remain readable together.

- [x] **9. Refine phase modal task list styling**
  - [x] Make active, waiting, and completed task rows use the same row size and typography.
  - [x] Remove row separator lines from the modal task list.
  - [x] Collapse completed items into a compact completed-checks reveal at the bottom, similar to the audit popup.
  - [x] Keep short lists flat; only use branch-style subdivisions when a list is long enough to need categories.
  - [x] Verify the selected Content phase modal no longer shows oversized/different completed rows or separator clutter.

- [x] **10. Standardize phase detail popup template behavior**
  - [x] Keep phase/task popups on the shared `PhaseDetailModal` template instead of one-off modal variants.
  - [x] Thread task status updates into client milestone, notification-opened, and audit-derived phase modal paths.
  - [x] Keep synthetic/audit-derived phase views locally editable inside the shared modal template.
  - [x] Verify client, paid Cocoon, In Full Flight, and admin phase modals all use the same editable template.

- [x] **11. Round task rows and branch long pending task lists**
  - [x] Round active task rows and completed-check toggle rows to 20px.
  - [x] Keep short task lists flat.
  - [x] Group pending audit-backed task lists into branch sections only when more than 10 pending items are visible.
  - [x] Mirror the same audit subcategory labels used in the audit popup, such as Typography, Hierarchy & feedback, Layout & grouping, and Media & interaction.
  - [x] Add side branch treatment to long pending task groups.
  - [x] Verify the Design & Typography modal shows grouped branches while the shorter Content modal stays flat.

- [x] **12. Sync modal status field with phase header progress**
  - [x] Make the Status field update the same task state used by the modal header dots and percentage.
  - [x] Keep Done, In Progress, Blocked, and Not started transitions bidirectional.
  - [x] Verify changing the status field updates the header progress indicators immediately.

- [x] **13. Restore and globalize the Files workspace**
  - [x] Use the client Files sidebar taxonomy as the source of truth for Admin and Client.
  - [x] Keep Assets, Brand Guidelines, and Contract in the same order and use one shared navigation config.
  - [x] Restore the reference file-hub layout: summary strip, upload rail, folder selector, milestone folders, and Other folders.
  - [x] Make uploads, drag-and-drop, folder creation, folder selection, and folder modals available from the shared hub.
  - [x] Keep Admin-specific file summary counts while preserving the same underlying layout and component.
  - [x] Verify both Client and Admin render the same Files structure on `/dashboard`.

- [x] **14. Mechanical cleanup after Files modularization**
  - [x] Remove the dead `showFileHub` feature flag and obsolete Admin Assets composition.
  - [x] Rename the shared brand editor to `BrandGuidelinesPanel`.
  - [x] Consolidate duplicate client Files/Assets rendering through one route predicate.
  - [x] Remove unreachable folder-renaming state, unused CSS, and always-true conditions.
  - [x] Add keyboard activation semantics to the shared upload dropzone.
  - [x] Simplify redundant milestone state assignment without changing accordion behavior.
  - [x] Remove stale, unmounted Admin overview and legacy Page Copy/File editor implementations.

- [x] **15. Clean admin/client test controls**
  - [x] Reduce the admin project selector to two distinct test clients: Flora & Co. and House of Hazel.
  - [x] Stop using separate lifecycle snapshots as selectable clients.
  - [x] Add an Admin current-plan selector that can move the selected client between Cocoon Consult Premium and Winged in a Week.
  - [x] Remove stale Full Flight / Deleted preview options from the active selector after consolidation.
  - [x] Preserve the selected client identity while changing the workflow/plan state.
  - [x] Add explicit View client and View admin demo actions on the login page.
  - [x] Add separate quick-login entries and credentials for Flora & Co. and House of Hazel.
  - [x] Route client login sessions to the matching selected client workspace by email.
  - [x] Show Cocoon tier as a Premium badge inside the admin plan dropdown trigger and menu rows.
  - [x] Stack the one-tap login buttons vertically.

- [x] **16. Remove free Cocoon from admin workspaces**
  - [x] Remove the standalone Free Consult admin panel so free clients do not use a custom admin view.
  - [x] Move the Cocoon status panel treatment to Cocoon Consult Premium.
  - [x] Replace the builder/CMS/integration stat grid with Client audit, Wise payment, Booking, and Access states while the selected client is on Cocoon Consult Premium.
  - [x] Add an admin follow-up CTA inside the normal Overview card.
  - [x] Document that no-upgrade accounts are automatically archived or deleted when the follow-up window ends, with no manual interaction required.

- [x] **17. Replace active demo generators with configured AI sources**
  - [x] Map the renamed Web Audit, SEO Audit, Funnel Builder, Social Media Builder, and Chat environment keys without exposing their values.
  - [x] Remove password-bypass demo users and one-tap login controls; Supabase is the only login authority.
  - [x] Remove the SEO sample crawl and clear only the exact legacy Blue Ribbon sample record.
  - [x] Replace hardcoded social voice, pillars, captions, and re-drafts with the dedicated server-side social generation route.
  - [x] Clear exact legacy seeded social months while preserving non-seeded saved client records.
  - [x] Derive keyword, page-map, metadata, and architecture views only from imported crawl fields; show an honest empty state when evidence is absent.

- [x] **18. Connect Brand Audit and Website Builder AI with approval-gated client access**
  - [x] Map the dedicated Brand Audit and Website Builder environment keys through one reusable server-side OpenAI client with authorized-key fallback.
  - [x] Replace duplicated Responses API request and response parsing across jumpstart and stage generation routes.
  - [x] Let studio users share completed audit reports and builder outputs into the matching client Approvals workspace.
  - [x] Preserve dynamically generated approval records when persisted workspaces are merged.
  - [x] Hide Audits and Builders from standard-client navigation, quick actions, Snapshot cards, and direct route rendering.
  - [x] Keep engine access available to client workspaces whose active service is In Full Flight.
  - [x] Add reusable final-output approval cards and lazy-load the heaviest dashboard workspaces.
  - [x] Remove unstable list keys in the touched reusable dashboard surfaces.

- [x] **19. Synchronize all service playbooks with the implemented workflows**
  - [x] Update Brand, Website, and SEO Audit manuals for workspace-based intake, server-side generation, studio review, and client-safe final delivery.
  - [x] Update Funnel and Website Build manuals for approved-source continuity, internal generation gates, build-ready final briefs, and Approvals delivery.
  - [x] Update Social Media and SEO Planning manuals for direct In Full Flight engine collaboration, isolated client cycles, studio review, and durable final approvals.
  - [x] Centralize the repeated standard-client and partner-access rules instead of duplicating policy text across each playbook definition.
  - [x] Synchronize playbook source references with the shared AI, access, approval-output, and client Approvals modules.
  - [x] Keep the workflow map and dashboard alignment checklist consistent with the updated operating manuals.

- [x] **20. Use the exact Social Media Operations service name**
  - [x] Rename the In Full Flight playbook card and document heading to `Social Media Operations`.
  - [x] Align the source-reference title and In Full Flight summary with the canonical workflow-map name.
  - [x] Keep `Social Media Builder` unchanged where it identifies the dashboard tool rather than the sold service.
  - [x] Verify the exact service name on `/dashboard?view=playbooks` with no console errors.

- [x] **21. Make Playbook documentation describe the service work**
  - [x] Replace dashboard feature inventories with a clear `What we do` section in every service manual.
  - [x] State the actual audit, strategy, copy, design, build, optimization, approval, reporting, and handoff work delivered for each service.
  - [x] Use the canonical service names: Brand Audit, Website Audit, SEO Audit, Funnel Build, Website Build, Social Media Operations, and SEO Planning And Execution.
  - [x] Keep technical source files and implementation references confined to the source-reference layer.
  - [x] Verify all seven manuals render as service documentation on `/dashboard?view=playbooks`.

- [x] **22. Document every questionnaire, assessment, scoring, and data-processing rule**
  - [x] Add the complete intake questions and accepted source inputs for all seven services.
  - [x] List every audit area tested and every strategy, build, or operations area produced.
  - [x] Document the actual score inputs, weighting, statuses, approval gates, and missing-evidence behavior without inventing numeric scoring where none exists.
  - [x] Document how raw submissions are normalized, generated or analyzed, reviewed, persisted, approved, and handed off.
  - [x] Remove name-seeded, self-assessment-default, and legacy fallback scores from active audit cards and completion paths.
  - [x] Require deterministic formulas or fixed evidence/readiness states; keep unsupported work Pending, Unverified, or Provisional.
  - [x] Keep implementation file details in the source-reference layer while making the operating logic readable in each manual.
  - [x] Verify all seven manuals render the new sections on `/dashboard?view=playbooks`.

- [x] **23. Ground builder copy in client notes and complete the funnel wireframe**
  - [x] Load saved client workspace notes into both Website Builder and Funnel Builder before generation.
  - [x] Send normalized client-note context to the server and make it an explicit source for copy, with conflicts and unsupported claims flagged rather than guessed.
  - [x] Provide five selectable wireframe design styles with distinct layout behavior.
  - [x] Expand the wireframe to a complete conversion-page section inventory, including conditional offer and checkout sections.
  - [x] Synchronize the builder playbooks, service workflow map, and dashboard alignment checklist.
  - [x] Verify the note context, five styles, complete section inventory, typecheck, production build, and live builder UI.

- [x] **24. Finish the Funnel Development Plan actions and task checklist**
  - [x] Move the editable task plan inside the Development Plan card, directly below Preview, Copy, and Share actions.
  - [x] Restyle the task checklist to match the dashboard task-card checklist pattern while preserving selection, editing, priority, CSV, and import behavior.
  - [x] Make Preview & download PDF generate and display an actual printable PDF, then download that same `.pdf` file.
  - [x] Make Share with client persist the client-safe output, open a share popup, and provide a copyable client link.
  - [x] Keep existing saved funnel plans compatible and avoid duplicated task-plan UI.
  - [x] Verify task placement, checklist interactions, share-link copy, actual PDF preview/download, responsive layout, typecheck, and production build.

- [x] **25. Give the Funnel Development Plan PDF a reusable document skeleton**
  - [x] Add a branded cover with the client, project, document purpose, status, and section index.
  - [x] Apply a consistent print hierarchy to the overview, recommendations, wireframe, build, launch, and task-plan sections.
  - [x] Convert editable task controls into clean printable checklist rows and remove dashboard-only controls from the export.
  - [x] Add print-safe spacing, page breaks, repeated footer treatment, and A4 typography without changing the dashboard layout.
  - [x] Generate, render, and visually inspect the actual PDF, then verify typecheck and the production build.

- [x] **26. Make the Funnel Development Plan PDF pageless**
  - [x] Replace the full-page cover and forced section breaks with one continuous report flow.
  - [x] Measure the rendered document and generate a single custom-height PDF page at a readable fixed width.
  - [x] Replace the repeated page footer with one closing document footer.
  - [x] Preserve the branded skeleton, printable task checklist, and downloadable `.pdf` behavior.
  - [x] Generate, render, and visually inspect the continuous PDF, then verify typecheck and the production build.

- [x] **27. Compact and round the Funnel task-plan rows**
  - [x] Reduce the checklist row height, vertical padding, and spacing so more tasks remain visible at once.
  - [x] Change each checklist row to a fully pill-shaped border radius while preserving its selected treatment.
  - [x] Vertically center the row contents and use circular selected check marks in both the dashboard and PDF.
  - [x] Keep task editing, milestone labels, priority controls, selection, and scrolling functional.
  - [x] Verify the updated rows in the live Funnel Development Plan and run typecheck.

- [x] **28. Apply pageless PDF generation to every report export**
  - [x] Make pageless generation the shared default in the PDF endpoint and client helper.
  - [x] Move Audit and Discovery report exports from the browser print dialog to the actual pageless PDF generator.
  - [x] Provide the same downloadable PDF preview behavior for the migrated report exports.
  - [x] Keep Funnel-specific cover details from leaking into generic Audit and Discovery report covers.
  - [x] Verify a single continuous PDF from the shared endpoint, then run typecheck and the production build.

- [x] **29. Rebuild the Funnel wireframe as a real sales page**
  - [x] Replace generic website-template copy with offer-led, buyer-focused sales copy derived from the approved funnel inputs.
  - [x] Restructure the page into a persuasive sequence: promise, proof, stakes, benefits, product details, process, proof, offer, objections, and repeated purchase CTA.
  - [x] Remove invented testimonials, ratings, guarantees, and pricing; show clear approval placeholders when evidence is missing.
  - [x] Keep all five visual directions while making each one feel intentional, polished, and conversion-led.
  - [x] Apply the upgraded sales-page treatment to reopened legacy funnel plans as well as newly generated plans.
  - [x] Verify the Blue Ribbon sales-page wireframe live, then run typecheck and the production build.

- [x] **30. Remove priority selectors from implementation checklists**
  - [x] Remove the High, Medium, and Low selector from the shared Builder task-row component.
  - [x] Rebalance the task name and milestone columns after the selector is removed.
  - [x] Keep the underlying imported task priority intact without exposing an unnecessary row control.
  - [x] Verify the change in Funnel and Website implementation checklists, then run typecheck.

- [x] **31. Shuffle every sales-page section independently**
  - [x] Replace the five global layout-style buttons with one clear Shuffle page formatting action.
  - [x] Give the hero, proof, stakes, benefits, audience, details, process, testimonial, offer, price, FAQ, and final CTA independent layout variants.
  - [x] Seed the initial section recipe deterministically so reopened plans remain stable until Shuffle is used.
  - [x] Make each Shuffle click generate a new mixed section recipe rather than changing only the hero.
  - [x] Preserve responsive behavior, report rendering, and the sales-page content hierarchy.
  - [x] Verify multiple section layout attributes change after Shuffle, then run typecheck and the production build.

- [x] **32. Equalize Brand Audit card heights**
  - [x] Give palette, intake, and empty Brand Audit previews one shared fixed-height slot.
  - [x] Prevent verified typography and voice metadata from wrapping and stretching completed cards.
  - [x] Verify every Brand Audit card has the same measured height with no clipped preview content.

- [x] **33. Use a domain-only Brand Audit source field**
  - [x] Rename the Website URL field and related helper copy to Domain.
  - [x] Normalize domain input into the URL format required by the scanner without asking clients to type a full URL.
  - [x] Verify a plain domain can be scanned successfully.

- [x] **34. Isolate Brand Audit prefills by the entered domain**
  - [x] Trace previous-scan, generated-answer, and persisted-progress lookup keys.
  - [x] Prevent a changed domain from reusing another domain's previous scan or seeded answers.
  - [x] Verify changing Concertina's domain produces fresh domain-specific evidence and does not surface Concertina content.

- [x] **35. Show only initiated Brand Audits**
  - [x] Exclude untouched client brands from the Brand Audit card grid.
  - [x] Keep saved intake, review, approval, and completed audit records visible.
  - [x] Make the summary counts reflect the visible audit records while keeping standalone audit creation available.
  - [x] Verify the live grid contains no `Not started` cards.

- [x] **36. Start Brand Audits without automatic client association**
  - [x] Make the Admin and Dev Generate audit action open an unassigned draft rather than selecting a client automatically.
  - [x] Persist the standalone draft separately from every client workspace.
  - [x] Update a Client brand system, approval workspace, and builder handoff only when the audit was explicitly opened from that Client's existing card.
  - [x] Verify Generate audit opens `Unassigned draft` and does not add a new client card automatically.

- [x] **37. Make every Audit start screen immediately clear**
  - [x] Shorten Brand, Website, and SEO Audit titles, instructions, loading copy, and primary actions.
  - [x] Make each screen explain only what to add, what happens next, and the next action.
  - [x] Verify the simplified language on all three live Audit routes.

- [x] **38. Keep client ordering alphabetical**
  - [x] Sort the shared client roster A–Z so cards, selectors, and derived client lists inherit the same order.
  - [x] Keep CreatorIQ as the explicit featured client for the Client-role toggle without promoting it in any roster.
  - [x] Verify alphabetical ordering and the CreatorIQ Client-role default in the live dashboard.

- [x] **39. Stack the Brand Audit header actions below the introduction**
  - [x] Move the completed, intake, and Generate audit controls onto a new row below the heading and description.
  - [x] Preserve compact wrapping on smaller screens.
  - [x] Verify the live Brand Audit list header.

- [x] **40. Redesign the Brand Audit action-plan summary**
  - [x] Replace the cramped three-cell metric strip with a cleaner visual summary.
  - [x] Keep priority count, next-action count, and evidence status immediately readable.
  - [x] Verify the revised summary in the completed CreatorIQ action plan.

- [x] **41. Use one column for Brand Audit priorities**
  - [x] Stack every priority roadmap item in one vertical list at all breakpoints.
  - [x] Preserve numbering, details, and supporting bullets.
  - [x] Verify all four CreatorIQ priority items render in one column.

- [x] **42. Confirm before starting a Brand Audit over**
  - [x] Open an `Are you sure?` confirmation modal from every Brand Audit Start over action.
  - [x] Explain that saved intake, report, and action-plan progress will be cleared.
  - [x] Keep the audit unchanged when cancelled; delete the saved audit and remove its card only after explicit confirmation.
  - [x] Verify the modal and cancel path live; verify the confirmed delete wiring in source without removing a saved client audit during QA.

- [x] **43. Show Website and SEO Audit cards only after initiation**
  - [x] Hide untouched Website Audit placeholder runs while preserving saved drafts and completed audits.
  - [x] Hide SEO client cards until a crawl or sitemap project has been saved.
  - [x] Keep Generate/New audit client selectors available so new audits can still be initiated.
  - [x] Verify both live Audit grids contain no untouched placeholder cards.

- [x] **44. Keep Audit client selections clipped and scrollable**
  - [x] Bound Website and SEO client-selection popups to the available viewport height.
  - [x] Clip the rounded popup edges and scroll the client choices independently.
  - [x] Verify both start menus live.

- [x] **45. Show Audit and Builder cards only after initiation**
  - [x] Confirm Brand, Website, and SEO Audit indexes are driven only by saved audit activity.
  - [x] Confirm Funnel Builder groups are driven only by created funnel records.
  - [x] Hide Website Builder cards until a client build has been opened or saved.
  - [x] Hide Social Media cards until at least one monthly calendar has been created.
  - [x] Keep every eligible client available from the Website and Social Media creation menus.
  - [x] Verify every Audit and Builder index live.
  - [x] Verify the same visibility rule in the Client account without exposing another brand.

- [x] **46. Start every Audit and Builder without choosing a client**
  - [x] Match Brand Audit: Admin starts or resumes an unassigned draft directly.
  - [x] Keep Client-account starts automatically scoped to that client only.
  - [x] Keep unassigned drafts out of assigned client cards and Client accounts.
  - [x] Preserve existing assigned Audit and Builder work.
  - [x] Verify Website/SEO Audits and Funnel/Website/Social Builders live.

- [x] **47. Unify the Audit and Builder lifecycle**
  - [x] Use one shared index-control component across Brand, Website, and SEO Audits and Funnel, Website, and Social Media Builders.
  - [x] Use one shared lifecycle utility for standalone Admin starts, client-scoped starts, resume ordering, and saved engine work.
  - [x] Persist Website Builder, SEO Audit, and Social Media Builder progress in the shared client workspace so assigned work reflects in the Client account.
  - [x] Restore standalone work without attaching it to a client and keep it out of Client accounts until assigned.
  - [x] Remove the old Website Audit and Funnel client-picker branches.
  - [x] Run the reusable Admin and Client smoke suite across all six engines.

- [x] **48. Hide internal delivery identity from the portal UI**
  - [x] Keep the internal Dev role and assignments intact while exposing only Admin and Client in the role-switch preview control.
  - [x] Hide the redundant client engine breadcrumb without deleting its navigation behavior.
  - [x] Present internal delivery ownership as the Studio team instead of a named team member.
  - [x] Use Studio instead of Dev in client-facing playbooks and funnel plans.
  - [x] Verify all six Admin and Client engine routes contain no visible Dev, Kier, or client breadcrumb text.

- [x] **49. Make every Audit safely restartable and keep its intake distinct**
  - [x] Use one shared confirmation dialog for Brand, Website, and SEO Audit Start over actions.
  - [x] Delete the confirmed audit record, saved intake, generated report, score, action plan, and builder handoff before returning to the index.
  - [x] Expose Start over from both active Audit workspaces and every initiated Audit card.
  - [x] Derive Website and Brand scan fields from their live questionnaire definitions instead of duplicate API lists.
  - [x] Remove the stale documentation-only Website questionnaire and document the live intake once.
  - [x] Clarify Website-only messaging, visual consistency, and site-positioning prompts; keep Brand focused on the full brand system and SEO evidence-first without a repeated questionnaire.
  - [x] Verify reset behavior, questionnaire separation, type checks, engine smoke coverage, and the production build.

## Active Batch: Website Report and Review Action Polish

Source: five browser comments captured July 25, 2026.

Target: Website Checkup report and Studio Review queue on `http://localhost:3412/dashboard`.

- [~] **50. Redesign the collapsed audited-pages control**
  - [x] Replace the browser-default disclosure marker with a deliberate full-width control.
  - [x] Keep the remaining-page count and expanded state clear.
  - [ ] Verify the interaction in the Blue Ribbon Website Checkup report.

- [~] **51. Correct the Website plan CTA width**
  - [x] Keep Build the website plan content-sized instead of stretching across the footer column.
  - [x] Preserve a balanced right-aligned footer layout.
  - [ ] Verify the report footer at desktop and constrained widths.

- [~] **52. Equalize Review & send padding**
  - [x] Give each Review & send action equal left and right padding.
  - [x] Keep the arrow separated without affecting the button’s visual centering.
  - [ ] Verify both visible CreatorIQ review actions.

- [~] **53. Remove the CreatorIQ interview banner**
  - [x] Remove the dedicated interview-demo section from the Website Checkup index.
  - [x] Keep the real CreatorIQ report accessible through its normal audit card.
  - [ ] Verify the demo query no longer adds the banner.

- [~] **54. Complete focused regression verification**
  - [ ] Confirm both target routes load without runtime errors. Authenticated browser verification is pending because the current dashboard session redirected to login.
  - [x] Run TypeScript, diff check, and the production build.

## Active Batch: Audit Index Score Clarity and Card Parity

Source: three browser comments captured July 26, 2026.

Target: Website and SEO Checkup indexes on `http://localhost:3412/dashboard`.

- [x] **55. Correct the Website projected score and uplift**
  - [x] Read the projected score from the saved audit result before any cached run summary.
  - [x] Keep the displayed uplift derived from the same current and projected values.
  - [x] Verify the Blue Ribbon card no longer contradicts its category targets: the saved result now renders `73 → 79`, `+6`.

- [x] **56. Equalize complete and incomplete Website card geometry**
  - [x] Give durable in-progress cards the same reserved score-panel area as scored cards.
  - [x] Keep unavailable score and category values visually blank.
  - [x] Verify paired cards align at the header, body, and footer: both measured `340px` tall with the footer at the same vertical position.

- [x] **57. Explain the projected score in Website and SEO cards**
  - [x] Add an accessible info control beside the current-to-projected score.
  - [x] Explain on hover, keyboard focus, and click that the second value is the estimated post-recommendation score.
  - [x] Keep the control compact within the shared score card.

- [x] **58. Complete focused regression verification**
  - [x] Run TypeScript, diff check, and the production build.
  - [x] Verify the Website and SEO index routes in the live authenticated browser; retain the existing single-column container fallback for constrained widths.

## Active Batch: Checkup Card Copy and Activity Summary

Source: two browser comments captured July 27, 2026.

Target: Website Checkup index and selected Activity run on `http://localhost:3412/dashboard`.

- [x] **59. Remove the internal normalized-client subtitle**
  - [x] Remove `Production client · normalized` from durable Checkup cards.
  - [x] Remove the same internal label from the Clients surface.
  - [x] Verify client names and status badges remain aligned without the subtitle.

- [x] **60. Simplify the selected Activity checkup design**
  - [x] Make the result and next action the primary visual hierarchy.
  - [x] Consolidate client, update, evidence, and item counts into a compact facts area.
  - [x] Keep progress, advanced details, recheck controls, and admin operations available without competing with the summary.
  - [x] Verify the selected run on desktop and retain the existing narrow-container stack without horizontal overflow.

- [x] **61. Complete focused regression verification**
  - [x] Run TypeScript and `git diff --check`.
  - [x] Verify the exact Website and Activity routes in the authenticated browser.

### Verification Checklist

- [x] `tsc --noEmit` passes.
- [x] Client milestone cards show five circles in visible footer progress.
- [x] Admin milestone cards show five circles in visible footer progress.
- [x] Phase detail modal header shows five circles and sorted/collapsed completed items.
- [x] Notification dropdown avatars are consistent across rows.
- [x] Soon and Awaiting Client status badges use distinct icons.

## Active Batch: Audit Score Labels, Mock Logins, and Playbook Agents

Source: three browser comments and two implementation requests captured July 27, 2026.

Target: Website and SEO Checkup indexes, local login identities, and `Playbooks` on `http://localhost:3412/dashboard`.

- [x] **62. Simplify projected score presentation**
  - [x] Remove the `Projected after Winged in a Week` Website card caption.
  - [x] Remove the `After recommendations` SEO card caption.
  - [x] Vertically center the projected-score information control on both card types.
  - [x] Verify the explanation remains available by hover, focus, and click.

- [x] **63. Standardize development login identities**
  - [x] Move every local mock login shown to users onto the `@baltz.studio` domain.
  - [x] Keep admin, manager, and client role resolution working with the new addresses.
  - [x] Verify the login page and development-login endpoint use the same credentials.

- [x] **64. Add governed agents under Playbooks**
  - [x] Add a clear Playbooks/Agents switch inside the Playbooks view.
  - [x] List enabled Playbook agents with lifecycle, version, evaluation, tools, and approval-gate context.
  - [x] Provide an agent creation entry point that uses the existing governed Playbook editor.
  - [x] Verify existing Playbook browsing and creation remain available.

- [x] **65. Complete focused regression verification**
  - [x] Run TypeScript and `git diff --check`.
  - [x] Verify the exact Website, SEO, Login, and Playbooks routes in the authenticated browser.

## Active Batch: Funnel Copy Fit and Final-Design Layout

Source: direct Funnel Builder review captured July 27, 2026.

Target: `http://localhost:3412/dashboard?view=funnels&serviceRunId=eedbe43d-4cea-40e6-a6d2-d6fdd6f9164e&builderType=funnel`.

- [x] **66. Replace the permanent annotation rail**
  - [x] Remove the always-visible strategy column from every final-design section.
  - [x] Preserve useful rationale as compact wireframe pointers that open popovers.
  - [x] Let the actual page design use the full available width.

- [x] **67. Enforce concise, layout-fit Funnel copy**
  - [x] Add role-specific headline, body, bullet, and CTA budgets to the shared Copywriting Agent.
  - [x] Tighten the Funnel generation contract and bump its governed agent version.
  - [x] Present the current generated result in a concise editorial layout without replacing it with canned copy.
  - [x] Keep the fixed order: Hero, Problem, Benefit, Solution, Differentiation, Proof, Objections, FAQ, CTA.

- [x] **68. Add visual section structures**
  - [x] Add a real gallery or media-grid mock structure to the final design.
  - [x] Vary section composition so the page is not a vertical stack of text cards.
  - [x] Keep repeated cards equal-height through copy budgets and grid geometry.
  - [x] Verify the design remains readable at the existing narrow-container breakpoint.

- [x] **69. Complete focused Funnel verification**
  - [x] Run the Funnel contract check, TypeScript, `git diff --check`, and the webpack build.
  - [x] Verify the exact Funnel route, generated-copy provenance, section order, gallery structure, pointer popover treatment, equal-card geometry, and overflow in the authenticated browser.

- [x] **70. Lock the approved Funnel wireframe composition**
  - [x] Remove the Shuffle layout control and its random recipe mutation.
  - [x] Use one preloaded, approved composition for every Funnel result.
  - [x] Allow generated copy to change without recomposing the wireframe.
  - [x] Verify the fixed recipe, AI-result provenance, section order, pointer popover, and zero overflow on the exact Funnel route.

## Active Batch: Shared Files Upload Placement

Source: browser comment captured July 27, 2026.

Target: `http://localhost:3412/dashboard?view=files&serviceRunId=eedbe43d-4cea-40e6-a6d2-d6fdd6f9164e`.

- [x] **71. Move upload out of the file-list footer**
  - [x] Remove the full-width upload strip below the file list.
  - [x] Add a compact upload action beside the active folder summary.
  - [x] Keep folder-aware multi-file upload behavior unchanged.
  - [x] Update the empty-state guidance so it points to the new action.
  - [x] Verify the exact Files route at desktop and narrow viewport widths.

## Active Batch: Semantic Dashboard URLs

Source: direct dashboard routing request captured July 27, 2026.

Target: all dashboard views and deep links under `http://localhost:3412/dashboard`.

- [x] **72. Replace internal query-state URLs with semantic paths**
  - [x] Add one shared parser and builder for dashboard paths.
  - [x] Support clean Checkup, Lab, Activity, Files, and standard view URLs.
  - [x] Keep legacy query-string links backward compatible and canonicalize them after load.
  - [x] Preserve run, report, demo, proposal, approval, and integration context across refreshes.
  - [x] Verify navigation, refresh restoration, browser history, and the production build.

## Active Batch: SEO Visuals and Concise Dashboard Copy

Source: six browser comments captured July 27, 2026.

Targets: `/dashboard/checkups/seo`, `/dashboard/playbooks`, and `/dashboard`.

- [x] **73. Clarify SEO findings visuals**
  - [x] Present crawl-depth distribution as an unmistakable graph with readable axes and interactive values.
  - [x] Remove the Discovery readiness description.
  - [x] Recompose the Discovery readiness heading, badge, and score into a compact aligned header.
  - [x] Verify the SEO findings at desktop and narrow viewport widths.

- [x] **74. Tighten Playbook and Snapshot card copy**
  - [x] Shorten the Brand Audit Playbook description.
  - [x] Shorten the Website Checkup next action.
  - [x] Shorten the Brand Checkup next action.
  - [x] Verify the cards remain understandable and balanced in Admin and Client views.

- [x] **75. Complete focused regression verification**
  - [x] Run TypeScript, `git diff --check`, and the production build.
  - [x] Verify the exact SEO, Playbooks, and Snapshot routes in the authenticated browser.
- [x] Audit subcategory toggles use 20px radius and connector lines stay inside the branch.
- [x] Notification rows alternate softly and show no duplicate side line.
- [x] Phase modal task lists use consistent rows, no separators, and collapsed completed checks.
- [x] Phase detail popups use the shared editable modal template across client/admin views.
- [x] Long pending task lists show branch groups only after the 10-item threshold.
- [x] Phase detail task rows and completed-toggle rows use 20px rounding.
- [x] Phase modal status changes sync with the modal header dots and percentage.
- [x] Client and Admin Files sidebars and file-hub layouts stay in parity through shared modules.
- [x] Admin project selector lists two distinct clients and plan changes apply to the selected client.
- [x] Admin plan selector exposes only consolidated active paths: Cocoon Consult Premium and Winged in a Week.
- [x] Dashboard role switcher is removed; Admin and Client are separate login-driven sessions.
- [x] Login page has no demo credentials, password bypasses, or one-tap role shortcuts.
- [x] Supabase password and Google OAuth remain the only login paths.
- [x] Admin plan dropdown renders the Premium badge inside the dropdown rows.
- [x] Cocoon Consult Free is not exposed as an admin workspace.
- [x] Browser console has no runtime errors on `/dashboard`.
- [x] Dedicated SEO and Social Media API routes return structured 200 responses with the renamed keys.
- [x] Brand Audit and Website Builder routes return structured live AI responses without exposing API keys to the browser.
- [x] Standard clients see final engine outputs only in Approvals; In Full Flight clients retain Audits and Builders access.
- [x] Dynamically shared approval outputs survive workspace merge and reload.
- [x] Every active service playbook matches the implemented client access, AI generation, review, handoff, and final-output rules.
- [x] Website and Funnel Builder generation receives saved client workspace notes before discovery context.
- [x] Funnel wireframes expose five selectable styles and the complete conversion-page skeleton, including on reopened legacy plans.
- [x] Funnel Development Plan keeps its task checklist below the actions, opens an actual printable PDF, and shares a copyable Approvals link.
- [x] Funnel Development Plan PDF uses the branded reusable skeleton and renders cleanly as an actual A4 document.
- [x] Funnel Development Plan PDF exports as one continuous pageless document without page seams or forced section breaks.
- [x] Funnel Development Plan task rows are compact, pill-shaped, vertically centered, and use circular check marks.
- [x] Funnel, Audit, and Discovery PDF actions all use the same pageless PDF generation path.
- [x] Blue Ribbon renders as a buyer-facing sales page with one Shop Feed CTA, no fabricated proof or price, and the complete conversion sequence.
- [x] Shared Funnel and Website implementation task rows expose no priority selector while retaining the imported priority value.
- [x] One Funnel wireframe Shuffle changes all 12 independent sales-section layout attributes in the live builder.
- [x] Brand Audit cards share one measured height across palette, intake, and empty states without clipped content.
- [x] Brand Audit accepts a plain domain and generates evidence from that active domain instead of the selected workspace label.
- [x] Brand Audit lists initiated records only and opens new Admin or Dev audits as standalone unassigned drafts.
- [x] All six Audit and Builder routes pass `npm run smoke:engines` for Admin and Client roles.

### Execution Rules

Proceed one checklist item at a time:

1. Implement the next unchecked comment.
2. Run targeted verification for that item.
3. Update this checklist immediately.
4. Move to the next item only after the current item is verified or marked `[~]` with a blocker note.
