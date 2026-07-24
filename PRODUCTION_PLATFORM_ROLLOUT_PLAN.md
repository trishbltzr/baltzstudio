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

- [x] **1. Preserve Hostinger as the public marketing platform**
  - [x] Keep the root marketing site at `baltz.studio`. (HTTP 200 from Hostinger after the portal cutover.)
  - [x] Keep the marketing experience independent from portal deployments.
  - [x] Use Hostinger for additional public campaign, service, lead-generation, or client microsites where its included site allowance avoids another hosting bill. (Seven retained sites currently use the Business allowance.)
  - [x] Inventory every existing Hostinger website before removing or repurposing anything. (`baltz.studio`, three Media Morphosys properties, `trishabaltazar.com`, one Hostinger site, and the preserved portal rollback.)
  - [x] Verify every retained marketing site on desktop and mobile. (All eight retained marketing/rollback hostnames returned HTTPS. Desktop and 390px checks passed without material overflow; `outsourcingsuccess.themediamorphosys.com` has a minor 2px mobile overflow, `trishabaltazar.com` logs legacy jQuery errors, and the Sofia/grey-crocodile sites remain default-template cleanup candidates.)

- [x] **2. Use Hostinger as the DNS control plane**
  - [x] Keep the domain registered at Hostinger.
  - [x] Export or record the complete current DNS zone before editing it. (Hostinger DNS Export was triggered before the cutover; pre-cutover `app` resolved to Hostinger A values `147.79.120.253` and `77.37.76.229`.)
  - [x] Preserve MX, SPF, DKIM, DMARC, verification, and existing marketing-service records. (Only an `app` record was added.)
  - [x] Add the exact Vercel verification and routing records for `app.baltz.studio`. (`CNAME app 076111bc744a1a85.vercel-dns-017.com`.)
  - [x] Point only the application subdomain to Vercel; do not move the root marketing site.
  - [x] Lower the relevant DNS TTL before cutover, then restore a normal TTL after verification. (`app` was cut over at 300 seconds and restored to 14400 seconds; both authoritative Hostinger nameservers return the normal TTL.)
  - [x] Verify root, `www`, `app`, and mail routing after propagation. (Root remains Hostinger 200, `www` now returns a permanent 308 to the apex, `app` remains the Vercel CNAME, and MX/SPF/DKIM/DMARC are authoritative.)

- [x] **3. Maximize branded email**
  - [x] Inventory existing Hostinger mailboxes, aliases, and forwarding rules. (One `portal@baltz.studio` mailbox, initially no aliases or forwarders.)
  - [x] Define role addresses such as `hello@`, `support@`, `projects@`, `billing@`, and `notifications@` without duplicating unnecessary paid inboxes. (All five available aliases now deliver to `portal@`.)
  - [x] Use aliases and forwarding where a separate mailbox is not required.
  - [x] Keep application transactional mail separated from human correspondence. (`notifications@` is the application sender; `portal@` remains the human inbox.)
  - [x] Configure SPF, DKIM, and DMARC and verify alignment. (SPF and all three Hostinger DKIM records pass; DMARC is present in monitoring mode, `p=none`.)
  - [x] Verify inbound mail, outbound mail, password resets, invitations, and application notifications. (SMTP self-send, Supabase invitation, password reset, and the production `/api/invite-request` notification all arrived. The application-triggered message reached Inbox; its acceptance-only database row was removed.)

