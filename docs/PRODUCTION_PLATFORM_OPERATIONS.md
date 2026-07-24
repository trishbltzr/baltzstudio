# Baltazar Studio Production Platform Operations

Last verified: 2026-07-25

## Authoritative platform map

| Surface | Provider | Authority |
| --- | --- | --- |
| `baltz.studio` and public marketing sites | Hostinger Business | Public content, SSL/CDN, marketing analytics, backups |
| `app.baltz.studio` | Vercel | Next.js portal, API routes, AI chat, workflows, Chromium, Lighthouse, PDF |
| Portal users, roles, state, evidence, files, and chat history | Supabase | PostgreSQL, Auth, RLS, private Storage |
| `@baltz.studio` mail | Hostinger Email | Human mailbox, aliases, SMTP |

Hostinger remains the DNS control plane. Only the `app` CNAME delegates the
portal to Vercel. The root site and mail records must not be changed during a
portal release.

## Current production and rollback targets

- Production portal: `https://app.baltz.studio`
- Stable Vercel alias: `https://baltazar-studio-dashboard.vercel.app`
- Hostinger rollback application:
  `https://antiquewhite-spider-144713.hostingersite.com`
- Minimum rollback observation window: through 2026-08-07 (14 days after
  cutover verification). This date does not authorize deletion.
- Latest recorded Hostinger deployment artifact:
  `baltz-hostinger-stability-20260724.zip`
- Previous Hostinger `app` A targets: `147.79.120.253`, `77.37.76.229`
- Current Vercel CNAME:
  `076111bc744a1a85.vercel-dns-017.com`

## Normal release

1. Build and test the dedicated release branch.
2. Deploy a Vercel Preview.
3. Test anonymous, Admin, Manager, and Client access.
4. Test one streamed chat, one scoped action, one PDF, one file, and one
   bounded workflow run.
5. Promote the exact tested Preview.
6. Confirm the production deployment is Ready in `icn1`.
7. Verify `app.baltz.studio`, TLS, `/login`, Supabase callbacks, and the
   production dev-login guard.
8. Record the deployment ID in the rollout checklist.

## Application rollback

Use a Vercel rollback first when the portal is reachable but a new release is
faulty:

1. Identify the most recent known-good production deployment.
2. Promote that immutable deployment in Vercel.
3. Verify login, role scope, chat, uploads, and workflow reads.
4. Do not reverse a compatible Supabase migration merely because application
   code was rolled back.

Use the Hostinger rollback only when Vercel cannot be restored inside the
incident window:

1. Confirm the temporary Hostinger target is healthy before DNS changes.
2. Replace only the Hostinger `app` CNAME with the recorded rollback target.
3. Leave root, `www`, MX, SPF, DKIM, and DMARC unchanged.
4. Verify authoritative DNS, TLS, login, and health from an uncached resolver.
5. Revert to the Vercel CNAME after the incident is corrected.

The 2026-07-24 cutover rehearsed the critical mechanics in reverse order:
the Hostinger application was verified at its temporary hostname, the custom
hostname was detached without deleting files or deployment history, the
authoritative CNAME was verified from both Hostinger nameservers, and Vercel
served the hostname with valid TLS.

## Data and security rules

- Supabase is the only authoritative production database.
- The `portal-uploads` bucket is private. Browser users receive no direct
  bucket policy; authenticated server routes enforce role/client scope.
- Service-role and OpenAI/SMTP secrets remain server-only.
- Public signup is disabled. Access is invite-only.
- Client action scope comes from the authenticated Supabase membership, not
  client-supplied metadata.
- Chat turns retain messages, scoped actions, tool activity, outcomes, model,
  tokens, latency, and status.
- Long audit state and evidence must be persisted before a workflow advances.
- Client records are soft-deleted by setting both `status = 'archived'` and
  `archived_at`. A database constraint rejects half-archived states, and a
  client can be restored by returning both fields to the active state.
- Client source metadata defaults to three years of retention, audit evidence
  defaults to two years, and portal chat content defaults to one year. A
  retention date does not authorize deletion by itself: a purge requires an
  owner-approved maintenance change with a fresh backup or export.

## Backup and recovery policy

- Hostinger creates daily website backups. The 2026-07-24 inventory showed a
  current restore point at `2026-07-24 16:00`. Its 639 MB file archive passed
  gzip/tar integrity and safe-path checks, then restored 66,288 entries across
  six shared-hosting domains into an isolated temporary directory without
  overwriting a live site.
