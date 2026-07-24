begin;

alter table public.agent_memory
  add column if not exists role_scope text[] not null default array['system']::text[],
  add column if not exists access_policy text not null default 'internal'
    check (access_policy in ('internal', 'agent', 'client_safe'));

create or replace function public.provision_default_service_agent()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  insert into public.agent_definitions (
    tenant_id,
    stable_key,
    version,
    lifecycle_state,
    service_kind,
    name,
    instructions,
    allowed_tools,
    output_schema,
    memory_policy,
    approval_requirements,
    playbook_key,
    playbook_version,
    change_summary,
    last_reviewed_at,
    published_at
  )
  values (
    new.id,
    'checkup.qualitative-reviewer',
    1,
    'published',
    'shared',
    'Governed Checkup Reviewer',
    'Assess qualitative Checkup requirements from the active run evidence. Be conservative, evidence-led, and explicit about limitations.',
    array[
      'lookup_review_targets',
      'list_scoped_evidence',
      'retrieve_scoped_evidence',
      'propose_human_review'
    ],
    jsonb_build_object(
      'kind', 'qualitative_check_findings',
      'required', array[
        'stableKey',
        'status',
        'evidenceItemIds',
        'confidence',
        'rationale',
        'limitations',
        'recommendedAction',
        'requiresHumanReview'
      ]
    ),
    jsonb_build_object(
      'read', 'approved_scoped_only',
      'write', 'prohibited',
      'max_items', 20,
      'minimum_confidence', 0.8,
      'allowed_roles', array['system']
    ),
    jsonb_build_object(
      'client_facing_claims', true,
      'material_contradictions', true,
      'confidence_below', 0.8,
      'publication', true,
      'handoff', true,
      'memory_write', true
    ),
    'checkup-core',
    1,
    'Initial governed qualitative reviewer. Read-only tools and human review gates are mandatory.',
    timezone('utc', now()),
    timezone('utc', now())
  )
  on conflict (tenant_id, stable_key, version) do nothing;

  return new;
end;
$$;

insert into public.agent_definitions (
  tenant_id,
  stable_key,
  version,
  lifecycle_state,
  service_kind,
  name,
  instructions,
  allowed_tools,
  output_schema,
  memory_policy,
  approval_requirements,
  playbook_key,
  playbook_version,
  change_summary,
  last_reviewed_at,
  published_at
)
select
  tenant.id,
  'checkup.qualitative-reviewer',
  1,
  'published',
  'shared',
  'Governed Checkup Reviewer',
  'Assess qualitative Checkup requirements from the active run evidence. Be conservative, evidence-led, and explicit about limitations.',
  array[
    'lookup_review_targets',
    'list_scoped_evidence',
    'retrieve_scoped_evidence',
    'propose_human_review'
  ],
  jsonb_build_object(
    'kind', 'qualitative_check_findings',
    'required', array[
      'stableKey',
      'status',
      'evidenceItemIds',
      'confidence',
      'rationale',
      'limitations',
      'recommendedAction',
      'requiresHumanReview'
    ]
  ),
  jsonb_build_object(
    'read', 'approved_scoped_only',
    'write', 'prohibited',
    'max_items', 20,
    'minimum_confidence', 0.8,
    'allowed_roles', array['system']
  ),
  jsonb_build_object(
    'client_facing_claims', true,
    'material_contradictions', true,
    'confidence_below', 0.8,
    'publication', true,
    'handoff', true,
    'memory_write', true
  ),
  'checkup-core',
  1,
  'Initial governed qualitative reviewer. Read-only tools and human review gates are mandatory.',
  timezone('utc', now()),
  timezone('utc', now())
from public.portal_tenants tenant
on conflict (tenant_id, stable_key, version) do nothing;

drop trigger if exists portal_tenants_provision_default_service_agent
  on public.portal_tenants;
create trigger portal_tenants_provision_default_service_agent
after insert on public.portal_tenants
for each row execute function public.provision_default_service_agent();

