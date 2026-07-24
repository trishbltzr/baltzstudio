# Archived Hostinger MySQL Consolidation Prototype

Status: Archived on 2026-07-24. This is historical reference only. The
authoritative production architecture is Vercel for the Next.js application and
Supabase for PostgreSQL, Auth, RLS, Storage, and durable application state.
Nothing in this document should be enabled in production.

## Goal

Run the Next.js portal, database, authentication, and protected application
storage on Hostinger while preserving the current portal behavior and keeping
Supabase available as a rollback source until parity is verified.

## Cutover Rules

- Do not delete or mutate Supabase source data during migration.
- Do not enable `PORTAL_DATA_BACKEND=mysql` until every required table has
  migrated and the parity checks pass.
- Never migrate or expose plaintext passwords. Existing users receive a secure
  reset/invite flow when Hostinger authentication is enabled.
- Keep `baltz.studio` on the landing page and use `app.baltz.studio` for the
  portal.

## Progress

- [x] Deploy the current Next.js portal to Hostinger Business Hosting.
- [x] Bind and verify `app.baltz.studio`.
- [x] Bound local workflow concurrency and Chromium-heavy jobs for shared hosting.
- [x] Preserve the existing `baltz.studio` landing page.
- [x] Create a dedicated Hostinger MySQL database and application user.
- [x] Apply the Hostinger authentication foundation schema.
- [x] Add server-only MySQL pooling and transaction helpers.
- [x] Add password verification and hashed session-token primitives.
- [x] Add feature-flagged Hostinger login/logout API endpoints.
- [ ] Add password-reset and invite-token endpoints with SMTP delivery.
- [ ] Add a backend adapter for memberships and client scope.
- [ ] Port operational tables and repositories from PostgreSQL to MySQL.
- [ ] Port protected file metadata and storage.
- [ ] Copy tenant, client, membership, workflow, audit, and workspace data.
- [ ] Run count, checksum, role-scope, and workflow parity checks.
- [ ] Seed/invite users and verify Admin, Manager, and Client login flows.
- [ ] Enable `PORTAL_DATA_BACKEND=mysql` for an internal pilot.
- [ ] Complete production cutover after a rollback-window review.
- [ ] Retire Supabase only after explicit approval.

## Required Parity Checks

- Admin, Manager, and Client permissions match the current membership model.
- Client accounts cannot read or mutate another client’s data.
- Checkup and Lab runs survive restarts and resume from durable checkpoints.
- Login and dashboard traffic remain available while a checkup, Lighthouse run,
  or report export is active.
- Selective rechecks preserve prior verified evidence.
- Files, approvals, notifications, tasks, and workflow exceptions persist.
- Password reset, logout, expiry, revocation, and disabled accounts behave
  correctly.
- Migration counts and payload checksums match the source system.
