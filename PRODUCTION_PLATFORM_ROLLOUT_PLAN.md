# Baltazar Studio Production Platform Rollout Plan

Source: Approved architecture discussion for Hostinger, Vercel, and Supabase
Target: `https://baltz.studio` and `https://app.baltz.studio`
Workspace: `/Users/trishabltzr/baltazarstudio`
Created: 2026-07-24

## Progress Legend

- `[ ]` Not started
- `[~]` Implemented, verification pending
- `[x]` Implemented and verified

## Approved Platform Model

| Provider | Primary ownership | Explicitly not responsible for |
| --- | --- | --- |
| Hostinger Business | Domain registration, DNS, public marketing sites, branded email, email marketing, CDN, SSL, and marketing-site backups | Dashboard runtime, portal authentication, portal database, audit workers |
| Vercel | Next.js portal, API routes, AI chat streaming, durable workflows, Chromium/Lighthouse/PDF execution, preview deployments, production rollbacks, and application observability | Primary user/data storage |
| Supabase | PostgreSQL, Auth, row-level security, portal storage, conversation history, audit/workflow persistence, and database backups | Hosting the Next.js user interface |
| OpenAI | Chat, analysis, tool decisions, and report generation | Authentication, authorization, or durable application state |

## Final URL Structure

- `baltz.studio` — primary Baltazar Studio marketing site on Hostinger.
- `www.baltz.studio` — redirect to `https://baltz.studio`.
- `app.baltz.studio` — production portal on Vercel.
- `staging-app.baltz.studio` — optional stable Vercel staging alias after the production flow is verified.
- Additional campaign or client-marketing domains/subdomains stay on Hostinger when they are public, content-led sites rather than authenticated applications.

## Hostinger Business Maximization

- [~] **1. Preserve Hostinger as the public marketing platform**
  - [x] Keep the root marketing site at `baltz.studio`. (HTTP 200 from Hostinger after the portal cutover.)
  - [x] Keep the marketing experience independent from portal deployments.
  - [x] Use Hostinger for additional public campaign, service, lead-generation, or client microsites where its included site allowance avoids another hosting bill. (Seven retained sites currently use the Business allowance.)
  - [x] Inventory every existing Hostinger website before removing or repurposing anything. (`baltz.studio`, three Media Morphosys properties, `trishabaltazar.com`, one Hostinger site, and the preserved portal rollback.)
  - [ ] Verify every retained marketing site on desktop and mobile.

- [~] **2. Use Hostinger as the DNS control plane**
  - [x] Keep the domain registered at Hostinger.
  - [x] Export or record the complete current DNS zone before editing it. (Hostinger DNS Export was triggered before the cutover; pre-cutover `app` resolved to Hostinger A values `147.79.120.253` and `77.37.76.229`.)
  - [x] Preserve MX, SPF, DKIM, DMARC, verification, and existing marketing-service records. (Only an `app` record was added.)
  - [x] Add the exact Vercel verification and routing records for `app.baltz.studio`. (`CNAME app 076111bc744a1a85.vercel-dns-017.com`.)
  - [x] Point only the application subdomain to Vercel; do not move the root marketing site.
  - [~] Lower the relevant DNS TTL before cutover, then restore a normal TTL after verification. (`app` CNAME created at 300 seconds; restoration follows propagation/acceptance.)
  - [~] Verify root, `www`, `app`, and mail routing after propagation. (Root, `app`, MX, SPF, DKIM, and DMARC are authoritative; `www` still serves the marketing site directly and needs a canonical redirect.)

- [~] **3. Maximize branded email**
  - [x] Inventory existing Hostinger mailboxes, aliases, and forwarding rules. (One `portal@baltz.studio` mailbox, initially no aliases or forwarders.)
  - [x] Define role addresses such as `hello@`, `support@`, `projects@`, `billing@`, and `notifications@` without duplicating unnecessary paid inboxes. (All five available aliases now deliver to `portal@`.)
  - [x] Use aliases and forwarding where a separate mailbox is not required.
  - [x] Keep application transactional mail separated from human correspondence. (`notifications@` is the application sender; `portal@` remains the human inbox.)
  - [x] Configure SPF, DKIM, and DMARC and verify alignment. (SPF and all three Hostinger DKIM records pass; DMARC is present in monitoring mode, `p=none`.)
  - [ ] Verify inbound mail, outbound mail, password resets, invitations, and application notifications.

- [~] **4. Use Hostinger email marketing intentionally**
  - [~] Use Hostinger email marketing for public leads, newsletters, service education, and nurture campaigns. (It is not included with this plan: the available choices are the free 100-recipient/200-email monthly tier or a paid add-on. No purchase was made without approval.)
  - [ ] Keep portal transactional messages out of marketing lists.
  - [ ] Maintain consent, unsubscribe, and suppression handling.
  - [ ] Connect marketing forms to the selected CRM/list workflow without exposing Supabase secrets in the browser.
  - [ ] Track campaign attribution into the marketing analytics layer.

