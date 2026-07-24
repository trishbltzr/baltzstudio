begin;

create temporary table workflow_pilot_test_results (
  check_name text primary key,
  passed boolean not null
) on commit drop;

do $$
declare
  v_tenant_id uuid;
  v_user_id uuid := '00000000-0000-4000-8000-000000000914';
  v_client_id uuid;
  v_source_id uuid;
  v_run_id uuid;
  v_created boolean;
  v_replay_client_id uuid;
  v_replay_source_id uuid;
  v_replay_run_id uuid;
  v_replay_created boolean;
  v_blocked boolean := false;
  v_collision_blocked boolean := false;
  v_other_client_id uuid := gen_random_uuid();
  v_manager_id uuid := '00000000-0000-4000-8000-000000000915';
  v_manager_blocked boolean := false;
begin
  select id into strict v_tenant_id
  from public.portal_tenants
  order by created_at
  limit 1;

  insert into auth.users (id, is_sso_user, is_anonymous)
  values (v_user_id, false, false);
  insert into public.portal_tenant_memberships (tenant_id, user_id, role)
  values (v_tenant_id, v_user_id, 'admin');
  perform set_config('request.jwt.claim.sub', v_user_id::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_user_id, 'role', 'authenticated')::text, true);

  update public.workflow_release_controls
  set new_workflows_enabled = false,
      rollout_stage = 'internal',
      client_projection_source = 'legacy',
      pilot_client_id = null,
      rollout_note = 'Transactional pre-pilot state.'
  where tenant_id = v_tenant_id;

  select client_id, client_source_id, service_run_id, created
  into strict v_client_id, v_source_id, v_run_id, v_created
  from public.enroll_pilot_client_with_baseline(
    v_tenant_id,
    'pilot-enrollment-914',
    'pilot-enrollment-914',
    'Pilot Enrollment',
    'pilot-enrollment.example.com',
    'https://pilot-enrollment.example.com',
    'https://pilot-enrollment.example.com/sitemap.xml',
    'website',
    'pilot@example.com',
    'Transactional production pilot enrollment.'
  );

  if not v_created then raise exception 'Pilot client was not created.'; end if;
  if not exists (
    select 1 from public.workflow_release_controls control
    where control.tenant_id = v_tenant_id
      and control.new_workflows_enabled
      and control.rollout_stage = 'pilot'
      and control.client_projection_source = 'legacy'
      and control.pilot_client_id = v_client_id
  ) then
    raise exception 'Pilot release control was not updated atomically.';
  end if;
  if not exists (
    select 1 from public.service_runs run
    where run.id = v_run_id
      and run.client_id = v_client_id
      and run.run_kind = 'baseline'
      and run.source_kind = 'production'
  ) then
    raise exception 'Pilot baseline was not created.';
  end if;
  insert into workflow_pilot_test_results values ('atomic enrollment', true);

  select client_id, client_source_id, service_run_id, created
  into strict v_replay_client_id, v_replay_source_id, v_replay_run_id, v_replay_created
  from public.enroll_pilot_client_with_baseline(
    v_tenant_id,
    'pilot-enrollment-914',
    'pilot-enrollment-914',
    'Pilot Enrollment',
    'pilot-enrollment.example.com',
    'https://pilot-enrollment.example.com',
    'https://pilot-enrollment.example.com/sitemap.xml',
    'website',
    'pilot@example.com',
    'Transactional production pilot enrollment replay.'
  );
  if v_replay_created
    or v_replay_client_id <> v_client_id
    or v_replay_source_id <> v_source_id
    or v_replay_run_id <> v_run_id then
    raise exception 'Pilot enrollment replay was not idempotent.';
  end if;
  insert into workflow_pilot_test_results values ('idempotent replay', true);

  begin
    perform *
    from public.enroll_pilot_client_with_baseline(
      v_tenant_id,
      'pilot-enrollment-collision-914',
      'pilot-enrollment-914',
      'Pilot Enrollment',
      'different.example.com',
      'https://different.example.com',
      null,
      'website',
      'pilot@example.com',
      'Transactional collision test.'
    );
  exception when unique_violation then
    v_collision_blocked := true;
  end;
  if not v_collision_blocked then raise exception 'Slug/domain collision was not rejected.'; end if;
  insert into workflow_pilot_test_results values ('collision rejection', true);

  insert into public.clients (id, tenant_id, slug, name, source_kind)
  values (
    v_other_client_id,
    v_tenant_id,
    'pilot-other-' || left(replace(v_other_client_id::text, '-', ''), 8),
    'Pilot Other',
    'production'
  );
  begin
    insert into public.service_runs (
      tenant_id, client_id, service_kind, run_kind, trigger_kind, state,
      idempotency_key, source_version, playbook_key, playbook_version,
      checklist_version, source_kind, recheck_scope
    ) values (
      v_tenant_id, v_other_client_id, 'website', 'baseline', 'manual', 'queued',
      'pilot-other-blocked-' || v_other_client_id, 1, 'website-checkup', 1,
      1, 'production', 'all_actionable'
    );
  exception when others then
    if sqlerrm like 'This durable workflow rollout is limited%' then
      v_blocked := true;
    else
      raise;
    end if;
  end;
  if not v_blocked then raise exception 'Pilot isolation did not block another client.'; end if;
  insert into workflow_pilot_test_results values ('pilot isolation', true);

  insert into auth.users (id, is_sso_user, is_anonymous)
  values (v_manager_id, false, false);
  insert into public.portal_tenant_memberships (tenant_id, user_id, role)
  values (v_tenant_id, v_manager_id, 'manager');
  perform set_config('request.jwt.claim.sub', v_manager_id::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_manager_id, 'role', 'authenticated')::text, true);
  begin
    perform *
    from public.enroll_pilot_client_with_baseline(
      v_tenant_id,
      'pilot-manager-915',
      'pilot-manager-915',
      'Pilot Manager',
      'pilot-manager.example.com',
      'https://pilot-manager.example.com',
      null,
      'website',
      'manager@example.com',
      'Transactional manager permission test.'
    );
  exception when insufficient_privilege then
    v_manager_blocked := true;
  end;
  if not v_manager_blocked then raise exception 'Manager could enroll a production pilot.'; end if;
  insert into workflow_pilot_test_results values ('admin-only enrollment', true);
end;
$$;

select check_name, passed
from workflow_pilot_test_results
order by check_name;

rollback;
