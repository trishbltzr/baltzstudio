begin;

alter table public.service_runs
  add column workflow_token_hash bytea,
  add column workflow_token_expires_at timestamptz;

comment on column public.service_runs.workflow_token_hash is
  'SHA-256 digest of the short-lived capability token used only by a durable workflow run.';

create or replace function public.prepare_service_run_dispatch(p_run_id uuid)
returns table (
  dispatch_token text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_run public.service_runs%rowtype;
  token_value text;
  token_expiry timestamptz := timezone('utc', now()) + interval '6 hours';
begin
  select *
  into target_run
  from public.service_runs
  where id = p_run_id;

  if target_run.id is null then
    raise exception 'Service run not found.';
  end if;

  if not exists (
    select 1
    from public.portal_tenant_memberships membership
    where membership.tenant_id = target_run.tenant_id
      and membership.user_id = (select auth.uid())
      and membership.role in ('admin', 'manager')
  ) then
    raise exception 'Only tenant staff can dispatch a service run.';
  end if;

  if target_run.state not in ('queued', 'blocked', 'failed') then
    raise exception 'Only queued, blocked, or failed service runs can be dispatched.';
  end if;

  token_value := encode(gen_random_bytes(32), 'hex');

  update public.service_runs
  set
    workflow_token_hash = digest(token_value, 'sha256'),
    workflow_token_expires_at = token_expiry,
    state = 'queued',
    blocker_code = null,
    blocker_summary = null,
    recovery_action = null,
    completed_at = null,
    cancelled_at = null,
    updated_at = timezone('utc', now())
  where id = target_run.id;

  insert into public.run_events (
    tenant_id,
    service_run_id,
    event_kind,
    state,
    message,
    completed_targets,
    total_targets,
    metadata,
    idempotency_key
  )
  values (
    target_run.tenant_id,
    target_run.id,
    'workflow.dispatch_prepared',
    'queued',
    'Durable workflow dispatch prepared.',
    target_run.completed_targets,
    target_run.total_targets,
    jsonb_build_object('expires_at', token_expiry),
    'workflow.dispatch_prepared'
  )
  on conflict (service_run_id, idempotency_key) do nothing;

  return query select token_value, token_expiry;
end;
$$;

create or replace function public.workflow_service_run_context(
  p_run_id uuid,
  p_dispatch_token text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'run_id', service_run.id,
    'tenant_id', service_run.tenant_id,
    'client_id', service_run.client_id,
    'service_kind', service_run.service_kind,
    'run_kind', service_run.run_kind,
    'state', service_run.state,
    'source_version', service_run.source_version,
    'selected_check_keys', service_run.selected_check_keys,
    'completed_targets', service_run.completed_targets,
    'total_targets', service_run.total_targets,
    'source_id', source.id,
    'source_url', source.source_url,
    'sitemap_url', source.sitemap_url,
    'normalized_domain', source.normalized_domain
  )
  into result
  from public.service_runs service_run
  join public.client_sources source
    on source.client_id = service_run.client_id
    and source.version = service_run.source_version
    and source.source_kind = 'domain'
  where service_run.id = p_run_id
    and service_run.workflow_token_hash = digest(p_dispatch_token, 'sha256')
    and service_run.workflow_token_expires_at > timezone('utc', now());

  if result is null then
    raise exception 'Workflow capability is invalid or expired.';
  end if;

  return result;
end;
$$;

create or replace function public.workflow_transition_service_run(
  p_run_id uuid,
  p_dispatch_token text,
  p_state text,
  p_event_kind text,
  p_message text,
  p_event_key text,
  p_completed_targets integer default null,
  p_total_targets integer default null,
  p_checkpoint jsonb default null,
  p_workflow_id text default null,
  p_blocker_code text default null,
  p_blocker_summary text default null,
  p_recovery_action text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_run public.service_runs%rowtype;
  allowed boolean := false;
  next_completed integer;
  next_total integer;
begin
  select *
  into target_run
  from public.service_runs
  where id = p_run_id
    and workflow_token_hash = digest(p_dispatch_token, 'sha256')
    and workflow_token_expires_at > timezone('utc', now())
  for update;

  if target_run.id is null then
    raise exception 'Workflow capability is invalid or expired.';
  end if;

  if target_run.state = 'cancelled' then
    return false;
  end if;

  allowed := case target_run.state
    when 'queued' then p_state in ('queued', 'validating', 'cancelled', 'failed')
    when 'validating' then p_state in ('validating', 'discovering', 'blocked', 'failed', 'cancelled')
    when 'discovering' then p_state in ('discovering', 'capturing', 'partial', 'blocked', 'failed', 'cancelled')
    when 'capturing' then p_state in ('capturing', 'checking', 'partial', 'blocked', 'failed', 'cancelled')
    when 'checking' then p_state in ('checking', 'reviewing', 'partial', 'blocked', 'failed', 'cancelled')
    when 'reviewing' then p_state in ('reviewing', 'ready', 'partial', 'blocked', 'failed', 'cancelled')
    when 'ready' then p_state in ('ready', 'current', 'cancelled')
    when 'partial' then p_state in ('partial', 'cancelled')
    when 'blocked' then p_state in ('blocked', 'cancelled')
    when 'failed' then p_state in ('failed', 'cancelled')
    else false
  end;

  if not allowed then
    raise exception 'Invalid service run transition: % -> %', target_run.state, p_state;
  end if;

  if p_state in ('partial', 'blocked', 'failed')
    and (p_blocker_code is null or p_blocker_summary is null or p_recovery_action is null) then
    raise exception 'Partial, blocked, and failed states require a blocker and recovery action.';
  end if;

  next_total := greatest(coalesce(p_total_targets, target_run.total_targets), 0);
  next_completed := greatest(coalesce(p_completed_targets, target_run.completed_targets), 0);
  if next_completed > next_total then
    raise exception 'Completed targets cannot exceed total targets.';
  end if;

  update public.service_runs
  set
    state = p_state,
    workflow_id = coalesce(p_workflow_id, workflow_id),
    completed_targets = next_completed,
    total_targets = next_total,
    checkpoint = coalesce(p_checkpoint, checkpoint),
    blocker_code = case when p_state in ('partial', 'blocked', 'failed') then p_blocker_code else null end,
    blocker_summary = case when p_state in ('partial', 'blocked', 'failed') then p_blocker_summary else null end,
    recovery_action = case when p_state in ('partial', 'blocked', 'failed') then p_recovery_action else null end,
    started_at = case
      when p_state = 'validating' then coalesce(started_at, timezone('utc', now()))
      else started_at
    end,
    completed_at = case
      when p_state in ('current', 'partial', 'blocked', 'failed', 'cancelled') then timezone('utc', now())
      else null
    end,
    cancelled_at = case when p_state = 'cancelled' then timezone('utc', now()) else cancelled_at end,
    updated_at = timezone('utc', now())
  where id = target_run.id;

  insert into public.run_events (
    tenant_id,
    service_run_id,
    event_kind,
    state,
    message,
    completed_targets,
    total_targets,
    metadata,
    idempotency_key
  )
  values (
    target_run.tenant_id,
    target_run.id,
    p_event_kind,
    p_state,
    left(coalesce(p_message, ''), 500),
    next_completed,
    next_total,
    jsonb_build_object(
      'blocker_code', p_blocker_code,
      'recovery_action', p_recovery_action
    ),
    left(p_event_key, 200)
  )
  on conflict (service_run_id, idempotency_key) do nothing;

  return true;
end;
$$;

create or replace function public.workflow_begin_evidence_snapshot(
  p_run_id uuid,
  p_dispatch_token text,
  p_idempotency_key text,
  p_provenance jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_run public.service_runs%rowtype;
  source_id uuid;
  snapshot_id uuid;
begin
  select *
  into target_run
  from public.service_runs
  where id = p_run_id
    and workflow_token_hash = digest(p_dispatch_token, 'sha256')
    and workflow_token_expires_at > timezone('utc', now());

  if target_run.id is null then
    raise exception 'Workflow capability is invalid or expired.';
  end if;

  select id
  into source_id
  from public.client_sources
  where client_id = target_run.client_id
    and version = target_run.source_version
    and source_kind = 'domain';

  insert into public.evidence_snapshots (
    tenant_id,
    client_id,
    service_run_id,
    client_source_id,
    snapshot_kind,
    idempotency_key,
    status,
    provenance
  )
  values (
    target_run.tenant_id,
    target_run.client_id,
    target_run.id,
    source_id,
    case target_run.run_kind
      when 'baseline' then 'baseline'
      when 'full_refresh' then 'full_refresh'
      else 'targeted'
    end,
    left(p_idempotency_key, 200),
    'capturing',
    coalesce(p_provenance, '{}'::jsonb)
  )
  on conflict (tenant_id, idempotency_key)
  do update set provenance = public.evidence_snapshots.provenance || excluded.provenance
  returning id into snapshot_id;

  return snapshot_id;
end;
$$;

create or replace function public.workflow_store_evidence_item(
  p_run_id uuid,
  p_dispatch_token text,
  p_snapshot_id uuid,
  p_source_kind text,
  p_source_locator text,
  p_device_kind text,
  p_fingerprint text,
  p_status text,
  p_payload jsonb,
  p_fresh_until timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_run public.service_runs%rowtype;
  item_id uuid;
begin
  select *
  into target_run
  from public.service_runs
  where id = p_run_id
    and workflow_token_hash = digest(p_dispatch_token, 'sha256')
    and workflow_token_expires_at > timezone('utc', now());

  if target_run.id is null then
    raise exception 'Workflow capability is invalid or expired.';
  end if;

  if not exists (
    select 1
    from public.evidence_snapshots snapshot
    where snapshot.id = p_snapshot_id
      and snapshot.service_run_id = target_run.id
  ) then
    raise exception 'Evidence snapshot does not belong to this service run.';
  end if;

  insert into public.evidence_items (
    tenant_id,
    client_id,
    evidence_snapshot_id,
    source_kind,
    source_locator,
    device_kind,
    fingerprint,
    status,
    payload,
    fresh_until,
    retention_until
  )
  values (
    target_run.tenant_id,
    target_run.client_id,
    p_snapshot_id,
    left(p_source_kind, 80),
    left(p_source_locator, 2_000),
    p_device_kind,
    left(p_fingerprint, 128),
    p_status,
    coalesce(p_payload, '{}'::jsonb),
    p_fresh_until,
    timezone('utc', now()) + interval '2 years'
  )
  on conflict (evidence_snapshot_id, source_kind, source_locator, fingerprint)
  do update set
    status = excluded.status,
    payload = excluded.payload,
    captured_at = timezone('utc', now()),
    fresh_until = excluded.fresh_until
  returning id into item_id;

  return item_id;
end;
$$;

create or replace function public.workflow_finalize_evidence_snapshot(
  p_run_id uuid,
  p_dispatch_token text,
  p_snapshot_id uuid,
  p_status text,
  p_coverage_ratio numeric,
  p_fingerprint text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.service_runs service_run
    join public.evidence_snapshots snapshot on snapshot.service_run_id = service_run.id
    where service_run.id = p_run_id
      and snapshot.id = p_snapshot_id
      and service_run.workflow_token_hash = digest(p_dispatch_token, 'sha256')
      and service_run.workflow_token_expires_at > timezone('utc', now())
  ) then
    raise exception 'Workflow capability is invalid, expired, or does not own this snapshot.';
  end if;

  update public.evidence_snapshots
  set
    status = p_status,
    coverage_ratio = least(greatest(p_coverage_ratio, 0), 1),
    fingerprint = left(p_fingerprint, 128),
    captured_at = timezone('utc', now()),
    fresh_until = timezone('utc', now()) + interval '7 days',
    retention_until = timezone('utc', now()) + interval '2 years'
  where id = p_snapshot_id;

  return true;
end;
$$;

revoke all on function public.prepare_service_run_dispatch(uuid) from public, anon;
grant execute on function public.prepare_service_run_dispatch(uuid) to authenticated, service_role;

revoke all on function public.workflow_service_run_context(uuid, text) from public;
revoke all on function public.workflow_transition_service_run(uuid, text, text, text, text, text, integer, integer, jsonb, text, text, text, text) from public;
revoke all on function public.workflow_begin_evidence_snapshot(uuid, text, text, jsonb) from public;
revoke all on function public.workflow_store_evidence_item(uuid, text, uuid, text, text, text, text, text, jsonb, timestamptz) from public;
revoke all on function public.workflow_finalize_evidence_snapshot(uuid, text, uuid, text, numeric, text) from public;

grant execute on function public.workflow_service_run_context(uuid, text) to anon, authenticated, service_role;
grant execute on function public.workflow_transition_service_run(uuid, text, text, text, text, text, integer, integer, jsonb, text, text, text, text) to anon, authenticated, service_role;
grant execute on function public.workflow_begin_evidence_snapshot(uuid, text, text, jsonb) to anon, authenticated, service_role;
grant execute on function public.workflow_store_evidence_item(uuid, text, uuid, text, text, text, text, text, jsonb, timestamptz) to anon, authenticated, service_role;
grant execute on function public.workflow_finalize_evidence_snapshot(uuid, text, uuid, text, numeric, text) to anon, authenticated, service_role;

commit;
