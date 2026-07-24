begin;

drop policy if exists portal_chat_turns_select_scoped
on public.portal_chat_turns;

create policy portal_chat_turns_select_scoped
on public.portal_chat_turns
for select
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.portal_tenant_memberships membership
    where membership.tenant_id = portal_chat_turns.tenant_id
      and membership.user_id = (select auth.uid())
      and membership.role in ('admin', 'manager')
  )
);

commit;
