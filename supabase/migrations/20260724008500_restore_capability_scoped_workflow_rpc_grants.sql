begin;

-- The durable Workflow DevKit runner can execute outside a signed-in browser
-- session. Each mutation is still authorized by a short-lived, per-run,
-- high-entropy dispatch token whose SHA-256 digest and expiry live on the
-- service run. A publishable key therefore opens only the RPC transport; it
-- does not authorize reading or mutating any run without that capability.
--
-- SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY remains preferred by the
-- server-side workflow client when configured.
grant execute on function public.workflow_begin_agent_run_context(uuid, text, uuid, text, text) to anon, authenticated;
grant execute on function public.workflow_begin_evidence_snapshot(uuid, text, text, jsonb) to anon, authenticated;
grant execute on function public.workflow_capture_requirements(uuid, text) to anon, authenticated;
grant execute on function public.workflow_complete_agent_run(uuid, text, uuid, text, jsonb, jsonb, integer) to anon, authenticated;
grant execute on function public.workflow_ensure_check_definitions(uuid, text, jsonb) to anon, authenticated;
grant execute on function public.workflow_ensure_check_dependencies(uuid, text, jsonb) to anon, authenticated;
grant execute on function public.workflow_evidence_bundle(uuid, text, uuid) to anon, authenticated;
grant execute on function public.workflow_finalize_evidence_snapshot(uuid, text, uuid, text, numeric, text) to anon, authenticated;
grant execute on function public.workflow_recheck_plan(uuid, text, jsonb) to anon, authenticated;
grant execute on function public.workflow_record_check_revisions(uuid, text, uuid, jsonb) to anon, authenticated;
grant execute on function public.workflow_record_sentinel(uuid, text, jsonb, text) to anon, authenticated;
grant execute on function public.workflow_record_source_validation(uuid, text, text, text, text, text) to anon, authenticated;
grant execute on function public.workflow_service_run_context(uuid, text) to anon, authenticated;
grant execute on function public.workflow_store_evidence_item(uuid, text, uuid, text, text, text, text, text, jsonb, timestamptz) to anon, authenticated;
grant execute on function public.workflow_transition_service_run(uuid, text, text, text, text, text, integer, integer, jsonb, text, text, text, text) to anon, authenticated;

commit;