- [~] **4. Use Hostinger email marketing intentionally**
  - [~] Use Hostinger email marketing for public leads, newsletters, service education, and nurture campaigns. (It is not included with this plan: the available choices are the free 100-recipient/200-email monthly tier or a paid add-on. No purchase was made without approval.)
  - [x] Keep portal transactional messages out of marketing lists. (Transactional SMTP and the future marketing-list path are explicitly separated in operations.)
  - [x] Maintain consent, unsubscribe, and suppression handling. (The activation contract requires consent source/time/version plus immutable unsubscribe, complaint, hard-bounce, and suppression handling.)
  - [x] Connect marketing forms to the selected CRM/list workflow without exposing Supabase secrets in the browser. (The Hostinger marketing app now submits inquiry forms through its server-side `/api/waitlist` adapter into the Supabase `cocoon_leads` queue using public project credentials. Production acceptance preserved `footer_connect` attribution and timestamped `direct_response` consent metadata; the acceptance-only row was deleted. No inquiry is enrolled in a marketing list.)
  - [x] Track campaign attribution into the marketing analytics layer. (The required UTM contract and monthly reconciliation control are documented before activation.)

- [~] **5. Use included marketing performance and protection**
  - [x] Enable Hostinger CDN for Hostinger-hosted public sites only. (`baltz.studio` CDN is Active; its cache was flushed after the secured marketing redeploy. The Vercel portal is not routed through it.)
  - [x] Confirm SSL renewal and HTTPS redirects for every marketing domain. (All eight retained hostnames have valid certificates and HTTP-to-HTTPS redirects; the earliest observed certificate expiry is 2026-09-08.)
  - [x] Keep daily backups enabled and perform at least one documented restore test. (Daily Hostinger backups are active. The 2026-07-24 16:00 file archive downloaded successfully, passed gzip/tar integrity and safe-path checks, and restored 66,288 entries across six shared-hosting domains into an isolated temporary directory without touching a live site.)
  - [x] Review malware scanning and access controls. (Hostinger dependency scanning found 14 findings on the rollback build; maintained portal and marketing sources were upgraded to Next.js 16.2.11, PostCSS 8.5.15, and Sharp 0.35.0. SSH remains inactive.)
  - [~] Connect Google Analytics, Search Console, and relevant advertising pixels to the marketing site. (The portal has a configured read-only GA4 OAuth client, but connections are session-cookie scoped and production has no persisted integration/property record. The marketing source has no GA4 measurement ID, Search Console ownership, or approved advertising-pixel IDs; those account selections are required from the owner.)
  - [x] Keep marketing-site performance monitoring separate from portal monitoring. (Hostinger CDN/Page Speed is the public-site layer; Vercel Observability and durable workflow checks are the portal layer.)

- [~] **6. Retire unused Hostinger application resources safely**
  - [x] Keep the existing Hostinger portal deployment as a rollback target until the Vercel cutover is accepted. (Detached only from `app.baltz.studio`; it remains HTTP 200 at `antiquewhite-spider-144713.hostingersite.com`.)
  - [x] Do not delete the Hostinger Node application, MySQL database, deployment files, or environment settings during initial cutover.
  - [x] Export the Hostinger MySQL schema and any data before retirement. (Eight MySQL databases were inventoried. The abandoned 1 MB `baltz_portal` database was exported separately through phpMyAdmin because it post-dated the latest automated restore point; its SQL contains seven tables and no data-row inserts.)
  - [x] Archive the abandoned MySQL-consolidation work rather than allowing it to remain an ambiguous production path. (Moved outside active routes/source to `docs/archive/hostinger-mysql-prototype`; removed MySQL auth/runtime dependencies and environment flags.)
  - [ ] Remove the old Hostinger portal only after the rollback window closes and explicit approval is given.

## Vercel Application Plan

- [x] **7. Establish the approved release source**
  - [x] Decide whether the production source is the current local checkout, GitHub `main`, or a dedicated release branch. (`joanandco/production-platform-rollout` is the release branch.)
  - [x] Review the extensive uncommitted local changes and separate approved work from experiments. (The approved Supabase/Vercel workflow candidate remains on the dedicated release branch; the abandoned Hostinger/MySQL path is not enabled.)
  - [x] Confirm that production must not expose development-only or quick-login controls. (`/api/dev-login` returns 404 whenever `NODE_ENV=production`, and development-session reads are disabled in production.)
  - [x] Create a reproducible release commit before deployment. (`c97e1827` contains the hardened Next.js 16.2.11 production source, retention migration, and operations/checklist documentation on `joanandco/production-platform-rollout`.)
  - [x] Run TypeScript, production build, workflow tests, and relevant smoke tests. (TypeScript, Next.js production build, workflow, shadow projection, notifications, portal access/task/workspace, legacy hardening, and client-scope tests pass.)

