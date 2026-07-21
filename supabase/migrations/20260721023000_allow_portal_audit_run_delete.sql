begin;

revoke delete on table public.portal_audit_runs from anon;
grant delete on table public.portal_audit_runs to authenticated;

drop policy if exists portal_audit_runs_delete on public.portal_audit_runs;
create policy portal_audit_runs_delete
on public.portal_audit_runs
for delete
to authenticated
using ((select auth.uid()) is not null);

commit;
