begin;

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
  has_fresh_baseline boolean := false;
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
    select exists (
      select 1
      from public.evidence_snapshots baseline
      where baseline.client_id = target_run.client_id
        and baseline.service_run_id = coalesce(target_run.baseline_run_id, target_run.parent_run_id)
        and baseline.client_source_id = source_id
        and baseline.snapshot_kind in ('baseline', 'full_refresh', 'targeted')
        and baseline.status in ('ready', 'partial')
        and baseline.fresh_until > timezone('utc', now())
    )
    into has_fresh_baseline;

    if not has_fresh_baseline then
      changed_dependencies := array['domain', 'page', 'sitemap', 'robots'];
    end if;
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
      'collector_version', 2,
      'changed_dependencies', to_jsonb(changed_dependencies),
      'bootstrapped_from_fresh_baseline', prior_payload is null and has_fresh_baseline
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
    'noChange', cardinality(changed_dependencies) = 0,
    'bootstrappedFromFreshBaseline', prior_payload is null and has_fresh_baseline
  );
end;
$$;

revoke all on function public.workflow_record_sentinel(uuid, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.workflow_record_sentinel(uuid, text, jsonb, text) to service_role;

comment on function public.workflow_record_sentinel(uuid, text, jsonb, text) is
  'Persists a lightweight source sentinel. A fresh same-source baseline safely bootstraps the first selective recheck without flagging every dependency as changed.';

commit;
