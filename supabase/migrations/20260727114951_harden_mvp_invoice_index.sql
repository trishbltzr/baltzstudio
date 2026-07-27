create index if not exists portal_invoices_created_by_idx
  on public.portal_invoices (created_by)
  where created_by is not null;
