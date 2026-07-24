import { NextResponse } from "next/server";
import { z } from "zod";
import { getPortalActorContext } from "@/lib/portalIntelligenceRepository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ runId: string }>;
};

const reviewSchema = z.object({
  exceptionId: z.string().uuid(),
  action: z.enum(["approve", "correct", "reject"]),
  status: z.enum(["passed", "failed", "unverified", "not_applicable"]).nullable().optional(),
  rationale: z.string().trim().max(2_000).nullable().optional(),
}).superRefine((value, context) => {
  if (value.action === "correct" && !value.status) {
    context.addIssue({
      code: "custom",
      path: ["status"],
      message: "A corrected finding needs a status.",
    });
  }
});

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { runId } = await params;
    const input = reviewSchema.parse(await request.json());
    const supabase = await createSupabaseServerClient();
    const actor = await getPortalActorContext(supabase);

    if (!actor) {
      return NextResponse.json({ error: "Sign in to review this finding." }, { status: 401 });
    }
    if (actor.role === "client") {
      return NextResponse.json({ error: "Only an admin or manager can review agent findings." }, { status: 403 });
    }

    const { data: serviceRun, error: runError } = await supabase
      .from("service_runs")
      .select("id")
      .eq("id", runId)
      .eq("tenant_id", actor.tenantId)
      .maybeSingle();
    if (runError) throw new Error(runError.message);
    if (!serviceRun) {
      return NextResponse.json({ error: "Service run not found." }, { status: 404 });
    }

    const { data: exceptionRow, error: exceptionError } = await supabase
      .from("process_exceptions")
      .select("id")
      .eq("id", input.exceptionId)
      .eq("service_run_id", serviceRun.id)
      .eq("tenant_id", actor.tenantId)
      .maybeSingle();
    if (exceptionError) throw new Error(exceptionError.message);
    if (!exceptionRow) {
      return NextResponse.json({ error: "Review item not found for this run." }, { status: 404 });
    }

    const { data, error } = await supabase.rpc("review_agent_finding", {
      p_exception_id: exceptionRow.id,
      p_action: input.action,
      p_status: input.status ?? null,
      p_rationale: input.rationale ?? null,
    });
    if (error) throw new Error(error.message);

    return NextResponse.json({ review: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: error.issues[0]?.message ?? "The review payload is invalid.",
      }, { status: 400 });
    }
    return NextResponse.json({
      error: error instanceof Error ? error.message : "The finding could not be reviewed.",
    }, { status: 500 });
  }
}
