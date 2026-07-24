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
set search_path = pg_catalog, extensions
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
  if target_run.state = 'cancelled' then return false; end if;

  allowed := case target_run.state
    when 'queued' then p_state in ('queued', 'validating', 'cancelled', 'failed')
    when 'validating' then p_state in ('validating', 'discovering', 'checking', 'blocked', 'failed', 'cancelled')
    when 'discovering' then p_state in ('discovering', 'capturing', 'partial', 'blocked', 'failed', 'cancelled')
    when 'capturing' then p_state in ('capturing', 'checking', 'partial', 'blocked', 'failed', 'cancelled')
    when 'checking' then p_state in ('checking', 'reviewing', 'current', 'partial', 'blocked', 'failed', 'cancelled')
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
  set state = p_state,
      workflow_id = coalesce(p_workflow_id, workflow_id),
      completed_targets = next_completed,
      total_targets = next_total,
      checkpoint = coalesce(p_checkpoint, checkpoint),
      blocker_code = case when p_state in ('partial', 'blocked', 'failed') then p_blocker_code else null end,
      blocker_summary = case when p_state in ('partial', 'blocked', 'failed') then p_blocker_summary else null end,
      recovery_action = case when p_state in ('partial', 'blocked', 'failed') then p_recovery_action else null end,
      started_at = case when p_state = 'validating' then coalesce(started_at, timezone('utc', now())) else started_at end,
      completed_at = case when p_state in ('current', 'partial', 'blocked', 'failed', 'cancelled') then timezone('utc', now()) else null end,
      cancelled_at = case when p_state = 'cancelled' then timezone('utc', now()) else cancelled_at end,
      updated_at = timezone('utc', now())
  where id = target_run.id;

  insert into public.run_events (
    tenant_id, service_run_id, event_kind, state, message,
    completed_targets, total_targets, metadata, idempotency_key
  )
  values (
    target_run.tenant_id, target_run.id, p_event_kind, p_state,
    left(coalesce(p_message, ''), 500), next_completed, next_total,
    jsonb_build_object('blocker_code', p_blocker_code, 'recovery_action', p_recovery_action),
    left(p_event_key, 200)
  )
  on conflict (service_run_id, idempotency_key) do nothing;

  return true;
end;
$$;

comment on function public.workflow_transition_service_run(uuid, text, text, text, text, text, integer, integer, jsonb, text, text, text, text) is
  'Capability-scoped durable state transition. Selective no-op runs may move Validating → Checking → Current without capture.';
