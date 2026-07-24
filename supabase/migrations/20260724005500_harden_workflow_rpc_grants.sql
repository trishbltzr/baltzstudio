begin;

-- Durable workflow mutations are executed only by the server-side worker.
-- Dispatch tokens remain a second boundary, not a substitute for role grants.
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

commit;
