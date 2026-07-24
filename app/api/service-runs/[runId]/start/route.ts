import { NextResponse } from "next/server";
import { dispatchServiceRun } from "@/lib/serviceRunWorkflow";
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
    if (!actor) return NextResponse.json({ error: "Sign in to start this run." }, { status: 401 });
    if (actor.role === "client") {
      return NextResponse.json({ error: "Only studio staff can start a service run." }, { status: 403 });
    }

    const { data: serviceRun, error } = await supabase
      .from("service_runs")
      .select("id, tenant_id, state")
      .eq("id", runId)
      .eq("tenant_id", actor.tenantId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!serviceRun) return NextResponse.json({ error: "Service run not found." }, { status: 404 });

    const dispatch = await dispatchServiceRun(supabase, serviceRun.id);
    return NextResponse.json({
      runId: serviceRun.id,
      workflowRunId: dispatch.workflowRunId,
      status: "queued",
    }, { status: 202 });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "The service run could not be started.",
    }, { status: 500 });
  }
}
