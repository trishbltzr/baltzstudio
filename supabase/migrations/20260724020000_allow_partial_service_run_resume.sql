begin;

create or replace function public.prepare_service_run_dispatch(p_run_id uuid)
returns table (
  dispatch_token text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = 'pg_catalog', 'extensions'
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

  if target_run.state not in ('queued', 'blocked', 'failed', 'partial') then
    raise exception 'Only queued, blocked, failed, or partial service runs can be dispatched.';
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

revoke all on function public.prepare_service_run_dispatch(uuid) from public, anon;
grant execute on function public.prepare_service_run_dispatch(uuid) to authenticated, service_role;

commit;