- [~] **8. Configure the Vercel project**
  - [x] Reuse the existing `baltazar-studio-dashboard` Vercel project unless inspection proves a clean replacement is safer. (Verified project `prj_yfj1pooR3CXrBmQG7tan2q1XP8CR` and healthy deployment history.)
  - [x] Confirm Node.js 24 and the Next.js build command. (Vercel project reports Node `24.x`; `package.json` uses `next build --webpack`.)
  - [x] Separate Production, Preview, and Development environment variables. (Required non-empty Supabase/OpenAI settings are configured per environment; the expiring local OIDC token was not copied.)
  - [x] Add Supabase public settings only as public variables. (`NEXT_PUBLIC_SUPABASE_URL` and the publishable key are the only browser-exposed Supabase values.)
  - [x] Keep Supabase secret keys, OpenAI credentials, SMTP credentials, OAuth secrets, and integration secrets server-only.
  - [x] Configure the Vercel function region near the Supabase project. (Preview `dpl_CaFdQPNdDLgL8YepSHb2bBNvTUEj` reports `icn1`, matching Supabase `ap-northeast-2` in Seoul.)
  - [~] Enable spend alerts and a deliberate usage budget. (The project is on Vercel Hobby with no payment method; Spend Management requires Pro, so activation needs an explicit billing upgrade.)

- [x] **9. Move the portal domain**
  - [x] Add `app.baltz.studio` to the Vercel project before changing DNS.
  - [x] Complete domain ownership verification. (Vercel reports ownership in the current team; routing/SSL propagation remains under observation.)
  - [x] Deploy and verify using the generated Vercel URL first. (Preview `dpl_AAGJMsBWVpWXj6tYKd44u2Jfiw4p` is READY in `icn1`; real Client authentication and streamed durable chat passed before promotion.)
  - [x] Update Hostinger DNS only after the generated deployment passes.
  - [x] Verify SSL, redirects, login, callbacks, API routes, streaming, uploads, and authenticated navigation on `app.baltz.studio`. (Vercel/HSTS response, real role sessions, scoped APIs, streamed chat, PDF, upload, and workflow paths passed.)

- [x] **10. Separate real-time requests from durable work**
  - [x] Keep login, dashboard reads, ordinary mutations, and chat requests in Vercel Functions.
  - [x] Move long audits into Vercel Workflows with explicit durable steps. (`serviceCheckupWorkflow` uses `"use workflow"` and bounded `"use step"` functions.)
  - [x] Persist every workflow state transition in Supabase. (`workflow_transition_service_run` records the run state and an idempotent event.)
  - [x] Return an accepted/run identifier quickly instead of holding one browser request open for the full audit. (`POST /api/service-runs/[runId]/start` returns HTTP 202 with both run IDs.)
  - [x] Stream or poll durable progress into the dashboard. (`GET /api/service-runs/[runId]/stream` provides authenticated SSE from the durable run.)
  - [x] Add idempotency keys so retries cannot duplicate side effects. (Snapshot, event, agent, and check-revision writes use stable run-scoped idempotency keys.)

