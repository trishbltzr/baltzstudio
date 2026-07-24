begin;

create or replace function public.workflow_ensure_check_dependencies(
  p_run_id uuid,
  p_dispatch_token text,
  p_dependencies jsonb
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, extensions
as $$
declare
  target_run public.service_runs%rowtype;
  dependency jsonb;
  definition_id uuid;
  inserted_count integer := 0;
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
  if jsonb_typeof(p_dependencies) <> 'array' or jsonb_array_length(p_dependencies) > 1_000 then
    raise exception 'Check dependencies must be an array of at most 1000 items.';
  end if;

  for dependency in select value from jsonb_array_elements(p_dependencies)
  loop
    select id
    into definition_id
    from public.check_definitions definition
    where definition.tenant_id = target_run.tenant_id
      and definition.service_kind = target_run.service_kind
      and definition.stable_key = dependency->>'stable_key'
      and definition.version = target_run.checklist_version
      and definition.lifecycle_state = 'published';

    if definition_id is null then
      raise exception 'Published check definition not found for dependency: %', dependency->>'stable_key';
    end if;

    insert into public.check_dependencies (
      tenant_id,
      check_definition_id,
      dependency_kind,
      dependency_key,
      required
    )
    values (
      target_run.tenant_id,
      definition_id,
      dependency->>'dependency_kind',
      left(dependency->>'dependency_key', 200),
      coalesce((dependency->>'required')::boolean, true)
    )
    on conflict (check_definition_id, dependency_kind, dependency_key)
    do update set required = excluded.required;

    inserted_count := inserted_count + 1;
  end loop;

  return inserted_count;
end;
$$;

create or replace function public.workflow_record_sentinel(
  p_run_id uuid,
  p_dispatch_token text,
  p_payload jsonb,
  p_fingerprint text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, extensions
as $$
declare
  target_run public.service_runs%rowtype;
  source_id uuid;
  snapshot_id uuid;
  prior_payload jsonb;
  changed_dependencies text[] := '{}'::text[];
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
  if jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Sentinel payload must be an object.';
  end if;

  select id
  into source_id
  from public.client_sources
  where client_id = target_run.client_id
    and version = target_run.source_version
    and source_kind = 'domain';

  select item.payload
  into prior_payload
  from public.evidence_items item
  join public.evidence_snapshots snapshot on snapshot.id = item.evidence_snapshot_id
  where item.client_id = target_run.client_id
    and item.source_kind = 'sentinel'
    and snapshot.service_run_id <> target_run.id
  order by item.captured_at desc
  limit 1;

  if prior_payload is null then
    changed_dependencies := array['domain', 'page', 'sitemap', 'robots'];
  else
    if prior_payload->>'sourceStatus' is distinct from p_payload->>'sourceStatus'
      or prior_payload->>'sourceFingerprint' is distinct from p_payload->>'sourceFingerprint'
    then
      changed_dependencies := changed_dependencies || array['domain', 'page'];
    end if;
    if prior_payload->>'sitemapStatus' is distinct from p_payload->>'sitemapStatus'
      or prior_payload->>'sitemapFingerprint' is distinct from p_payload->>'sitemapFingerprint'
    then
      changed_dependencies := changed_dependencies || array['sitemap', 'page'];
    end if;
    if prior_payload->>'robotsStatus' is distinct from p_payload->>'robotsStatus'
      or prior_payload->>'robotsFingerprint' is distinct from p_payload->>'robotsFingerprint'
    then
      changed_dependencies := changed_dependencies || array['robots'];
    end if;
  end if;

  select array_agg(distinct dependency)
  into changed_dependencies
  from unnest(changed_dependencies) dependency;
  changed_dependencies := coalesce(changed_dependencies, '{}'::text[]);

  insert into public.evidence_snapshots (
    tenant_id,
    client_id,
    service_run_id,
    client_source_id,
    snapshot_kind,
    idempotency_key,
    status,
    fingerprint,
    provenance,
    coverage_ratio,
    captured_at,
    fresh_until,
    retention_until
  )
  values (
    target_run.tenant_id,
    target_run.client_id,
    target_run.id,
    source_id,
    'sentinel',
    left(target_run.id || ':sentinel:v1', 200),
    'ready',
    left(p_fingerprint, 128),
    jsonb_build_object(
      'collector', 'baltazar-source-sentinel',
      'collector_version', 1,
      'changed_dependencies', to_jsonb(changed_dependencies)
    ),
    1,
    timezone('utc', now()),
    timezone('utc', now()) + interval '1 day',
    timezone('utc', now()) + interval '2 years'
  )
  on conflict (tenant_id, idempotency_key)
  do update set
    fingerprint = excluded.fingerprint,
    provenance = excluded.provenance,
    captured_at = excluded.captured_at,
    fresh_until = excluded.fresh_until
  returning id into snapshot_id;

  insert into public.evidence_items (
    tenant_id,
    client_id,
    evidence_snapshot_id,
    source_kind,
    source_locator,
    fingerprint,
    status,
    payload,
    fresh_until,
    retention_until
  )
  values (
    target_run.tenant_id,
    target_run.client_id,
    snapshot_id,
    'sentinel',
    coalesce(nullif(p_payload->>'sourceUrl', ''), 'source'),
    left(p_fingerprint, 128),
    'verified',
    p_payload,
    timezone('utc', now()) + interval '1 day',
    timezone('utc', now()) + interval '2 years'
  )
  on conflict (evidence_snapshot_id, source_kind, source_locator, fingerprint)
  do update set
    payload = excluded.payload,
    captured_at = timezone('utc', now()),
    fresh_until = excluded.fresh_until;

  return jsonb_build_object(
    'snapshotId', snapshot_id,
    'changedDependencies', to_jsonb(changed_dependencies),
    'changeCount', cardinality(changed_dependencies),
    'noChange', cardinality(changed_dependencies) = 0
  );
end;
$$;

create or replace function public.workflow_recheck_plan(
  p_run_id uuid,
  p_dispatch_token text,
  p_changed_dependencies jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, extensions
as $$
declare
  target_run public.service_runs%rowtype;
  changed_dependencies text[];
  target_keys text[];
  target_count integer;
  capture_mode text;
  targets_json jsonb;
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
  if jsonb_typeof(p_changed_dependencies) <> 'array' then
    raise exception 'Changed dependencies must be an array.';
  end if;

  select coalesce(array_agg(distinct value), '{}'::text[])
  into changed_dependencies
  from jsonb_array_elements_text(p_changed_dependencies);

  with current_results as (
    select
      definition.id as definition_id,
      definition.stable_key,
      definition.title,
      definition.required,
      definition.freshness_seconds,
      latest.id as revision_id,
      latest.status,
      latest.created_at as verified_at,
      latest.evidence_snapshot_id,
      latest.evidence_item_ids,
      dependencies.dependency_kinds,
      case
        when definition.stable_key = any(target_run.selected_check_keys) then 'requested'
        when latest.id is null and definition.required then 'newly_required'
        when latest.status = 'failed' then 'failed'
        when latest.status = 'unverified' then 'unverified'
        when definition.required
          and (latest.evidence_snapshot_id is null or cardinality(latest.evidence_item_ids) = 0)
          then 'evidence_missing'
        when exists (
          select 1
          from public.evidence_items item
          where item.id = any(latest.evidence_item_ids)
            and item.fresh_until is not null
            and item.fresh_until <= timezone('utc', now())
        ) then 'evidence_stale'
        when definition.freshness_seconds is not null
          and latest.created_at + make_interval(secs => definition.freshness_seconds) <= timezone('utc', now())
          then 'check_stale'
        when exists (
          select 1
          from public.check_dependencies changed_dependency
          where changed_dependency.check_definition_id = definition.id
            and changed_dependency.dependency_kind = any(changed_dependencies)
        ) then 'dependency_changed'
        else null
      end as selection_reason
    from public.check_definitions definition
    left join lateral (
      select revision.*
      from public.check_result_revisions revision
      where revision.client_id = target_run.client_id
        and revision.check_definition_id = definition.id
      order by revision.revision desc
      limit 1
    ) latest on true
    left join lateral (
      select coalesce(
        array_agg(distinct dependency.dependency_kind),
        '{}'::text[]
      ) as dependency_kinds
      from public.check_dependencies dependency
      where dependency.check_definition_id = definition.id
    ) dependencies on true
    where definition.tenant_id = target_run.tenant_id
      and definition.service_kind = target_run.service_kind
      and definition.version = target_run.checklist_version
      and definition.lifecycle_state = 'published'
  ), selected as (
    select *
    from current_results
    where selection_reason is not null
  )
  select
    coalesce(array_agg(stable_key order by stable_key), '{}'::text[]),
    count(*),
    case
      when bool_or('page' = any(dependency_kinds)) then 'representative'
      when bool_or(
        'lighthouse_mobile' = any(dependency_kinds)
        or 'lighthouse_desktop' = any(dependency_kinds)
      ) then 'performance'
      else 'technical'
    end,
    coalesce(jsonb_agg(
      jsonb_build_object(
        'stableKey', stable_key,
        'title', title,
        'reason', selection_reason,
        'currentStatus', status,
        'verifiedAt', verified_at,
        'dependencyKinds', to_jsonb(dependency_kinds)
      )
      order by stable_key
    ), '[]'::jsonb)
  into target_keys, target_count, capture_mode, targets_json
  from selected;

  target_count := coalesce(target_count, 0);
  capture_mode := coalesce(capture_mode, 'none');

  update public.service_runs
  set selected_check_keys = coalesce(target_keys, '{}'::text[]),
      total_targets = target_count,
      completed_targets = 0,
      checkpoint = checkpoint || jsonb_build_object(
        'recheck_plan', jsonb_build_object(
          'target_count', target_count,
          'capture_mode', capture_mode,
          'changed_dependencies', to_jsonb(changed_dependencies)
        )
      ),
      updated_at = timezone('utc', now())
  where id = target_run.id;

  return jsonb_build_object(
    'targetCount', target_count,
    'noOp', target_count = 0,
    'captureMode', capture_mode,
    'changedDependencies', to_jsonb(changed_dependencies),
    'targets', targets_json
  );
end;
$$;

revoke all on function public.workflow_ensure_check_dependencies(uuid, text, jsonb) from public;
revoke all on function public.workflow_record_sentinel(uuid, text, jsonb, text) from public;
revoke all on function public.workflow_recheck_plan(uuid, text, jsonb) from public;

grant execute on function public.workflow_ensure_check_dependencies(uuid, text, jsonb)
  to anon, authenticated, service_role;
grant execute on function public.workflow_record_sentinel(uuid, text, jsonb, text)
  to anon, authenticated, service_role;
grant execute on function public.workflow_recheck_plan(uuid, text, jsonb)
  to anon, authenticated, service_role;

comment on function public.workflow_record_sentinel(uuid, text, jsonb, text) is
  'Persists a lightweight source sentinel and returns only materially changed dependency kinds.';
comment on function public.workflow_recheck_plan(uuid, text, jsonb) is
  'Capability-scoped deterministic target selector with dependency expansion and an explicit no-op plan.';

commit;
