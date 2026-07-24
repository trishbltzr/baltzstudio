begin;

create index evidence_items_tenant_idx
  on public.evidence_items (tenant_id);
create index run_events_tenant_idx
  on public.run_events (tenant_id);

commit;
