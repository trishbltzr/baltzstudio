begin;

alter table public.portal_audit_runs
  alter column source_kind set default 'production';

commit;
