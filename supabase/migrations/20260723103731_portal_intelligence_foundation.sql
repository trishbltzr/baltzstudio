begin;

create extension if not exists pgcrypto;

create table public.portal_tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.portal_tenant_memberships (
  tenant_id uuid not null references public.portal_tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'manager', 'client')),
  client_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (tenant_id, user_id)
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.portal_tenants(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(trim(name)) between 1 and 180),
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  primary_contact_email text,
  source_kind text not null default 'production' check (source_kind in ('production', 'demo', 'imported')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz,
  unique (tenant_id, slug)
);

alter table public.portal_tenant_memberships
  add constraint portal_tenant_memberships_client_id_fkey
  foreign key (client_id) references public.clients(id) on delete set null;

create table public.client_sources (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.portal_tenants(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  version integer not null check (version > 0),
  source_kind text not null check (
    source_kind in ('domain', 'sitemap', 'brand_asset', 'guideline', 'social_profile', 'analytics', 'search_console', 'manual')
  ),
  normalized_domain text,
  source_url text,
  sitemap_url text,
  asset_reference text,
  connected_data_reference text,
  secret_ref text check (secret_ref is null or secret_ref ~ '^vault://[A-Za-z0-9_./:-]+$'),
  validation_state text not null default 'pending' check (
    validation_state in ('pending', 'valid', 'invalid', 'blocked', 'expired')
  ),
  validation_message text,
  fingerprint text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  supersedes_source_id uuid references public.client_sources(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  validated_at timestamptz,
  retention_until timestamptz,
  unique (client_id, version, source_kind)
);

create unique index client_sources_one_domain_version_idx
  on public.client_sources (client_id, version)
  where source_kind = 'domain';

create table public.check_definitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.portal_tenants(id) on delete cascade,
  stable_key text not null check (stable_key ~ '^[a-z0-9]+(?:[._-][a-z0-9]+)*$'),
  service_kind text not null check (service_kind in ('brand', 'website', 'seo', 'funnel', 'social')),
  version integer not null check (version > 0),
  title text not null,
  description text not null default '',
  evaluation_kind text not null check (evaluation_kind in ('deterministic', 'qualitative', 'connected_data', 'human')),
  formula jsonb not null default '{}'::jsonb check (jsonb_typeof(formula) = 'object'),
  required boolean not null default true,
  freshness_seconds integer check (freshness_seconds is null or freshness_seconds > 0),
  lifecycle_state text not null default 'draft' check (lifecycle_state in ('draft', 'published', 'archived')),
  change_summary text not null default '',
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (tenant_id, stable_key, version)
);

create table public.check_dependencies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.portal_tenants(id) on delete cascade,
  check_definition_id uuid not null references public.check_definitions(id) on delete cascade,
  dependency_kind text not null check (
    dependency_kind in ('domain', 'page', 'sitemap', 'robots', 'lighthouse_mobile', 'lighthouse_desktop', 'asset', 'analytics', 'search_console', 'manual')
  ),
  dependency_key text not null,
  required boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  unique (check_definition_id, dependency_kind, dependency_key)
);

create table public.service_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.portal_tenants(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  service_kind text not null check (service_kind in ('brand', 'website', 'seo', 'funnel', 'social')),
  run_kind text not null check (run_kind in ('baseline', 'targeted_recheck', 'full_refresh', 'lab_dependency_recheck')),
  trigger_kind text not null check (
    trigger_kind in ('client_created', 'scheduled_sentinel', 'manual', 'source_changed', 'checklist_changed', 'regression', 'recovery', 'lab_request')
  ),
  state text not null default 'queued' check (
    state in ('queued', 'validating', 'discovering', 'capturing', 'checking', 'reviewing', 'ready', 'current', 'partial', 'blocked', 'failed', 'cancelled')
  ),
  idempotency_key text not null,
  parent_run_id uuid references public.service_runs(id) on delete set null,
  baseline_run_id uuid references public.service_runs(id) on delete set null,
  source_version integer not null check (source_version > 0),
  playbook_key text not null,
  playbook_version integer not null check (playbook_version > 0),
  checklist_version integer not null check (checklist_version > 0),
  agent_definition_id uuid,
  agent_version integer,
  workflow_id text,
  owner_user_id uuid references auth.users(id) on delete set null,
  selected_check_keys text[] not null default '{}',
  completed_targets integer not null default 0 check (completed_targets >= 0),
  total_targets integer not null default 0 check (total_targets >= 0),
  blocker_code text,
  blocker_summary text,
  recovery_action text,
  checkpoint jsonb not null default '{}'::jsonb check (jsonb_typeof(checkpoint) = 'object'),
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (tenant_id, idempotency_key),
  constraint service_runs_progress_bounds check (completed_targets <= total_targets),
  constraint service_runs_blocker_contract check (
    state not in ('partial', 'blocked', 'failed') or (
      blocker_code is not null and blocker_summary is not null and recovery_action is not null
    )
  )
);

