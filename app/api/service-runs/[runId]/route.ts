import { NextResponse } from "next/server";
import { getRun } from "workflow/api";
import { getPortalActorContext } from "@/lib/portalIntelligenceRepository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ runId: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { runId } = await params;
    const supabase = await createSupabaseServerClient();
    const actor = await getPortalActorContext(supabase);
    if (!actor) return NextResponse.json({ error: "Sign in to view this run." }, { status: 401 });

    const clientSafe = actor.role === "client";
    const [{ data: serviceRun, error: runError }, { data: events, error: eventsError }] = await Promise.all([
      supabase
        .from("service_runs")
        .select(clientSafe
          ? "id, client_id, service_kind, run_kind, state, completed_targets, total_targets, started_at, completed_at, created_at, updated_at"
          : "*")
        .eq("id", runId)
        .eq("tenant_id", actor.tenantId)
        .maybeSingle(),
      clientSafe
        ? Promise.resolve({ data: [], error: null })
        : supabase
          .from("run_events")
          .select("*")
          .eq("service_run_id", runId)
          .eq("tenant_id", actor.tenantId)
          .order("occurred_at"),
    ]);
    if (runError) throw new Error(runError.message);
    if (eventsError) throw new Error(eventsError.message);
    if (!serviceRun) return NextResponse.json({ error: "Service run not found." }, { status: 404 });

    let workflowStatus: string | null = null;
    const workflowId = !clientSafe && "workflow_id" in serviceRun && typeof serviceRun.workflow_id === "string"
      ? serviceRun.workflow_id
      : null;
    if (workflowId) {
      try {
        workflowStatus = await getRun(workflowId).status;
      } catch {
        workflowStatus = "unavailable";
      }
    }

    return NextResponse.json(clientSafe
      ? { run: serviceRun, events: [] }
      : { run: serviceRun, events: events ?? [], workflowStatus });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "The service run could not be loaded.",
    }, { status: 500 });
  }
}
