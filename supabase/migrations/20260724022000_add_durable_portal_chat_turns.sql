begin;

create table public.portal_chat_turns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.portal_tenants(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id text not null check (char_length(session_id) between 1 and 160),
  request_id text not null check (char_length(request_id) between 1 and 160),
  request_hash text not null check (request_hash ~ '^[a-f0-9]{64}$'),
  user_message text not null check (char_length(user_message) between 1 and 4000),
  assistant_message text not null default '',
  actions jsonb not null default '[]'::jsonb check (jsonb_typeof(actions) = 'array'),
  tool_activity jsonb not null default '[]'::jsonb check (jsonb_typeof(tool_activity) = 'array'),
  outcome jsonb not null default '{}'::jsonb check (jsonb_typeof(outcome) = 'object'),
  model text,
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  latency_ms integer not null check (latency_ms >= 0),
  status text not null default 'completed' check (status in ('completed', 'failed')),
  error text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, request_id)
);

create index portal_chat_turns_tenant_created_idx
  on public.portal_chat_turns (tenant_id, created_at desc);

create index portal_chat_turns_client_created_idx
  on public.portal_chat_turns (client_id, created_at desc)
  where client_id is not null;

create index portal_chat_turns_session_created_idx
  on public.portal_chat_turns (user_id, session_id, created_at);

alter table public.portal_chat_turns enable row level security;

revoke all on table public.portal_chat_turns from anon, authenticated;
grant select on table public.portal_chat_turns to authenticated;
grant select, insert, update, delete on table public.portal_chat_turns to service_role;

create policy portal_chat_turns_select_scoped
on public.portal_chat_turns
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.portal_tenant_memberships membership
    where membership.tenant_id = portal_chat_turns.tenant_id
      and membership.user_id = auth.uid()
      and membership.role in ('admin', 'manager')
  )
);

comment on table public.portal_chat_turns is
  'Durable, tenant-scoped Snapshot chat turns, action decisions, outcomes, and usage measurements.';

commit;