- The legacy `u625895629_baltz_portal` database was created after that restore
  point, so it was exported separately through phpMyAdmin. The file backup,
  SQL export, complete Git source bundle, checksums, and restore evidence are
  stored outside the repositories in
  `Documents/Baltz Studio Archives/hostinger-rollback-2026-07-24`.
- Supabase is currently on Free. Supabase does not provide downloadable daily
  backups for Free projects, so the migration chain is the schema recovery
  source and an off-site logical export is required before any destructive
  database maintenance.
- Database backups do not include Supabase Storage objects. Before a destructive
  exercise, separately inventory and export private bucket objects.
- The 2026-07-24 non-destructive recovery exercise applied the retention and
  archival migration, rejected an invalid half-archived client, accepted a
  valid archive/restore cycle, removed the test record, and confirmed that no
  test or invalid-retention rows remained.
- The 2026-07-25 off-site logical recovery export captured all 34 public
  tables (2,027 rows), three Supabase Auth users, and the private Storage
  object. `verify-production-recovery.mjs` independently passed 36 artifact
  hashes plus all table, Auth, and Storage counts. The export directory is
  owner-only (`0700`) and every artifact is `0600`.
- On Supabase Free, run a fresh export before every destructive migration and
  at least weekly:

  ```sh
  npm run backup:production -- --output "/absolute/new/backup-directory"
  npm run verify:production-backup -- --input "/absolute/backup-directory"
  ```

  Keep each export outside the repository. The migration chain remains the
  schema source; the logical export supplies public-table data, Auth user
  metadata, and Storage bytes. This interim control does not provide PITR or
  guaranteed managed daily backups.
- Owner accepted commercial production on Supabase Free on 2026-07-25 and
  declined Pro for now. This accepts the absence of managed daily backups and
  PITR. Keep the verified off-site logical exporter available; recurring weekly
  automation remains pending explicit approval. Revisit Pro when the recovery
  point, client volume, or compliance obligation exceeds this accepted risk.

Use PITR rather than an ordinary application rollback when any of these are
confirmed:

1. A destructive query or migration changed many tenant rows.
2. Cross-tenant data was mutated or deleted.
3. Data corruption cannot be repaired deterministically from durable events.
4. The required recovery point is between daily backups.
5. Incident review concludes that replaying writes would be less reliable than
   restoring the database and reconciling the write gap.

Do not start an in-place restore while the portal is accepting writes. Put the
portal into maintenance mode, record the target time and expected data-loss
window, export Storage separately, restore, run tenant-boundary checks, and
only then reopen writes.

## Mail model

- Human mailbox: `portal@baltz.studio`
- Aliases: `hello@`, `support@`, `projects@`, `billing@`,
  `notifications@`
- Transactional sender: `notifications@baltz.studio`
- SMTP: Hostinger, configured as server-only Vercel variables
- Marketing campaigns must use a consent-aware marketing list and never the
  transactional mail path.

The production application notification path was accepted through
`POST /api/invite-request`: Vercel persisted the request, Hostinger SMTP sent it
as `notifications@baltz.studio`, and the message arrived in the Hostinger
Inbox. The acceptance-only database row was removed after verification.

The Hostinger marketing forms submit through the server-side
`POST /api/waitlist` adapter into Supabase `cocoon_leads`. The deployed
environment contains only the public Supabase URL and publishable key. A
production acceptance submission preserved the `footer_connect` source and
timestamped `direct_response` consent metadata, then its test row was removed.
These inquiries are a reply queue, not marketing-list subscriptions.

## Marketing email activation contract

Hostinger Email Marketing remains deliberately unpurchased until there is an
approved audience and campaign. Activation must satisfy all of the following:

- Store consent source, consent time, privacy-copy version, and list purpose.
- Keep an immutable suppression list for unsubscribes, complaints, and hard
  bounces. Never re-import suppressed recipients.
- Send portal invitations, resets, alerts, and receipts only through the
  transactional SMTP path.
- Submit public forms to a server-side CRM/list adapter. Browser code may send
  form fields but must never receive Hostinger, Supabase service-role, or CRM
  secrets.
- Add `utm_source`, `utm_medium`, `utm_campaign`, and `utm_content` to campaign
  links and reconcile those values in the marketing analytics layer.
- Start with the free tier only for an internal or explicitly consented pilot;
  purchase a paid tier only after the audience size and monthly send forecast
  exceed the free allowance.

