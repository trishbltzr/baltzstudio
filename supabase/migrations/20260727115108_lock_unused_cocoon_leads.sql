drop policy if exists "Public can submit Cocoon leads"
  on public.cocoon_leads;

revoke all privileges on table public.cocoon_leads
  from anon, authenticated;
