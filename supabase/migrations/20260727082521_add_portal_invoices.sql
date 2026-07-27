begin;

create table if not exists public.portal_invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.portal_tenants(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  invoice_number text not null check (char_length(trim(invoice_number)) between 1 and 80),
  status text not null default 'Draft' check (
    status in ('Draft', 'Sent', 'Viewed', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled')
  ),
  recipient_email text,
  currency text not null default 'GBP' check (currency ~ '^[A-Z]{3}$'),
  total numeric(14,2) not null default 0 check (total >= 0),
  due_date date,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  sent_at timestamptz,
  unique (tenant_id, invoice_number)
);

create index if not exists portal_invoices_tenant_updated_idx
  on public.portal_invoices (tenant_id, updated_at desc);
create index if not exists portal_invoices_client_updated_idx
  on public.portal_invoices (client_id, updated_at desc)
  where client_id is not null;

alter table public.portal_invoices enable row level security;
revoke all on table public.portal_invoices from anon, authenticated;
grant select, insert, update, delete on table public.portal_invoices to authenticated;
grant select, insert, update, delete on table public.portal_invoices to service_role;

create policy portal_invoices_select_membership
on public.portal_invoices for select
to authenticated
using (
  exists (
    select 1
    from public.portal_tenant_memberships membership
    where membership.tenant_id = portal_invoices.tenant_id
      and membership.user_id = (select auth.uid())
      and (
        membership.role in ('admin', 'manager')
        or (
          membership.role = 'client'
          and membership.client_id = portal_invoices.client_id
          and portal_invoices.status <> 'Draft'
        )
      )
  )
);

create policy portal_invoices_insert_studio
on public.portal_invoices for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1
    from public.portal_tenant_memberships membership
    where membership.tenant_id = portal_invoices.tenant_id
      and membership.user_id = (select auth.uid())
      and membership.role in ('admin', 'manager')
  )
);

create policy portal_invoices_update_studio
on public.portal_invoices for update
to authenticated
using (
  exists (
    select 1
    from public.portal_tenant_memberships membership
    where membership.tenant_id = portal_invoices.tenant_id
      and membership.user_id = (select auth.uid())
      and membership.role in ('admin', 'manager')
  )
)
with check (
  exists (
    select 1
    from public.portal_tenant_memberships membership
    where membership.tenant_id = portal_invoices.tenant_id
      and membership.user_id = (select auth.uid())
      and membership.role in ('admin', 'manager')
  )
);

create policy portal_invoices_delete_studio
on public.portal_invoices for delete
to authenticated
using (
  exists (
    select 1
    from public.portal_tenant_memberships membership
    where membership.tenant_id = portal_invoices.tenant_id
      and membership.user_id = (select auth.uid())
      and membership.role in ('admin', 'manager')
  )
);

commit;
