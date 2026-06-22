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

### Verification Checklist

- [x] `tsc --noEmit` passes.
- [x] Client milestone cards show five circles in visible footer progress.
- [x] Admin milestone cards show five circles in visible footer progress.
- [x] Phase detail modal header shows five circles and sorted/collapsed completed items.
- [x] Notification dropdown avatars are consistent across rows.
- [x] Soon and Awaiting Client status badges use distinct icons.
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
- [x] Login page exposes both View client and View admin demo entries.
- [x] Login page exposes easy demo login for Admin, Flora & Co., and House of Hazel.
- [x] Admin plan dropdown renders the Premium badge inside the dropdown rows.
- [x] Cocoon Consult Free is not exposed as an admin workspace.
- [x] Browser console has no runtime errors on `/dashboard`.

### Execution Rules

Proceed one checklist item at a time:

1. Implement the next unchecked comment.
2. Run targeted verification for that item.
3. Update this checklist immediately.
4. Move to the next item only after the current item is verified or marked `[~]` with a blocker note.
