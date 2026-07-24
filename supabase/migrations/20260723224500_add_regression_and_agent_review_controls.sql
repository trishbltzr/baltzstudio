begin;

create or replace function public.raise_check_regression_exception()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  previous_status text;
  definition_key text;
begin
  if new.status <> 'failed' or new.supersedes_revision_id is null then
    return new;
  end if;

  select revision.status
  into previous_status
  from public.check_result_revisions revision
  where revision.id = new.supersedes_revision_id;

  if previous_status <> 'passed' then
    return new;
  end if;

  select definition.stable_key
  into definition_key
  from public.check_definitions definition
  where definition.id = new.check_definition_id;

  insert into public.process_exceptions (
    tenant_id,
    client_id,
    service_run_id,
    exception_kind,
    state,
    summary,
    owner_kind,
    recovery_action,
    retry_policy,
    idempotency_key
  )
  values (
    new.tenant_id,
    new.client_id,
    new.service_run_id,
    'regression',
    'open',
    left('Regression detected: ' || coalesce(definition_key, 'check') || ' now fails.', 300),
    'manager',
    'Review the changed evidence, assign an owner, and confirm the recovery task.',
    jsonb_build_object(
      'check_definition_id', new.check_definition_id,
      'stable_key', definition_key,
      'previous_revision_id', new.supersedes_revision_id,
      'failed_revision_id', new.id,
      'automatic_resolution', false
    ),
    left(new.service_run_id || ':regression:' || new.check_definition_id || ':' || new.revision, 200)
  )
  on conflict (tenant_id, idempotency_key) do nothing;

  insert into public.run_events (
    tenant_id,
    service_run_id,
    event_kind,
    state,
    message,
    metadata,
    idempotency_key
  )
  values (
    new.tenant_id,
    new.service_run_id,
    'check.regression_detected',
    'ready',
    'A previously passing check now fails.',
    jsonb_build_object(
      'stable_key', definition_key,
      'previous_revision_id', new.supersedes_revision_id,
      'failed_revision_id', new.id
    ),
    left('check.regression:' || new.check_definition_id || ':' || new.revision, 200)
  )
  on conflict (service_run_id, idempotency_key) do nothing;

  return new;
end;
$$;

drop trigger if exists check_result_revision_regression
  on public.check_result_revisions;
create trigger check_result_revision_regression
after insert on public.check_result_revisions
for each row execute function public.raise_check_regression_exception();

