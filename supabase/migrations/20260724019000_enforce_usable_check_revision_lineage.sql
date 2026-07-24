begin;

create or replace function public.enforce_usable_check_revision_lineage()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  select revision.id
  into new.supersedes_revision_id
  from public.check_result_revisions revision
  join public.service_runs revision_run on revision_run.id = revision.service_run_id
  where revision.client_id = new.client_id
    and revision.check_definition_id = new.check_definition_id
    and (
      revision.service_run_id = new.service_run_id
      or revision_run.state in ('ready', 'current', 'partial')
    )
  order by revision.revision desc
  limit 1;

  return new;
end;
$$;

drop trigger if exists check_result_revisions_usable_lineage
  on public.check_result_revisions;
create trigger check_result_revisions_usable_lineage
before insert on public.check_result_revisions
for each row execute function public.enforce_usable_check_revision_lineage();

comment on function public.enforce_usable_check_revision_lineage() is
  'Ensures new check revisions supersede only an earlier revision in the same run or the latest revision from a usable ready, current, or partial run.';

commit;
