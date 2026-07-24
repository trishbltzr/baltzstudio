import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getRun, start } from "workflow/api";
import type { Database } from "@/lib/supabase/types";
import { serviceCheckupWorkflow } from "@/workflows/serviceCheckup";

type PortalSupabaseClient = SupabaseClient<Database>;

type RecoveredServiceRun = {
  run_id: string;
  previous_workflow_id: string | null;
  previous_state: string;
  recovered_at: string;
};

function isRecoveredServiceRun(value: unknown): value is RecoveredServiceRun {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const recovered = value as Record<string, unknown>;
  return typeof recovered.run_id === "string"
    && (recovered.previous_workflow_id === null || typeof recovered.previous_workflow_id === "string")
    && typeof recovered.previous_state === "string"
    && typeof recovered.recovered_at === "string";
}

export async function dispatchServiceRun(
  supabase: PortalSupabaseClient,
  serviceRunId: string,
) {
  const { data, error } = await supabase.rpc("prepare_service_run_dispatch", {
    p_run_id: serviceRunId,
  });
  const dispatch = data?.[0];
  if (error || !dispatch) throw new Error(error?.message || "The service run could not be dispatched.");

  try {
    const run = await start(serviceCheckupWorkflow, [{
      runId: serviceRunId,
      dispatchToken: dispatch.dispatch_token,
    }]);
    return {
      workflowRunId: run.runId,
      expiresAt: dispatch.expires_at,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workflow dispatch failed.";
    await supabase
      .from("service_runs")
      .update({
        state: "failed",
        blocker_code: "workflow_dispatch_failed",
        blocker_summary: message.slice(0, 300),
        recovery_action: "Confirm the workflow runtime is healthy, then retry this queued run.",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", serviceRunId);
    throw error;
  }
}

export async function recoverAndDispatchServiceRun(
  supabase: PortalSupabaseClient,
  serviceRunId: string,
  staleAfterSeconds = 600,
) {
  const { data, error } = await supabase.rpc("recover_stale_service_run", {
    p_run_id: serviceRunId,
    p_stale_after_seconds: staleAfterSeconds,
  });
  if (error || !isRecoveredServiceRun(data)) {
    throw new Error(error?.message || "The stale service run could not be recovered.");
  }
  const recovered = data;

  if (recovered.previous_workflow_id) {
    try {
      await getRun(recovered.previous_workflow_id).cancel();
    } catch {
      // Recovery remains valid when the original runtime no longer knows the
      // orphaned workflow. The database checkpoint is the source of truth.
    }
  }

  const dispatch = await dispatchServiceRun(supabase, recovered.run_id);
  return {
    ...dispatch,
    previousState: recovered.previous_state,
    previousWorkflowRunId: recovered.previous_workflow_id,
    recoveredAt: recovered.recovered_at,
  };
}
