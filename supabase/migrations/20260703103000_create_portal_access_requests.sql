begin;

create table if not exists public.portal_access_requests (
  id uuid primary key default gen_random_uuid(),
  requested_name text not null,
  requested_email text not null,
  business_name text,
  note text,
  status text not null default 'new',
  requested_at timestamptz not null default timezone('utc', now()),
  constraint portal_access_requests_status_check check (status in ('new', 'reviewed', 'invited', 'declined'))
);

create index if not exists portal_access_requests_requested_at_idx
  on public.portal_access_requests (requested_at desc);

create index if not exists portal_access_requests_requested_email_idx
  on public.portal_access_requests (lower(requested_email));

alter table public.portal_access_requests enable row level security;

revoke all on table public.portal_access_requests from anon, authenticated;
grant insert on public.portal_access_requests to anon, authenticated;

drop policy if exists portal_access_requests_insert on public.portal_access_requests;
create policy portal_access_requests_insert
on public.portal_access_requests
for insert
to anon, authenticated
with check (true);

commit;