## Marketing analytics

- The approved analytics scope is GA4 plus a Search Console Domain property for
  `baltz.studio`; no advertising pixels are approved.
- GA4 is configured as account `Baltz Studio`, property
  `Baltz Studio Website`, Philippines reporting time, PHP currency, with lead
  generation and web-traffic objectives. Optional Google account data-sharing
  switches were disabled. The owner accepted Google's Analytics Terms. Web
  stream `15318027405` uses measurement ID `G-56N71YXBBR`.
- Marketing commit `dca51de` added consent-aware GA4, `/privacy`, a footer
  privacy link, and the corrected `https://baltz.studio` canonical. Before
  consent, the live page loaded zero GA scripts and showed the consent banner;
  after explicit opt-in, it loaded the correct Google tag. No advertising
  pixels are present.
- Search Console ownership uses a Hostinger apex TXT record with a 300-second
  TTL. The Domain property is `baltz.studio`; a URL-prefix fallback for
  `https://baltz.studio/` uses the same token in server-rendered metadata.
  Google and Cloudflare public resolvers return the TXT token. Keep both the DNS
  record and metadata after verification so ownership remains valid.
- Search Console verification and sitemap submission remain pending because
  Hostinger began returning HTTP 503 before Google could fetch the live tag.

## Marketing-site incident: 2026-07-25

- Deployment `baltz-studio-hostinger-search-console-20260725.zip` completed and
  became Current. Its clean build produced all expected routes, and the
  verification meta tag briefly returned from the live homepage.
- After the Hostinger CDN cache was purged, the apex, `/privacy`, and
  `/sitemap.xml` consistently returned Hostinger HTTP 503 responses. Requests
  did not reach the application: hPanel showed the Web App as `Running`, 1% CPU,
  576 MB memory, and zero runtime-log issues or errors.
- The last known-good artifact
  `baltz-studio-hostinger-ga4-20260725.zip` was redeployed and became Current.
  The Web App was then restarted through hPanel. The 503 persisted.
- Current marketing source keeps Search Console metadata in commit `d15790d`,
  but production is intentionally rolled back to the GA4 archive while the
  Hostinger runtime incident is unresolved.
- Do not perform another blind redeploy. The next authorized action must be one
  of:
  1. open a Hostinger support incident with the timestamps, deployment names,
     clean-build evidence, resource readings, restart result, and persistent
     503 response; or
  2. deploy the marketing site to Vercel and change only the apex/`www` web
     records after preserving MX, SPF, DKIM, DMARC, and the Search Console TXT.

## Cost controls and upgrade gates

- Hostinger Business remains valuable for the seven public/rollback sites,
  one mailbox plus five aliases, DNS, SSL, and backups.
- The current Hostinger term expires 2027-07-24. On 2026-07-25 hPanel quoted
  another 12 months at PHP 5,268 before tax and PHP 5,900.16 including the
  displayed PHP 632.16 tax/fees (PHP 439/month after the displayed 8%
  discount; PHP 479/month list). Recheck the quote before renewal.
- Hostinger email marketing is a separate free/paid product, not an included
  Business allowance.
- Vercel remains on Hobby by owner decision dated 2026-07-25. Spend Management
  requires Pro and a payment method, so monthly manual usage review is the
  accepted cost control.
- Supabase remains on Free by owner decision dated 2026-07-25. The owner
  accepted the absence of leaked-password protection, managed backups, and PITR
  for now; weekly logical-export automation is still awaiting approval.
- Do not purchase either upgrade without account-owner approval.
- Review Vercel function/workflow/Sandbox usage, Supabase database/storage
  usage, and OpenAI usage by client each month.
- Consider a VPS worker only after measured browser-workload cost exceeds the
  VPS price plus maintenance, patching, observability, and backup labor.
- Use `docs/PLATFORM_MONTHLY_OPERATIONS_CHECKLIST.md` as the recurring evidence
  log. Do not treat a green application dashboard as proof that backups, email,
  DNS, or spend controls are healthy.

## Known follow-ups

- Revisit Vercel Pro and Supabase Pro if measured usage, recovery objectives, or
  compliance needs exceed the accepted free-tier controls.
- Select and configure the Hostinger email-marketing tier only after an
  audience, campaign owner, and monthly send forecast are approved.
- Keep the Hostinger rollback application until the observation window is
  explicitly closed.
