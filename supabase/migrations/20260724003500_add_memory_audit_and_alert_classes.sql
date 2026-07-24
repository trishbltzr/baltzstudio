begin;

create table if not exists public.agent_memory_revisions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.portal_tenants(id) on delete cascade,
  memory_id uuid not null references public.agent_memory(id) on delete cascade,
  revision integer not null check (revision > 0),
  change_kind text not null check (change_kind in ('created', 'updated', 'revoked')),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  change_summary text not null default '',
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (memory_id, revision)
);

create table if not exists public.agent_memory_usage_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.portal_tenants(id) on delete cascade,
  memory_id uuid not null references public.agent_memory(id) on delete cascade,
  agent_run_id uuid not null references public.agent_runs(id) on delete cascade,
  service_run_id uuid not null references public.service_runs(id) on delete cascade,
  stage_key text not null,
  used_at timestamptz not null default timezone('utc', now()),
  unique (memory_id, agent_run_id)
);

create index if not exists agent_memory_revisions_memory_idx
  on public.agent_memory_revisions (memory_id, revision desc);
create index if not exists agent_memory_usage_memory_idx
  on public.agent_memory_usage_events (memory_id, used_at desc);

alter table public.agent_memory_revisions enable row level security;
alter table public.agent_memory_usage_events enable row level security;

drop policy if exists agent_memory_revisions_staff on public.agent_memory_revisions;
create policy agent_memory_revisions_staff on public.agent_memory_revisions
for select to authenticated
using (public.is_tenant_staff(tenant_id));

drop policy if exists agent_memory_usage_staff on public.agent_memory_usage_events;
create policy agent_memory_usage_staff on public.agent_memory_usage_events
for select to authenticated
using (public.is_tenant_staff(tenant_id));

grant select on public.agent_memory_revisions to authenticated, service_role;
grant select on public.agent_memory_usage_events to authenticated, service_role;
grant insert on public.agent_memory_revisions, public.agent_memory_usage_events to service_role;

create or replace function public.record_agent_memory_revision()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  next_revision integer;
  revision_kind text;
begin
  select coalesce(max(revision), 0) + 1
  into next_revision
  from public.agent_memory_revisions
  where memory_id = new.id;

  revision_kind := case
    when tg_op = 'INSERT' then 'created'
    when old.revoked_at is null and new.revoked_at is not null then 'revoked'
    else 'updated'
  end;

  insert into public.agent_memory_revisions (
    tenant_id,
    memory_id,
    revision,
    change_kind,
    snapshot,
    change_summary,
    changed_by
  )
  values (
    new.tenant_id,
    new.id,
    next_revision,
    revision_kind,
    jsonb_build_object(
      'client_id', new.client_id,
      'service_kind', new.service_kind,
      'stage_key', new.stage_key,
      'memory_kind', new.memory_kind,
      'content', new.content,
      'source_kind', new.source_kind,
      'source_reference', new.source_reference,
      'confidence', new.confidence,
      'role_scope', new.role_scope,
      'access_policy', new.access_policy,
      'approved_by', new.approved_by,
      'approved_at', new.approved_at,
      'expires_at', new.expires_at,
      'revoked_at', new.revoked_at,
      'revoked_by', new.revoked_by
    ),
    case
      when revision_kind = 'created' then 'Approved memory created.'
      when revision_kind = 'revoked' then 'Approved memory revoked.'
      else 'Approved memory updated.'
    end,
    coalesce(new.revoked_by, (select auth.uid()))
  );
  return new;
end;
$$;

drop trigger if exists agent_memory_record_revision on public.agent_memory;
create trigger agent_memory_record_revision
after insert or update on public.agent_memory
for each row execute function public.record_agent_memory_revision();
revoke all on function public.record_agent_memory_revision() from public, anon, authenticated;

insert into public.agent_memory_revisions (
  tenant_id,
  memory_id,
  revision,
  change_kind,
  snapshot,
  change_summary,
  changed_by,
  created_at
)
select
  memory.tenant_id,
  memory.id,
  1,
  case when memory.revoked_at is null then 'created' else 'revoked' end,
  jsonb_build_object(
    'client_id', memory.client_id,
    'service_kind', memory.service_kind,
    'stage_key', memory.stage_key,
    'memory_kind', memory.memory_kind,
    'content', memory.content,
    'source_kind', memory.source_kind,
    'source_reference', memory.source_reference,
    'confidence', memory.confidence,
    'role_scope', memory.role_scope,
    'access_policy', memory.access_policy,
    'approved_by', memory.approved_by,
    'approved_at', memory.approved_at,
    'expires_at', memory.expires_at,
    'revoked_at', memory.revoked_at,
    'revoked_by', memory.revoked_by
  ),
  'Imported existing approved memory into revision history.',
  coalesce(memory.revoked_by, memory.approved_by),
  memory.created_at