create or replace function public.workflow_begin_agent_run_context(
  p_run_id uuid,
  p_dispatch_token text,
  p_snapshot_id uuid,
  p_stage_key text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, extensions
as $$
declare
  target_run public.service_runs%rowtype;
  definition public.agent_definitions%rowtype;
  current_agent_run public.agent_runs%rowtype;
  result jsonb;
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

  if not exists (
    select 1
    from public.evidence_snapshots snapshot
    where snapshot.id = p_snapshot_id
      and snapshot.service_run_id = target_run.id
      and snapshot.client_id = target_run.client_id
  ) then
    raise exception 'Evidence snapshot does not belong to this service run.';
  end if;

  select *
  into definition
  from public.agent_definitions candidate
  where candidate.tenant_id = target_run.tenant_id
    and candidate.lifecycle_state = 'published'
    and candidate.service_kind in (target_run.service_kind, 'shared')
    and candidate.playbook_version = target_run.playbook_version
  order by
    case when candidate.service_kind = target_run.service_kind then 0 else 1 end,
    candidate.version desc
  limit 1;

  if definition.id is null then
    raise exception 'No published agent definition is bound to this service run.';
  end if;

  insert into public.agent_runs (
    tenant_id,
    client_id,
    service_run_id,
    agent_definition_id,
    agent_version,
    state,
    input_scope,
    idempotency_key,
    started_at
  )
  values (
    target_run.tenant_id,
    target_run.client_id,
    target_run.id,
    definition.id,
    definition.version,
    'running',
    jsonb_build_object(
      'snapshot_id', p_snapshot_id,
      'service_kind', target_run.service_kind,
      'stage_key', left(coalesce(nullif(p_stage_key, ''), 'reviewing'), 100),
      'checklist_version', target_run.checklist_version,
      'playbook_version', target_run.playbook_version
    ),
    left(p_idempotency_key, 200),
    timezone('utc', now())
  )
  on conflict (tenant_id, idempotency_key) do nothing;

  select *
  into current_agent_run
  from public.agent_runs
  where tenant_id = target_run.tenant_id
    and idempotency_key = left(p_idempotency_key, 200);

  if current_agent_run.service_run_id <> target_run.id
    or current_agent_run.agent_definition_id <> definition.id then
    raise exception 'Agent-run idempotency key belongs to another scope.';
  end if;

  update public.service_runs
  set agent_definition_id = definition.id,
      updated_at = timezone('utc', now())
  where id = target_run.id;

  select jsonb_build_object(
    'agent_run', jsonb_build_object(
      'id', current_agent_run.id,
      'state', current_agent_run.state,
      'output', current_agent_run.output
    ),
    'definition', jsonb_build_object(
      'id', definition.id,
      'stable_key', definition.stable_key,
      'version', definition.version,
      'name', definition.name,
      'instructions', definition.instructions,
      'allowed_tools', definition.allowed_tools,
      'memory_policy', definition.memory_policy,
      'approval_requirements', definition.approval_requirements,
      'playbook_key', definition.playbook_key,
      'playbook_version', definition.playbook_version
    ),
    'memory', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', memory.id,
          'memory_kind', memory.memory_kind,
          'content', memory.content,
          'source_kind', memory.source_kind,
          'source_reference', memory.source_reference,
          'confidence', memory.confidence,
          'approved_at', memory.approved_at,
          'expires_at', memory.expires_at
        )
        order by memory.approved_at desc
      )
      from (
        select scoped_memory.*
        from public.agent_memory scoped_memory
        where scoped_memory.tenant_id = target_run.tenant_id
          and scoped_memory.client_id = target_run.client_id
          and scoped_memory.service_kind in (target_run.service_kind, 'shared')
          and scoped_memory.stage_key in (left(coalesce(nullif(p_stage_key, ''), 'reviewing'), 100), '*')
          and scoped_memory.revoked_at is null
          and (scoped_memory.expires_at is null or scoped_memory.expires_at > timezone('utc', now()))
          and 'system' = any(scoped_memory.role_scope)
          and scoped_memory.access_policy in ('internal', 'agent')
        order by scoped_memory.approved_at desc
        limit least(coalesce((definition.memory_policy->>'max_items')::integer, 20), 50)
      ) memory
    ), '[]'::jsonb),
    'targets', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'stable_key', target_definition.stable_key,
          'title', target_definition.title,
          'description', target_definition.description,
          'required', target_definition.required,
          'formula', target_definition.formula
        )
        order by target_definition.stable_key
      )
      from public.check_definitions target_definition
      left join lateral (
        select revision.status
        from public.check_result_revisions revision
        where revision.client_id = target_run.client_id
          and revision.check_definition_id = target_definition.id
        order by revision.revision desc
        limit 1
      ) latest_result on true
      where target_definition.tenant_id = target_run.tenant_id
        and target_definition.service_kind = target_run.service_kind
        and target_definition.version = target_run.checklist_version
        and target_definition.lifecycle_state = 'published'
        and target_definition.evaluation_kind = 'qualitative'
        and coalesce(latest_result.status, 'unverified') = 'unverified'
        and (
          cardinality(target_run.selected_check_keys) = 0
          or target_definition.stable_key = any(target_run.selected_check_keys)
        )
    ), '[]'::jsonb)
  )
  into result;

  return result;