create table public.evidence_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.portal_tenants(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  service_run_id uuid not null references public.service_runs(id) on delete cascade,
  client_source_id uuid not null references public.client_sources(id) on delete restrict,
  snapshot_kind text not null check (snapshot_kind in ('baseline', 'targeted', 'sentinel', 'full_refresh')),
  idempotency_key text not null,
  status text not null default 'capturing' check (status in ('capturing', 'ready', 'partial', 'blocked', 'failed')),
  fingerprint text,
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  coverage_ratio numeric(5,4) not null default 0 check (coverage_ratio between 0 and 1),
  captured_at timestamptz,
  fresh_until timestamptz,
  retention_until timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (tenant_id, idempotency_key)
);

create table public.evidence_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.portal_tenants(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  evidence_snapshot_id uuid not null references public.evidence_snapshots(id) on delete cascade,
  source_kind text not null,
  source_locator text not null,
  device_kind text check (device_kind is null or device_kind in ('desktop', 'mobile')),
  fingerprint text not null,
  status text not null check (status in ('verified', 'partial', 'unsupported', 'failed')),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  payload_reference text,
  captured_at timestamptz not null default timezone('utc', now()),
  fresh_until timestamptz,
  retention_until timestamptz,
  unique (evidence_snapshot_id, source_kind, source_locator, fingerprint)
);

create table public.check_result_revisions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.portal_tenants(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  service_run_id uuid not null references public.service_runs(id) on delete restrict,
  check_definition_id uuid not null references public.check_definitions(id) on delete restrict,
  revision integer not null check (revision > 0),
  status text not null check (status in ('passed', 'failed', 'unverified', 'not_applicable')),
  score numeric(5,2) check (score is null or score between 0 and 100),
  evidence_snapshot_id uuid references public.evidence_snapshots(id) on delete restrict,
  evidence_item_ids uuid[] not null default '{}',
  evidence_fingerprint text,
  verifier_kind text not null check (verifier_kind in ('deterministic', 'agent', 'human')),
  verifier_id text,
  confidence numeric(5,4) check (confidence is null or confidence between 0 and 1),
  limitations text[] not null default '{}',
  rationale text not null default '',
  idempotency_key text not null,
  supersedes_revision_id uuid references public.check_result_revisions(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  unique (client_id, check_definition_id, revision),
  unique (tenant_id, idempotency_key)
);

create table public.run_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.portal_tenants(id) on delete cascade,
  service_run_id uuid not null references public.service_runs(id) on delete cascade,
  event_kind text not null,
  state text,
  message text not null default '',
  completed_targets integer check (completed_targets is null or completed_targets >= 0),
  total_targets integer check (total_targets is null or total_targets >= 0),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  idempotency_key text not null,
  occurred_at timestamptz not null default timezone('utc', now()),
  unique (service_run_id, idempotency_key)
);

create table public.agent_definitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.portal_tenants(id) on delete cascade,
  stable_key text not null check (stable_key ~ '^[a-z0-9]+(?:[._-][a-z0-9]+)*$'),
  version integer not null check (version > 0),
  lifecycle_state text not null default 'draft' check (lifecycle_state in ('draft', 'published', 'archived')),
  service_kind text not null check (service_kind in ('brand', 'website', 'seo', 'funnel', 'social', 'shared')),
  name text not null,
  instructions text not null,
  allowed_tools text[] not null default '{}',
  output_schema jsonb not null default '{}'::jsonb check (jsonb_typeof(output_schema) = 'object'),
  memory_policy jsonb not null default '{}'::jsonb check (jsonb_typeof(memory_policy) = 'object'),
  approval_requirements jsonb not null default '{}'::jsonb check (jsonb_typeof(approval_requirements) = 'object'),
  playbook_key text not null,
  playbook_version integer not null check (playbook_version > 0),
  change_summary text not null default '',
  owner_user_id uuid references auth.users(id) on delete set null,
  last_reviewed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (tenant_id, stable_key, version)
);

