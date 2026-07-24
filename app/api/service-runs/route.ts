import { NextResponse } from "next/server";
import { getPortalActorContext } from "@/lib/portalIntelligenceRepository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ACTIVE_STATES = ["queued", "validating", "discovering", "capturing", "checking", "reviewing", "ready", "blocked", "partial", "failed"];

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const actor = await getPortalActorContext(supabase);
    if (!actor) {
      return NextResponse.json({
        runs: [],
        role: null,
      });
    }

    const url = new URL(request.url);
    const activeOnly = url.searchParams.get("active") !== "false";
    let runQuery = supabase
      .from("service_runs")
      .select("id, client_id, service_kind, run_kind, trigger_kind, state, source_version, checklist_version, playbook_key, playbook_version, selected_check_keys, completed_targets, total_targets, checkpoint, blocker_code, blocker_summary, recovery_action, workflow_id, started_at, completed_at, created_at, updated_at")
      .eq("tenant_id", actor.tenantId)
      .order("updated_at", { ascending: false })
      .limit(40);
    if (activeOnly) runQuery = runQuery.in("state", ACTIVE_STATES);

    const { data: runs, error: runsError } = await runQuery;
    if (runsError) throw new Error(runsError.message);
    const runIds = (runs ?? []).map(run => run.id);
    const clientIds = [...new Set((runs ?? []).map(run => run.client_id))];

    const [
      { data: clients, error: clientsError },
      { data: snapshots, error: snapshotsError },
      { data: agents, error: agentsError },
      { data: exceptions, error: exceptionsError },
      { data: relatedRuns, error: relatedRunsError },
    ] = await Promise.all([
      clientIds.length
        ? supabase.from("clients").select("id, name, source_kind").in("id", clientIds)
        : Promise.resolve({ data: [], error: null }),
      runIds.length
        ? supabase.from("evidence_snapshots").select("service_run_id, status, coverage_ratio, captured_at, fresh_until").in("service_run_id", runIds).order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      runIds.length && actor.role !== "client"
        ? supabase.from("agent_runs").select("service_run_id, state, agent_version, latency_ms, token_cost, tool_trace, completed_at").in("service_run_id", runIds).order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      runIds.length
        ? supabase.from("process_exceptions").select("service_run_id, exception_kind, owner_kind, summary, recovery_action, state, created_at").in("service_run_id", runIds).eq("state", "open").order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      clientIds.length
        ? supabase
          .from("service_runs")
          .select("id, client_id, service_kind, run_kind, state, completed_at, created_at")
          .eq("tenant_id", actor.tenantId)
          .in("client_id", clientIds)
          .in("run_kind", ["baseline", "targeted_recheck", "lab_dependency_recheck", "full_refresh"])
          .order("created_at", { ascending: false })
          .limit(240)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (clientsError) throw new Error(clientsError.message);
    if (snapshotsError) throw new Error(snapshotsError.message);
    if (agentsError) throw new Error(agentsError.message);
    if (exceptionsError) throw new Error(exceptionsError.message);
    if (relatedRunsError) throw new Error(relatedRunsError.message);

    const clientsById = new Map((clients ?? []).map(client => [client.id, client]));
    const snapshotByRun = new Map<string, (typeof snapshots)[number]>();
    for (const snapshot of snapshots ?? []) {
      if (!snapshotByRun.has(snapshot.service_run_id)) snapshotByRun.set(snapshot.service_run_id, snapshot);
    }
    const agentByRun = new Map<string, (typeof agents)[number]>();
    for (const agent of agents ?? []) {
      if (!agentByRun.has(agent.service_run_id)) agentByRun.set(agent.service_run_id, agent);
    }
    const exceptionByRun = new Map<string, (typeof exceptions)[number]>();
    for (const exception of exceptions ?? []) {
      if (!exceptionByRun.has(exception.service_run_id)) exceptionByRun.set(exception.service_run_id, exception);
    }
    const baselineByClientService = new Map<string, (typeof relatedRuns)[number]>();
    const targetedByClientService = new Map<string, (typeof relatedRuns)[number]>();
    for (const related of relatedRuns ?? []) {
      const key = `${related.client_id}:${related.service_kind}`;
      if (related.run_kind === "baseline" && !baselineByClientService.has(key)) {
        baselineByClientService.set(key, related);
      }
      if (["targeted_recheck", "lab_dependency_recheck"].includes(related.run_kind) && !targetedByClientService.has(key)) {
        targetedByClientService.set(key, related);
      }
    }

    return NextResponse.json({
      runs: (runs ?? []).map(run => {
        const client = clientsById.get(run.client_id);
        const snapshot = snapshotByRun.get(run.id);
        const exception = exceptionByRun.get(run.id);
        const agent = agentByRun.get(run.id);
        const clientServiceKey = `${run.client_id}:${run.service_kind}`;
        const baseline = baselineByClientService.get(clientServiceKey);
        const targeted = targetedByClientService.get(clientServiceKey);
        const safeProgress = {
          id: run.id,
          clientId: run.client_id,
          clientName: client?.name ?? "Client",
          serviceKind: run.service_kind,
          runKind: run.run_kind,
          state: run.state,
          sourceVersion: run.source_version,
          completedTargets: run.completed_targets,
          totalTargets: run.total_targets,
          startedAt: run.started_at,
          completedAt: run.completed_at,
          updatedAt: run.updated_at,
          coverage: snapshot?.coverage_ratio ?? null,
          evidenceStatus: snapshot?.status ?? null,
          evidenceCapturedAt: snapshot?.captured_at ?? null,
          evidenceFreshUntil: snapshot?.fresh_until ?? null,
          baselineState: baseline?.state ?? null,
          baselineCompletedAt: baseline?.completed_at ?? null,
          lastTargetedRecheckAt: targeted?.completed_at ?? targeted?.created_at ?? null,
          lastTargetedRecheckState: targeted?.state ?? null,
          nextSentinelAt: snapshot?.fresh_until ?? null,
          blocker: exception?.summary ?? run.blocker_summary,
        };
        if (actor.role === "client") return safeProgress;
        return {
          ...safeProgress,
          sourceKind: client?.source_kind ?? "production",
          triggerKind: run.trigger_kind,
          sourceVersion: run.source_version,
          checklistVersion: run.checklist_version,
          playbook: `${run.playbook_key}@${run.playbook_version}`,
          selectedCheckKeys: run.selected_check_keys,
          workflowId: run.workflow_id,
          blockerCode: run.blocker_code,
          recoveryAction: exception?.recovery_action ?? run.recovery_action,
          blockerOwner: exception?.owner_kind ?? null,
          exceptionKind: exception?.exception_kind ?? null,
          agent: agent ? {
            state: agent.state,
            version: agent.agent_version,
            latencyMs: agent.latency_ms,
            tokenCost: agent.token_cost,
            toolTrace: agent.tool_trace,
            completedAt: agent.completed_at,
          } : null,
        };
      }),
      role: actor.role,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Service runs could not be loaded.",
    }, { status: 500 });
  }
}
