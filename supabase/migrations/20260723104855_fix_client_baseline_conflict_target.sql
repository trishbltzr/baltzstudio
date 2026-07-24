begin;

create or replace function public.create_client_with_baseline(
  p_tenant_id uuid,
  p_event_key text,
  p_client_slug text,
  p_client_name text,
  p_normalized_domain text,
  p_source_url text,
  p_sitemap_url text default null,
  p_service_kind text default 'website',
  p_playbook_key text default 'website-checkup',
  p_playbook_version integer default 1,
  p_checklist_version integer default 1
)
returns table (
  client_id uuid,
  client_source_id uuid,
  service_run_id uuid,
  created boolean
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  v_actor_id uuid := auth.uid();
  v_client_id uuid;
  v_source_id uuid;
  v_run_id uuid;
  v_inserted boolean := false;
  v_run_client_id uuid;
  v_idempotency_key text;
begin
  if v_actor_id is null then
    raise exception 'Authentication is required.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.portal_tenant_memberships membership
    where membership.tenant_id = p_tenant_id
      and membership.user_id = v_actor_id
      and membership.role in ('admin', 'manager')
  ) then
    raise exception 'The current user cannot create clients for this tenant.'
      using errcode = '42501';
  end if;

  if p_event_key is null or char_length(trim(p_event_key)) not between 1 and 160 then
    raise exception 'A bounded client-created event key is required.'
      using errcode = '22023';
  end if;

  if p_client_slug is null or p_client_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Client slug is invalid.'
      using errcode = '22023';
  end if;

  if p_normalized_domain is null
    or p_normalized_domain !~ '^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$'
    or position('.' in p_normalized_domain) = 0 then
    raise exception 'A normalized domain is required.'
      using errcode = '22023';
  end if;

  if p_service_kind not in ('brand', 'website', 'seo') then
    raise exception 'A Checkup service kind is required.'
      using errcode = '22023';
  end if;

  insert into public.clients (
    tenant_id,
    slug,
    name,
    source_kind,
    created_by
  )
  values (
    p_tenant_id,
    p_client_slug,
    trim(p_client_name),
    'production',
    v_actor_id
  )
  on conflict (tenant_id, slug) do nothing
  returning id into v_client_id;

  if v_client_id is not null then
    v_inserted := true;
  else
    select existing.id
    into strict v_client_id
    from public.clients existing
    where existing.tenant_id = p_tenant_id
      and existing.slug = p_client_slug;
  end if;

  insert into public.client_sources (
    tenant_id,
    client_id,
    version,
    source_kind,
    normalized_domain,
    source_url,
    sitemap_url,
    validation_state,
    metadata,
    created_by
  )
  values (
    p_tenant_id,
    v_client_id,
    1,
    'domain',
    p_normalized_domain,
    p_source_url,
    p_sitemap_url,
    'pending',
    jsonb_build_object('created_event_key', trim(p_event_key)),
    v_actor_id
  )
  on conflict (client_id, version) where source_kind = 'domain'
  do nothing
  returning id into v_source_id;

  if v_source_id is null then
    select existing.id
    into strict v_source_id
    from public.client_sources existing
    where existing.client_id = v_client_id
      and existing.version = 1
      and existing.source_kind = 'domain';
  end if;

  v_idempotency_key := 'client.created:' || trim(p_event_key) || ':' || p_service_kind;

  insert into public.service_runs (
    tenant_id,
    client_id,
    service_kind,
    run_kind,
    trigger_kind,
    state,
    idempotency_key,
    source_version,
    playbook_key,
    playbook_version,
    checklist_version,
    selected_check_keys,
    completed_targets,
    total_targets
  )
  values (
    p_tenant_id,
    v_client_id,
    p_service_kind,
    'baseline',
    'client_created',
    'queued',
    v_idempotency_key,
    1,
    p_playbook_key,
    p_playbook_version,
    p_checklist_version,
    '{}',
    0,
    0
  )
  on conflict (tenant_id, idempotency_key) do nothing
  returning id, service_runs.client_id into v_run_id, v_run_client_id;

  if v_run_id is null then
    select existing.id, existing.client_id
    into strict v_run_id, v_run_client_id
    from public.service_runs existing
    where existing.tenant_id = p_tenant_id
      and existing.idempotency_key = v_idempotency_key;
  end if;

  if v_run_client_id <> v_client_id then
    raise exception 'The client-created event key is already bound to another client.'
      using errcode = '23505';
  end if;

  return query
  select v_client_id, v_source_id, v_run_id, v_inserted;
end;
$$;

commit;
