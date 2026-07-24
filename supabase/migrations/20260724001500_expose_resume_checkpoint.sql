create or replace function public.workflow_service_run_context(
  p_run_id uuid,
  p_dispatch_token text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, extensions
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'run_id', service_run.id,
    'tenant_id', service_run.tenant_id,
    'client_id', service_run.client_id,
    'service_kind', service_run.service_kind,
    'run_kind', service_run.run_kind,
    'recheck_scope', service_run.recheck_scope,
    'source_kind', service_run.source_kind,
    'state', service_run.state,
    'source_version', service_run.source_version,
    'selected_check_keys', service_run.selected_check_keys,
    'completed_targets', service_run.completed_targets,
    'total_targets', service_run.total_targets,
    'checkpoint', service_run.checkpoint,
    'source_id', source.id,
    'source_url', source.source_url,
    'sitemap_url', source.sitemap_url,
    'normalized_domain', source.normalized_domain
  )
  into result
  from public.service_runs service_run
  join public.client_sources source
    on source.client_id = service_run.client_id
    and source.version = service_run.source_version
    and source.source_kind = 'domain'
  where service_run.id = p_run_id
    and service_run.workflow_token_hash = digest(p_dispatch_token, 'sha256')
    and service_run.workflow_token_expires_at > timezone('utc', now());

  if result is null then
    raise exception 'Workflow capability is invalid or expired.';
  end if;

  return result;
end;
$$;

comment on function public.workflow_service_run_context(uuid, text) is
  'Capability-scoped workflow context including the durable checkpoint required for restart/resume.';