- [x] **11. Adapt Chromium, Lighthouse, scanning, and PDF execution**
  - [x] Keep lightweight HTTP/HTML scanning in bounded workflow steps.
  - [x] Use a Vercel-compatible Chromium package for small, bounded PDF or screenshot functions. (`puppeteer-core` + `@sparticuz/chromium`, with browser cleanup in `finally`.)
  - [x] Use Vercel Sandbox for full Lighthouse runs or browser workloads that need installed binaries, greater isolation, or longer execution. (Production run `b0c8e2f4-6f8d-487d-af8b-b81d02543068` persisted verified Lighthouse 13.4.0 mobile and desktop evidence.)
  - [x] Cap discovered pages and per-page navigation time. (Discovery is capped at seven pages; browser navigation is capped at 30 seconds and HTTP probes at 8 seconds.)
  - [x] Separate desktop and mobile captures into independently retryable steps. (Each rendered target and each Lighthouse strategy now has an independent composite checkpoint key.)
  - [x] Close browsers in `finally` blocks and clean temporary files. (Rendered evidence and local Lighthouse always close/kill Chromium resources.)
  - [x] Store evidence and generated files in Supabase Storage instead of ephemeral function filesystems. (Evidence already persists; every generated PDF is now uploaded to private `portal-uploads` before its response is returned.)
  - [x] Verify that an active audit cannot delay login, chat, or ordinary dashboard traffic. (The production audit ran as a durable Workflow/Sandbox job while authenticated API, mail, and portal checks continued independently.)

- [x] **12. Structure the AI chatbot**
  - [x] Authenticate every chat request through Supabase.
  - [x] Resolve client and role scope server-side before loading context or executing tools.
  - [x] Store conversations, tool activity, approvals, and durable outcomes in Supabase. (`portal_chat_turns` records scoped messages, actions, tool activity, outcome, model, tokens, latency, and status with idempotent request IDs.)
  - [x] Stream ordinary chat responses from Vercel. (Authenticated preview acceptance produced an incremental response and a matching durable row.)
  - [x] Trigger a Workflow when a chat request becomes a long-running audit, report, or multi-stage operation. (Long audit actions use the durable `serviceCheckupWorkflow`; ordinary Snapshot chat remains a bounded Vercel request.)
  - [x] Require explicit authorization for sensitive or externally visible tool actions. (The server-side action policy restricts roles and returns authorization-required decisions rather than executing unapproved side effects.)
  - [x] Add token, latency, error, and per-client usage measurements.

## Supabase Production Plan

- [x] **13. Confirm production Auth**
  - [x] Inventory production users, providers, callback URLs, and email templates. (Email/password is the sole enabled provider; public signup is disabled.)
  - [x] Add the exact Vercel preview and production callback URLs. (`app.baltz.studio`, wildcard Vercel previews, and canonical localhost callback are allowed; Site URL is production.)
  - [x] Verify password login, password reset, invitation, logout, expiry, revocation, and disabled accounts. (Password login, invitation delivery, reset delivery, and normal logout behavior passed. A bounded production acceptance user also proved access-token expiry, global refresh-token revocation, and disabled-account rejection; it was deleted afterward.)
  - [x] Keep development login routes unavailable in production.
  - [x] Verify Admin, Manager, and Client roles through real authenticated sessions. (All three shells and client scoping were exercised against Vercel. Temporary Admin/Client accounts were removed afterward; production now has one Admin, one Manager, and one Client membership.)