alter table public.service_runs
  add constraint service_runs_agent_definition_id_fkey
  foreign key (agent_definition_id) references public.agent_definitions(id) on delete set null;

create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.portal_tenants(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  service_run_id uuid not null references public.service_runs(id) on delete cascade,
  agent_definition_id uuid not null references public.agent_definitions(id) on delete restrict,
  agent_version integer not null check (agent_version > 0),
  state text not null check (state in ('queued', 'running', 'awaiting_review', 'completed', 'partial', 'blocked', 'failed', 'cancelled')),
  input_scope jsonb not null default '{}'::jsonb check (jsonb_typeof(input_scope) = 'object'),
  output jsonb not null default '{}'::jsonb check (jsonb_typeof(output) = 'object'),
  tool_trace jsonb not null default '[]'::jsonb check (jsonb_typeof(tool_trace) = 'array'),
  correction_summary text,
  token_cost numeric(12,6) check (token_cost is null or token_cost >= 0),
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  idempotency_key text not null,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (tenant_id, idempotency_key)
);

create table public.agent_memory (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.portal_tenants(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  service_kind text not null check (service_kind in ('brand', 'website', 'seo', 'funnel', 'social', 'shared')),
  stage_key text not null default '*',
  memory_kind text not null check (memory_kind in ('fact', 'preference', 'decision', 'terminology', 'scope', 'source_reference')),
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  source_kind text not null check (source_kind in ('human', 'trusted_integration', 'reviewed_agent_output')),
  source_reference text not null,
  confidence numeric(5,4) not null check (confidence between 0 and 1),
  approved_by uuid not null references auth.users(id) on delete restrict,
  approved_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.agent_learning_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.portal_tenants(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  agent_definition_id uuid not null references public.agent_definitions(id) on delete restrict,
  agent_run_id uuid references public.agent_runs(id) on delete set null,
  event_kind text not null check (event_kind in ('human_correction', 'eval_failure', 'tool_failure', 'policy_violation', 'accepted_improvement')),
  summary text not null,
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence) = 'object'),
  proposed_change jsonb not null default '{}'::jsonb check (jsonb_typeof(proposed_change) = 'object'),
  review_state text not null default 'pending' check (review_state in ('pending', 'accepted', 'rejected')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index clients_tenant_status_idx on public.clients (tenant_id, status);
create index client_sources_client_created_idx on public.client_sources (client_id, created_at desc);
create index evidence_snapshots_client_created_idx on public.evidence_snapshots (client_id, created_at desc);
create index evidence_items_snapshot_idx on public.evidence_items (evidence_snapshot_id);
create index check_definitions_service_state_idx on public.check_definitions (tenant_id, service_kind, lifecycle_state);
create index check_result_revisions_current_idx on public.check_result_revisions (client_id, check_definition_id, revision desc);
create index service_runs_client_created_idx on public.service_runs (client_id, created_at desc);
create index run_events_run_time_idx on public.run_events (service_run_id, occurred_at);
create index agent_memory_scope_idx on public.agent_memory (tenant_id, client_id, service_kind, stage_key)
  where revoked_at is null;
create index agent_learning_events_review_idx on public.agent_learning_events (tenant_id, review_state, created_at);

alter table public.portal_tenants enable row level security;
alter table public.portal_tenant_memberships enable row level security;
alter table public.clients enable row level security;
alter table public.client_sources enable row level security;
alter table public.evidence_snapshots enable row level security;
alter table public.evidence_items enable row level security;
alter table public.check_definitions enable row level security;
alter table public.check_dependencies enable row level security;
alter table public.check_result_revisions enable row level security;
alter table public.service_runs enable row level security;
alter table public.run_events enable row level security;
alter table public.agent_definitions enable row level security;
alter table public.agent_runs enable row level security;
alter table public.agent_memory enable row level security;
alter table public.agent_learning_events enable row level security;

grant usage on schema public to authenticated, service_role;
grant select, insert, update on public.portal_tenants to authenticated, service_role;
grant select on public.portal_tenant_memberships to authenticated;
grant select, insert, update, delete on public.portal_tenant_memberships to service_role;
grant select, insert, update on public.clients to authenticated, service_role;
grant select, insert on public.client_sources to authenticated, service_role;
grant select, insert on public.evidence_snapshots to authenticated, service_role;
grant select, insert on public.evidence_items to authenticated, service_role;
grant select, insert, update on public.check_definitions to authenticated, service_role;
grant select, insert on public.check_dependencies to authenticated, service_role;
grant select, insert on public.check_result_revisions to authenticated, service_role;
grant select, insert, update on public.service_runs to authenticated, service_role;
grant select, insert on public.run_events to authenticated, service_role;
grant select, insert, update on public.agent_definitions to authenticated, service_role;
grant select, insert, update on public.agent_runs to authenticated, service_role;
grant select, insert, update on public.agent_memory to authenticated, service_role;
grant select, insert, update on public.agent_learning_events to authenticated, service_role;

create policy portal_tenant_memberships_select_own
on public.portal_tenant_memberships for select to authenticated
using ((select auth.uid()) = user_id);

create policy portal_tenants_select_member
on public.portal_tenants for select to authenticated
using (
  exists (
    select 1 from public.portal_tenant_memberships membership
    where membership.tenant_id = portal_tenants.id
      and membership.user_id = (select auth.uid())
  )
);

create policy portal_tenants_update_admin
on public.portal_tenants for update to authenticated
using (
  exists (
    select 1 from public.portal_tenant_memberships membership
    where membership.tenant_id = portal_tenants.id
      and membership.user_id = (select auth.uid())
      and membership.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.portal_tenant_memberships membership
    where membership.tenant_id = portal_tenants.id
      and membership.user_id = (select auth.uid())
      and membership.role = 'admin'
  )
);

create policy clients_select_member
on public.clients for select to authenticated
using (
  exists (
    select 1 from public.portal_tenant_memberships membership
    where membership.tenant_id = clients.tenant_id
      and membership.user_id = (select auth.uid())
      and (membership.client_id is null or membership.client_id = clients.id)
  )
);

create policy clients_write_staff
on public.clients for all to authenticated
using (
  exists (
    select 1 from public.portal_tenant_memberships membership
    where membership.tenant_id = clients.tenant_id
      and membership.user_id = (select auth.uid())
      and membership.role in ('admin', 'manager')
  )
)
with check (
  exists (
    select 1 from public.portal_tenant_memberships membership
    where membership.tenant_id = clients.tenant_id
      and membership.user_id = (select auth.uid())
      and membership.role in ('admin', 'manager')
  )
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'client_sources',
    'evidence_snapshots',
    'evidence_items',
    'check_definitions',
    'check_dependencies',
    'check_result_revisions',
    'service_runs',
    'run_events',
    'agent_definitions',
    'agent_runs',
    'agent_memory',
    'agent_learning_events'
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
              or (to_jsonb(%I) ->> ''client_id'') is null
              or membership.client_id::text = (to_jsonb(%I) ->> ''client_id'')
            )
        )
      )',
      table_name,
      table_name,
      table_name,
      table_name,
      table_name
    );

    execute format(
      'create policy %I_write_staff on public.%I for all to authenticated using (
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

revoke all on public.portal_tenants from anon;
revoke all on public.portal_tenant_memberships from anon;
revoke all on public.clients from anon;
revoke all on public.client_sources from anon;
revoke all on public.evidence_snapshots from anon;
revoke all on public.evidence_items from anon;
revoke all on public.check_definitions from anon;
revoke all on public.check_dependencies from anon;
revoke all on public.check_result_revisions from anon;
revoke all on public.service_runs from anon;
revoke all on public.run_events from anon;
revoke all on public.agent_definitions from anon;
revoke all on public.agent_runs from anon;
revoke all on public.agent_memory from anon;
revoke all on public.agent_learning_events from anon;

comment on column public.client_sources.secret_ref is
  'Opaque reference to a credential stored outside public tables. Raw secrets are prohibited.';
comment on table public.evidence_snapshots is
  'Immutable evidence capture header. Corrections create a new snapshot.';
comment on table public.check_result_revisions is
  'Append-only per-check result history. Current Checkup state is projected from the latest applicable revision.';
comment on table public.agent_memory is
  'Approved client-scoped memory only; generated reasoning and unrestricted transcripts are prohibited.';

commit;