from public.agent_memory memory
on conflict (memory_id, revision) do nothing;

create or replace function public.revoke_agent_memory(
  p_memory_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  target_memory public.agent_memory%rowtype;
  actor_id uuid := (select auth.uid());
begin
  select *
  into target_memory
  from public.agent_memory
  where id = p_memory_id
  for update;

  if target_memory.id is null then
    raise exception 'Memory record not found.';
  end if;
  if not public.is_tenant_staff(target_memory.tenant_id) then
    raise exception 'Only tenant staff can revoke approved memory.';
  end if;
  if target_memory.revoked_at is not null then
    return jsonb_build_object('id', target_memory.id, 'revoked_at', target_memory.revoked_at, 'already_revoked', true);
  end if;
  if length(trim(coalesce(p_reason, ''))) < 4 then
    raise exception 'A concise revocation reason is required.';
  end if;

  update public.agent_memory
  set revoked_at = timezone('utc', now()),
      revoked_by = actor_id
  where id = target_memory.id;

  update public.agent_memory_revisions
  set change_summary = left(trim(p_reason), 500)
  where memory_id = target_memory.id
    and revision = (
      select max(revision)
      from public.agent_memory_revisions
      where memory_id = target_memory.id
    );

  return jsonb_build_object('id', target_memory.id, 'revoked_at', timezone('utc', now()), 'already_revoked', false);
end;
$$;

revoke all on function public.revoke_agent_memory(uuid, text) from public, anon;
grant execute on function public.revoke_agent_memory(uuid, text) to authenticated, service_role;

create or replace function public.record_agent_memory_usage()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  maximum_items integer := 20;
begin
  select least(coalesce((definition.memory_policy->>'max_items')::integer, 20), 50)
  into maximum_items
  from public.agent_definitions definition
  where definition.id = new.agent_definition_id;

  insert into public.agent_memory_usage_events (
    tenant_id,
    memory_id,
    agent_run_id,
    service_run_id,
    stage_key
  )
  select
    new.tenant_id,
    selected_memory.id,
    new.id,
    new.service_run_id,
    left(coalesce(nullif(new.input_scope->>'stage_key', ''), 'reviewing'), 100)
  from (
    select memory.id
    from public.agent_memory memory
    where memory.tenant_id = new.tenant_id
      and memory.client_id = new.client_id
      and memory.service_kind in (coalesce(new.input_scope->>'service_kind', 'shared'), 'shared')
      and memory.stage_key in (
        left(coalesce(nullif(new.input_scope->>'stage_key', ''), 'reviewing'), 100),
        '*'
      )
      and memory.revoked_at is null
      and (memory.expires_at is null or memory.expires_at > timezone('utc', now()))
      and 'system' = any(memory.role_scope)
      and memory.access_policy in ('internal', 'agent')
    order by memory.approved_at desc
    limit maximum_items
  ) selected_memory
  on conflict (memory_id, agent_run_id) do nothing;

  return new;
end;
$$;

drop trigger if exists agent_runs_record_memory_usage on public.agent_runs;
create trigger agent_runs_record_memory_usage
after insert on public.agent_runs
for each row execute function public.record_agent_memory_usage();
revoke all on function public.record_agent_memory_usage() from public, anon, authenticated;

create or replace function public.raise_full_refresh_rate_alert()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  refresh_count integer;
begin
  if new.run_kind <> 'full_refresh' or new.source_kind = 'demo' then
    return new;
  end if;

  select count(*)
  into refresh_count
  from public.service_runs candidate
  where candidate.tenant_id = new.tenant_id
    and candidate.client_id = new.client_id
    and candidate.run_kind = 'full_refresh'
    and candidate.created_at >= timezone('utc', now()) - interval '24 hours';

  if refresh_count >= 3 then
    insert into public.workflow_alerts (
      tenant_id, service_run_id, alert_kind, severity, summary, metadata
    )
    values (
      new.tenant_id,
      new.id,
      'abnormal_full_refresh_rate',
      'warning',
      'This client started three or more full refreshes in 24 hours.',
      jsonb_build_object('refresh_count', refresh_count, 'window_hours', 24)
    )
    on conflict (tenant_id, service_run_id, alert_kind)
    do update set metadata = excluded.metadata, state = 'open', updated_at = timezone('utc', now());
  end if;
  return new;
end;
$$;

drop trigger if exists service_runs_full_refresh_rate_alert on public.service_runs;
create trigger service_runs_full_refresh_rate_alert
after insert on public.service_runs
for each row execute function public.raise_full_refresh_rate_alert();
revoke all on function public.raise_full_refresh_rate_alert() from public, anon, authenticated;

create or replace function public.raise_agent_operational_alert()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if new.state = 'failed' then
    insert into public.workflow_alerts (
      tenant_id, service_run_id, alert_kind, severity, summary, metadata
    )
    values (
      new.tenant_id,
      new.service_run_id,
      'agent_run_failed',
      'warning',
      'The governed agent run failed and needs review.',
      jsonb_build_object('agent_run_id', new.id, 'agent_version', new.agent_version)
    )
    on conflict (tenant_id, service_run_id, alert_kind)
    do update set metadata = excluded.metadata, state = 'open', updated_at = timezone('utc', now());
  end if;

  if new.token_cost is not null and new.token_cost > 5 then
    insert into public.workflow_alerts (
      tenant_id, service_run_id, alert_kind, severity, summary, metadata
    )
    values (
      new.tenant_id,
      new.service_run_id,
      'agent_cost_anomaly',
      'warning',
      'The governed agent run exceeded the configured five-dollar review threshold.',
      jsonb_build_object('agent_run_id', new.id, 'token_cost', new.token_cost, 'threshold', 5)
    )
    on conflict (tenant_id, service_run_id, alert_kind)
    do update set metadata = excluded.metadata, state = 'open', updated_at = timezone('utc', now());
  end if;
  return new;
end;
$$;

drop trigger if exists agent_runs_operational_alert on public.agent_runs;
create trigger agent_runs_operational_alert
after insert or update of state, token_cost on public.agent_runs
for each row execute function public.raise_agent_operational_alert();
revoke all on function public.raise_agent_operational_alert() from public, anon, authenticated;

create or replace function public.raise_agent_learning_alert()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  related_run_id uuid;
  recent_failures integer;
begin
  select run.service_run_id
  into related_run_id
  from public.agent_runs run
  where run.id = new.agent_run_id;

  if new.event_kind = 'policy_violation' then
    insert into public.workflow_alerts (
      tenant_id, service_run_id, alert_kind, severity, summary, metadata
    )
    values (
      new.tenant_id,
      related_run_id,
      'agent_policy_violation',
      'critical',
      'A governed agent policy or memory-isolation attempt requires review.',
      jsonb_build_object('learning_event_id', new.id, 'summary', new.summary)
    )
    on conflict (tenant_id, service_run_id, alert_kind)
    do update set metadata = excluded.metadata, state = 'open', updated_at = timezone('utc', now());
  end if;

  if new.event_kind = 'tool_failure' then
    select count(*)
    into recent_failures
    from public.agent_learning_events event
    where event.tenant_id = new.tenant_id
      and event.event_kind = 'tool_failure'
      and event.created_at >= timezone('utc', now()) - interval '1 hour';

    if recent_failures >= 3 then
      insert into public.workflow_alerts (
        tenant_id, service_run_id, alert_kind, severity, summary, metadata
      )
      values (
        new.tenant_id,
        related_run_id,
        'repeated_agent_tool_failure',
        'warning',
        'The governed agent recorded three or more tool failures in one hour.',
        jsonb_build_object('failure_count', recent_failures, 'window_minutes', 60)
      )
      on conflict (tenant_id, service_run_id, alert_kind)
      do update set metadata = excluded.metadata, state = 'open', updated_at = timezone('utc', now());
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists agent_learning_events_operational_alert on public.agent_learning_events;
create trigger agent_learning_events_operational_alert
after insert on public.agent_learning_events
for each row execute function public.raise_agent_learning_alert();
revoke all on function public.raise_agent_learning_alert() from public, anon, authenticated;

comment on table public.agent_memory_revisions is
  'Append-only review history for approved scoped memory.';
comment on table public.agent_memory_usage_events is
  'Auditable record of each governed agent run that consumed approved memory.';

commit;
