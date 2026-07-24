alter table public.portal_audit_runs
  add column if not exists source_kind text not null default 'demo'
  check (source_kind in ('demo', 'imported', 'production'));

do $$
begin
  if to_regclass('public.portal_workspace_state') is not null then
    alter table public.portal_workspace_state
      add column if not exists source_kind text not null default 'demo'
      check (source_kind in ('demo', 'imported', 'production'));
    comment on column public.portal_workspace_state.source_kind is
      'Legacy workspace snapshots default to demo and are never an implicit production source.';
  end if;
end;
$$;

comment on column public.portal_audit_runs.source_kind is
  'Legacy records default to demo and require an explicit reviewed migration link before production use.';
