begin;

create or replace function public.recover_stale_service_run(
  p_run_id uuid,
  p_stale_after_seconds integer default 600
)
returns table (
  run_id uuid,
  previous_workflow_id text,
  previous_state text,
  recovered_at timestamptz
)
language plpgsql
security definer
set search_path = 'pg_catalog'
as $$
declare
  target_run public.service_runs%rowtype;
  recovery_time timestamptz := timezone('utc', now());
  stale_seconds integer := greatest(120, least(coalesce(p_stale_after_seconds, 600), 86400));
begin
  select *
  into target_run
  from public.service_runs
  where id = p_run_id
  for update;

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
    raise exception 'Only tenant staff can recover a service run.';
  end if;

  if target_run.state not in ('queued', 'validating', 'discovering', 'capturing', 'checking', 'reviewing', 'ready') then
    raise exception 'Only non-terminal service runs can be recovered.';
  end if;

  if target_run.updated_at > recovery_time - make_interval(secs => stale_seconds) then
    raise exception 'Service run is still active; wait for the stale window before recovery.';
  end if;

  update public.service_runs
  set
    state = 'blocked',
    blocker_code = 'workflow_stalled',
    blocker_summary = 'The background worker stopped reporting progress.',
    recovery_action = 'Resume from the last saved checkpoint.',
    checkpoint = coalesce(checkpoint, '{}'::jsonb) || jsonb_build_object(
      'recovery',
      jsonb_build_object(
        'previous_state', target_run.state,
        'previous_workflow_id', target_run.workflow_id,
        'detected_at', recovery_time
      )
    ),
    workflow_token_hash = null,
    workflow_token_expires_at = null,
    completed_at = recovery_time,
    updated_at = recovery_time
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
    'workflow.stalled',
    'blocked',
    'The background worker stopped reporting progress. Recovery is available.',
    target_run.completed_targets,
    target_run.total_targets,
    jsonb_build_object(
      'previous_state', target_run.state,
      'previous_workflow_id', target_run.workflow_id,
      'stale_after_seconds', stale_seconds,
      'recovery_action', 'Resume from the last saved checkpoint.'
    ),
    left(
      'workflow.stalled.' || coalesce(target_run.workflow_id, 'unassigned') || '.' ||
      extract(epoch from target_run.updated_at)::bigint,
      200
    )
  )
  on conflict (service_run_id, idempotency_key) do nothing;

  return query
  select target_run.id, target_run.workflow_id, target_run.state, recovery_time;
end;
$$;

revoke all on function public.recover_stale_service_run(uuid, integer) from public, anon;
grant execute on function public.recover_stale_service_run(uuid, integer) to authenticated, service_role;

commit;
