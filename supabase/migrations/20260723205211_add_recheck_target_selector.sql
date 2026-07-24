begin;

create or replace function public.get_recheck_targets(
  p_client_id uuid,
  p_service_kind text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  target_client public.clients%rowtype;
  result jsonb;
begin
  if p_service_kind not in ('brand', 'website', 'seo', 'funnel', 'social') then
    raise exception 'Unsupported service kind.';
  end if;

  select *
  into target_client
  from public.clients
  where id = p_client_id
    and status <> 'archived';

  if target_client.id is null then
    raise exception 'Active client not found.';
  end if;

  if coalesce((select auth.role()), '') <> 'service_role'
    and not exists (
      select 1
      from public.portal_tenant_memberships membership
      where membership.tenant_id = target_client.tenant_id
        and membership.user_id = (select auth.uid())
        and membership.role in ('admin', 'manager')
    )
  then
    raise exception 'Only tenant staff can select recheck targets.';
  end if;

  with latest_definitions as (
    select distinct on (definition.stable_key)
      definition.*
    from public.check_definitions definition
    where definition.tenant_id = target_client.tenant_id
      and definition.service_kind = p_service_kind
      and definition.lifecycle_state = 'published'
    order by definition.stable_key, definition.version desc
  ),
  current_results as (
    select
      definition.id as check_definition_id,
      definition.stable_key,
      definition.title,
      definition.version as check_version,
      definition.required,
      definition.freshness_seconds,
      revision.id as revision_id,
      revision.status as current_status,
      revision.created_at as verified_at,
      revision.evidence_snapshot_id,
      revision.evidence_item_ids,
      case
        when revision.id is null and definition.required then 'newly_required'
        when revision.status = 'failed' then 'failed'
        when revision.status = 'unverified' then 'unverified'
        when definition.required
          and (
            revision.evidence_snapshot_id is null
            or cardinality(revision.evidence_item_ids) = 0
          )
          then 'evidence_missing'
        when exists (
          select 1
          from public.evidence_items item
          where item.id = any(revision.evidence_item_ids)
            and item.fresh_until is not null
            and item.fresh_until <= timezone('utc', now())
        )
          then 'evidence_stale'
        when definition.freshness_seconds is not null
          and revision.created_at + make_interval(secs => definition.freshness_seconds) <= timezone('utc', now())
          then 'check_stale'
        else null
      end as selection_reason
    from latest_definitions definition
    left join lateral (
      select result_revision.*
      from public.check_result_revisions result_revision
      where result_revision.client_id = target_client.id
        and result_revision.check_definition_id = definition.id
      order by result_revision.revision desc
      limit 1
    ) revision on true
  ),
  targets as (
    select *
    from current_results
    where selection_reason is not null
  )
  select jsonb_build_object(
    'clientId', target_client.id,
    'serviceKind', p_service_kind,
    'selectedAt', timezone('utc', now()),
    'targetCount', count(*),
    'noOp', count(*) = 0,
    'targets', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'checkDefinitionId', check_definition_id,
          'stableKey', stable_key,
          'title', title,
          'checkVersion', check_version,
          'reason', selection_reason,
          'currentStatus', current_status,
          'verifiedAt', verified_at,
          'evidenceSnapshotId', evidence_snapshot_id
        )
        order by stable_key
      ),
      '[]'::jsonb
    )
  )
  into result
  from targets;

  return result;
end;
$$;

revoke all on function public.get_recheck_targets(uuid, text) from public, anon;
grant execute on function public.get_recheck_targets(uuid, text) to authenticated, service_role;

comment on function public.get_recheck_targets(uuid, text) is
  'Selects only newly required, failed, unverified, missing-evidence, or stale published checks for a tenant-authorized client.';

commit;