- [ ] **5. Use included marketing performance and protection**
  - [ ] Enable Hostinger CDN for Hostinger-hosted public sites only.
  - [ ] Confirm SSL renewal and HTTPS redirects for every marketing domain.
  - [ ] Keep daily backups enabled and perform at least one documented restore test.
  - [ ] Review malware scanning and access controls.
  - [ ] Connect Google Analytics, Search Console, and relevant advertising pixels to the marketing site.
  - [ ] Keep marketing-site performance monitoring separate from portal monitoring.

- [~] **6. Retire unused Hostinger application resources safely**
  - [x] Keep the existing Hostinger portal deployment as a rollback target until the Vercel cutover is accepted. (Detached only from `app.baltz.studio`; it remains HTTP 200 at `antiquewhite-spider-144713.hostingersite.com`.)
  - [x] Do not delete the Hostinger Node application, MySQL database, deployment files, or environment settings during initial cutover.
  - [ ] Export the Hostinger MySQL schema and any data before retirement.
  - [x] Archive the abandoned MySQL-consolidation work rather than allowing it to remain an ambiguous production path. (Moved outside active routes/source to `docs/archive/hostinger-mysql-prototype`; removed MySQL auth/runtime dependencies and environment flags.)
  - [ ] Remove the old Hostinger portal only after the rollback window closes and explicit approval is given.

## Vercel Application Plan

- [ ] **7. Establish the approved release source**
  - [x] Decide whether the production source is the current local checkout, GitHub `main`, or a dedicated release branch. (`joanandco/production-platform-rollout` is the release branch.)
  - [x] Review the extensive uncommitted local changes and separate approved work from experiments. (The approved Supabase/Vercel workflow candidate remains on the dedicated release branch; the abandoned Hostinger/MySQL path is not enabled.)
  - [x] Confirm that production must not expose development-only or quick-login controls. (`/api/dev-login` returns 404 whenever `NODE_ENV=production`, and development-session reads are disabled in production.)
  - [x] Create a reproducible release commit before deployment. (`05ef92bc` currently contains the durable-workload release on `joanandco/production-platform-rollout`; advisor follow-up is pending commit.)
  - [x] Run TypeScript, production build, workflow tests, and relevant smoke tests. (TypeScript, Next.js production build, workflow, shadow projection, notifications, portal access/task/workspace, legacy hardening, and client-scope tests pass.)

- [ ] **8. Configure the Vercel project**
  - [x] Reuse the existing `baltazar-studio-dashboard` Vercel project unless inspection proves a clean replacement is safer. (Verified project `prj_yfj1pooR3CXrBmQG7tan2q1XP8CR` and healthy deployment history.)
  - [x] Confirm Node.js 24 and the Next.js build command. (Vercel project reports Node `24.x`; `package.json` uses `next build --webpack`.)
  - [x] Separate Production, Preview, and Development environment variables. (Required non-empty Supabase/OpenAI settings are configured per environment; the expiring local OIDC token was not copied.)
  - [x] Add Supabase public settings only as public variables. (`NEXT_PUBLIC_SUPABASE_URL` and the publishable key are the only browser-exposed Supabase values.)
  - [x] Keep Supabase secret keys, OpenAI credentials, SMTP credentials, OAuth secrets, and integration secrets server-only.
  - [x] Configure the Vercel function region near the Supabase project. (Preview `dpl_CaFdQPNdDLgL8YepSHb2bBNvTUEj` reports `icn1`, matching Supabase `ap-northeast-2` in Seoul.)
  - [~] Enable spend alerts and a deliberate usage budget. (The project is on Vercel Hobby with no payment method; Spend Management requires Pro, so activation needs an explicit billing upgrade.)

- [ ] **9. Move the portal domain**
  - [x] Add `app.baltz.studio` to the Vercel project before changing DNS.
  - [x] Complete domain ownership verification. (Vercel reports ownership in the current team; routing/SSL propagation remains under observation.)
  - [x] Deploy and verify using the generated Vercel URL first. (Preview `dpl_AAGJMsBWVpWXj6tYKd44u2Jfiw4p` is READY in `icn1`; real Client authentication and streamed durable chat passed before promotion.)
  - [x] Update Hostinger DNS only after the generated deployment passes.
  - [ ] Verify SSL, redirects, login, callbacks, API routes, streaming, uploads, and authenticated navigation on `app.baltz.studio`.

