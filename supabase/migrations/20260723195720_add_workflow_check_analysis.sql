begin;

create or replace function public.workflow_ensure_check_definitions(
  p_run_id uuid,
  p_dispatch_token text,
  p_definitions jsonb
)
returns integer
language plpgsql
security definer
set search_path = 'pg_catalog, extensions'
as $$
declare
  target_run public.service_runs%rowtype;
  definition jsonb;
  inserted_count integer := 0;
  definition_key text;
  evaluation_kind text;
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

  if jsonb_typeof(p_definitions) <> 'array' or jsonb_array_length(p_definitions) > 300 then
    raise exception 'Check definitions must be an array of at most 300 items.';
  end if;

  for definition in select value from jsonb_array_elements(p_definitions)
  loop
    definition_key := definition->>'stable_key';
    evaluation_kind := definition->>'evaluation_kind';

    if definition_key is null
      or definition_key !~ '^[a-z0-9]+(?:[._-][a-z0-9]+)*$'
      or definition_key not like target_run.service_kind || '.%'
      or evaluation_kind not in ('deterministic', 'qualitative', 'connected_data', 'human') then
      raise exception 'Invalid built-in check definition.';
    end if;

    insert into public.check_definitions (
      tenant_id,
      stable_key,
      service_kind,
      version,
      title,
      description,
      evaluation_kind,
      formula,
      required,
      freshness_seconds,
      lifecycle_state,
      change_summary,
      published_at
    )
    values (
      target_run.tenant_id,
      definition_key,
      target_run.service_kind,
      target_run.checklist_version,
      left(coalesce(definition->>'title', definition_key), 240),
      left(coalesce(definition->>'description', ''), 1_000),
      evaluation_kind,
      coalesce(definition->'formula', '{}'::jsonb),
      coalesce((definition->>'required')::boolean, true),
      case
        when definition->>'freshness_seconds' is null then null
        else greatest(60, least((definition->>'freshness_seconds')::integer, 31536000))
      end,
      'published',
      left(coalesce(definition->>'change_summary', 'Built-in checklist definition.'), 500),
      timezone('utc', now())
    )
    on conflict (tenant_id, stable_key, version) do nothing;

    if found then inserted_count := inserted_count + 1; end if;
  end loop;

  return inserted_count;
end;
$$;

create or replace function public.workflow_evidence_bundle(
  p_run_id uuid,
  p_dispatch_token text,
  p_snapshot_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog, extensions'
as $$
declare
  target_run public.service_runs%rowtype;
  result jsonb;
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

  select jsonb_build_object(
    'snapshot_id', snapshot.id,
    'status', snapshot.status,
    'coverage_ratio', snapshot.coverage_ratio,
    'fingerprint', snapshot.fingerprint,
    'items', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', item.id,
          'source_kind', item.source_kind,
          'source_locator', item.source_locator,
          'device_kind', item.device_kind,
          'fingerprint', item.fingerprint,
          'status', item.status,
          'payload', item.payload,
          'captured_at', item.captured_at,
          'fresh_until', item.fresh_until
        )
        order by item.source_kind, item.source_locator, item.device_kind
      ) filter (where item.id is not null),
      '[]'::jsonb
    )
  )
  into result
  from public.evidence_snapshots snapshot
  left join public.evidence_items item on item.evidence_snapshot_id = snapshot.id
  where snapshot.id = p_snapshot_id
    and snapshot.service_run_id = target_run.id
  group by snapshot.id;

  if result is null then
    raise exception 'Evidence snapshot does not belong to this service run.';
  end if;

  return result;
end;
$$;

