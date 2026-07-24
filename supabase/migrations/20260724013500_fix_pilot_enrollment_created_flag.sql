begin;

create or replace function public.enroll_pilot_client_with_baseline(
  p_tenant_id uuid,
  p_event_key text,
  p_client_slug text,
  p_client_name text,
  p_normalized_domain text,
  p_source_url text,
  p_sitemap_url text default null,
  p_service_kind text default 'website',
  p_primary_contact_email text default null,
  p_rollout_note text default ''
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
  v_result record;
  v_inserted boolean := false;
begin
  if not exists (
    select 1 from public.portal_tenant_memberships membership
    where membership.tenant_id = p_tenant_id
      and membership.user_id = v_actor_id
      and membership.role = 'admin'
  ) then
    raise exception 'Only an admin can enroll the production pilot.' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_rollout_note, ''))) < 8 then
    raise exception 'A concise pilot rollout note is required.' using errcode = '22023';
  end if;

  insert into public.clients (
    tenant_id, slug, name, primary_contact_email, source_kind, created_by
  )
  values (
    p_tenant_id,
    p_client_slug,
    trim(p_client_name),
    nullif(lower(trim(p_primary_contact_email)), ''),
    'production',
    v_actor_id
  )
  on conflict (tenant_id, slug) do nothing
  returning id into v_client_id;

  if v_client_id is not null then
    v_inserted := true;
  else
    select existing.id into strict v_client_id
    from public.clients existing
    where existing.tenant_id = p_tenant_id and existing.slug = p_client_slug;
  end if;

  insert into public.client_sources (
    tenant_id, client_id, version, source_kind, normalized_domain, source_url,
    sitemap_url, validation_state, metadata, created_by
  )
  values (
    p_tenant_id, v_client_id, 1, 'domain', p_normalized_domain, p_source_url,
    p_sitemap_url, 'pending',
    jsonb_build_object('created_event_key', trim(p_event_key)),
    v_actor_id
  )
  on conflict (client_id, version) where source_kind = 'domain' do nothing;

  insert into public.workflow_release_controls (
    tenant_id,
    new_workflows_enabled,
    rollout_stage,
    client_projection_source,
    pilot_client_id,
    rollout_note,
    updated_by,
    updated_at
  )
  values (
    p_tenant_id,
    true,
    'pilot',
    'legacy',
    v_client_id,
    trim(p_rollout_note),
    v_actor_id,
    timezone('utc', now())
  )
  on conflict (tenant_id) do update set
    new_workflows_enabled = true,
    rollout_stage = 'pilot',
    client_projection_source = 'legacy',
    pilot_client_id = excluded.pilot_client_id,
    rollout_note = excluded.rollout_note,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at;

  select * into strict v_result
  from public.create_client_with_baseline(
    p_tenant_id,
    p_event_key,
    p_client_slug,
    p_client_name,
    p_normalized_domain,
    p_source_url,
    p_sitemap_url,
    p_service_kind,
    p_service_kind || '-checkup',
    1,
    1,
    p_primary_contact_email
  );

  return query
  select
    v_result.client_id,
    v_result.client_source_id,
    v_result.service_run_id,
    v_inserted;
end;
$$;

commit;
