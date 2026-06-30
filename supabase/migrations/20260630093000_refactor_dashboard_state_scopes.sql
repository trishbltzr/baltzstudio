begin;

create table if not exists public.dashboard_project_state (
  project_id text primary key,
  project jsonb not null,
  client_email text,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint dashboard_project_state_project_object check (jsonb_typeof(project) = 'object')
);

create index if not exists dashboard_project_state_client_email_idx
  on public.dashboard_project_state (lower(client_email));

alter table public.dashboard_project_state enable row level security;

grant select, insert, update on public.dashboard_project_state to anon, authenticated;

drop policy if exists dashboard_project_state_read on public.dashboard_project_state;
create policy dashboard_project_state_read
on public.dashboard_project_state
for select
to anon, authenticated
using (true);

drop policy if exists dashboard_project_state_insert on public.dashboard_project_state;
create policy dashboard_project_state_insert
on public.dashboard_project_state
for insert
to anon, authenticated
with check (true);

drop policy if exists dashboard_project_state_update on public.dashboard_project_state;
create policy dashboard_project_state_update
on public.dashboard_project_state
for update
to anon, authenticated
using (true)
with check (true);

create table if not exists public.dashboard_user_state (
  user_email text primary key,
  selected_project_id text references public.dashboard_project_state (project_id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists dashboard_user_state_selected_project_id_idx
  on public.dashboard_user_state (selected_project_id);

alter table public.dashboard_user_state enable row level security;

grant select, insert, update on public.dashboard_user_state to anon, authenticated;

drop policy if exists dashboard_user_state_read on public.dashboard_user_state;
create policy dashboard_user_state_read
on public.dashboard_user_state
for select
to anon, authenticated
using (true);

drop policy if exists dashboard_user_state_insert on public.dashboard_user_state;
create policy dashboard_user_state_insert
on public.dashboard_user_state
for insert
to anon, authenticated
with check (true);

drop policy if exists dashboard_user_state_update on public.dashboard_user_state;
create policy dashboard_user_state_update
on public.dashboard_user_state
for update
to anon, authenticated
using (true)
with check (true);

with legacy_state as (
  select projects::jsonb as projects, selected_project_id, updated_at
  from public.dashboard_state
  where id = 'default'
),
legacy_projects as (
  select
    project,
    legacy_state.updated_at
  from legacy_state
  cross join lateral jsonb_array_elements(legacy_state.projects) as project
  where jsonb_typeof(project) = 'object'
    and coalesce(project->>'id', '') <> ''
)
insert into public.dashboard_project_state (project_id, project, client_email, updated_at)
select
  project->>'id' as project_id,
  project,
  nullif(lower(project->>'clientEmail'), '') as client_email,
  updated_at
from legacy_projects
on conflict (project_id) do update
set
  project = excluded.project,
  client_email = excluded.client_email,
  updated_at = excluded.updated_at;

with legacy_state as (
  select projects::jsonb as projects, selected_project_id, updated_at
  from public.dashboard_state
  where id = 'default'
),
legacy_client_selections as (
  select
    lower(project->>'clientEmail') as user_email,
    project->>'id' as selected_project_id,
    legacy_state.updated_at
  from legacy_state
  cross join lateral jsonb_array_elements(legacy_state.projects) as project
  where jsonb_typeof(project) = 'object'
    and coalesce(project->>'id', '') <> ''
    and coalesce(project->>'clientEmail', '') <> ''
),
legacy_studio_selections as (
  select
    studio_user.user_email,
    legacy_state.selected_project_id,
    legacy_state.updated_at
  from legacy_state
  cross join (
    values
      ('trisha@baltazarstudio.co'),
      ('manager@baltazarstudio.co')
  ) as studio_user(user_email)
)
insert into public.dashboard_user_state (user_email, selected_project_id, updated_at)
select user_email, selected_project_id, updated_at from legacy_client_selections
union all
select user_email, selected_project_id, updated_at from legacy_studio_selections
on conflict (user_email) do update
set
  selected_project_id = excluded.selected_project_id,
  updated_at = excluded.updated_at;

commit;