end;
$$;

create or replace function public.workflow_complete_agent_run(
  p_run_id uuid,
  p_dispatch_token text,
  p_agent_run_id uuid,
  p_state text,
  p_output jsonb,
  p_tool_trace jsonb,
  p_latency_ms integer
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, extensions
as $$
declare
  target_run public.service_runs%rowtype;
  target_agent_run public.agent_runs%rowtype;
  finding jsonb;
  review_count integer := 0;
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

  select *
  into target_agent_run
  from public.agent_runs
  where id = p_agent_run_id
    and service_run_id = target_run.id
    and client_id = target_run.client_id
  for update;

  if target_agent_run.id is null then
    raise exception 'Agent run does not belong to this service run.';
  end if;

  if p_state not in ('completed', 'partial', 'awaiting_review', 'blocked', 'failed', 'cancelled') then
    raise exception 'Invalid agent completion state.';
  end if;
  if jsonb_typeof(p_output) <> 'object' or jsonb_typeof(p_tool_trace) <> 'array' then
    raise exception 'Agent output or tool trace is malformed.';
  end if;

  if jsonb_typeof(coalesce(p_output->'findings', '[]'::jsonb)) = 'array' then
    for finding in select value from jsonb_array_elements(coalesce(p_output->'findings', '[]'::jsonb))
    loop
      if coalesce((finding->>'requiresHumanReview')::boolean, false) then
        review_count := review_count + 1;
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
          target_run.tenant_id,
          target_run.client_id,
          target_run.id,
          case
            when finding->>'status' = 'unverified' then 'unsupported_evidence'
            else 'policy'
          end,
          'open',
          left(
            coalesce(nullif(finding->>'reviewReason', ''), 'Qualitative finding requires human review.'),
            300
          ),
          'manager',
          left(
            coalesce(nullif(finding->>'recommendedAction', ''), 'Review the evidence and approve, correct, or reject the finding.'),
            500
          ),
          jsonb_build_object(
            'agent_run_id', target_agent_run.id,
            'stable_key', finding->>'stableKey',
            'automatic_approval', false
          ),
          left(target_run.id || ':agent-review:' || coalesce(finding->>'stableKey', gen_random_uuid()::text), 200)
        )
        on conflict (tenant_id, idempotency_key) do nothing;
      end if;
    end loop;
  end if;

  update public.agent_runs
  set state = case when review_count > 0 then 'awaiting_review' else p_state end,
      output = p_output,
      tool_trace = p_tool_trace,
      latency_ms = greatest(coalesce(p_latency_ms, 0), 0),
      completed_at = timezone('utc', now())
  where id = target_agent_run.id;

  return jsonb_build_object(
    'agent_run_id', target_agent_run.id,
    'state', case when review_count > 0 then 'awaiting_review' else p_state end,
    'review_count', review_count
  );
end;
$$;

revoke all on function public.provision_default_service_agent() from public, anon, authenticated;
revoke all on function public.workflow_begin_agent_run_context(uuid, text, uuid, text, text) from public;
revoke all on function public.workflow_complete_agent_run(uuid, text, uuid, text, jsonb, jsonb, integer) from public;

grant execute on function public.workflow_begin_agent_run_context(uuid, text, uuid, text, text)
  to anon, authenticated, service_role;
grant execute on function public.workflow_complete_agent_run(uuid, text, uuid, text, jsonb, jsonb, integer)
  to anon, authenticated, service_role;

comment on function public.workflow_begin_agent_run_context(uuid, text, uuid, text, text) is
  'Capability-scoped agent context. Returns one published definition, matching approved memory, and qualitative targets for exactly one service run.';
comment on function public.workflow_complete_agent_run(uuid, text, uuid, text, jsonb, jsonb, integer) is
  'Host-controlled agent completion. The model cannot approve findings or write durable memory; configured review findings become owned exceptions.';

commit;
