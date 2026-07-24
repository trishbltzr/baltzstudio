begin;

drop policy if exists clients_write_staff on public.clients;

create policy clients_insert_staff
on public.clients for insert to authenticated
with check (
  exists (
    select 1 from public.portal_tenant_memberships membership
    where membership.tenant_id = clients.tenant_id
      and membership.user_id = (select auth.uid())
      and membership.role in ('admin', 'manager')
  )
);

create policy clients_update_staff
on public.clients for update to authenticated
using (
  exists (
    select 1 from public.portal_tenant_memberships membership
    where membership.tenant_id = clients.tenant_id
      and membership.user_id = (select auth.uid())
      and membership.role in ('admin', 'manager')
  )
)
with check (
  exists (
    select 1 from public.portal_tenant_memberships membership
    where membership.tenant_id = clients.tenant_id
      and membership.user_id = (select auth.uid())
      and membership.role in ('admin', 'manager')
  )
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'client_sources',
    'evidence_snapshots',
    'evidence_items',
    'check_dependencies',
    'check_result_revisions',
    'run_events'
  ]
  loop
    execute format('drop policy if exists %I_write_staff on public.%I', table_name, table_name);
    execute format(
      'create policy %I_insert_staff on public.%I for insert to authenticated with check (
        exists (
          select 1 from public.portal_tenant_memberships membership
          where membership.tenant_id = %I.tenant_id
            and membership.user_id = (select auth.uid())
            and membership.role in (''admin'', ''manager'')
        )
      )',
      table_name,
      table_name,
      table_name
    );
  end loop;

  foreach table_name in array array[
    'check_definitions',
    'service_runs',
    'agent_definitions',
    'agent_runs',
    'agent_memory',
    'agent_learning_events'
  ]
  loop
    execute format('drop policy if exists %I_write_staff on public.%I', table_name, table_name);
    execute format(
      'create policy %I_insert_staff on public.%I for insert to authenticated with check (
        exists (
          select 1 from public.portal_tenant_memberships membership
          where membership.tenant_id = %I.tenant_id
            and membership.user_id = (select auth.uid())
            and membership.role in (''admin'', ''manager'')
        )
      )',
      table_name,
      table_name,
      table_name
    );
    execute format(
      'create policy %I_update_staff on public.%I for update to authenticated using (
        exists (
          select 1 from public.portal_tenant_memberships membership
          where membership.tenant_id = %I.tenant_id
            and membership.user_id = (select auth.uid())
            and membership.role in (''admin'', ''manager'')
        )
      ) with check (
        exists (
          select 1 from public.portal_tenant_memberships membership
          where membership.tenant_id = %I.tenant_id
            and membership.user_id = (select auth.uid())
            and membership.role in (''admin'', ''manager'')
        )
      )',
      table_name,
      table_name,
      table_name,
      table_name
    );
  end loop;
end
$$;

create index portal_tenant_memberships_user_idx
  on public.portal_tenant_memberships (user_id);
create index portal_tenant_memberships_client_idx
  on public.portal_tenant_memberships (client_id)
  where client_id is not null;
create index clients_created_by_idx
  on public.clients (created_by)
  where created_by is not null;
create index client_sources_tenant_idx
  on public.client_sources (tenant_id);
create index client_sources_created_by_idx
  on public.client_sources (created_by)
  where created_by is not null;
create index client_sources_supersedes_idx
  on public.client_sources (supersedes_source_id)
  where supersedes_source_id is not null;
create index check_definitions_created_by_idx
  on public.check_definitions (created_by)
  where created_by is not null;
create index check_dependencies_tenant_idx
  on public.check_dependencies (tenant_id);
create index service_runs_parent_idx
  on public.service_runs (parent_run_id)
  where parent_run_id is not null;
create index service_runs_baseline_idx
  on public.service_runs (baseline_run_id)
  where baseline_run_id is not null;
create index service_runs_agent_definition_idx
  on public.service_runs (agent_definition_id)
  where agent_definition_id is not null;
create index service_runs_owner_idx
  on public.service_runs (owner_user_id)
  where owner_user_id is not null;
create index evidence_snapshots_run_idx
  on public.evidence_snapshots (service_run_id);
create index evidence_snapshots_source_idx
  on public.evidence_snapshots (client_source_id);
create index evidence_items_client_idx
  on public.evidence_items (client_id);
create index check_result_revisions_run_idx
  on public.check_result_revisions (service_run_id);
create index check_result_revisions_definition_idx
  on public.check_result_revisions (check_definition_id);
create index check_result_revisions_snapshot_idx
  on public.check_result_revisions (evidence_snapshot_id)
  where evidence_snapshot_id is not null;
create index check_result_revisions_supersedes_idx
  on public.check_result_revisions (supersedes_revision_id)
  where supersedes_revision_id is not null;
create index agent_definitions_owner_idx
  on public.agent_definitions (owner_user_id)
  where owner_user_id is not null;
create index agent_runs_client_idx
  on public.agent_runs (client_id);
create index agent_runs_service_run_idx
  on public.agent_runs (service_run_id);
create index agent_runs_definition_idx
  on public.agent_runs (agent_definition_id);
create index agent_memory_client_idx
  on public.agent_memory (client_id);
create index agent_memory_approved_by_idx
  on public.agent_memory (approved_by);
create index agent_memory_revoked_by_idx
  on public.agent_memory (revoked_by)
  where revoked_by is not null;
create index agent_learning_events_client_idx
  on public.agent_learning_events (client_id)
  where client_id is not null;
create index agent_learning_events_definition_idx
  on public.agent_learning_events (agent_definition_id);
create index agent_learning_events_run_idx
  on public.agent_learning_events (agent_run_id)
  where agent_run_id is not null;
create index agent_learning_events_reviewed_by_idx
  on public.agent_learning_events (reviewed_by)
  where reviewed_by is not null;

commit;
