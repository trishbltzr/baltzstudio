begin;

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
        when target_run.recheck_scope = 'failed' and latest.status = 'failed' then 'failed'
        when target_run.recheck_scope = 'unverified' and latest.id is null and definition.required then 'newly_required'
        when target_run.recheck_scope = 'unverified' and latest.status = 'unverified' then 'unverified'
        when target_run.recheck_scope = 'unverified'
          and definition.required
          and (latest.evidence_snapshot_id is null or cardinality(latest.evidence_item_ids) = 0)
          then 'evidence_missing'
        when target_run.recheck_scope = 'changed'
          and exists (
            select 1
            from public.check_dependencies changed_dependency
            where changed_dependency.check_definition_id = definition.id
              and changed_dependency.dependency_kind = any(changed_dependencies)
          ) then 'dependency_changed'
        when target_run.recheck_scope = 'all_actionable' and latest.id is null and definition.required then 'newly_required'
        when target_run.recheck_scope = 'all_actionable' and latest.status = 'failed' then 'failed'
        when target_run.recheck_scope = 'all_actionable' and latest.status = 'unverified' then 'unverified'
        when target_run.recheck_scope = 'all_actionable'
          and definition.required
          and (latest.evidence_snapshot_id is null or cardinality(latest.evidence_item_ids) = 0)
          then 'evidence_missing'
        when target_run.recheck_scope = 'all_actionable'
          and exists (
            select 1
            from public.evidence_items item
            where item.id = any(latest.evidence_item_ids)
              and item.fresh_until is not null
              and item.fresh_until <= timezone('utc', now())
          ) then 'evidence_stale'
        when target_run.recheck_scope = 'all_actionable'
          and definition.freshness_seconds is not null
          and latest.created_at + make_interval(secs => definition.freshness_seconds) <= timezone('utc', now())
          then 'check_stale'
        when target_run.recheck_scope = 'all_actionable'
          and exists (
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
      join public.service_runs revision_run on revision_run.id = revision.service_run_id
      where revision.client_id = target_run.client_id
        and revision.check_definition_id = definition.id
        and revision_run.tenant_id = target_run.tenant_id
        and revision_run.state in ('ready', 'current', 'partial')
      order by revision.revision desc
      limit 1
    ) latest on true
    left join lateral (
      select coalesce(array_agg(distinct dependency.dependency_kind), '{}'::text[]) as dependency_kinds
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
      when bool_or('lighthouse_mobile' = any(dependency_kinds) or 'lighthouse_desktop' = any(dependency_kinds)) then 'performance'
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
          'scope', target_run.recheck_scope,
          'target_count', target_count,
          'capture_mode', capture_mode,
          'changed_dependencies', to_jsonb(changed_dependencies)
        )
      ),
      updated_at = timezone('utc', now())
  where id = target_run.id;

  return jsonb_build_object(
    'scope', target_run.recheck_scope,
    'targetCount', target_count,
    'noOp', target_count = 0,
    'captureMode', capture_mode,
    'changedDependencies', to_jsonb(changed_dependencies),
    'targets', targets_json
  );
end;
$$;

revoke all on function public.workflow_recheck_plan(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.workflow_recheck_plan(uuid, text, jsonb) to service_role;

comment on function public.workflow_recheck_plan(uuid, text, jsonb) is
  'Builds a checklist-scoped recheck plan from the latest usable result revisions. Cancelled, failed, queued, or in-progress attempts never affect future plans.';

commit;
