create or replace view public.service_run_operational_metrics
with (security_invoker = true)
as
select
  run.tenant_id,
  run.id as service_run_id,
  run.client_id,
  run.service_kind,
  run.run_kind,
  run.state,
  timing.duration_seconds,
  run.completed_targets,
  run.total_targets,
  case when run.total_targets > 0
    then round(run.completed_targets::numeric / run.total_targets::numeric, 4)
    else null
  end as target_completion_ratio,
  snapshot.coverage_ratio,
  agent.latency_ms as agent_latency_ms,
  agent.token_cost as agent_token_cost,
  coalesce(event_stats.retry_count, 0) as retry_count,
  coalesce(event_stats.failure_count, 0) as failure_count,
  run.blocker_code as failure_class,
  run.run_kind in ('targeted_recheck', 'lab_dependency_recheck')
    and run.state = 'current'
    and run.total_targets = 0 as no_op,
  coalesce(stage_stats.stage_duration_seconds, '{}'::jsonb) as stage_duration_seconds,
  coalesce(evidence_stats.evidence_item_count, 0) as evidence_item_count,
  case when timing.duration_seconds > 0
    then round((coalesce(evidence_stats.evidence_item_count, 0) * 60.0 / timing.duration_seconds)::numeric, 2)
    else null
  end as page_evidence_throughput_per_minute,
  case when timing.duration_seconds > 0
    then round((run.completed_targets * 60.0 / timing.duration_seconds)::numeric, 2)
    else null
  end as check_throughput_per_minute,
  coalesce(agent.tool_call_count, 0) as agent_tool_call_count,
  approval.approval_turnaround_seconds,
  coalesce(exceptions.regression_count, 0) as regression_count
from public.service_runs run
cross join lateral (
  select extract(epoch from (
    coalesce(run.completed_at, timezone('utc', now()))
    - coalesce(run.started_at, run.created_at)
  ))::bigint as duration_seconds
) timing
left join lateral (
  select evidence.coverage_ratio
  from public.evidence_snapshots evidence
  where evidence.service_run_id = run.id
  order by evidence.created_at desc
  limit 1
) snapshot on true
left join lateral (
  select
    agent_run.latency_ms,
    agent_run.token_cost,
    case
      when jsonb_typeof(agent_run.tool_trace) = 'array'
        then jsonb_array_length(agent_run.tool_trace)
      else 0
    end as tool_call_count
  from public.agent_runs agent_run
  where agent_run.service_run_id = run.id
  order by agent_run.created_at desc
  limit 1
) agent on true
left join lateral (
  select
    count(*) filter (where event.event_kind ilike '%retry%')::integer as retry_count,
    count(*) filter (where event.state in ('failed', 'blocked', 'partial'))::integer as failure_count
  from public.run_events event
  where event.service_run_id = run.id
) event_stats on true
left join lateral (
  select jsonb_object_agg(stage, seconds order by stage) as stage_duration_seconds
  from (
    select
      timed.state as stage,
      greatest(0, round(sum(extract(epoch from (timed.next_at - timed.occurred_at)))))::bigint as seconds
    from (
      select
        event.state,
        event.occurred_at,
        lead(
          event.occurred_at,
          1,
          coalesce(run.completed_at, timezone('utc', now()))
        ) over (order by event.occurred_at, event.id) as next_at
      from public.run_events event
      where event.service_run_id = run.id
        and event.state is not null
    ) timed
    group by timed.state
  ) durations
) stage_stats on true
left join lateral (
  select count(item.id)::integer as evidence_item_count
  from public.evidence_snapshots evidence
  left join public.evidence_items item on item.evidence_snapshot_id = evidence.id
  where evidence.service_run_id = run.id
) evidence_stats on true
left join lateral (
  select round(avg(extract(epoch from (handoff.approved_at - handoff.created_at))))::bigint
    as approval_turnaround_seconds
  from public.service_handoffs handoff
  where handoff.source_service_run_id = run.id
    and handoff.approved_at is not null
) approval on true
left join lateral (
  select count(*) filter (where exception.exception_kind = 'regression')::integer as regression_count
  from public.process_exceptions exception
  where exception.service_run_id = run.id
) exceptions on true;

grant select on public.service_run_operational_metrics to authenticated, service_role;

comment on view public.service_run_operational_metrics is
  'Operational quality for durable Checkups: total and per-stage duration, page/check throughput, retries, coverage, agent token/tool cost, approval turnaround, regressions, no-op rate, and failure class.';
