create table if not exists public.workflow_release_controls (
  tenant_id uuid primary key references public.portal_tenants(id) on delete cascade,
  new_workflows_enabled boolean not null default true,
  client_projection_source text not null default 'legacy'
    check (client_projection_source in ('legacy', 'shadow', 'normalized')),
  pilot_client_id uuid references public.clients(id) on delete set null,
  rollout_note text not null default '',
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.projection_shadow_comparisons (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.portal_tenants(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  service_run_id uuid not null references public.service_runs(id) on delete cascade,
  legacy_kind text not null check (legacy_kind in ('portal_audit_run', 'workspace_engine')),
  legacy_reference text not null,
  legacy_fingerprint text not null,
  normalized_fingerprint text not null,
  legacy_score numeric,
  normalized_score numeric,
  parity_state text not null check (parity_state in ('match', 'mismatch', 'not_comparable')),
  discrepancies jsonb not null default '[]'::jsonb check (jsonb_typeof(discrepancies) = 'array'),
  review_state text not null default 'pending' check (review_state in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (tenant_id, service_run_id, legacy_kind, legacy_reference)
);

create table if not exists public.workflow_alerts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.portal_tenants(id) on delete cascade,
  service_run_id uuid references public.service_runs(id) on delete cascade,
  alert_kind text not null,
  severity text not null default 'warning' check (severity in ('info', 'warning', 'critical')),
  summary text not null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  state text not null default 'open' check (state in ('open', 'acknowledged', 'resolved')),
  owner_user_id uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (tenant_id, service_run_id, alert_kind)
);

create index if not exists projection_shadow_pending_idx
  on public.projection_shadow_comparisons (tenant_id, created_at desc)
  where review_state = 'pending';
create index if not exists workflow_alerts_open_idx
  on public.workflow_alerts (tenant_id, severity, created_at desc)
  where state = 'open';

alter table public.workflow_release_controls enable row level security;
alter table public.projection_shadow_comparisons enable row level security;
alter table public.workflow_alerts enable row level security;

create or replace function public.is_tenant_staff(target_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.portal_tenant_memberships membership
    where membership.tenant_id = target_tenant_id
      and membership.user_id = (select auth.uid())
      and membership.role in ('admin', 'manager')
  );
$$;

revoke all on function public.is_tenant_staff(uuid) from public, anon;
grant execute on function public.is_tenant_staff(uuid) to authenticated, service_role;

drop policy if exists workflow_release_controls_staff on public.workflow_release_controls;
create policy workflow_release_controls_staff on public.workflow_release_controls
for all to authenticated
using (public.is_tenant_staff(tenant_id))
with check (public.is_tenant_staff(tenant_id));

drop policy if exists projection_shadow_comparisons_staff on public.projection_shadow_comparisons;
create policy projection_shadow_comparisons_staff on public.projection_shadow_comparisons
for all to authenticated
using (public.is_tenant_staff(tenant_id))
with check (public.is_tenant_staff(tenant_id));

drop policy if exists workflow_alerts_staff on public.workflow_alerts;
create policy workflow_alerts_staff on public.workflow_alerts
for all to authenticated
using (public.is_tenant_staff(tenant_id))
with check (public.is_tenant_staff(tenant_id));

create or replace function public.enforce_workflow_release_control()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  control public.workflow_release_controls%rowtype;
begin
  select *
  into control
  from public.workflow_release_controls
  where tenant_id = new.tenant_id;

  if control.tenant_id is not null
    and not control.new_workflows_enabled
    and new.source_kind <> 'demo'
  then
    raise exception 'New durable workflows are paused for this tenant. Existing evidence and history remain available.';
  end if;

  if control.pilot_client_id is not null
    and new.source_kind <> 'demo'
    and new.client_id <> control.pilot_client_id
  then
    raise exception 'This durable workflow rollout is limited to the configured pilot client.';
  end if;
  return new;
end;
$$;

drop trigger if exists service_runs_release_control on public.service_runs;
create trigger service_runs_release_control
before insert on public.service_runs
for each row execute function public.enforce_workflow_release_control();
revoke all on function public.enforce_workflow_release_control() from public, anon, authenticated;

create or replace function public.raise_workflow_alerts()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if new.state in ('blocked', 'failed', 'partial') then
    insert into public.workflow_alerts (
      tenant_id, service_run_id, alert_kind, severity, summary, metadata, owner_user_id
    )
    values (
      new.tenant_id,
      new.id,
      coalesce(new.blocker_code, 'workflow_' || new.state),
      case when new.state = 'failed' then 'critical' else 'warning' end,
      coalesce(new.blocker_summary, 'The workflow requires attention.'),
      jsonb_build_object('state', new.state, 'recovery_action', new.recovery_action),
      new.owner_user_id
    )
    on conflict (tenant_id, service_run_id, alert_kind)
    do update set
      severity = excluded.severity,
      summary = excluded.summary,
      metadata = excluded.metadata,
      state = 'open',
      owner_user_id = excluded.owner_user_id,
      resolved_at = null,
      updated_at = timezone('utc', now());
  end if;
  return new;
end;
$$;

drop trigger if exists service_runs_raise_alert on public.service_runs;
create trigger service_runs_raise_alert
after insert or update of state, blocker_code, blocker_summary
on public.service_runs
for each row execute function public.raise_workflow_alerts();
revoke all on function public.raise_workflow_alerts() from public, anon, authenticated;

create or replace function public.raise_low_coverage_alert()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if new.coverage_ratio < 0.7 and new.status in ('ready', 'partial') then
    insert into public.workflow_alerts (
      tenant_id, service_run_id, alert_kind, severity, summary, metadata
    )
    values (
      new.tenant_id,
      new.service_run_id,
      'low_evidence_coverage',
      'warning',
      'Evidence coverage is below the 70% release threshold.',
      jsonb_build_object('coverage_ratio', new.coverage_ratio, 'snapshot_id', new.id)
    )
    on conflict (tenant_id, service_run_id, alert_kind)
    do update set metadata = excluded.metadata, state = 'open', updated_at = timezone('utc', now());
  end if;
  return new;
end;
$$;

drop trigger if exists evidence_snapshots_raise_low_coverage_alert on public.evidence_snapshots;
create trigger evidence_snapshots_raise_low_coverage_alert
after insert or update of coverage_ratio, status
on public.evidence_snapshots
for each row execute function public.raise_low_coverage_alert();
revoke all on function public.raise_low_coverage_alert() from public, anon, authenticated;

create or replace view public.service_run_operational_metrics
with (security_invoker = true)
as
select
  run.tenant_id,
  run.id as service_run_id,
  run.client_id,
  run.service_kind,
  run.run_kind,
  run.state,
  extract(epoch from (coalesce(run.completed_at, timezone('utc', now())) - coalesce(run.started_at, run.created_at)))::bigint as duration_seconds,
  run.completed_targets,
  run.total_targets,
  case when run.total_targets > 0
    then round(run.completed_targets::numeric / run.total_targets::numeric, 4)
    else null
  end as target_completion_ratio,
  snapshot.coverage_ratio,
  agent.latency_ms as agent_latency_ms,
  agent.token_cost as agent_token_cost,
  coalesce(event_stats.retry_count, 0) as retry_count,
  coalesce(event_stats.failure_count, 0) as failure_count,
  run.blocker_code as failure_class,
  run.run_kind in ('targeted_recheck', 'lab_dependency_recheck') and run.state = 'current' and run.total_targets = 0 as no_op
from public.service_runs run
left join lateral (
  select evidence.coverage_ratio
  from public.evidence_snapshots evidence
  where evidence.service_run_id = run.id
  order by evidence.created_at desc
  limit 1
) snapshot on true
left join lateral (
  select agent_run.latency_ms, agent_run.token_cost
  from public.agent_runs agent_run
  where agent_run.service_run_id = run.id
  order by agent_run.created_at desc
  limit 1
) agent on true
left join lateral (
  select
    count(*) filter (where event.event_kind ilike '%retry%')::integer as retry_count,
    count(*) filter (where event.state in ('failed', 'blocked', 'partial'))::integer as failure_count
  from public.run_events event
  where event.service_run_id = run.id
) event_stats on true;

grant select on public.service_run_operational_metrics to authenticated, service_role;

comment on table public.workflow_release_controls is
  'Data-preserving rollout and rollback switch. Pausing blocks only new production workflows.';
comment on table public.projection_shadow_comparisons is
  'Reviewed old/new projection parity; normalized output cannot become client source of truth without approval.';
comment on table public.workflow_alerts is
  'Owned operational alerts for workflow failures, stalls, regressions, low coverage, and parity issues.';
