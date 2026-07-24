begin;

insert into public.workflow_release_controls (
  tenant_id,
  new_workflows_enabled,
  client_projection_source,
  pilot_client_id,
  rollout_note
)
select
  tenant.id,
  false,
  'legacy',
  null,
  'Internal verification complete. Production workflows remain paused until a real pilot client is explicitly assigned.'
from public.portal_tenants tenant
on conflict (tenant_id) do nothing;

commit;
