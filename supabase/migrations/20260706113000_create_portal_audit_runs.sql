begin;

create table if not exists public.portal_audit_runs (
  run_id text primary key,
  client_id text not null,
  run jsonb not null,
  state jsonb not null,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint portal_audit_runs_run_object check (jsonb_typeof(run) = 'object'),
  constraint portal_audit_runs_state_object check (jsonb_typeof(state) = 'object')
);

create index if not exists portal_audit_runs_client_id_idx
  on public.portal_audit_runs (client_id);

create index if not exists portal_audit_runs_updated_at_idx
  on public.portal_audit_runs (updated_at desc);

alter table public.portal_audit_runs enable row level security;

grant select, insert, update on public.portal_audit_runs to anon, authenticated;

drop policy if exists portal_audit_runs_read on public.portal_audit_runs;
create policy portal_audit_runs_read
on public.portal_audit_runs
for select
to anon, authenticated
using (true);

drop policy if exists portal_audit_runs_insert on public.portal_audit_runs;
create policy portal_audit_runs_insert
on public.portal_audit_runs
for insert
to anon, authenticated
with check (true);

drop policy if exists portal_audit_runs_update on public.portal_audit_runs;
create policy portal_audit_runs_update
on public.portal_audit_runs
for update
to anon, authenticated
using (true)
with check (true);

commit;
