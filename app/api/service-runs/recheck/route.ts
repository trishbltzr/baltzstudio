import { NextResponse } from "next/server";
import { z } from "zod";
import { getPortalActorContext } from "@/lib/portalIntelligenceRepository";
import { dispatchServiceRun } from "@/lib/serviceRunWorkflow";
import {
  FULL_REFRESH_TRIGGERS,
  fullRefreshTriggerKind,
  validateFullRefreshRequest,
} from "@/lib/serviceRunGovernance";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const requestSchema = z.object({
  clientId: z.string().uuid(),
  serviceKind: z.enum(["brand", "website", "seo"]),
  scope: z.enum(["all_actionable", "failed", "unverified", "changed", "full"]).default("all_actionable"),
  reason: z.enum(["failed_or_unverified", "lab_dependency", "manual", "full_refresh"]).default("failed_or_unverified"),
  fullRefreshTrigger: z.enum(Object.keys(FULL_REFRESH_TRIGGERS) as [
    keyof typeof FULL_REFRESH_TRIGGERS,
    ...(keyof typeof FULL_REFRESH_TRIGGERS)[],
  ]).optional(),
  checkKeys: z.array(z.string().regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/)).max(100).default([]),
}).superRefine((value, context) => {
  const issue = validateFullRefreshRequest(value.scope, value.reason, value.fullRefreshTrigger);
  if (issue) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: issue.includes("scope") ? ["scope"] : ["fullRefreshTrigger"],
      message: issue,
    });
  }
});

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    const requestKey = request.headers.get("Idempotency-Key")?.trim();
    if (!requestKey || requestKey.length > 160) {
      return NextResponse.json({
        error: "Provide an Idempotency-Key of at most 160 characters.",
      }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const actor = await getPortalActorContext(supabase);
    if (!actor) {
      return NextResponse.json({ error: "Sign in to request a recheck." }, { status: 401 });
    }
    if (actor.role === "client") {
      return NextResponse.json({ error: "Only studio staff can request a recheck." }, { status: 403 });
    }

    const [{ data: client, error: clientError }, { data: source, error: sourceError }, { data: baseline, error: baselineError }] = await Promise.all([
      supabase
        .from("clients")
        .select("id")
        .eq("id", input.clientId)
        .eq("tenant_id", actor.tenantId)
        .maybeSingle(),
      supabase
        .from("client_sources")
        .select("version")
        .eq("client_id", input.clientId)
        .eq("tenant_id", actor.tenantId)
        .eq("source_kind", "domain")
        .eq("validation_state", "valid")
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("service_runs")
        .select("id, baseline_run_id, playbook_key, playbook_version, checklist_version")
        .eq("client_id", input.clientId)
        .eq("tenant_id", actor.tenantId)
        .eq("service_kind", input.serviceKind)
        .in("state", ["ready", "current", "partial"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (clientError) throw new Error(clientError.message);
    if (sourceError) throw new Error(sourceError.message);
    if (baselineError) throw new Error(baselineError.message);
    if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });
    if (!source) {
      return NextResponse.json({
        error: "A validated client domain is required before rechecking.",
      }, { status: 409 });
    }

    const idempotencyKey = `recheck:${actor.tenantId}:${requestKey}`;
    const { data: existing, error: existingError } = await supabase
      .from("service_runs")
      .select("id, state, workflow_id")
      .eq("tenant_id", actor.tenantId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);
    if (existing) {
      return NextResponse.json({ run: existing, replayed: true }, { status: 200 });
    }

    const { data: serviceRun, error: insertError } = await supabase
      .from("service_runs")
      .insert({
        tenant_id: actor.tenantId,
        client_id: input.clientId,
        service_kind: input.serviceKind,
        run_kind: input.scope === "full"
          ? "full_refresh"
          : input.reason === "lab_dependency" ? "lab_dependency_recheck" : "targeted_recheck",
        trigger_kind: input.scope === "full"
          ? fullRefreshTriggerKind(input.fullRefreshTrigger!)
          : input.reason === "lab_dependency" ? "lab_request" : "manual",
        recheck_scope: input.scope,
        state: "queued",
        idempotency_key: idempotencyKey,
        parent_run_id: baseline?.id ?? null,
        baseline_run_id: baseline?.baseline_run_id ?? baseline?.id ?? null,
        source_version: source.version,
        playbook_key: baseline?.playbook_key ?? "checkup-core",
        playbook_version: baseline?.playbook_version ?? 1,
        checklist_version: baseline?.checklist_version ?? 1,
        selected_check_keys: [...new Set(input.checkKeys)],
        total_targets: input.checkKeys.length,
        owner_user_id: actor.userId,
        checkpoint: {
          requested_by: actor.userId,
          request_reason: input.reason,
          recheck_scope: input.scope,
          full_refresh_trigger: input.fullRefreshTrigger ?? null,
          requested_check_keys: [...new Set(input.checkKeys)],
          full_rerun: input.scope === "full",
        },
      })
      .select("id, state")
      .single();
    if (insertError) throw new Error(insertError.message);

    const dispatch = await dispatchServiceRun(supabase, serviceRun.id);
    return NextResponse.json({
      run: serviceRun,
      replayed: false,
      scope: input.scope,
      fullRefreshTrigger: input.fullRefreshTrigger ?? null,
      dispatch,
    }, { status: 202 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: error.issues[0]?.message ?? "The recheck request is invalid.",
      }, { status: 400 });
    }
    return NextResponse.json({
      error: error instanceof Error ? error.message : "The recheck could not be created.",
    }, { status: 500 });
  }
}
