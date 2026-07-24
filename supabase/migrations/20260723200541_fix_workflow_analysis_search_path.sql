begin;

alter function public.workflow_ensure_check_definitions(uuid, text, jsonb)
  set search_path = pg_catalog, extensions;

alter function public.workflow_evidence_bundle(uuid, text, uuid)
  set search_path = pg_catalog, extensions;

alter function public.workflow_record_check_revisions(uuid, text, uuid, jsonb)
  set search_path = pg_catalog, extensions;

commit;
