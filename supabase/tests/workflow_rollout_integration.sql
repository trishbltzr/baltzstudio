begin;

create temporary table workflow_rollout_test_results (
  stage text primary key,
  expected_access text not null,
  passed boolean not null
) on commit drop;

do $$
declare
  v_tenant_id uuid;
  v_client_a uuid := gen_random_uuid();
  v_client_b uuid := gen_random_uuid();
  v_blocked boolean;
begin
  select id into strict v_tenant_id
  from public.portal_tenants
  order by created_at
  limit 1;

  insert into public.clients (id, tenant_id, slug, name, source_kind)
  values
    (v_client_a, v_tenant_id, 'rollout-test-a-' || left(replace(v_client_a::text, '-', ''), 8), 'Rollout Test A', 'production'),
    (v_client_b, v_tenant_id, 'rollout-test-b-' || left(replace(v_client_b::text, '-', ''), 8), 'Rollout Test B', 'production');

  update public.workflow_release_controls
  set new_workflows_enabled = false,
      rollout_stage = 'internal',
      pilot_client_id = null,
      rollout_note = 'Transactional internal-stage test.'
  where tenant_id = v_tenant_id;

  v_blocked := false;
  begin
    insert into public.service_runs (
      tenant_id, client_id, service_kind, run_kind, trigger_kind, state,
      idempotency_key, source_version, playbook_key, playbook_version,
      checklist_version, source_kind, recheck_scope
    ) values (
      v_tenant_id, v_client_a, 'website', 'baseline', 'manual', 'queued',
      'rollout-internal-' || v_client_a, 1, 'website-checkup', 1,
      1, 'production', 'all_actionable'
    );
  exception when others then
    if sqlerrm like 'New production workflows are paused%' then
      v_blocked := true;
    else
      raise;
    end if;
  end;
  if not v_blocked then raise exception 'Internal stage did not block production.'; end if;
  insert into workflow_rollout_test_results values ('internal', 'none', true);

  update public.workflow_release_controls
  set new_workflows_enabled = true,
      rollout_stage = 'pilot',
      pilot_client_id = v_client_a,
      rollout_note = 'Transactional pilot-stage test.'
  where tenant_id = v_tenant_id;

  insert into public.service_runs (
    tenant_id, client_id, service_kind, run_kind, trigger_kind, state,
    idempotency_key, source_version, playbook_key, playbook_version,
    checklist_version, source_kind, recheck_scope
  ) values (
    v_tenant_id, v_client_a, 'website', 'baseline', 'manual', 'queued',
    'rollout-pilot-allowed-' || v_client_a, 1, 'website-checkup', 1,
    1, 'production', 'all_actionable'
  );
  v_blocked := false;
  begin
    insert into public.service_runs (
      tenant_id, client_id, service_kind, run_kind, trigger_kind, state,
      idempotency_key, source_version, playbook_key, playbook_version,
      checklist_version, source_kind, recheck_scope
    ) values (
      v_tenant_id, v_client_b, 'website', 'baseline', 'manual', 'queued',
      'rollout-pilot-blocked-' || v_client_b, 1, 'website-checkup', 1,
      1, 'production', 'all_actionable'
    );
  exception when others then
    if sqlerrm like 'This durable workflow rollout is limited%' then
      v_blocked := true;
    else
      raise;
    end if;
  end;
  if not v_blocked then raise exception 'Pilot stage did not restrict the second client.'; end if;
  insert into workflow_rollout_test_results values ('pilot', 'configured client only', true);

  update public.workflow_release_controls
  set rollout_stage = 'cohort',
      pilot_client_id = null,
      rollout_note = 'Transactional cohort-stage test.'
  where tenant_id = v_tenant_id;
  insert into public.workflow_rollout_clients (tenant_id, client_id, enabled)
  values (v_tenant_id, v_client_b, true);

  insert into public.service_runs (
    tenant_id, client_id, service_kind, run_kind, trigger_kind, state,
    idempotency_key, source_version, playbook_key, playbook_version,
    checklist_version, source_kind, recheck_scope
  ) values (
    v_tenant_id, v_client_b, 'website', 'baseline', 'manual', 'queued',
    'rollout-cohort-allowed-' || v_client_b, 1, 'website-checkup', 1,
    1, 'production', 'all_actionable'
  );
  v_blocked := false;
  begin
    insert into public.service_runs (
      tenant_id, client_id, service_kind, run_kind, trigger_kind, state,
      idempotency_key, source_version, playbook_key, playbook_version,
      checklist_version, source_kind, recheck_scope
    ) values (
      v_tenant_id, v_client_a, 'website', 'baseline', 'manual', 'queued',
      'rollout-cohort-blocked-' || v_client_a, 1, 'website-checkup', 1,
      1, 'production', 'all_actionable'
    );
  exception when others then
    if sqlerrm like 'This client is not enabled%' then
      v_blocked := true;
    else
      raise;
    end if;
  end;
  if not v_blocked then raise exception 'Cohort stage did not enforce its allowlist.'; end if;
  insert into workflow_rollout_test_results values ('cohort', 'enabled allowlist only', true);

  update public.workflow_release_controls
  set rollout_stage = 'general',
      rollout_note = 'Transactional general-stage test.'
  where tenant_id = v_tenant_id;
  insert into public.service_runs (
    tenant_id, client_id, service_kind, run_kind, trigger_kind, state,
    idempotency_key, source_version, playbook_key, playbook_version,
    checklist_version, source_kind, recheck_scope
  ) values (
    v_tenant_id, v_client_a, 'website', 'baseline', 'manual', 'queued',
    'rollout-general-' || v_client_a, 1, 'website-checkup', 1,
    1, 'production', 'all_actionable'
  );
  insert into workflow_rollout_test_results values ('general', 'all production clients', true);
end;
$$;

select stage, expected_access, passed
from workflow_rollout_test_results
order by case stage
  when 'internal' then 1
  when 'pilot' then 2
  when 'cohort' then 3
  else 4
end;

rollback;
