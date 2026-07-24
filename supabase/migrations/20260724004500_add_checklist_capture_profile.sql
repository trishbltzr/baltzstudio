begin;

create or replace function public.workflow_capture_requirements(
  p_run_id uuid,
  p_dispatch_token text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, extensions
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

  with selected_definitions as (
    select definition.id, definition.stable_key
    from public.check_definitions definition
    where definition.tenant_id = target_run.tenant_id
      and definition.service_kind = target_run.service_kind
      and definition.version = target_run.checklist_version
      and definition.lifecycle_state = 'published'
      and (
        cardinality(target_run.selected_check_keys) = 0
        or definition.stable_key = any(target_run.selected_check_keys)
      )
  ),
  selected_dependencies as (
    select dependency.dependency_kind
    from public.check_dependencies dependency
    join selected_definitions definition
      on definition.id = dependency.check_definition_id
  )
  select jsonb_build_object(
    'rendered_strategies',
    to_jsonb(array_remove(array[
      case when exists (
        select 1
        from selected_definitions
        where stable_key not like 'website.mobile-%'
          and stable_key <> 'website.seo-07'
      ) then 'desktop' end,
      case when exists (
        select 1
        from selected_definitions
        where stable_key like 'website.mobile-%'
          or stable_key like 'website.accessibility-%'
      ) then 'mobile' end
    ], null)),
    'lighthouse_strategies',
    to_jsonb(array_remove(array[
      case when exists (
        select 1 from selected_dependencies where dependency_kind = 'lighthouse_mobile'
      ) then 'mobile' end,
      case when exists (
        select 1 from selected_dependencies where dependency_kind = 'lighthouse_desktop'
      ) then 'desktop' end
    ], null)),
    'include_technical',
    exists (
      select 1
      from selected_dependencies
      where dependency_kind in ('domain', 'sitemap', 'robots')
    ),
    'definition_count',
    (select count(*) from selected_definitions)
  )
  into result;

  return coalesce(result, jsonb_build_object(
    'rendered_strategies', '[]'::jsonb,
    'lighthouse_strategies', '[]'::jsonb,
    'include_technical', false,
    'definition_count', 0
  ));
end;
$$;

revoke all on function public.workflow_capture_requirements(uuid, text) from public;
grant execute on function public.workflow_capture_requirements(uuid, text)
  to anon, authenticated, service_role;

comment on function public.workflow_capture_requirements(uuid, text) is
  'Capability-scoped evidence profile derived from the active published checklist and precise selected targets.';

commit;
