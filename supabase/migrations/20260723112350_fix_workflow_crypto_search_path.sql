begin;

alter function public.prepare_service_run_dispatch(uuid)
  set search_path = pg_catalog, extensions;
alter function public.workflow_service_run_context(uuid, text)
  set search_path = pg_catalog, extensions;
alter function public.workflow_transition_service_run(uuid, text, text, text, text, text, integer, integer, jsonb, text, text, text, text)
  set search_path = pg_catalog, extensions;
alter function public.workflow_begin_evidence_snapshot(uuid, text, text, jsonb)
  set search_path = pg_catalog, extensions;
alter function public.workflow_store_evidence_item(uuid, text, uuid, text, text, text, text, text, jsonb, timestamptz)
  set search_path = pg_catalog, extensions;
alter function public.workflow_finalize_evidence_snapshot(uuid, text, uuid, text, numeric, text)
  set search_path = pg_catalog, extensions;

commit;
