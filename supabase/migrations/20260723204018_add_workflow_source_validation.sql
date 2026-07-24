begin;

create or replace function public.workflow_record_source_validation(
  p_run_id uuid,
  p_dispatch_token text,
  p_validation_state text,
  p_validation_message text,
  p_normalized_domain text default null,
  p_source_url text default null
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, extensions
as $$
declare
  target_run public.service_runs%rowtype;
  target_source public.client_sources%rowtype;
begin
  if p_validation_state not in ('valid', 'invalid', 'blocked') then
    raise exception 'Unsupported source validation state.';
  end if;

  select *
  into target_run
  from public.service_runs
  where id = p_run_id
    and workflow_token_hash = digest(p_dispatch_token, 'sha256')
    and workflow_token_expires_at > timezone('utc', now());

  if target_run.id is null then
    raise exception 'Workflow capability is invalid or expired.';
  end if;

  select *
  into target_source
  from public.client_sources
  where client_id = target_run.client_id
    and tenant_id = target_run.tenant_id
    and version = target_run.source_version
    and source_kind = 'domain'
  for update;

  if target_source.id is null then
    raise exception 'The workflow domain source was not found.';
  end if;

  update public.client_sources
  set
    validation_state = p_validation_state,
    validation_message = left(nullif(trim(p_validation_message), ''), 500),
    normalized_domain = case
      when p_validation_state = 'valid' then coalesce(nullif(trim(lower(p_normalized_domain)), ''), normalized_domain)
      else normalized_domain
    end,
    source_url = case
      when p_validation_state = 'valid' then coalesce(nullif(trim(p_source_url), ''), source_url)
      else source_url
    end,
    validated_at = timezone('utc', now())
  where id = target_source.id;

  return true;
end;
$$;

revoke all on function public.workflow_record_source_validation(
  uuid, text, text, text, text, text
) from public;
grant execute on function public.workflow_record_source_validation(
  uuid, text, text, text, text, text
) to anon, authenticated, service_role;

comment on function public.workflow_record_source_validation(
  uuid, text, text, text, text, text
) is
  'Capability-scoped writer for the exact versioned client domain source used by a service run.';

commit;
