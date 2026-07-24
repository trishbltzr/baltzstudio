alter table public.service_runs
  add column if not exists source_kind text not null default 'production'
  check (source_kind in ('production', 'demo', 'imported'));

alter table public.evidence_snapshots
  add column if not exists source_kind text not null default 'production'
  check (source_kind in ('production', 'demo', 'imported'));

update public.clients
set source_kind = 'demo',
    updated_at = timezone('utc', now())
where slug = 'creator-iq'
  and source_kind <> 'demo';

update public.service_runs run
set source_kind = client.source_kind
from public.clients client
where client.id = run.client_id
  and run.source_kind is distinct from client.source_kind;

update public.evidence_snapshots snapshot
set source_kind = run.source_kind
from public.service_runs run
where run.id = snapshot.service_run_id
  and snapshot.source_kind is distinct from run.source_kind;

create or replace function public.enforce_service_run_source_kind()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  client_source_kind text;
begin
  select client.source_kind
  into client_source_kind
  from public.clients client
  where client.id = new.client_id
    and client.tenant_id = new.tenant_id;

  if client_source_kind is null then
    raise exception 'The service run client does not belong to this tenant.';
  end if;
  new.source_kind := client_source_kind;
  return new;
end;
$$;

drop trigger if exists service_runs_enforce_source_kind on public.service_runs;
create trigger service_runs_enforce_source_kind
before insert or update of client_id, tenant_id, source_kind
on public.service_runs
for each row execute function public.enforce_service_run_source_kind();

create or replace function public.enforce_snapshot_source_kind()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  run_source_kind text;
begin
  select run.source_kind
  into run_source_kind
  from public.service_runs run
  where run.id = new.service_run_id
    and run.client_id = new.client_id
    and run.tenant_id = new.tenant_id;

  if run_source_kind is null then
    raise exception 'The evidence snapshot is outside the service run scope.';
  end if;
  new.source_kind := run_source_kind;
  return new;
end;
$$;

drop trigger if exists evidence_snapshots_enforce_source_kind on public.evidence_snapshots;
create trigger evidence_snapshots_enforce_source_kind
before insert or update of service_run_id, client_id, tenant_id, source_kind
on public.evidence_snapshots
for each row execute function public.enforce_snapshot_source_kind();

revoke all on function public.enforce_service_run_source_kind() from public, anon, authenticated;
revoke all on function public.enforce_snapshot_source_kind() from public, anon, authenticated;

create table if not exists public.legacy_service_run_links (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.portal_tenants(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  service_run_id uuid not null references public.service_runs(id) on delete cascade,
  legacy_kind text not null check (legacy_kind in ('portal_audit_run', 'workspace_engine')),
  legacy_reference text not null,
  legacy_url text,
  migration_state text not null default 'linked' check (migration_state in ('linked', 'needs_review', 'rejected')),
  review_reason text,
  linked_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (tenant_id, legacy_kind, legacy_reference)
);

create table if not exists public.migration_review_queue (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.portal_tenants(id) on delete cascade,
  legacy_kind text not null check (legacy_kind in ('portal_audit_run', 'workspace_engine')),
  legacy_reference text not null,
  proposed_client_id uuid references public.clients(id) on delete set null,
  proposed_service_run_id uuid references public.service_runs(id) on delete set null,
  reason text not null,
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence) = 'object'),
  state text not null default 'open' check (state in ('open', 'linked', 'rejected')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (tenant_id, legacy_kind, legacy_reference)
);

create index if not exists legacy_service_run_links_run_idx
  on public.legacy_service_run_links (service_run_id);
create index if not exists migration_review_queue_open_idx
  on public.migration_review_queue (tenant_id, created_at desc)
  where state = 'open';

alter table public.legacy_service_run_links enable row level security;
alter table public.migration_review_queue enable row level security;

drop policy if exists legacy_service_run_links_staff on public.legacy_service_run_links;
create policy legacy_service_run_links_staff
on public.legacy_service_run_links
for all
to authenticated
using (
  exists (
    select 1
    from public.portal_tenant_memberships membership
    where membership.tenant_id = legacy_service_run_links.tenant_id
      and membership.user_id = (select auth.uid())
      and membership.role in ('admin', 'manager')
  )
)
with check (
  exists (
    select 1
    from public.portal_tenant_memberships membership
    where membership.tenant_id = legacy_service_run_links.tenant_id
      and membership.user_id = (select auth.uid())
      and membership.role in ('admin', 'manager')
  )
);

drop policy if exists migration_review_queue_staff on public.migration_review_queue;
create policy migration_review_queue_staff
on public.migration_review_queue
for all
to authenticated
using (
  exists (
    select 1
    from public.portal_tenant_memberships membership
    where membership.tenant_id = migration_review_queue.tenant_id
      and membership.user_id = (select auth.uid())
      and membership.role in ('admin', 'manager')
  )
)
with check (
  exists (
    select 1
    from public.portal_tenant_memberships membership
    where membership.tenant_id = migration_review_queue.tenant_id
      and membership.user_id = (select auth.uid())
      and membership.role in ('admin', 'manager')
  )
);

comment on column public.service_runs.source_kind is
  'Origin inherited from the client. Demo runs can never be mistaken for production runs.';
comment on column public.evidence_snapshots.source_kind is
  'Origin inherited from the service run and enforced by trigger.';
comment on table public.legacy_service_run_links is
  'Explicit mapping from a restorable legacy dashboard reference to its normalized durable run.';
comment on table public.migration_review_queue is
  'Admin review queue for ambiguous historical audit/workspace records; nothing is auto-promoted.';
