begin;

alter function public.prepare_service_run_dispatch(uuid)
  set search_path = 'pg_catalog', 'extensions';

commit;
