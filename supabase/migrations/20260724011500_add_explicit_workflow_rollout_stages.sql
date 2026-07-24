begin;

alter table public.workflow_release_controls
  add column if not exists rollout_stage text not null default 'internal'
  check (rollout_stage in ('internal', 'pilot', 'cohort', 'general'));

update public.workflow_release_controls
set rollout_stage = case
  when not new_workflows_enabled then 'internal'
  when pilot_client_id is not null then 'pilot'
  else 'general'
end;

create table if not exists public.workflow_rollout_clients (
  tenant_id uuid not null references public.portal_tenants(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  cohort_name text not null default 'production-cohort',
  enabled boolean not null default true,
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (tenant_id, client_id)
);

create index if not exists workflow_rollout_clients_enabled_idx
  on public.workflow_rollout_clients (tenant_id, cohort_name, client_id)
  where enabled;

alter table public.workflow_rollout_clients enable row level security;

drop policy if exists workflow_rollout_clients_staff on public.workflow_rollout_clients;
create policy workflow_rollout_clients_staff
on public.workflow_rollout_clients
for all to authenticated
using (public.is_tenant_staff(tenant_id))
with check (public.is_tenant_staff(tenant_id));

grant select, insert, update, delete on public.workflow_rollout_clients to authenticated, service_role;
revoke all on public.workflow_rollout_clients from anon;

create or replace function public.enforce_workflow_release_control()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  control public.workflow_release_controls%rowtype;
begin
  if new.source_kind = 'demo' then
    return new;
  end if;

  select *
  into control
  from public.workflow_release_controls
  where tenant_id = new.tenant_id;

  if control.tenant_id is null then
    raise exception 'Production workflows require an explicit rollout control for this tenant.';
  end if;

  if not control.new_workflows_enabled or control.rollout_stage = 'internal' then
    raise exception 'New production workflows are paused for this tenant. Existing evidence and history remain available.';
  end if;

  if control.rollout_stage = 'pilot' then
    if control.pilot_client_id is null or new.client_id <> control.pilot_client_id then
      raise exception 'This durable workflow rollout is limited to the configured pilot client.';
    end if;
  elsif control.rollout_stage = 'cohort' then
    if not exists (
      select 1
      from public.workflow_rollout_clients rollout_client
      where rollout_client.tenant_id = new.tenant_id
        and rollout_client.client_id = new.client_id
        and rollout_client.enabled
    ) then
      raise exception 'This client is not enabled for the current production workflow cohort.';
    end if;
  elsif control.rollout_stage <> 'general' then
    raise exception 'Choose a valid workflow rollout stage before starting production work.';
  end if;

  return new;
end;
$$;

drop trigger if exists service_runs_release_control on public.service_runs;
create trigger service_runs_release_control
before insert on public.service_runs
for each row execute function public.enforce_workflow_release_control();

revoke all on function public.enforce_workflow_release_control() from public, anon, authenticated;

comment on column public.workflow_release_controls.rollout_stage is
  'Internal blocks production; Pilot permits one client; Cohort permits only enabled allowlist clients; General permits all production clients.';
comment on table public.workflow_rollout_clients is
  'Explicit production-client allowlist used only during the controlled cohort rollout stage.';

commit;