create or replace function public.workflow_record_check_revisions(
  p_run_id uuid,
  p_dispatch_token text,
  p_snapshot_id uuid,
  p_results jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog, extensions'
as $$
declare
  target_run public.service_runs%rowtype;
  result_item jsonb;
  definition public.check_definitions%rowtype;
  next_revision integer;
  inserted_count integer := 0;
  replayed_count integer := 0;
  result_status text;
  result_key text;
  result_idempotency_key text;
  evidence_ids uuid[];
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
  ) then
    raise exception 'Evidence snapshot does not belong to this service run.';
  end if;

  if jsonb_typeof(p_results) <> 'array' or jsonb_array_length(p_results) > 300 then
    raise exception 'Check results must be an array of at most 300 items.';
  end if;

  for result_item in select value from jsonb_array_elements(p_results)
  loop
    result_key := result_item->>'stable_key';
    result_status := result_item->>'status';
    result_idempotency_key := left(
      coalesce(result_item->>'idempotency_key', target_run.id || ':check:' || result_key),
      200
    );

    if result_status not in ('passed', 'failed', 'unverified', 'not_applicable') then
      raise exception 'Invalid check result status.';
    end if;

    select *
    into definition
    from public.check_definitions check_definition
    where check_definition.tenant_id = target_run.tenant_id
      and check_definition.service_kind = target_run.service_kind
      and check_definition.stable_key = result_key
      and check_definition.version = target_run.checklist_version
      and check_definition.lifecycle_state = 'published';

    if definition.id is null then
      raise exception 'Published check definition not found: %', result_key;
    end if;

    if exists (
      select 1
      from public.check_result_revisions revision
      where revision.tenant_id = target_run.tenant_id
        and revision.idempotency_key = result_idempotency_key
    ) then
      replayed_count := replayed_count + 1;
      continue;
    end if;

    perform pg_advisory_xact_lock(
      hashtextextended(target_run.client_id::text || ':' || definition.id::text, 0)
    );

    select coalesce(max(revision), 0) + 1
    into next_revision
    from public.check_result_revisions
    where client_id = target_run.client_id
      and check_definition_id = definition.id;

    select coalesce(array_agg(value::text::uuid), '{}'::uuid[])
    into evidence_ids
    from jsonb_array_elements_text(coalesce(result_item->'evidence_item_ids', '[]'::jsonb));

    if exists (
      select 1
      from unnest(evidence_ids) evidence_id
      where not exists (
        select 1
        from public.evidence_items item
        where item.id = evidence_id
          and item.evidence_snapshot_id = p_snapshot_id
          and item.client_id = target_run.client_id
      )
    ) then
      raise exception 'A cited evidence item does not belong to this snapshot.';
    end if;

    insert into public.check_result_revisions (
      tenant_id,
      client_id,
      service_run_id,
      check_definition_id,
      revision,
      status,
      score,
      evidence_snapshot_id,
      evidence_item_ids,
      evidence_fingerprint,
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
      definition.id,
      next_revision,
      result_status,
      case when result_item->>'score' is null then null else (result_item->>'score')::numeric end,
      p_snapshot_id,
      evidence_ids,
      nullif(result_item->>'evidence_fingerprint', ''),
      coalesce(result_item->>'verifier_kind', definition.evaluation_kind),
      nullif(result_item->>'verifier_id', ''),
      case when result_item->>'confidence' is null then null else (result_item->>'confidence')::numeric end,
      coalesce(
        array(select value from jsonb_array_elements_text(coalesce(result_item->'limitations', '[]'::jsonb))),
        '{}'::text[]
      ),
      left(coalesce(result_item->>'rationale', ''), 2_000),
      result_idempotency_key,
      (
        select id
        from public.check_result_revisions
        where client_id = target_run.client_id
          and check_definition_id = definition.id
        order by revision desc
        limit 1
      )
    );

    inserted_count := inserted_count + 1;
  end loop;

  return jsonb_build_object(
    'inserted', inserted_count,
    'replayed', replayed_count,
    'total', jsonb_array_length(p_results)
  );
end;
$$;

revoke all on function public.workflow_ensure_check_definitions(uuid, text, jsonb) from public;
revoke all on function public.workflow_evidence_bundle(uuid, text, uuid) from public;
revoke all on function public.workflow_record_check_revisions(uuid, text, uuid, jsonb) from public;

grant execute on function public.workflow_ensure_check_definitions(uuid, text, jsonb) to anon, authenticated, service_role;
grant execute on function public.workflow_evidence_bundle(uuid, text, uuid) to anon, authenticated, service_role;
grant execute on function public.workflow_record_check_revisions(uuid, text, uuid, jsonb) to anon, authenticated, service_role;

commit;
