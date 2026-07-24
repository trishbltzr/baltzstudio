begin;

create temporary table workflow_test_results (
  check_name text primary key,
  passed boolean not null,
  detail jsonb not null default '{}'::jsonb
) on commit drop;

do $$
declare
  v_tenant_id uuid;
  v_user_id uuid := '00000000-0000-4000-8000-000000000812';
  v_client_id uuid;
  v_source_id uuid;
  v_baseline_id uuid;
  v_replayed_client_id uuid;
  v_replayed_source_id uuid;
  v_replayed_baseline_id uuid;
  v_created boolean;
  v_replayed_created boolean;
  v_dispatch_token text;
  v_targeted_id uuid;
  v_check_failed_id uuid;
  v_check_stale_id uuid;
  v_snapshot_id uuid;
  v_failed_evidence_id uuid;
  v_stale_evidence_id uuid;
  v_recheck_plan jsonb;
  v_recovery jsonb;
  v_checkpoint jsonb;
  v_handoff_id uuid;
  v_lab_run_id uuid;
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
  set new_workflows_enabled = true,
      rollout_stage = 'general',
      rollout_note = 'Transactional integration test; rolled back.',
      updated_by = v_user_id,
      updated_at = timezone('utc', now())
  where tenant_id = v_tenant_id;

  update public.check_definitions
  set lifecycle_state = 'archived',
      updated_at = timezone('utc', now())
  where tenant_id = v_tenant_id
    and service_kind = 'website'
    and lifecycle_state = 'published';

  select client_id, client_source_id, service_run_id, created
  into strict v_client_id, v_source_id, v_baseline_id, v_created
  from public.create_client_with_baseline(
    v_tenant_id,
    'integration-lifecycle-812',
    'integration-lifecycle-812',
    'Integration Lifecycle',
    'integration.example.com',
    'https://integration.example.com/',
    'https://integration.example.com/sitemap.xml',
    'website',
    'website-checkup',
    1,
    1
  );

  select client_id, client_source_id, service_run_id, created
  into strict v_replayed_client_id, v_replayed_source_id, v_replayed_baseline_id, v_replayed_created
  from public.create_client_with_baseline(
    v_tenant_id,
    'integration-lifecycle-812',
    'integration-lifecycle-812',
    'Integration Lifecycle',
    'integration.example.com',
    'https://integration.example.com/',
    'https://integration.example.com/sitemap.xml',
    'website',
    'website-checkup',
    1,
    1
  );

  if not v_created
    or v_replayed_created
    or v_client_id <> v_replayed_client_id
    or v_source_id <> v_replayed_source_id
    or v_baseline_id <> v_replayed_baseline_id then
    raise exception 'Client-created baseline transaction is not idempotent.';
  end if;

  update public.client_sources
  set validation_state = 'valid',
      validated_at = timezone('utc', now()),
      fingerprint = 'integration-source-v1'
  where id = v_source_id;

  insert into public.check_definitions (
    tenant_id, stable_key, service_kind, version, title, description,
    evaluation_kind, formula, required, freshness_seconds, lifecycle_state,
    change_summary, published_at, created_by
  )
  values (
    v_tenant_id, 'website.integration-failed', 'website', 1,
    'Integration failed check', 'Focused target-selection fixture.',
    'deterministic', '{"kind":"integration"}', true, 3600, 'published',
    'Integration test definition.', timezone('utc', now()), v_user_id
  )
  returning id into v_check_failed_id;
  insert into public.check_definitions (
    tenant_id, stable_key, service_kind, version, title, description,
    evaluation_kind, formula, required, freshness_seconds, lifecycle_state,
    change_summary, published_at, created_by
  )
  values (
    v_tenant_id, 'website.integration-stale', 'website', 1,
    'Integration stale check', 'Focused freshness-selection fixture.',
    'deterministic', '{"kind":"integration"}', true, 3600, 'published',
    'Integration test definition.', timezone('utc', now()), v_user_id
  )
  returning id into v_check_stale_id;

  insert into public.check_dependencies (
    tenant_id, check_definition_id, dependency_kind, dependency_key, required
  )
  values
    (v_tenant_id, v_check_failed_id, 'page', 'primary', true),
    (v_tenant_id, v_check_stale_id, 'sitemap', 'sitemap.xml', true);

  insert into public.evidence_snapshots (
    tenant_id, client_id, service_run_id, client_source_id, snapshot_kind,
    idempotency_key, status, fingerprint, provenance, coverage_ratio,
    captured_at, fresh_until
  )
  values (
    v_tenant_id, v_client_id, v_baseline_id, v_source_id, 'baseline',
    'integration-snapshot-812', 'ready', 'integration-snapshot',
    '{"source":"integration"}', 1, timezone('utc', now()) - interval '2 hours',
    timezone('utc', now()) + interval '1 day'
  )
  returning id into v_snapshot_id;

  insert into public.evidence_items (
    tenant_id, client_id, evidence_snapshot_id, source_kind, source_locator,
    fingerprint, status, payload, fresh_until
  )
  values (
    v_tenant_id, v_client_id, v_snapshot_id, 'rendered_page',
    'https://integration.example.com/', 'integration-failed-evidence',
    'verified', '{"kind":"page"}', timezone('utc', now()) + interval '1 day'
  )
  returning id into v_failed_evidence_id;
  insert into public.evidence_items (
    tenant_id, client_id, evidence_snapshot_id, source_kind, source_locator,
    fingerprint, status, payload, captured_at, fresh_until
  )
  values (
    v_tenant_id, v_client_id, v_snapshot_id, 'sitemap',
    'https://integration.example.com/sitemap.xml', 'integration-stale-evidence',
    'verified', '{"kind":"sitemap"}',
    timezone('utc', now()) - interval '2 hours',
    timezone('utc', now()) - interval '1 minute'
  )
  returning id into v_stale_evidence_id;

  insert into public.check_result_revisions (
    tenant_id, client_id, service_run_id, check_definition_id, revision,
    status, score, evidence_snapshot_id, evidence_item_ids, evidence_fingerprint,
    verifier_kind, verifier_id, confidence, rationale, idempotency_key
  )
  values
    (
      v_tenant_id, v_client_id, v_baseline_id, v_check_failed_id, 1,
      'failed', 0, v_snapshot_id, array[v_failed_evidence_id], 'integration-failed',
      'deterministic', 'integration', 1, 'Verified failure.', 'integration-failed-result-812'
    ),
    (
      v_tenant_id, v_client_id, v_baseline_id, v_check_stale_id, 1,
      'passed', 100, v_snapshot_id, array[v_stale_evidence_id], 'integration-stale',
      'deterministic', 'integration', 1, 'Previously passed evidence is expired.', 'integration-stale-result-812'
    );

  select dispatch_token into strict v_dispatch_token
  from public.prepare_service_run_dispatch(v_baseline_id);
  perform public.workflow_transition_service_run(
    v_baseline_id, v_dispatch_token, 'validating', 'test.validating',
    'Validating integration baseline.', 'test.validating', 0, 1,
    '{"phase":"validating"}'::jsonb
  );
  perform public.workflow_transition_service_run(
    v_baseline_id, v_dispatch_token, 'checking', 'test.checking',
    'Checking integration baseline.', 'test.checking', 0, 1,
    '{"phase":"checking"}'::jsonb
  );
  perform public.workflow_transition_service_run(
    v_baseline_id, v_dispatch_token, 'current', 'test.current',
    'Published integration baseline.', 'test.current', 1, 1,
    '{"phase":"current"}'::jsonb
  );

  if not exists (
    select 1 from public.service_runs
    where id = v_baseline_id and state = 'current' and completed_targets = total_targets
  ) then
    raise exception 'Baseline did not reach current.';
  end if;
  insert into workflow_test_results values (
    'client_to_baseline',
    true,
    jsonb_build_object('idempotent', true, 'state', 'current')
  );

  insert into public.service_runs (
    tenant_id, client_id, service_kind, run_kind, trigger_kind, state,
    idempotency_key, parent_run_id, baseline_run_id, source_version,
    playbook_key, playbook_version, checklist_version, recheck_scope,
    selected_check_keys, completed_targets, total_targets, workflow_id,
    checkpoint, started_at, updated_at
  )
  values (
    v_tenant_id, v_client_id, 'website', 'targeted_recheck', 'manual', 'queued',
    'integration-targeted-recovery-812', v_baseline_id, v_baseline_id, 1,
    'website-checkup', 1, 1, 'failed',
    '{}', 0, 0, null,
    '{"phase":"capturing","captured":[{"url":"https://integration.example.com/","ok":true}]}'::jsonb,
    timezone('utc', now()) - interval '20 minutes',
    timezone('utc', now()) - interval '20 minutes'
  )
  returning id into v_targeted_id;

  select dispatch_token into strict v_dispatch_token
  from public.prepare_service_run_dispatch(v_targeted_id);
  v_recheck_plan := public.workflow_recheck_plan(v_targeted_id, v_dispatch_token, '[]'::jsonb);
  if (v_recheck_plan->>'targetCount')::integer <> 1
    or v_recheck_plan#>>'{targets,0,stableKey}' <> 'website.integration-failed'
    or v_recheck_plan#>>'{targets,0,reason}' <> 'failed'
    or v_recheck_plan#>>'{targets,0,dependencyKinds,0}' <> 'page' then
    raise exception 'Failed-only target selection or dependency expansion is incorrect: %', v_recheck_plan;
  end if;

  update public.service_runs set recheck_scope = 'all_actionable' where id = v_targeted_id;
  v_recheck_plan := public.workflow_recheck_plan(v_targeted_id, v_dispatch_token, '[]'::jsonb);
  if (v_recheck_plan->>'targetCount')::integer <> 2
    or not (v_recheck_plan->'targets' @> '[{"stableKey":"website.integration-stale","reason":"evidence_stale"}]'::jsonb) then
    raise exception 'Freshness-based target selection is incorrect: %', v_recheck_plan;
  end if;
  insert into workflow_test_results values (
    'target_selection_and_freshness',
    true,
    jsonb_build_object('failed_scope_targets', 1, 'all_actionable_targets', 2, 'stale_evidence_selected', true)
  );

  update public.service_runs
  set state = 'checking',
      workflow_id = 'integration-orphaned-workflow',
      workflow_token_hash = null,
      workflow_token_expires_at = null,
      checkpoint = '{"phase":"capturing","captured":[{"url":"https://integration.example.com/","ok":true}]}'::jsonb,
      started_at = timezone('utc', now()) - interval '20 minutes',
      updated_at = timezone('utc', now()) - interval '20 minutes'
  where id = v_targeted_id;

  v_recovery := public.recover_stale_service_run(v_targeted_id, 120);
  select checkpoint into strict v_checkpoint
  from public.service_runs where id = v_targeted_id;
  if v_recovery->>'previous_state' <> 'checking'
    or v_checkpoint->>'phase' <> 'capturing'
    or jsonb_array_length(v_checkpoint->'captured') <> 1
    or v_checkpoint->'recovery' is null then
    raise exception 'Targeted recovery did not preserve the checkpoint.';
  end if;

  perform dispatch_token from public.prepare_service_run_dispatch(v_targeted_id);
  if not exists (
    select 1 from public.service_runs
    where id = v_targeted_id
      and state = 'queued'
      and blocker_code is null
      and checkpoint->>'phase' = 'capturing'
  ) then
    raise exception 'Recovered targeted run was not resumable.';
  end if;
  insert into workflow_test_results values (
    'targeted_recovery',
    true,
    jsonb_build_object('checkpoint_preserved', true, 'resume_state', 'queued')
  );

  insert into public.service_handoffs (
    tenant_id, client_id, source_service_run_id, destination_service_kind,
    state, projection_version, payload, idempotency_key
  )
  values (
    v_tenant_id, v_client_id, v_baseline_id, 'website',
    'awaiting_approval', 1,
    jsonb_build_object('source_run_id', v_baseline_id, 'checkup_version', 1),
    'integration-handoff-812'
  )
  returning id into v_handoff_id;

  update public.service_handoffs
  set state = 'approved', approved_by = v_user_id, approved_at = timezone('utc', now())
  where id = v_handoff_id;

  insert into public.service_runs (
    tenant_id, client_id, service_kind, run_kind, trigger_kind, state,
    idempotency_key, parent_run_id, baseline_run_id, source_version,
    playbook_key, playbook_version, checklist_version, selected_check_keys,
    completed_targets, total_targets, checkpoint
  )
  values (
    v_tenant_id, v_client_id, 'website', 'lab_dependency_recheck', 'lab_request', 'queued',
    'integration-lab-run-812', v_baseline_id, v_baseline_id, 1,
    'website-lab', 1, 1, '{}', 0, 0,
    jsonb_build_object('approved_checkup_run_id', v_baseline_id, 'handoff_id', v_handoff_id)
  )
  returning id into v_lab_run_id;

  update public.service_handoffs
  set state = 'accepted', accepted_run_id = v_lab_run_id, updated_at = timezone('utc', now())
  where id = v_handoff_id;

  if not exists (
    select 1 from public.service_handoffs
    where id = v_handoff_id
      and state = 'accepted'
      and approved_by = v_user_id
      and accepted_run_id = v_lab_run_id
      and payload->>'source_run_id' = v_baseline_id::text
  ) then
    raise exception 'Approval resume or Checkup-to-Lab handoff failed.';
  end if;
  insert into workflow_test_results values (
    'approval_and_handoff',
    true,
    jsonb_build_object('approval_pause', 'awaiting_approval', 'resume', 'accepted', 'exact_source_run', true)
  );
end
$$;

select jsonb_object_agg(check_name, detail order by check_name) as integration_proof
from workflow_test_results
where passed;

rollback;
