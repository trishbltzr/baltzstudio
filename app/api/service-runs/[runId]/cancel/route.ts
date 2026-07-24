import { NextResponse } from "next/server";
import { getRun } from "workflow/api";
import { getPortalActorContext } from "@/lib/portalIntelligenceRepository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ runId: string }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const { runId } = await params;
    const supabase = await createSupabaseServerClient();
    const actor = await getPortalActorContext(supabase);
    if (!actor) return NextResponse.json({ error: "Sign in to cancel this run." }, { status: 401 });
    if (actor.role === "client") {
      return NextResponse.json({ error: "Only studio staff can cancel a service run." }, { status: 403 });
    }

    const { data: serviceRun, error } = await supabase
      .from("service_runs")
      .select("id, workflow_id, state")
      .eq("id", runId)
      .eq("tenant_id", actor.tenantId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!serviceRun) return NextResponse.json({ error: "Service run not found." }, { status: 404 });

    if (serviceRun.workflow_id) {
      try {
        await getRun(serviceRun.workflow_id).cancel();
      } catch {
        // The canonical database state is still cancelled if the workflow runtime
        // has already completed or no longer knows this run.
      }
    }

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("service_runs")
      .update({
        state: "cancelled",
        cancelled_at: now,
        completed_at: now,
        blocker_code: null,
        blocker_summary: null,
        recovery_action: null,
        updated_at: now,
      })
      .eq("id", serviceRun.id);
    if (updateError) throw new Error(updateError.message);

    const { error: agentUpdateError } = await supabase
      .from("agent_runs")
      .update({
        state: "cancelled",
        completed_at: now,
      })
      .eq("service_run_id", serviceRun.id)
      .eq("tenant_id", actor.tenantId)
      .in("state", ["queued", "running"]);
    if (agentUpdateError) throw new Error(agentUpdateError.message);

    const { error: eventError } = await supabase.from("run_events").insert({
      tenant_id: actor.tenantId,
      service_run_id: serviceRun.id,
      event_kind: "workflow.cancelled",
      state: "cancelled",
      message: "Run cancelled by studio staff.",
      idempotency_key: "workflow.cancelled",
    });
    if (eventError && eventError.code !== "23505") throw new Error(eventError.message);

    return NextResponse.json({ runId: serviceRun.id, state: "cancelled" });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "The service run could not be cancelled.",
    }, { status: 500 });
  }
}
