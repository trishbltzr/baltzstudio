begin;

alter table public.portal_chat_turns
  add column if not exists retention_until timestamptz
    not null
    default (timezone('utc', now()) + interval '1 year');

alter table public.portal_chat_turns
  drop constraint if exists portal_chat_turns_retention_after_creation,
  add constraint portal_chat_turns_retention_after_creation
    check (retention_until > created_at);

update public.clients
set archived_at = coalesce(archived_at, timezone('utc', now()))
where status = 'archived';

update public.clients
set archived_at = null
where status <> 'archived'
  and archived_at is not null;

alter table public.clients
  drop constraint if exists clients_archive_state_consistent,
  add constraint clients_archive_state_consistent
    check ((status = 'archived') = (archived_at is not null));

create index if not exists portal_chat_turns_retention_until_idx
  on public.portal_chat_turns (retention_until);

comment on column public.portal_chat_turns.retention_until is
  'Chat content defaults to one year of retention. Any purge remains an explicit, owner-approved maintenance action.';
comment on column public.clients.archived_at is
  'Soft-deletion timestamp. Archived clients remain restorable and must use status=archived; active or paused clients keep this null.';

commit;
