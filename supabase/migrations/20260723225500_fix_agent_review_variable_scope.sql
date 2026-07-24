begin;

do $fix$
declare
  function_definition text;
begin
  select pg_get_functiondef(
    'public.review_agent_finding(uuid,text,text,text)'::regprocedure
  )
  into function_definition;

  -- The first deployed body used a local variable named stable_key, which
  -- conflicted with check_definitions.stable_key during PL/pgSQL resolution.
  -- Keep this corrective migration replay-safe: on fresh installs the source
  -- migration already uses v_stable_key and these replacements are no-ops.
  function_definition := replace(
    function_definition,
    E'\n  stable_key text;',
    E'\n  v_stable_key text;'
  );
  function_definition := replace(
    function_definition,
    E'\n  stable_key := target_exception.retry_policy->>''stable_key'';',
    E'\n  v_stable_key := target_exception.retry_policy->>''stable_key'';'
  );
  function_definition := replace(
    function_definition,
    E'where value->>''stableKey'' = stable_key',
    E'where value->>''stableKey'' = v_stable_key'
  );
  function_definition := replace(
    function_definition,
    E'and definition.stable_key = stable_key',
    E'and definition.stable_key = v_stable_key'
  );
  function_definition := replace(
    function_definition,
    E'''stable_key'', stable_key',
    E'''stable_key'', v_stable_key'
  );
  function_definition := replace(
    function_definition,
    E'''stableKey'', stable_key',
    E'''stableKey'', v_stable_key'
  );

  execute function_definition;
end;
$fix$;

commit;
