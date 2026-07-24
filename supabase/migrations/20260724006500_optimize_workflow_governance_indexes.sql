create index if not exists agent_memory_revisions_changed_by_idx
  on public.agent_memory_revisions (changed_by);
create index if not exists agent_memory_revisions_tenant_id_idx
  on public.agent_memory_revisions (tenant_id);

create index if not exists agent_memory_usage_events_agent_run_id_idx
  on public.agent_memory_usage_events (agent_run_id);
create index if not exists agent_memory_usage_events_service_run_id_idx
  on public.agent_memory_usage_events (service_run_id);
create index if not exists agent_memory_usage_events_tenant_id_idx
  on public.agent_memory_usage_events (tenant_id);

create index if not exists legacy_service_run_links_client_id_idx
  on public.legacy_service_run_links (client_id);
create index if not exists legacy_service_run_links_linked_by_idx
  on public.legacy_service_run_links (linked_by);

create index if not exists migration_review_queue_proposed_client_id_idx
  on public.migration_review_queue (proposed_client_id);
create index if not exists migration_review_queue_proposed_service_run_id_idx
  on public.migration_review_queue (proposed_service_run_id);
create index if not exists migration_review_queue_reviewed_by_idx
  on public.migration_review_queue (reviewed_by);

create index if not exists projection_shadow_comparisons_client_id_idx
  on public.projection_shadow_comparisons (client_id);
create index if not exists projection_shadow_comparisons_service_run_id_idx
  on public.projection_shadow_comparisons (service_run_id);
create index if not exists projection_shadow_comparisons_reviewed_by_idx
  on public.projection_shadow_comparisons (reviewed_by);

create index if not exists workflow_alerts_owner_user_id_idx
  on public.workflow_alerts (owner_user_id);
create index if not exists workflow_alerts_service_run_id_idx
  on public.workflow_alerts (service_run_id);

create index if not exists workflow_release_controls_pilot_client_id_idx
  on public.workflow_release_controls (pilot_client_id);
create index if not exists workflow_release_controls_updated_by_idx
  on public.workflow_release_controls (updated_by);