create or replace function public.review_agent_finding(
  p_exception_id uuid,
  p_action text,
  p_status text default null,
  p_rationale text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  actor_id uuid := auth.uid();
  target_exception public.process_exceptions%rowtype;
  target_run public.service_runs%rowtype;
  target_agent_run public.agent_runs%rowtype;
  target_definition public.check_definitions%rowtype;
  finding jsonb;
  v_stable_key text;
  reviewed_status text;
  snapshot_id uuid;
  evidence_ids uuid[];
  next_revision integer;
  revision_id uuid;
  remaining_reviews integer;
begin
  if actor_id is null then
    raise exception 'Sign in to review an agent finding.';
  end if;
  if p_action not in ('approve', 'correct', 'reject') then
    raise exception 'Review action must be approve, correct, or reject.';
  end if;

  select *
  into target_exception
  from public.process_exceptions exception_row
  where exception_row.id = p_exception_id
  for update;

  if target_exception.id is null then
    raise exception 'Review item not found.';
  end if;
  if target_exception.state <> 'open' then
    raise exception 'Review item is no longer open.';
  end if;
  if not exists (
    select 1
    from public.portal_tenant_memberships membership
    where membership.tenant_id = target_exception.tenant_id
      and membership.user_id = actor_id
      and membership.role in ('admin', 'manager')
  ) then
    raise exception 'Only an admin or manager can review agent findings.';
  end if;

  select *
  into target_run
  from public.service_runs service_run
  where service_run.id = target_exception.service_run_id;

  select *
  into target_agent_run
  from public.agent_runs agent_run
  where agent_run.id = nullif(target_exception.retry_policy->>'agent_run_id', '')::uuid
    and agent_run.service_run_id = target_run.id
    and agent_run.client_id = target_run.client_id
  for update;

  if target_agent_run.id is null then
    raise exception 'The governed agent run for this review could not be found.';
  end if;

  v_stable_key := target_exception.retry_policy->>'stable_key';
  select value
  into finding
  from jsonb_array_elements(coalesce(target_agent_run.output->'findings', '[]'::jsonb))
  where value->>'stableKey' = v_stable_key
  limit 1;

  if finding is null then
    raise exception 'The governed finding for this review could not be found.';
  end if;

  reviewed_status := case
    when p_action = 'approve' then finding->>'status'
    when p_action = 'correct' then p_status
    else 'unverified'
  end;
  if reviewed_status not in ('passed', 'failed', 'unverified', 'not_applicable') then
    raise exception 'A corrected review must include a valid status.';
  end if;

  select *
  into target_definition
  from public.check_definitions definition
  where definition.tenant_id = target_run.tenant_id
    and definition.service_kind = target_run.service_kind
    and definition.version = target_run.checklist_version
    and definition.stable_key = v_stable_key
    and definition.lifecycle_state = 'published';
  if target_definition.id is null then
    raise exception 'Published check definition not found for this review.';
  end if;

  snapshot_id := nullif(target_agent_run.input_scope->>'snapshot_id', '')::uuid;
  select coalesce(array_agg(value::text::uuid), '{}'::uuid[])
  into evidence_ids
  from jsonb_array_elements_text(coalesce(finding->'evidenceItemIds', '[]'::jsonb));

  if exists (
    select 1
    from unnest(evidence_ids) evidence_id
    where not exists (
      select 1
      from public.evidence_items item
      where item.id = evidence_id
        and item.evidence_snapshot_id = snapshot_id
        and item.client_id = target_run.client_id
    )
  ) then
    raise exception 'A cited evidence item is outside this review scope.';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(target_run.client_id::text || ':' || target_definition.id::text, 0)
  );
  select coalesce(max(revision), 0) + 1
  into next_revision
  from public.check_result_revisions
  where client_id = target_run.client_id
    and check_definition_id = target_definition.id;

  insert into public.check_result_revisions (
    tenant_id,
    client_id,
    service_run_id,
    check_definition_id,
    revision,
    status,
    evidence_snapshot_id,
    evidence_item_ids,
    verifier_kind,
    verifier_id,
    confidence,
    limitations,
    rationale,
    idempotency_key,
    supersedes_revision_id
  )
  values (
    target_run.tenant_id,
    target_run.client_id,
    target_run.id,
    target_definition.id,
    next_revision,
    reviewed_status,
    snapshot_id,
    evidence_ids,
    'human',
    actor_id::text,
    1,
    case when p_action = 'reject' then array['Agent finding rejected by reviewer.'] else '{}'::text[] end,
    left(coalesce(nullif(p_rationale, ''), finding->>'rationale', 'Reviewed by studio staff.'), 2_000),
    left('agent-review:' || target_exception.id, 200),
    (
      select revision_row.id
      from public.check_result_revisions revision_row
      where revision_row.client_id = target_run.client_id
        and revision_row.check_definition_id = target_definition.id
      order by revision_row.revision desc
      limit 1
    )
  )
  on conflict (tenant_id, idempotency_key) do nothing
  returning id into revision_id;

  update public.process_exceptions
  set state = 'resolved',
      resolved_by = actor_id,
      resolved_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  where id = target_exception.id;

  if p_action in ('correct', 'reject') then
    insert into public.agent_learning_events (
      tenant_id,
      client_id,
      agent_definition_id,
      agent_run_id,
      event_kind,
      summary,
      evidence,
      proposed_change,
      review_state
    )
    values (
      target_run.tenant_id,
      target_run.client_id,
      target_agent_run.agent_definition_id,
      target_agent_run.id,
      'human_correction',
      left(coalesce(nullif(p_rationale, ''), 'A reviewer corrected or rejected an agent finding.'), 500),
      jsonb_build_object(
        'exception_id', target_exception.id,
        'stable_key', v_stable_key,
        'agent_status', finding->>'status',
        'reviewed_status', reviewed_status,
        'action', p_action
      ),
      jsonb_build_object(
        'kind', 'review_agent_behavior',
        'stable_key', v_stable_key,
        'automatic_publish', false
      ),
      'pending'
    );
  end if;

  select count(*)
  into remaining_reviews
  from public.process_exceptions exception_row
  where exception_row.service_run_id = target_run.id
    and exception_row.state = 'open'
    and exception_row.retry_policy->>'agent_run_id' = target_agent_run.id::text;

  update public.agent_runs
  set state = case when remaining_reviews = 0 then 'completed' else 'awaiting_review' end,
      correction_summary = case
        when p_action in ('correct', 'reject')
          then left(coalesce(nullif(p_rationale, ''), 'Finding corrected during review.'), 500)
        else correction_summary
      end,
      completed_at = case when remaining_reviews = 0 then timezone('utc', now()) else completed_at end
  where id = target_agent_run.id;

  insert into public.run_events (
    tenant_id,
    service_run_id,
    event_kind,
    state,
    message,
    metadata,
    idempotency_key
  )
  values (
    target_run.tenant_id,
    target_run.id,
    'agent.finding_reviewed',
    target_run.state,
    'A governed agent finding was reviewed.',
    jsonb_build_object(
      'exception_id', target_exception.id,
      'stable_key', v_stable_key,
      'action', p_action,
      'reviewed_status', reviewed_status,
      'remaining_reviews', remaining_reviews
    ),
    left('agent.finding_reviewed:' || target_exception.id, 200)
  )
  on conflict (service_run_id, idempotency_key) do nothing;

  return jsonb_build_object(
    'exceptionId', target_exception.id,
    'agentRunId', target_agent_run.id,
    'stableKey', v_stable_key,
    'action', p_action,
    'status', reviewed_status,
    'revisionId', revision_id,
    'remainingReviews', remaining_reviews,
    'agentState', case when remaining_reviews = 0 then 'completed' else 'awaiting_review' end
  );
end;
$$;

revoke all on function public.review_agent_finding(uuid, text, text, text) from public, anon;
grant execute on function public.review_agent_finding(uuid, text, text, text)
  to authenticated, service_role;

comment on function public.review_agent_finding(uuid, text, text, text) is
  'Human approval boundary for governed findings. Corrections become pending learning events and never auto-publish agent changes.';

commit;