- [x] **14. Harden authorization and data boundaries**
  - [x] Review RLS on every exposed table and storage bucket. (Legacy snapshot tables have RLS enabled with no anon/authenticated grants; `portal-uploads` is private.)
  - [x] Ensure policies use trusted authorization data rather than user-editable metadata. (Tenant membership and `auth.uid()` are authoritative; the Snapshot action fix uses the server-resolved Supabase client scope.)
  - [x] Verify that client users cannot read or mutate another client's data. (Live client-role scope check returned one scoped client, no staff fields, and HTTP 403 for governance access.)
  - [x] Verify privileged server clients are never shipped to browser bundles. (The privileged client and workflow credential modules import `server-only` and are used only behind authenticated server routes/steps.)
  - [x] Run database security and performance advisors. (Re-run after chat migration; the new policy's `auth.uid()` init-plan warning was remediated in `20260724023000_optimize_portal_chat_turns_rls.sql`. Remaining notices are pre-existing and recorded for acceptance.)
  - [x] Preserve migration history and document the production schema version. (Production now includes durable chat plus its RLS optimization; matching SQL is retained in `supabase/migrations`.)

- [~] **15. Confirm durable application data**
  - [x] Verify conversations, audits, reports, workflow runs, evidence, approvals, tasks, notifications, and files survive deployments and retries. (Chat, applied Inbox/task action, PDF, upload, workflow run, snapshot, evidence, model/tokens/latency, and idempotent retry state were all queried from Supabase. Acceptance-only artifacts were removed after proof.)
  - [x] Confirm storage upload, download, replacement, and deletion policies. (`portal-uploads` is private with no direct browser policies; authenticated routes use privileged storage only after role/client checks. Upload, privileged download, and cleanup deletion passed; `upsert:false` prevents silent replacement.)
  - [x] Verify data retention and soft-deletion behavior. (Source metadata defaults to three years, evidence to two years, and chat content to one year. `20260724024500_enforce_chat_retention_and_client_archival.sql` rejects invalid retention and half-archived clients; the temporary archive/restore acceptance left no test rows.)
  - [~] Confirm daily backups and perform a documented recovery exercise. (The non-destructive migration/archive/recovery exercise passed. A permission-restricted off-site logical export now contains all 34 public tables/2,027 rows, three Auth users, and the private Storage object; an independent verifier passed all 36 artifact hashes and record counts. Supabase Free still lacks managed daily backups, so this remains partial until Pro is approved or a reliable daily schedule is authorized.)
  - [x] Define the conditions that would require point-in-time recovery. (Broad destructive changes, cross-tenant mutation, non-deterministic corruption, or an RPO between daily backups require PITR; the maintenance-mode restore sequence is documented.)

## Cutover and Rollback

- [x] **16. Stage the release**
  - [x] Deploy an approved preview build. (Final durable-action preview `dpl_8Jji9GJxoz6QjGbKTh7GwkCGFqHF` is READY in Seoul.)
  - [x] Run anonymous, Admin, Manager, and Client acceptance checks.
  - [x] Run one bounded audit, one chatbot conversation, one tool-backed chat action, one PDF export, and one file upload. (Audit `b0c8e2f4-6f8d-487d-af8b-b81d02543068` finished Ready with five evidence items and Lighthouse 13.4.0 mobile/desktop scores; all other flows passed.)
  - [x] Confirm logs and persisted state for every flow. (Chat rows, applied action outcomes, Inbox/task persistence, PDF/file Storage objects, workflow run, snapshot, and evidence were queried directly. Acceptance-only Inbox/file artifacts were then removed.)

- [x] **17. Cut over `app.baltz.studio`**
  - [x] Record the previous DNS state and Hostinger deployment identifier. (Previous Hostinger A targets recorded; latest rollback artifact is `baltz-hostinger-stability-20260724.zip`, completed 2026-07-24 21:14:13.)
  - [x] Change only the required DNS records.
  - [x] Monitor HTTP status, latency, authentication callbacks, API errors, workflow failures, and Supabase errors. (Final production `dpl_LLpBWF3L5CcJ7QjE6XokuDN52qQW` is READY from commit `c97e1827`, with Node.js 24 functions in `icn1`; Vercel/HSTS login and root checks pass, `/api/dev-login` returns 404, and no error/fatal runtime logs were present after release.)
  - [x] Keep the Hostinger deployment intact during the rollback window. (The application and deployment history remain available under the temporary Hostinger hostname.)

- [x] **18. Rollback rule**
  - [x] Roll back if authentication, tenant isolation, uploads, chat, workflow persistence, or dashboard availability fails.
  - [x] Restore the previous Hostinger DNS target if the Vercel deployment cannot be corrected within the agreed incident window.
  - [x] Do not roll the database backward solely because the application deployment is rolled back.
  - [x] Document the exact application-first and DNS-fallback procedures in `docs/PRODUCTION_PLATFORM_OPERATIONS.md`.

- [~] **19. Close the rollback window**
  - [ ] Obtain explicit production acceptance.
  - [~] Retain the Hostinger portal deployment for the agreed observation period. (A conservative 14-day window runs through 2026-08-07; the rollback hostname and deployment history remain intact during that window.)
  - [x] Export and archive Hostinger deployment and MySQL artifacts. (A checksum manifest, verified 639 MB Hostinger file archive, `baltz_portal` SQL export, and verified complete Git source bundle are stored off-repository under `Documents/Baltz Studio Archives/hostinger-rollback-2026-07-24`; the live rollback Web App and its deployment history remain intact.)
  - [ ] Remove unused Hostinger application resources only after approval.
  - [x] Update architecture and operations documentation to show Vercel + Supabase as authoritative. (`docs/PRODUCTION_PLATFORM_OPERATIONS.md`.)

## Cost and Operations Guardrails

- [~] **20. Establish monthly controls**
  - [x] Record the actual Hostinger renewal date and post-promotion price. (The current term expires 2027-07-24. The read-only hPanel renewal quote for another 12 months showed PHP 479/month list, PHP 439/month after the displayed 8% discount, PHP 5,268 before tax, PHP 632.16 tax/fees, and PHP 5,900.16 total; no payment was submitted.)
  - [x] Use the Hostinger plan for public marketing sites, mailboxes, email marketing, CDN, SSL, and backups to avoid duplicating those costs. (Seven site slots plus the rollback hostname, one mailbox/five aliases, active CDN, SSL, and daily backups are now inventoried and assigned.)
  - [~] Start Vercel on the appropriate commercial plan with spend alerts and a hard budget decision. (Currently Hobby; Pro and a payment method are required for Spend Management.)
  - [~] Start or retain the appropriate Supabase production plan with cost controls. (Currently Free; Pro is required for leaked-password protection and production-grade PITR/backup controls.)
  - [x] Track OpenAI usage by feature and client. (`portal_chat_turns` stores tenant/client, model, input/output tokens, latency, status, tool activity, and outcome for monthly reconciliation.)
  - [x] Review Vercel function, workflow, sandbox, bandwidth, and build usage monthly. (`docs/PLATFORM_MONTHLY_OPERATIONS_CHECKLIST.md` is the recurring evidence log.)
  - [x] Consider a VPS worker only when measured browser-processing costs exceed the VPS cost plus its maintenance burden. (The gate requires three consecutive monthly reviews above the fully loaded VPS alternative.)

## Final Verification Checklist

- [x] `baltz.studio` loads the approved Hostinger marketing site.
- [x] `www.baltz.studio` redirects correctly. (Hostinger returns 308 to `https://baltz.studio` after the secured marketing release and CDN flush.)
- [x] `app.baltz.studio` serves the approved Vercel production deployment.
- [x] Hostinger mail continues to send and receive with valid SPF, DKIM, and DMARC.
- [x] Supabase authentication and callback URLs work on the production domain.
- [x] Admin, Manager, and Client access boundaries are verified.
- [x] Chat streams successfully and persists its history.
- [x] Long-running chatbot work becomes a durable workflow.
- [x] Chromium, Lighthouse, website scanning, and PDF rendering complete without blocking the portal.
- [x] Files and generated evidence persist in Supabase Storage.
- [ ] Vercel and Supabase spend alerts are active.
- [x] The rollback procedure has been rehearsed and documented.
- [x] Production has no development-only login or debugging controls.

## Workflow

Proceed one checklist item at a time:

1. Implement the next unchecked item.
2. Verify it with the appropriate provider, browser, code, or data evidence.
3. Update this checklist immediately.
4. Move to the next item only after the current item is verified or explicitly marked blocked.
