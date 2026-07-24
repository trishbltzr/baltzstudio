begin;

create table if not exists public.portal_workspace_state (
  workspace_id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint portal_workspace_state_state_object check (jsonb_typeof(state) = 'object')
);

create index if not exists portal_workspace_state_updated_at_idx
  on public.portal_workspace_state (updated_at desc);

alter table public.portal_workspace_state enable row level security;

drop policy if exists portal_workspace_state_read on public.portal_workspace_state;
drop policy if exists portal_workspace_state_insert on public.portal_workspace_state;
drop policy if exists portal_workspace_state_update on public.portal_workspace_state;

revoke all on table public.portal_workspace_state from anon, authenticated;
grant select, insert, update, delete on table public.portal_workspace_state to service_role;

insert into storage.buckets (id, name, public)
values ('portal-uploads', 'portal-uploads', false)
on conflict (id) do update set public = false;

drop policy if exists portal_uploads_select on storage.objects;
drop policy if exists portal_uploads_insert on storage.objects;
drop policy if exists portal_uploads_update on storage.objects;

commit;
