begin;

-- The durable runner now has a server-only Supabase credential in every
-- supported runtime. Capability tokens remain defense in depth, while the RPC
-- transport itself is no longer exposed through a publishable user key.
revoke execute on function public.workflow_begin_agent_run_context(uuid, text, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.workflow_begin_evidence_snapshot(uuid, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.workflow_capture_requirements(uuid, text) from public, anon, authenticated;
revoke execute on function public.workflow_complete_agent_run(uuid, text, uuid, text, jsonb, jsonb, integer) from public, anon, authenticated;
revoke execute on function public.workflow_ensure_check_definitions(uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function public.workflow_ensure_check_dependencies(uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function public.workflow_evidence_bundle(uuid, text, uuid) from public, anon, authenticated;
revoke execute on function public.workflow_finalize_evidence_snapshot(uuid, text, uuid, text, numeric, text) from public, anon, authenticated;
revoke execute on function public.workflow_recheck_plan(uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function public.workflow_record_check_revisions(uuid, text, uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.workflow_record_sentinel(uuid, text, jsonb, text) from public, anon, authenticated;
revoke execute on function public.workflow_record_source_validation(uuid, text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.workflow_service_run_context(uuid, text) from public, anon, authenticated;
revoke execute on function public.workflow_store_evidence_item(uuid, text, uuid, text, text, text, text, text, jsonb, timestamptz) from public, anon, authenticated;
revoke execute on function public.workflow_transition_service_run(uuid, text, text, text, text, text, integer, integer, jsonb, text, text, text, text) from public, anon, authenticated;

grant execute on function public.workflow_begin_agent_run_context(uuid, text, uuid, text, text) to service_role;
grant execute on function public.workflow_begin_evidence_snapshot(uuid, text, text, jsonb) to service_role;
grant execute on function public.workflow_capture_requirements(uuid, text) to service_role;
grant execute on function public.workflow_complete_agent_run(uuid, text, uuid, text, jsonb, jsonb, integer) to service_role;
grant execute on function public.workflow_ensure_check_definitions(uuid, text, jsonb) to service_role;
grant execute on function public.workflow_ensure_check_dependencies(uuid, text, jsonb) to service_role;
grant execute on function public.workflow_evidence_bundle(uuid, text, uuid) to service_role;
grant execute on function public.workflow_finalize_evidence_snapshot(uuid, text, uuid, text, numeric, text) to service_role;
grant execute on function public.workflow_recheck_plan(uuid, text, jsonb) to service_role;
grant execute on function public.workflow_record_check_revisions(uuid, text, uuid, jsonb) to service_role;
grant execute on function public.workflow_record_sentinel(uuid, text, jsonb, text) to service_role;
grant execute on function public.workflow_record_source_validation(uuid, text, text, text, text, text) to service_role;
grant execute on function public.workflow_service_run_context(uuid, text) to service_role;
grant execute on function public.workflow_store_evidence_item(uuid, text, uuid, text, text, text, text, text, jsonb, timestamptz) to service_role;
grant execute on function public.workflow_transition_service_run(uuid, text, text, text, text, text, integer, integer, jsonb, text, text, text, text) to service_role;

-- Cover both foreign keys independently. The existing partial composite index
-- starts with tenant_id and cannot satisfy deletes/updates by these columns.
create index if not exists workflow_rollout_clients_client_id_idx
  on public.workflow_rollout_clients (client_id);

create index if not exists workflow_rollout_clients_added_by_idx
  on public.workflow_rollout_clients (added_by)
  where added_by is not null;

commit;
