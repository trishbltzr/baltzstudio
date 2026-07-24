begin;

alter function public.workflow_begin_agent_run_context(uuid, text, uuid, text, text)
  set search_path = pg_catalog, extensions;

alter function public.workflow_complete_agent_run(uuid, text, uuid, text, jsonb, jsonb, integer)
  set search_path = pg_catalog, extensions;

commit;
