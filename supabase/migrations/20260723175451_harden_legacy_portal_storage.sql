-- Legacy portal snapshots contain cross-client state and must never be reachable
-- with a publishable key. The dashboard API authenticates the caller, projects
-- client-safe data, and then performs these operations with a server-only key.

do $$
declare
  target_table text;
  target_policy text;
begin
  foreach target_table in array array[
    'dashboard_state',
    'portal_workspace_state',
    'portal_audit_runs',
    'dashboard_project_state',
    'dashboard_user_state'
  ]
  loop
    -- Production may still use portal_audit_runs as the workspace fallback,
    -- while newer environments also have portal_workspace_state.
    if to_regclass(format('public.%I', target_table)) is null then
      continue;
    end if;

    execute format(
      'alter table public.%I enable row level security',
      target_table
    );

    for target_policy in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = target_table
    loop
      execute format(
        'drop policy if exists %I on public.%I',
        target_policy,
        target_table
      );
    end loop;

    execute format(
      'revoke all on table public.%I from anon, authenticated',
      target_table
    );
    execute format(
      'grant select, insert, update, delete on table public.%I to service_role',
      target_table
    );
  end loop;
end;
$$;

-- Storage remains private and is reachable only through the authenticated
-- portal-files API. The service role bypasses Storage RLS on the server.
update storage.buckets
set public = false
where id = 'portal-uploads';

drop policy if exists portal_uploads_select on storage.objects;
drop policy if exists portal_uploads_insert on storage.objects;
drop policy if exists portal_uploads_update on storage.objects;
