begin;

alter table public.client_sources
  alter column retention_until set default (timezone('utc', now()) + interval '3 years'),
  add constraint client_sources_retention_after_creation
    check (retention_until is null or retention_until > created_at);

alter table public.evidence_snapshots
  alter column retention_until set default (timezone('utc', now()) + interval '2 years'),
  add constraint evidence_snapshots_retention_after_creation
    check (retention_until is null or retention_until > created_at),
  add constraint evidence_snapshots_freshness_after_capture
    check (fresh_until is null or captured_at is null or fresh_until > captured_at);

alter table public.evidence_items
  alter column retention_until set default (timezone('utc', now()) + interval '2 years'),
  add constraint evidence_items_retention_after_creation
    check (retention_until is null or retention_until > captured_at),
  add constraint evidence_items_freshness_after_capture
    check (fresh_until is null or fresh_until > captured_at);

alter table public.agent_memory
  add constraint agent_memory_expiry_after_approval
    check (expires_at is null or expires_at > approved_at),
  add constraint agent_memory_revocation_contract
    check (
      (revoked_at is null and revoked_by is null)
      or (revoked_at is not null and revoked_by is not null)
    );

comment on column public.client_sources.retention_until is
  'Source metadata retention defaults to three years; an explicit longer or shorter approved window may be supplied.';
comment on column public.evidence_snapshots.retention_until is
  'Immutable evidence retention defaults to two years. Purge jobs may remove expired payloads while preserving non-sensitive result history.';
comment on column public.agent_memory.expires_at is
  'Optional approved-memory expiry. Expired or revoked memory is excluded from agent retrieval.';

commit;
