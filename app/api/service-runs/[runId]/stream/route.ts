import { getRun } from "workflow/api";
import { getPortalActorContext } from "@/lib/portalIntelligenceRepository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ runId: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { runId } = await params;
  const supabase = await createSupabaseServerClient();
  const actor = await getPortalActorContext(supabase);
  if (!actor) return Response.json({ error: "Sign in to stream this run." }, { status: 401 });

  const { data: serviceRun, error } = await supabase
    .from("service_runs")
    .select("workflow_id")
    .eq("id", runId)
    .eq("tenant_id", actor.tenantId)
    .maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!serviceRun?.workflow_id) return Response.json({ error: "This run has no active workflow." }, { status: 404 });

  let workflowRun;
  try {
    workflowRun = getRun(serviceRun.workflow_id);
    if (!await workflowRun.exists) throw new Error("Workflow run not found.");
  } catch {
    return Response.json({ error: "Workflow run not found." }, { status: 404 });
  }

  const readable = workflowRun.getReadable({ startIndex: -30 });
  const encoder = new TextEncoder();
  const sseStream = readable.pipeThrough(new TransformStream({
    transform(chunk, controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
    },
  }));

  return new Response(sseStream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