- [ ] **10. Separate real-time requests from durable work**
  - [x] Keep login, dashboard reads, ordinary mutations, and chat requests in Vercel Functions.
  - [x] Move long audits into Vercel Workflows with explicit durable steps. (`serviceCheckupWorkflow` uses `"use workflow"` and bounded `"use step"` functions.)
  - [x] Persist every workflow state transition in Supabase. (`workflow_transition_service_run` records the run state and an idempotent event.)
  - [x] Return an accepted/run identifier quickly instead of holding one browser request open for the full audit. (`POST /api/service-runs/[runId]/start` returns HTTP 202 with both run IDs.)
  - [x] Stream or poll durable progress into the dashboard. (`GET /api/service-runs/[runId]/stream` provides authenticated SSE from the durable run.)
  - [x] Add idempotency keys so retries cannot duplicate side effects. (Snapshot, event, agent, and check-revision writes use stable run-scoped idempotency keys.)

- [ ] **11. Adapt Chromium, Lighthouse, scanning, and PDF execution**
  - [x] Keep lightweight HTTP/HTML scanning in bounded workflow steps.
  - [x] Use a Vercel-compatible Chromium package for small, bounded PDF or screenshot functions. (`puppeteer-core` + `@sparticuz/chromium`, with browser cleanup in `finally`.)
  - [~] Use Vercel Sandbox for full Lighthouse runs or browser workloads that need installed binaries, greater isolation, or longer execution. (Implemented isolated Node 24/Chrome/Lighthouse execution with bounded PageSpeed fallback; one post-promotion production run remains.)
  - [x] Cap discovered pages and per-page navigation time. (Discovery is capped at seven pages; browser navigation is capped at 30 seconds and HTTP probes at 8 seconds.)
  - [x] Separate desktop and mobile captures into independently retryable steps. (Each rendered target and each Lighthouse strategy now has an independent composite checkpoint key.)
  - [x] Close browsers in `finally` blocks and clean temporary files. (Rendered evidence and local Lighthouse always close/kill Chromium resources.)
  - [x] Store evidence and generated files in Supabase Storage instead of ephemeral function filesystems. (Evidence already persists; every generated PDF is now uploaded to private `portal-uploads` before its response is returned.)
  - [ ] Verify that an active audit cannot delay login, chat, or ordinary dashboard traffic.

- [~] **12. Structure the AI chatbot**
  - [x] Authenticate every chat request through Supabase.
  - [x] Resolve client and role scope server-side before loading context or executing tools.
  - [x] Store conversations, tool activity, approvals, and durable outcomes in Supabase. (`portal_chat_turns` records scoped messages, actions, tool activity, outcome, model, tokens, latency, and status with idempotent request IDs.)
  - [x] Stream ordinary chat responses from Vercel. (Authenticated preview acceptance produced an incremental response and a matching durable row.)
  - [ ] Trigger a Workflow when a chat request becomes a long-running audit, report, or multi-stage operation.
  - [x] Require explicit authorization for sensitive or externally visible tool actions. (The server-side action policy restricts roles and returns authorization-required decisions rather than executing unapproved side effects.)
  - [x] Add token, latency, error, and per-client usage measurements.

## Supabase Production Plan

- [~] **13. Confirm production Auth**
  - [x] Inventory production users, providers, callback URLs, and email templates. (Email/password is the sole enabled provider; public signup is disabled.)
  - [x] Add the exact Vercel preview and production callback URLs. (`app.baltz.studio`, wildcard Vercel previews, and canonical localhost callback are allowed; Site URL is production.)
  - [ ] Verify password login, password reset, invitation, logout, expiry, revocation, and disabled accounts.
  - [x] Keep development login routes unavailable in production.
  - [x] Verify Admin, Manager, and Client roles through real authenticated sessions. (All three shells and client scoping were exercised against Vercel; temporary Admin/Client accounts will be removed after final acceptance.)

