# Baltazar Studio Production Platform Operations

Last verified: 2026-07-24

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

## Mail model

- Human mailbox: `portal@baltz.studio`
- Aliases: `hello@`, `support@`, `projects@`, `billing@`,
  `notifications@`
- Transactional sender: `notifications@baltz.studio`
- SMTP: Hostinger, configured as server-only Vercel variables
- Marketing campaigns must use a consent-aware marketing list and never the
  transactional mail path.

## Cost controls and upgrade gates

- Hostinger Business remains valuable for the seven public/rollback sites,
  one mailbox plus five aliases, DNS, SSL, and backups.
- Hostinger email marketing is a separate free/paid product, not an included
  Business allowance.
- Vercel currently uses Hobby. Spend Management requires Pro and a payment
  method.
- Supabase currently uses Free. Leaked-password protection and stronger
  production recovery/PITR controls require Pro.
- Do not purchase either upgrade without account-owner approval.
- Review Vercel function/workflow/Sandbox usage, Supabase database/storage
  usage, and OpenAI usage by client each month.
- Consider a VPS worker only after measured browser-workload cost exceeds the
  VPS price plus maintenance, patching, observability, and backup labor.

## Known follow-ups

- Configure `www.baltz.studio` to issue a canonical redirect to the root
  instead of serving a second 200 response.
- Choose whether to upgrade Vercel and Supabase before enabling spend alerts,
  leaked-password protection, and PITR.
- Select and configure the Hostinger email-marketing tier only after audience,
  consent, unsubscribe, suppression, and attribution requirements are defined.
- Keep the Hostinger rollback application until the observation window is
  explicitly closed.
