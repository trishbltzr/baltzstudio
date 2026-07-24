begin;

alter table public.portal_access_requests enable row level security;

revoke all on table public.portal_access_requests from anon, authenticated;
grant insert on table public.portal_access_requests to anon, authenticated;

drop policy if exists portal_access_requests_insert on public.portal_access_requests;
create policy portal_access_requests_insert
on public.portal_access_requests
for insert
to anon, authenticated
with check (
  length(trim(requested_name)) between 1 and 120
  and length(trim(requested_email)) between 3 and 320
  and requested_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  and (business_name is null or length(trim(business_name)) <= 180)
  and (note is null or length(trim(note)) <= 2000)
  and status = 'new'
);

commit;
