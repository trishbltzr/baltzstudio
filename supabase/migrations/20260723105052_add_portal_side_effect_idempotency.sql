begin;

create table public.process_exceptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.portal_tenants(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  service_run_id uuid not null references public.service_runs(id) on delete cascade,
  exception_kind text not null check (
    exception_kind in (
      'missing_access',
      'missing_assets',
      'failed_collection',
      'failed_generation',
      'unsupported_evidence',
      'client_inactivity',
      'rejected_approval',
      'scope_change',
      'reopened_stage',
      'failed_handoff',
      'overdue_work',
      'regression',
      'policy'
    )
  ),
  state text not null default 'open' check (state in ('open', 'retrying', 'resolved', 'cancelled')),
  summary text not null,
  owner_kind text not null check (owner_kind in ('studio', 'manager', 'client', 'system')),
  owner_user_id uuid references auth.users(id) on delete set null,
  recovery_action text not null,
  retry_policy jsonb not null default '{}'::jsonb check (jsonb_typeof(retry_policy) = 'object'),
  idempotency_key text not null,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (tenant_id, idempotency_key),
  constraint process_exceptions_resolution_contract check (
    (state = 'resolved' and resolved_at is not null)
    or (state <> 'resolved' and resolved_at is null)
  )
);

create table public.task_import_batches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.portal_tenants(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  service_run_id uuid references public.service_runs(id) on delete set null,
  source_kind text not null check (source_kind in ('checkup', 'lab', 'csv', 'manual')),
  source_reference text not null,
  state text not null default 'pending' check (state in ('pending', 'validated', 'imported', 'partial', 'failed', 'cancelled')),
  row_count integer not null default 0 check (row_count >= 0),
  imported_count integer not null default 0 check (imported_count >= 0 and imported_count <= row_count),
  error_summary text,
  idempotency_key text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  unique (tenant_id, idempotency_key)
);

create table public.service_handoffs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.portal_tenants(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  source_service_run_id uuid not null references public.service_runs(id) on delete restrict,
  destination_service_kind text not null check (destination_service_kind in ('funnel', 'website', 'social', 'seo')),
  state text not null default 'draft' check (state in ('draft', 'awaiting_approval', 'approved', 'accepted', 'rejected', 'cancelled')),
  projection_version integer not null check (projection_version > 0),
  evidence_snapshot_ids uuid[] not null default '{}',
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  idempotency_key text not null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  accepted_run_id uuid references public.service_runs(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (tenant_id, idempotency_key),
  constraint service_handoffs_approval_contract check (
    state not in ('approved', 'accepted')
    or (approved_by is not null and approved_at is not null)
  )
);

create index process_exceptions_client_state_idx
  on public.process_exceptions (client_id, state, created_at desc);
create index process_exceptions_run_idx
  on public.process_exceptions (service_run_id);
create index process_exceptions_owner_idx
  on public.process_exceptions (owner_user_id)
  where owner_user_id is not null;
create index process_exceptions_resolved_by_idx
  on public.process_exceptions (resolved_by)
  where resolved_by is not null;
create index task_import_batches_client_idx
  on public.task_import_batches (client_id, created_at desc);
create index task_import_batches_run_idx
  on public.task_import_batches (service_run_id)
  where service_run_id is not null;
create index task_import_batches_created_by_idx
  on public.task_import_batches (created_by)
  where created_by is not null;
create index service_handoffs_client_state_idx
  on public.service_handoffs (client_id, state, created_at desc);
create index service_handoffs_source_run_idx
  on public.service_handoffs (source_service_run_id);
create index service_handoffs_accepted_run_idx
  on public.service_handoffs (accepted_run_id)
  where accepted_run_id is not null;
create index service_handoffs_approved_by_idx
  on public.service_handoffs (approved_by)
  where approved_by is not null;

alter table public.process_exceptions enable row level security;
alter table public.task_import_batches enable row level security;
alter table public.service_handoffs enable row level security;

grant select, insert, update on public.process_exceptions to authenticated, service_role;
grant select, insert, update on public.task_import_batches to authenticated, service_role;
grant select, insert, update on public.service_handoffs to authenticated, service_role;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'process_exceptions',
    'task_import_batches',
    'service_handoffs'
  ]
  loop
    execute format(
      'create policy %I_select_member on public.%I for select to authenticated using (
        exists (
          select 1 from public.portal_tenant_memberships membership
          where membership.tenant_id = %I.tenant_id
            and membership.user_id = (select auth.uid())
            and (
              membership.client_id is null
              or membership.client_id::text = (to_jsonb(%I) ->> ''client_id'')
            )
        )
      )',
      table_name,
      table_name,
      table_name,
      table_name
    );
    execute format(
      'create policy %I_insert_staff on public.%I for insert to authenticated with check (
        exists (
          select 1 from public.portal_tenant_memberships membership
          where membership.tenant_id = %I.tenant_id
            and membership.user_id = (select auth.uid())
            and membership.role in (''admin'', ''manager'')
        )
      )',
      table_name,
      table_name,
      table_name
    );
    execute format(
      'create policy %I_update_staff on public.%I for update to authenticated using (
        exists (
          select 1 from public.portal_tenant_memberships membership
          where membership.tenant_id = %I.tenant_id
            and membership.user_id = (select auth.uid())
            and membership.role in (''admin'', ''manager'')
        )
      ) with check (
        exists (
          select 1 from public.portal_tenant_memberships membership
          where membership.tenant_id = %I.tenant_id
            and membership.user_id = (select auth.uid())
            and membership.role in (''admin'', ''manager'')
        )
      )',
      table_name,
      table_name,
      table_name,
      table_name
    );
  end loop;
end
$$;

revoke all on public.process_exceptions from anon;
revoke all on public.task_import_batches from anon;
revoke all on public.service_handoffs from anon;

comment on table public.process_exceptions is
  'Owned recovery contract for blocked, partial, failed, regressed, and overdue process states.';
comment on table public.task_import_batches is
  'Idempotent import boundary for Checkup, Lab, CSV, and manual task sources.';
comment on table public.service_handoffs is
  'Versioned approved Checkup-to-Lab or service-to-service transfer; payload creation is idempotent.';

commit;