- [ ] **14. Harden authorization and data boundaries**
  - [x] Review RLS on every exposed table and storage bucket. (Legacy snapshot tables have RLS enabled with no anon/authenticated grants; `portal-uploads` is private.)
  - [ ] Ensure policies use trusted authorization data rather than user-editable metadata.
  - [x] Verify that client users cannot read or mutate another client's data. (Live client-role scope check returned one scoped client, no staff fields, and HTTP 403 for governance access.)
  - [x] Verify privileged server clients are never shipped to browser bundles. (The privileged client and workflow credential modules import `server-only` and are used only behind authenticated server routes/steps.)
  - [x] Run database security and performance advisors. (Re-run after chat migration; the new policy's `auth.uid()` init-plan warning was remediated in `20260724023000_optimize_portal_chat_turns_rls.sql`. Remaining notices are pre-existing and recorded for acceptance.)
  - [x] Preserve migration history and document the production schema version. (Production now includes durable chat plus its RLS optimization; matching SQL is retained in `supabase/migrations`.)

- [ ] **15. Confirm durable application data**
  - [~] Verify conversations, audits, reports, workflow runs, evidence, approvals, tasks, notifications, and files survive deployments and retries. (Live production contains durable service runs/events/snapshots/evidence/agent runs; a real preview chat persisted model/tokens/latency/messages through the new production schema. PDF/file acceptance remains.)
  - [ ] Confirm storage upload, download, replacement, and deletion policies.
  - [ ] Verify data retention and soft-deletion behavior.
  - [ ] Confirm daily backups and perform a documented recovery exercise.
  - [ ] Define the conditions that would require point-in-time recovery.

## Cutover and Rollback

- [~] **16. Stage the release**
  - [x] Deploy an approved preview build. (`dpl_AAGJMsBWVpWXj6tYKd44u2Jfiw4p` in Seoul, generated URL verified 2026-07-24.)
  - [x] Run anonymous, Admin, Manager, and Client acceptance checks.
  - [ ] Run one bounded audit, one chatbot conversation, one tool-backed chat action, one PDF export, and one file upload.
  - [ ] Confirm logs and persisted state for every flow.

- [ ] **17. Cut over `app.baltz.studio`**
  - [x] Record the previous DNS state and Hostinger deployment identifier. (Previous Hostinger A targets recorded; latest rollback artifact is `baltz-hostinger-stability-20260724.zip`, completed 2026-07-24 21:14:13.)
  - [x] Change only the required DNS records.
  - [ ] Monitor HTTP status, latency, authentication callbacks, API errors, workflow failures, and Supabase errors.
  - [x] Keep the Hostinger deployment intact during the rollback window. (The application and deployment history remain available under the temporary Hostinger hostname.)

- [ ] **18. Rollback rule**
  - [ ] Roll back if authentication, tenant isolation, uploads, chat, workflow persistence, or dashboard availability fails.
  - [ ] Restore the previous Hostinger DNS target if the Vercel deployment cannot be corrected within the agreed incident window.
  - [ ] Do not roll the database backward solely because the application deployment is rolled back.

- [ ] **19. Close the rollback window**
  - [ ] Obtain explicit production acceptance.
  - [ ] Retain the Hostinger portal deployment for the agreed observation period.
  - [ ] Export and archive Hostinger deployment and MySQL artifacts.
  - [ ] Remove unused Hostinger application resources only after approval.
  - [ ] Update architecture and operations documentation to show Vercel + Supabase as authoritative.

## Cost and Operations Guardrails

- [ ] **20. Establish monthly controls**
  - [~] Record the actual Hostinger renewal date and post-promotion price. (Business plan expiry/renewal date is 2027-07-24; the future renewal price is not exposed in the current panel.)
  - [ ] Use the Hostinger plan for public marketing sites, mailboxes, email marketing, CDN, SSL, and backups to avoid duplicating those costs.
  - [~] Start Vercel on the appropriate commercial plan with spend alerts and a hard budget decision. (Currently Hobby; Pro and a payment method are required for Spend Management.)
  - [~] Start or retain the appropriate Supabase production plan with cost controls. (Currently Free; Pro is required for leaked-password protection and production-grade PITR/backup controls.)
  - [ ] Track OpenAI usage by feature and client.
  - [ ] Review Vercel function, workflow, sandbox, bandwidth, and build usage monthly.
  - [ ] Consider a VPS worker only when measured browser-processing costs exceed the VPS cost plus its maintenance burden.

## Final Verification Checklist

- [ ] `baltz.studio` loads the approved Hostinger marketing site.
- [ ] `www.baltz.studio` redirects correctly.
- [ ] `app.baltz.studio` serves the approved Vercel production deployment.
- [ ] Hostinger mail continues to send and receive with valid SPF, DKIM, and DMARC.
- [ ] Supabase authentication and callback URLs work on the production domain.
- [ ] Admin, Manager, and Client access boundaries are verified.
- [ ] Chat streams successfully and persists its history.
- [ ] Long-running chatbot work becomes a durable workflow.
- [ ] Chromium, Lighthouse, website scanning, and PDF rendering complete without blocking the portal.
- [ ] Files and generated evidence persist in Supabase Storage.
- [ ] Vercel and Supabase spend alerts are active.
- [ ] The rollback procedure has been rehearsed and documented.
- [ ] Production has no development-only login or debugging controls.

## Workflow

Proceed one checklist item at a time:

1. Implement the next unchecked item.
2. Verify it with the appropriate provider, browser, code, or data evidence.
3. Update this checklist immediately.
4. Move to the next item only after the current item is verified or explicitly marked blocked.
