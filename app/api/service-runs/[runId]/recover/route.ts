import { NextResponse } from "next/server";
import { getPortalActorContext } from "@/lib/portalIntelligenceRepository";
import { dispatchServiceRun, recoverAndDispatchServiceRun } from "@/lib/serviceRunWorkflow";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ runId: string }>;
};

const DIRECTLY_RESUMABLE_STATES = new Set(["blocked", "failed", "partial"]);
const STALE_RECOVERY_STATES = new Set([
  "queued",
  "validating",
  "discovering",
  "capturing",
  "checking",
  "reviewing",
  "ready",
]);

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const { runId } = await params;
    const supabase = await createSupabaseServerClient();
    const actor = await getPortalActorContext(supabase);
    if (!actor) {
      return NextResponse.json({ error: "Sign in to resume this service run." }, { status: 401 });
    }
    if (actor.role === "client") {
      return NextResponse.json({ error: "Only studio staff can resume service runs." }, { status: 403 });
    }

    const { data: run, error: runError } = await supabase
      .from("service_runs")
      .select("id, state, blocker_code")
      .eq("id", runId)
      .eq("tenant_id", actor.tenantId)
      .maybeSingle();
    if (runError) throw new Error(runError.message);
    if (!run) return NextResponse.json({ error: "Service run not found." }, { status: 404 });

    if (DIRECTLY_RESUMABLE_STATES.has(run.state)) {
      const dispatch = await dispatchServiceRun(supabase, run.id);
      return NextResponse.json({
        runId: run.id,
        resumedFrom: run.state,
        recoveredFromCheckpoint: run.blocker_code === "workflow_stalled",
        dispatch,
      }, { status: 202 });
    }

    if (!STALE_RECOVERY_STATES.has(run.state)) {
      return NextResponse.json({
        error: `A ${run.state} service run cannot be resumed.`,
      }, { status: 409 });
    }

    const recovery = await recoverAndDispatchServiceRun(supabase, run.id);
    return NextResponse.json({
      runId: run.id,
      resumedFrom: recovery.previousState,
      recoveredFromCheckpoint: true,
      recovery,
    }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The service run could not be resumed.";
    const status = /still active|cannot be resumed|Only non-terminal/.test(message) ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
