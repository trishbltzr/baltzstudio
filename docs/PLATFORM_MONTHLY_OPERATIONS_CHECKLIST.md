# Platform Monthly Operations Checklist

Use one dated copy of this checklist each month. Add links or identifiers for
the evidence reviewed; do not mark a line complete from memory.

## Availability and releases

- [ ] Record the current Vercel production deployment ID and region.
- [ ] Verify `baltz.studio` returns 200, `www.baltz.studio` permanently
  redirects to the apex, and `app.baltz.studio` returns 200 with valid TLS.
- [ ] Exercise one Admin, Manager, and Client login and confirm tenant scope.
- [ ] Run one bounded chat, durable action, file, PDF, and audit/workflow check.
- [ ] Review Vercel function, Workflow, Sandbox, build, bandwidth, and error
  usage against the prior month.

## Data and recovery

- [ ] Review Supabase database, egress, Storage, Auth, and function usage.
- [ ] Run Supabase security and performance advisors; record every new warning.
- [ ] Confirm no client has an inconsistent `status`/`archived_at` state.
- [ ] Confirm no retention date is earlier than its row creation/capture time.
- [ ] Confirm the newest managed backup or off-site logical export.
- [ ] Inventory private Storage objects separately from the database backup.
- [ ] Perform a quarterly non-production restore drill and record RPO, RTO, and
  reconciliation results.

## Hostinger Business

- [ ] Confirm all retained marketing and rollback sites return HTTPS without a
  certificate warning.
- [ ] Review CDN cache status, 4xx/5xx totals, and Page Speed separately from
  Vercel portal monitoring.
- [ ] Confirm the latest daily backup and inspect restore history.
- [ ] Review malware and dependency findings; patch high or critical findings
  before the next release.
- [ ] Review disk, inode, CPU, memory, database, and site-slot usage. Investigate
  any resource-limit banner even when the 24-hour graph is low.
- [ ] Review the eight inventoried MySQL databases and retain exports until the
  rollback window is explicitly closed.

## Mail and marketing

- [ ] Send one application-triggered transactional test and confirm Inbox
  delivery plus SPF, DKIM, and DMARC alignment.
- [ ] Review mailbox quota, spam placement, aliases, and SMTP failures.
- [ ] If marketing is active, reconcile consent, unsubscribe, complaint,
  bounce, and suppression counts.
- [ ] Reconcile campaign UTMs to analytics and CRM/list outcomes.
- [ ] Confirm transactional recipients were not added to a marketing list.

## Cost decision

- [ ] Record Hostinger renewal date/price, Vercel plan/usage, Supabase
  plan/usage, and OpenAI tokens/cost by feature and client.
- [ ] Compare browser-processing spend with a managed VPS estimate that
  includes patching, observability, backups, and on-call labor.
- [ ] Do not add a VPS worker unless three consecutive monthly reviews show
  measured browser-processing cost above the fully loaded VPS alternative.
- [ ] Record the owner decision for any plan upgrade, add-on, or resource
  retirement.
