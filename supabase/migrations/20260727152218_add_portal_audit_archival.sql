alter table public.portal_audit_runs
  add column if not exists archived_at timestamptz;

comment on column public.portal_audit_runs.archived_at is
  'Archive timestamp. Archived audits remain recoverable and are excluded from active audit lists.';

create index if not exists portal_audit_runs_active_client_updated_idx
  on public.portal_audit_runs (client_id, updated_at desc)
  where archived_at is null;
