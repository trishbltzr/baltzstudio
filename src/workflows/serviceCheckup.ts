/**
 * Service Checkup workflow — the durable background engine behind the Checkups
 * (website audit) product. Runs server-side via the `workflow` runtime, NOT in
 * the browser, so Node built-ins (e.g. `node:crypto`) are unavailable here.
 *
 * Given a run id, `serviceCheckupWorkflow` (bottom of file): loads run context →
 * validates the sources → opens an evidence snapshot and crawls/renders the
 * live site → stores each evidence item → ensures the check definitions and
 * dependencies → runs the governed audit agents → writes results back. Every
 * step is persisted through a Supabase RPC so an interrupted run can resume.
 * Content hashes (see `contentHash`) are stored alongside evidence/agent runs
 * purely to detect what changed between runs.
 */
import { createClient } from "@supabase/supabase-js";
import { FatalError, RetryableError, getStepMetadata, getWorkflowMetadata, getWritable } from "workflow";
import { collectWebsiteEvidence } from "@/lib/renderedWebsiteEvidence";
import { runLighthouse } from "@/lib/pageSpeedServer";
import {
  analyzeWebsiteEvidence,
  isWorkflowEvidenceBundle,
  websiteCheckDependencySeeds,
  websiteCheckDefinitionSeeds,
  type WorkflowCheckRevisionInput,
} from "@/lib/serviceCheckupAnalysis";
import {
  qualitativeReviewOutputSchema,
  type GovernedAgentDefinition,
  type GovernedAgentMemory,
  type QualitativeTarget,
} from "@/lib/serviceAgent/contracts";
import { runGovernedQualitativeReview } from "@/lib/serviceAgent/runtime";
import { inspectSourceSentinel } from "@/lib/sourceSentinel";
import { scanWebsite, validatePublicWebsiteUrl } from "@/lib/websiteScanner";
import type { Json } from "@/lib/supabase/types";

export type ServiceCheckupWorkflowInput = {
  runId: string;
  dispatchToken: string;
};

export type ServiceCheckupWorkflowEvent = {
  type: "state" | "progress" | "partial" | "complete";
  runId: string;
  state: string;
  message: string;
  completed: number;
  total: number;
  occurredAt: string;
};

type WorkflowContext = {
  run_id: string;
  tenant_id: string;
  client_id: string;
  service_kind: "brand" | "website" | "seo" | "funnel" | "social";
  run_kind: "baseline" | "targeted_recheck" | "full_refresh" | "lab_dependency_recheck";
  state: string;
  source_version: number;
  selected_check_keys: string[];
  completed_targets: number;
  total_targets: number;
  source_id: string;
  source_url: string;
  sitemap_url: string | null;
  normalized_domain: string;
  checkpoint: Json;
};

type CaptureResult = {
  url: string;
  ok: boolean;
  itemCount: number;
  error?: string;
};

type DiscoveredTarget = {
  url: string;
  selectionReason: string;
  selectionRank: number;
};

type LighthouseResult = {
  ok: boolean;
  itemCount: number;
  error?: string;
};

type WorkflowAgentContext = {
  agentRun: {
    id: string;
    state: string;
    output: Json;
  };
  definition: GovernedAgentDefinition;
  memory: GovernedAgentMemory[];
  targets: QualitativeTarget[];
};

export type RecheckPlan = {
  targetCount: number;
  noOp: boolean;
  captureMode: "none" | "technical" | "performance" | "representative";
  changedDependencies: string[];
  targets: Array<{
    stableKey: string;
    title: string;
    reason: string;
    currentStatus: string | null;
    verifiedAt: string | null;
    dependencyKinds: string[];
  }>;
};

export type CaptureRequirements = {
  renderedStrategies: Array<"mobile" | "desktop">;
  lighthouseStrategies: Array<"mobile" | "desktop">;
  includeTechnical: boolean;
  definitionCount: number;
};

const FRESH_FOR_SECONDS = 7 * 24 * 60 * 60;
export const SERVICE_CHECKUP_PHASE_RANK: Record<string, number> = {
  validating: 0,
  "recheck-planned": 0,
  discovering: 1,
  capturing: 2,
  checking: 3,
  reviewing: 4,
  ready: 5,
  current: 6,
};

type ResumeCheckpoint = {
  phase: string;
  pages: DiscoveredTarget[];
  snapshotId: string | null;
  captured: Array<{ url: string; ok: boolean }>;
  failedPages: Array<{ url: string; error?: string }>;
  lighthouseAvailable: boolean | null;
  coverage: number | null;
};

export function parseServiceCheckupResumeCheckpoint(value: Json): ResumeCheckpoint | null {
  if (!isObject(value) || typeof value.phase !== "string" || !(value.phase in SERVICE_CHECKUP_PHASE_RANK)) return null;
  const pages = Array.isArray(value.pages)
    ? value.pages.flatMap(page => {
      if (!isObject(page) || typeof page.url !== "string") return [];
      return [{
        url: page.url,
        selectionReason: typeof page.selectionReason === "string" ? page.selectionReason : "Recovered from the durable checkpoint.",
        selectionRank: typeof page.selectionRank === "number" ? page.selectionRank : 0,
      }];
    })
    : [];
  const captured = Array.isArray(value.captured)
    ? value.captured.flatMap(item => isObject(item) && typeof item.url === "string" && typeof item.ok === "boolean"
      ? [{ url: item.url, ok: item.ok }]
      : [])
    : [];
  const failedPages = Array.isArray(value.failedPages)
    ? value.failedPages.flatMap(item => isObject(item) && typeof item.url === "string"
      ? [{ url: item.url, error: typeof item.error === "string" ? item.error : undefined }]
      : [])
    : [];
  return {
    phase: value.phase,
    pages,
    snapshotId: typeof value.snapshotId === "string" ? value.snapshotId : null,
    captured,
    failedPages,
    lighthouseAvailable: typeof value.lighthouseAvailable === "boolean" ? value.lighthouseAvailable : null,
    coverage: typeof value.coverage === "number" ? value.coverage : null,
  };
}

function parseCaptureRequirements(value: unknown): CaptureRequirements {
  if (!isObject(value)) {
    return { renderedStrategies: [], lighthouseStrategies: [], includeTechnical: false, definitionCount: 0 };
  }
  const strategies = (candidate: unknown) => Array.isArray(candidate)
    ? candidate.filter((item): item is "mobile" | "desktop" => item === "mobile" || item === "desktop")
    : [];
  return {
    renderedStrategies: strategies(value.rendered_strategies),
    lighthouseStrategies: strategies(value.lighthouse_strategies),
    includeTechnical: value.include_technical === true,
    definitionCount: typeof value.definition_count === "number" ? value.definition_count : 0,
  };
}

export function serviceCheckupCaptureRequirementsForPlan(plan: RecheckPlan): CaptureRequirements {
  const keys = plan.targets.map(target => target.stableKey);
  const dependencies = new Set(plan.targets.flatMap(target => target.dependencyKinds));
  const renderedStrategies: CaptureRequirements["renderedStrategies"] = [];
  if (keys.some(key => !key.startsWith("website.mobile-") && key !== "website.seo-07")) renderedStrategies.push("desktop");
  if (keys.some(key => key.startsWith("website.mobile-") || key.startsWith("website.accessibility-"))) renderedStrategies.push("mobile");
  const lighthouseStrategies: CaptureRequirements["lighthouseStrategies"] = [];
  if (dependencies.has("lighthouse_mobile")) lighthouseStrategies.push("mobile");
  if (dependencies.has("lighthouse_desktop")) lighthouseStrategies.push("desktop");
  return {
    renderedStrategies,
    lighthouseStrategies,
    includeTechnical: ["domain", "sitemap", "robots"].some(kind => dependencies.has(kind)),
    definitionCount: keys.length,
  };
}

export function serviceCheckupRemainingCaptureUrls(
  phase: string | null,
  candidateUrls: string[],
  captured: Array<{ url: string }>,
) {
  if (phase && (SERVICE_CHECKUP_PHASE_RANK[phase] ?? -1) >= SERVICE_CHECKUP_PHASE_RANK.checking) return [];
  const completedUrls = new Set(captured.map(item => item.url));
  return candidateUrls.filter(url => !completedUrls.has(url));
}

function workflowClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serverKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serverKey) {
    throw new FatalError(
      "Supabase workflow configuration is missing its server-only secret.",
    );
  }
  return createClient(url, serverKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

// Non-crypto change-detection fingerprint (cyrb53). Node's crypto isn't
// available inside workflow functions; this is only used to detect whether a
// stored value changed, not for anything security-sensitive.
function contentHash(value: unknown) {
  const str = JSON.stringify(value) ?? "";
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0");
}

function cleanError(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 320) : String(error).slice(0, 320);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function workflowErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  if (isObject(error)) {
    for (const candidate of [error.message, error.error, error.stack]) {
      if (typeof candidate === "string" && candidate.trim()) return candidate;
    }
  }
  return fallback;
}

function parseWorkflowAgentContext(value: unknown): WorkflowAgentContext | null {
  if (!isObject(value) || !isObject(value.agent_run) || !isObject(value.definition)) return null;
  const definition = value.definition;
  if (
    typeof value.agent_run.id !== "string"
    || typeof value.agent_run.state !== "string"
    || typeof definition.id !== "string"
    || typeof definition.stable_key !== "string"
    || typeof definition.version !== "number"
    || typeof definition.name !== "string"
    || typeof definition.instructions !== "string"
    || !Array.isArray(definition.allowed_tools)
    || typeof definition.playbook_key !== "string"
    || typeof definition.playbook_version !== "number"
    || !Array.isArray(value.memory)
    || !Array.isArray(value.targets)
  ) return null;

  return {
    agentRun: {
      id: value.agent_run.id,
      state: value.agent_run.state,
      output: (value.agent_run.output ?? {}) as Json,
    },
    definition: {
      id: definition.id,
      stableKey: definition.stable_key,
      version: definition.version,
      name: definition.name,
      instructions: definition.instructions,
      allowedTools: definition.allowed_tools.filter((tool): tool is string => typeof tool === "string"),
      memoryPolicy: (definition.memory_policy ?? {}) as Json,
      approvalRequirements: (definition.approval_requirements ?? {}) as Json,
      playbookKey: definition.playbook_key,
      playbookVersion: definition.playbook_version,
    },
    memory: value.memory.flatMap(memory => {
      if (
        !isObject(memory)
        || typeof memory.id !== "string"
        || typeof memory.memory_kind !== "string"
        || typeof memory.source_kind !== "string"
        || typeof memory.source_reference !== "string"
        || typeof memory.confidence !== "number"
        || typeof memory.approved_at !== "string"
      ) return [];
      return [{
        id: memory.id,
        memoryKind: memory.memory_kind,
        content: (memory.content ?? {}) as Json,
        sourceKind: memory.source_kind,
        sourceReference: memory.source_reference,
        confidence: memory.confidence,
        approvedAt: memory.approved_at,
        expiresAt: typeof memory.expires_at === "string" ? memory.expires_at : null,
      }];
    }),
    targets: value.targets.flatMap(target => {
      if (
        !isObject(target)
        || typeof target.stable_key !== "string"
        || typeof target.title !== "string"
        || typeof target.description !== "string"
        || typeof target.required !== "boolean"
      ) return [];
      return [{
        stableKey: target.stable_key,
        title: target.title,
        description: target.description,
        required: target.required,
        formula: (target.formula ?? {}) as Json,
      }];
    }),
  };
}

function parseRecheckPlan(value: unknown): RecheckPlan | null {
  if (
    !isObject(value)
    || typeof value.targetCount !== "number"
    || typeof value.noOp !== "boolean"
    || !["none", "technical", "performance", "representative"].includes(String(value.captureMode))
    || !Array.isArray(value.changedDependencies)
    || !Array.isArray(value.targets)
  ) return null;
  return {
    targetCount: value.targetCount,
    noOp: value.noOp,
    captureMode: value.captureMode as RecheckPlan["captureMode"],
    changedDependencies: value.changedDependencies.filter((item): item is string => typeof item === "string"),
    targets: value.targets.flatMap(target => {
      if (!isObject(target) || typeof target.stableKey !== "string" || typeof target.reason !== "string") return [];
      return [{
        stableKey: target.stableKey,
        title: typeof target.title === "string" ? target.title : target.stableKey,
        reason: target.reason,
        currentStatus: typeof target.currentStatus === "string" ? target.currentStatus : null,
        verifiedAt: typeof target.verifiedAt === "string" ? target.verifiedAt : null,
        dependencyKinds: Array.isArray(target.dependencyKinds)
          ? target.dependencyKinds.filter((item): item is string => typeof item === "string")
          : [],
      }];
    }),
  };
}

async function emit(event: ServiceCheckupWorkflowEvent) {
  const writer = getWritable<ServiceCheckupWorkflowEvent>().getWriter();
  try {
    await writer.write(event);
  } finally {
    writer.releaseLock();
  }
}

async function getContext(input: ServiceCheckupWorkflowInput): Promise<{ context: WorkflowContext; workflowRunId: string }> {
  "use step";
  console.log(`[serviceCheckup.getContext] START runId=${input.runId}`);
  const { workflowRunId } = getWorkflowMetadata();
  const supabase = workflowClient();
  const { data, error } = await supabase.rpc("workflow_service_run_context", {
    p_run_id: input.runId,
    p_dispatch_token: input.dispatchToken,
  });
  if (error || !data || typeof data !== "object" || Array.isArray(data)) {
    console.error(`[serviceCheckup.getContext] FAIL runId=${input.runId} error=${error?.message || "missing context"}`);
    throw new FatalError(error?.message || "Service run context was not found.");
  }
  const context = data as unknown as WorkflowContext;
  console.log(`[serviceCheckup.getContext] DONE runId=${input.runId} source=${context.source_url}`);
  return { context, workflowRunId };
}

async function transition(
  input: ServiceCheckupWorkflowInput,
  update: {
    state: string;
    eventKind: string;
    eventKey: string;
    message: string;
    completed: number;
    total: number;
    checkpoint?: Json;
    workflowId?: string;
    blockerCode?: string;
    blockerSummary?: string;
    recoveryAction?: string;
  },
) {
  "use step";
  console.log(`[serviceCheckup.transition] START runId=${input.runId} state=${update.state}`);
  const supabase = workflowClient();
  const { data, error } = await supabase.rpc("workflow_transition_service_run", {
    p_run_id: input.runId,
    p_dispatch_token: input.dispatchToken,
    p_state: update.state,
    p_event_kind: update.eventKind,
    p_message: update.message,
    p_event_key: update.eventKey,
    p_completed_targets: update.completed,
    p_total_targets: update.total,
    ...(update.checkpoint ? { p_checkpoint: update.checkpoint } : {}),
    ...(update.workflowId ? { p_workflow_id: update.workflowId } : {}),
    ...(update.blockerCode ? { p_blocker_code: update.blockerCode } : {}),
    ...(update.blockerSummary ? { p_blocker_summary: update.blockerSummary } : {}),
    ...(update.recoveryAction ? { p_recovery_action: update.recoveryAction } : {}),
  });
  if (error) {
    console.error(`[serviceCheckup.transition] FAIL runId=${input.runId} state=${update.state} error=${error.message}`);
    throw new FatalError(error.message);
  }
  if (data === false) throw new FatalError("Service run was cancelled.");
  await emit({
    type: update.state === "partial" ? "partial" : update.state === "current" ? "complete" : update.eventKind.includes("progress") ? "progress" : "state",
    runId: input.runId,
    state: update.state,
    message: update.message,
    completed: update.completed,
    total: update.total,
    occurredAt: new Date().toISOString(),
  });
  console.log(`[serviceCheckup.transition] DONE runId=${input.runId} state=${update.state}`);
}

async function discoverTargets(
  input: ServiceCheckupWorkflowInput,
  sourceUrl: string,
): Promise<{ pages: DiscoveredTarget[]; error?: string }> {
  "use step";
  const attempt = getStepMetadata().attempt;
  console.log(`[serviceCheckup.discoverTargets] START runId=${input.runId} attempt=${attempt} source=${sourceUrl}`);
  try {
    const pages = await scanWebsite(sourceUrl);
    if (!pages.length) throw new Error("No public page with enough content was discovered.");
    const selected = pages
      .filter((page, index, all) => all.findIndex(candidate => candidate.url === page.url) === index)
      .slice(0, 7)
      .map(page => ({
        url: page.url,
        selectionReason: page.selectionReason,
        selectionRank: page.selectionRank,
      }));
    console.log(`[serviceCheckup.discoverTargets] DONE runId=${input.runId} pages=${selected.length}`);
    return { pages: selected };
  } catch (error) {
    const message = cleanError(error);
    console.error(`[serviceCheckup.discoverTargets] FAIL runId=${input.runId} attempt=${attempt} error=${message}`);
    if (attempt < 3) throw new RetryableError(message, { retryAfter: `${attempt * 5}s` });
    return { pages: [], error: message };
  }
}
discoverTargets.maxRetries = 2;

async function validateSource(
  input: ServiceCheckupWorkflowInput,
  sourceUrl: string,
): Promise<{ ok: boolean; normalizedUrl?: string; normalizedDomain?: string; error?: string }> {
  "use step";
  const attempt = getStepMetadata().attempt;
  const supabase = workflowClient();
  try {
    const validated = await validatePublicWebsiteUrl(sourceUrl);
    const { error } = await supabase.rpc("workflow_record_source_validation", {
      p_run_id: input.runId,
      p_dispatch_token: input.dispatchToken,
      p_validation_state: "valid",
      p_validation_message: "Public website source validated.",
      p_normalized_domain: validated.normalizedDomain,
      p_source_url: validated.normalizedUrl,
    });
    if (error) throw new FatalError(error.message);
    return { ok: true, ...validated };
  } catch (error) {
    if (error instanceof FatalError) throw error;
    const message = cleanError(error);
    if (attempt < 3) throw new RetryableError(message, { retryAfter: `${attempt * 4}s` });
    const { error: persistenceError } = await supabase.rpc("workflow_record_source_validation", {
      p_run_id: input.runId,
      p_dispatch_token: input.dispatchToken,
      p_validation_state: "invalid",
      p_validation_message: message,
      p_normalized_domain: null,
      p_source_url: null,
    });
    if (persistenceError) throw new FatalError(persistenceError.message);
    return { ok: false, error: message };
  }
}
validateSource.maxRetries = 2;

async function beginSnapshot(
  input: ServiceCheckupWorkflowInput,
  context: WorkflowContext,
  pages: DiscoveredTarget[],
) {
  "use step";
  console.log(`[serviceCheckup.beginSnapshot] START runId=${input.runId}`);
  const supabase = workflowClient();
  const { data, error } = await supabase.rpc("workflow_begin_evidence_snapshot", {
    p_run_id: input.runId,
    p_dispatch_token: input.dispatchToken,
    p_idempotency_key: `${input.runId}:evidence:v1`,
    p_provenance: {
      collector: "baltazar-rendered-evidence",
      collector_version: 1,
      source_version: context.source_version,
      requested_pages: pages,
    },
  });
  if (error || !data) {
    console.error(`[serviceCheckup.beginSnapshot] FAIL runId=${input.runId} error=${error?.message || "missing snapshot id"}`);
    throw new FatalError(error?.message || "Evidence snapshot could not be created.");
  }
  console.log(`[serviceCheckup.beginSnapshot] DONE runId=${input.runId} snapshotId=${data}`);
  return data;
}

async function storeItem(
  input: ServiceCheckupWorkflowInput,
  snapshotId: string,
  item: {
    sourceKind: string;
    sourceLocator: string;
    deviceKind: "desktop" | "mobile" | null;
    status: "verified" | "partial" | "unsupported" | "failed";
    payload: Json;
  },
) {
  const supabase = workflowClient();
  const valueFingerprint = contentHash(item.payload);
  const freshUntil = new Date(Date.now() + FRESH_FOR_SECONDS * 1_000).toISOString();
  const { error } = await supabase.rpc("workflow_store_evidence_item", {
    p_run_id: input.runId,
    p_dispatch_token: input.dispatchToken,
    p_snapshot_id: snapshotId,
    p_source_kind: item.sourceKind,
    p_source_locator: item.sourceLocator,
    p_device_kind: item.deviceKind,
    p_fingerprint: valueFingerprint,
    p_status: item.status,
    p_payload: item.payload,
    p_fresh_until: freshUntil,
  });
  if (error) throw new Error(error.message);
}

async function capturePage(
  input: ServiceCheckupWorkflowInput,
  snapshotId: string,
  url: string,
  includeTechnical: boolean,
  strategies: Array<"mobile" | "desktop">,
): Promise<CaptureResult> {
  "use step";
  const attempt = getStepMetadata().attempt;
  console.log(`[serviceCheckup.capturePage] START runId=${input.runId} attempt=${attempt} url=${url}`);
  try {
    const context = await getRunState(input);
    if (context.state === "cancelled") throw new FatalError("Service run was cancelled.");
    const bundle = await collectWebsiteEvidence([url], strategies, includeTechnical);
    if (strategies.length > 0 && !bundle.rendered.length) {
      throw new Error(`${strategies.join(" and ")} rendered capture failed.`);
    }
    for (const rendered of bundle.rendered) {
      await storeItem(input, snapshotId, {
        sourceKind: "rendered_page",
        sourceLocator: rendered.url,
        deviceKind: rendered.strategy,
        status: "verified",
        payload: rendered as unknown as Json,
      });
    }
    if (includeTechnical) {
      await storeItem(input, snapshotId, {
        sourceKind: "technical",
        sourceLocator: url,
        deviceKind: null,
        status: "verified",
        payload: bundle.technical as unknown as Json,
      });
    }
    const itemCount = bundle.rendered.length + (includeTechnical ? 1 : 0);
    console.log(`[serviceCheckup.capturePage] DONE runId=${input.runId} url=${url} items=${itemCount}`);
    return { url, ok: true, itemCount };
  } catch (error) {
    if (error instanceof FatalError) throw error;
    const message = cleanError(error);
    console.error(`[serviceCheckup.capturePage] FAIL runId=${input.runId} attempt=${attempt} url=${url} error=${message}`);
    if (attempt < 3) throw new RetryableError(message, { retryAfter: `${attempt * 10}s` });
    await storeItem(input, snapshotId, {
      sourceKind: "rendered_page",
      sourceLocator: url,
      deviceKind: null,
      status: "failed",
      payload: { error: message },
    });
    return { url, ok: false, itemCount: 1, error: message };
  }
}
capturePage.maxRetries = 2;

async function captureLighthouse(
  input: ServiceCheckupWorkflowInput,
  snapshotId: string,
  url: string,
  strategies: Array<"mobile" | "desktop">,
): Promise<LighthouseResult> {
  "use step";
  const attempt = getStepMetadata().attempt;
  console.log(`[serviceCheckup.captureLighthouse] START runId=${input.runId} attempt=${attempt} url=${url}`);
  try {
    const context = await getRunState(input);
    if (context.state === "cancelled") throw new FatalError("Service run was cancelled.");
    const runs = await runLighthouse(url, strategies);
    if (!runs.length) throw new Error(`${strategies.join(" and ")} Lighthouse capture failed.`);
    for (const run of runs) {
      await storeItem(input, snapshotId, {
        sourceKind: "lighthouse",
        sourceLocator: run.testedUrl,
        deviceKind: run.strategy,
        status: "verified",
        payload: run as unknown as Json,
      });
    }
    console.log(`[serviceCheckup.captureLighthouse] DONE runId=${input.runId} items=${runs.length}`);
    return { ok: true, itemCount: runs.length };
  } catch (error) {
    if (error instanceof FatalError) throw error;
    const message = cleanError(error);
    console.error(`[serviceCheckup.captureLighthouse] FAIL runId=${input.runId} attempt=${attempt} error=${message}`);
    if (attempt < 2) throw new RetryableError(message, { retryAfter: "20s" });
    await storeItem(input, snapshotId, {
      sourceKind: "lighthouse",
      sourceLocator: url,
      deviceKind: null,
      status: "unsupported",
      payload: { error: message },
    });
    return { ok: false, itemCount: 1, error: message };
  }
}
captureLighthouse.maxRetries = 1;

async function loadCaptureRequirements(input: ServiceCheckupWorkflowInput) {
  "use step";
  const supabase = workflowClient();
  const { data, error } = await supabase.rpc("workflow_capture_requirements", {
    p_run_id: input.runId,
    p_dispatch_token: input.dispatchToken,
  });
  if (error) throw new FatalError(error.message);
  return parseCaptureRequirements(data);
}

async function getRunState(input: ServiceCheckupWorkflowInput) {
  const supabase = workflowClient();
  const { data, error } = await supabase.rpc("workflow_service_run_context", {
    p_run_id: input.runId,
    p_dispatch_token: input.dispatchToken,
  });
  if (error || !data || typeof data !== "object" || Array.isArray(data)) {
    throw new FatalError(error?.message || "Service run context was not found.");
  }
  return data as unknown as WorkflowContext;
}

async function finalizeSnapshot(
  input: ServiceCheckupWorkflowInput,
  snapshotId: string,
  status: "ready" | "partial",
  coverage: number,
  summary: Json,
) {
  "use step";
  console.log(`[serviceCheckup.finalizeSnapshot] START runId=${input.runId} status=${status}`);
  const supabase = workflowClient();
  const { error } = await supabase.rpc("workflow_finalize_evidence_snapshot", {
    p_run_id: input.runId,
    p_dispatch_token: input.dispatchToken,
    p_snapshot_id: snapshotId,
    p_status: status,
    p_coverage_ratio: coverage,
    p_fingerprint: contentHash(summary),
  });
  if (error) {
    console.error(`[serviceCheckup.finalizeSnapshot] FAIL runId=${input.runId} error=${error.message}`);
    throw new FatalError(error.message);
  }
  console.log(`[serviceCheckup.finalizeSnapshot] DONE runId=${input.runId}`);
}

async function ensureWebsiteCheckDefinitions(input: ServiceCheckupWorkflowInput) {
  "use step";
  const supabase = workflowClient();
  const definitions = websiteCheckDefinitionSeeds();
  const { error } = await supabase.rpc("workflow_ensure_check_definitions", {
    p_run_id: input.runId,
    p_dispatch_token: input.dispatchToken,
    p_definitions: definitions as unknown as Json,
  });
  if (error) throw new FatalError(error.message);
  return definitions.length;
}

async function ensureWebsiteCheckDependencies(input: ServiceCheckupWorkflowInput) {
  "use step";
  const supabase = workflowClient();
  const dependencies = websiteCheckDependencySeeds();
  const { error } = await supabase.rpc("workflow_ensure_check_dependencies", {
    p_run_id: input.runId,
    p_dispatch_token: input.dispatchToken,
    p_dependencies: dependencies as unknown as Json,
  });
  if (error) throw new FatalError(error.message);
  return dependencies.length;
}

async function runSourceSentinel(
  input: ServiceCheckupWorkflowInput,
  sourceUrl: string,
  sitemapUrl: string | null,
) {
  "use step";
  const sentinel = await inspectSourceSentinel(sourceUrl, sitemapUrl);
  const supabase = workflowClient();
  const { data, error } = await supabase.rpc("workflow_record_sentinel", {
    p_run_id: input.runId,
    p_dispatch_token: input.dispatchToken,
    p_payload: sentinel as unknown as Json,
    p_fingerprint: contentHash(sentinel),
  });
  if (
    error
    || !isObject(data)
    || !Array.isArray(data.changedDependencies)
    || typeof data.noChange !== "boolean"
  ) {
    throw new FatalError(error?.message || "The source sentinel could not be persisted.");
  }
  return {
    sentinel,
    changedDependencies: data.changedDependencies.filter((item): item is string => typeof item === "string"),
    noChange: data.noChange,
  };
}

async function createRecheckPlan(
  input: ServiceCheckupWorkflowInput,
  changedDependencies: string[],
) {
  "use step";
  const supabase = workflowClient();
  const { data, error } = await supabase.rpc("workflow_recheck_plan", {
    p_run_id: input.runId,
    p_dispatch_token: input.dispatchToken,
    p_changed_dependencies: changedDependencies,
  });
  const plan = parseRecheckPlan(data);
  if (error || !plan) throw new FatalError(error?.message || "The targeted recheck plan could not be created.");
  return plan;
}

async function loadEvidenceBundle(
  input: ServiceCheckupWorkflowInput,
  snapshotId: string,
) {
  "use step";
  const supabase = workflowClient();
  const { data, error } = await supabase.rpc("workflow_evidence_bundle", {
    p_run_id: input.runId,
    p_dispatch_token: input.dispatchToken,
    p_snapshot_id: snapshotId,
  });
  if (error || !isWorkflowEvidenceBundle(data)) {
    throw new FatalError(error?.message || "The captured evidence could not be loaded for analysis.");
  }
  return data;
}

async function analyzeWebsiteSnapshot(
  runId: string,
  snapshot: Awaited<ReturnType<typeof loadEvidenceBundle>>,
) {
  "use step";
  return analyzeWebsiteEvidence(runId, snapshot);
}

async function persistCheckRevisions(
  input: ServiceCheckupWorkflowInput,
  snapshotId: string,
  results: WorkflowCheckRevisionInput[],
) {
  "use step";
  const supabase = workflowClient();
  const { data, error } = await supabase.rpc("workflow_record_check_revisions", {
    p_run_id: input.runId,
    p_dispatch_token: input.dispatchToken,
    p_snapshot_id: snapshotId,
    p_results: results as unknown as Json,
  });
  if (error || !data || typeof data !== "object" || Array.isArray(data)) {
    throw new FatalError(error?.message || "Checklist revisions could not be persisted.");
  }
  return data;
}

async function beginGovernedAgentRun(
  input: ServiceCheckupWorkflowInput,
  snapshotId: string,
) {
  "use step";
  const supabase = workflowClient();
  const { data, error } = await supabase.rpc("workflow_begin_agent_run_context", {
    p_run_id: input.runId,
    p_dispatch_token: input.dispatchToken,
    p_snapshot_id: snapshotId,
    p_stage_key: "reviewing",
    p_idempotency_key: `${input.runId}:agent:qualitative-review:v1`,
  });
  const context = parseWorkflowAgentContext(data);
  if (error || !context) {
    throw new FatalError(error?.message || "The governed agent context could not be loaded.");
  }
  return context;
}

async function executeGovernedAgentReview(
  input: ServiceCheckupWorkflowInput,
  context: WorkflowContext,
  agentContext: WorkflowAgentContext,
  evidence: Awaited<ReturnType<typeof loadEvidenceBundle>>,
) {
  "use step";
  const replayed = qualitativeReviewOutputSchema.safeParse(agentContext.agentRun.output);
  if (["completed", "awaiting_review", "partial"].includes(agentContext.agentRun.state) && replayed.success) {
    return {
      findings: replayed.data.findings,
      runSummary: replayed.data.runSummary,
      toolTrace: [],
      latencyMs: 0,
      model: "replayed",
    };
  }
  return runGovernedQualitativeReview({
    runId: input.runId,
    clientId: context.client_id,
    serviceKind: context.service_kind,
    stageKey: "reviewing",
    definition: agentContext.definition,
    memory: agentContext.memory,
    targets: agentContext.targets,
    evidence: evidence.items.map(item => ({
      id: item.id,
      sourceKind: item.source_kind,
      sourceLocator: item.source_locator,
      deviceKind: item.device_kind,
      status: item.status,
      fingerprint: item.fingerprint,
      payload: item.payload,
      capturedAt: item.captured_at,
      freshUntil: item.fresh_until,
    })),
  });
}
executeGovernedAgentReview.maxRetries = 0;

async function completeGovernedAgentRun(
  input: ServiceCheckupWorkflowInput,
  agentRunId: string,
  result: Awaited<ReturnType<typeof executeGovernedAgentReview>>,
) {
  "use step";
  const supabase = workflowClient();
  const output = {
    findings: result.findings,
    runSummary: result.runSummary,
    model: result.model,
  };
  const reviewCount = result.findings.filter(finding => finding.requiresHumanReview).length;
  const { data, error } = await supabase.rpc("workflow_complete_agent_run", {
    p_run_id: input.runId,
    p_dispatch_token: input.dispatchToken,
    p_agent_run_id: agentRunId,
    p_state: reviewCount ? "awaiting_review" : "completed",
    p_output: output as unknown as Json,
    p_tool_trace: result.toolTrace as unknown as Json,
    p_latency_ms: result.latencyMs,
  });
  if (error || !isObject(data)) throw new FatalError(error?.message || "The governed agent run could not be completed.");
  return { reviewCount, output, completion: data as Json };
}

async function failGovernedAgentRun(
  input: ServiceCheckupWorkflowInput,
  agentRunId: string,
  errorMessage: string,
) {
  "use step";
  const supabase = workflowClient();
  const output = {
    findings: [],
    runSummary: "Governed review did not complete. The verified deterministic results remain available.",
    error: errorMessage,
  };
  const { data, error } = await supabase.rpc("workflow_complete_agent_run", {
    p_run_id: input.runId,
    p_dispatch_token: input.dispatchToken,
    p_agent_run_id: agentRunId,
    p_state: "failed",
    p_output: output as unknown as Json,
    p_tool_trace: [] as Json,
    p_latency_ms: 0,
  });
  if (error || !isObject(data)) throw new FatalError(error?.message || "The governed agent failure could not be persisted.");
  return data as Json;
}

function agentCheckRevisions(
  runId: string,
  snapshotId: string,
  agentDefinition: GovernedAgentDefinition,
  findings: Awaited<ReturnType<typeof executeGovernedAgentReview>>["findings"],
): WorkflowCheckRevisionInput[] {
  return findings
    .filter(finding => !finding.requiresHumanReview && finding.confidence >= 0.8)
    .map(finding => ({
      stable_key: finding.stableKey,
      status: finding.status,
      evidence_item_ids: finding.evidenceItemIds,
      evidence_fingerprint: contentHash({
        snapshotId,
        stableKey: finding.stableKey,
        evidenceItemIds: finding.evidenceItemIds,
      }),
      verifier_kind: "agent",
      verifier_id: `${agentDefinition.stableKey}@${agentDefinition.version}`,
      confidence: finding.confidence,
      limitations: finding.limitations,
      rationale: finding.rationale,
      idempotency_key: `${runId}:agent-check:${finding.stableKey}:snapshot:${snapshotId}:v${agentDefinition.version}`,
    }));
}

export async function serviceCheckupWorkflow(input: ServiceCheckupWorkflowInput) {
  "use workflow";
  console.log(`[serviceCheckupWorkflow] START runId=${input.runId}`);

  const { context, workflowRunId } = await getContext(input);
  const resumeCheckpoint = parseServiceCheckupResumeCheckpoint(context.checkpoint);
  const resumeRank = resumeCheckpoint ? SERVICE_CHECKUP_PHASE_RANK[resumeCheckpoint.phase] : -1;
  await transition(input, {
    state: "validating",
    eventKind: "workflow.validating",
    eventKey: "workflow.validating",
    message: resumeCheckpoint ? `Resuming from the saved ${resumeCheckpoint.phase} checkpoint.` : "Validating the source and crawl boundary.",
    workflowId: workflowRunId,
    completed: 0,
    total: 0,
    checkpoint: resumeCheckpoint ? context.checkpoint : { phase: "validating" },
  });
  const validation = await validateSource(input, context.source_url);
  if (!validation.ok) {
    await transition(input, {
      state: "blocked",
      eventKind: "workflow.validation_blocked",
      eventKey: "workflow.validation_blocked",
      message: "The client source is not a valid public website.",
      completed: 0,
      total: 0,
      checkpoint: { phase: "validating", error: validation.error || "Invalid source" },
      blockerCode: "source_invalid",
      blockerSummary: validation.error || "The supplied source did not pass public-domain validation.",
      recoveryAction: "Correct the client domain or access configuration, then retry this run.",
    });
    return { runId: input.runId, state: "blocked", captured: 0, failed: 0 };
  }

  let recheckPlan: RecheckPlan | null = null;
  const isSelectiveRun = context.run_kind === "targeted_recheck"
    || context.run_kind === "lab_dependency_recheck";
  if (context.service_kind === "website") {
    await ensureWebsiteCheckDefinitions(input);
    await ensureWebsiteCheckDependencies(input);
  }
  if (isSelectiveRun) {
    const sentinel = await runSourceSentinel(
      input,
      validation.normalizedUrl || context.source_url,
      context.sitemap_url,
    );
    recheckPlan = await createRecheckPlan(input, sentinel.changedDependencies);
    await transition(input, {
      state: "validating",
      eventKind: "workflow.recheck_planned",
      eventKey: "workflow.recheck_planned",
      message: recheckPlan.noOp
        ? "No changed, failed, unverified, or stale checks need work."
        : `${recheckPlan.targetCount} check${recheckPlan.targetCount === 1 ? "" : "s"} selected for a targeted recheck.`,
      completed: 0,
      total: recheckPlan.targetCount,
      checkpoint: {
        phase: "recheck-planned",
        sentinel: {
          noChange: sentinel.noChange,
          changedDependencies: sentinel.changedDependencies,
          failures: sentinel.sentinel.failures,
        },
        recheckPlan: recheckPlan as unknown as Json,
      },
    });
    if (recheckPlan.noOp) {
      await transition(input, {
        state: "current",
        eventKind: "workflow.noop",
        eventKey: "workflow.noop",
        message: "Evidence remains current. No crawl or result revision was created.",
        completed: 0,
        total: 0,
        checkpoint: {
          phase: "current",
          noOp: true,
          changedDependencies: sentinel.changedDependencies,
        },
      });
      return { runId: input.runId, state: "current", captured: 0, failed: 0, noOp: true };
    }
  }

  const captureRequirements = recheckPlan
    ? serviceCheckupCaptureRequirementsForPlan(recheckPlan)
    : await loadCaptureRequirements(input);
  if (captureRequirements.definitionCount === 0) {
    await transition(input, {
      state: "blocked",
      eventKind: "workflow.checklist_blocked",
      eventKey: "workflow.checklist_blocked",
      message: "The published checklist has no capture requirements.",
      completed: 0,
      total: 0,
      checkpoint: { phase: "validating", captureRequirements: captureRequirements as unknown as Json },
      blockerCode: "checklist_capture_scope_missing",
      blockerSummary: "No published Checkup definition matched this run.",
      recoveryAction: "Publish or bind the required checklist version, then retry this run.",
    });
    return { runId: input.runId, state: "blocked", captured: 0, failed: 0 };
  }

  const pageLimit = recheckPlan?.captureMode === "representative" ? 3
    : recheckPlan ? 1
      : 7;
  let selectedPages = resumeCheckpoint && resumeRank >= SERVICE_CHECKUP_PHASE_RANK.discovering
    ? resumeCheckpoint.pages.slice(0, pageLimit)
    : [];
  if (!selectedPages.length) {
    const discovery = await discoverTargets(input, validation.normalizedUrl || context.source_url);
    if (!discovery.pages.length) {
      await transition(input, {
        state: "blocked",
        eventKind: "workflow.discovery_blocked",
        eventKey: "workflow.discovery_blocked",
        message: "The source could not be opened after three attempts.",
        completed: 0,
        total: 0,
        checkpoint: { phase: "discovering", error: discovery.error || "No pages discovered" },
        blockerCode: "source_unreachable",
        blockerSummary: discovery.error || "No public pages were discovered.",
        recoveryAction: "Confirm the public domain, access rules, and crawl permissions, then retry this run.",
      });
      return { runId: input.runId, state: "blocked", captured: 0, failed: 0 };
    }
    selectedPages = discovery.pages.slice(0, pageLimit);
  }
  const pageCaptureEnabled = captureRequirements.renderedStrategies.length > 0 || captureRequirements.includeTechnical;
  const pageCaptureCount = pageCaptureEnabled
    ? captureRequirements.renderedStrategies.length > 0
      ? selectedPages.length
      : Math.min(selectedPages.length, 1)
    : 0;
  const lighthouseCaptureCount = captureRequirements.lighthouseStrategies.length > 0 ? 1 : 0;
  const captureTotal = pageCaptureCount + lighthouseCaptureCount;
  const total = Math.max(captureTotal, recheckPlan?.targetCount ?? 0);
  const pageUrls = selectedPages.map(page => page.url);
  await transition(input, {
    state: "discovering",
    eventKind: "workflow.discovery_complete",
    eventKey: "workflow.discovery_complete",
    message: resumeCheckpoint && resumeRank >= SERVICE_CHECKUP_PHASE_RANK.discovering
      ? `${selectedPages.length} saved page target${selectedPages.length === 1 ? "" : "s"} restored from the checkpoint.`
      : `${selectedPages.length} public page${selectedPages.length === 1 ? "" : "s"} selected for this run.`,
    completed: 0,
    total,
    checkpoint: {
      phase: "discovering",
      pages: selectedPages,
      recheckPlan: recheckPlan as unknown as Json,
      captureRequirements: captureRequirements as unknown as Json,
    },
  });

  const snapshotId = resumeCheckpoint?.snapshotId || await beginSnapshot(input, context, selectedPages);
  await transition(input, {
    state: "capturing",
    eventKind: "workflow.capture_started",
    eventKey: "workflow.capture_started",
    message: resumeCheckpoint && resumeRank >= SERVICE_CHECKUP_PHASE_RANK.capturing
      ? "Resuming the unfinished checklist-scoped evidence capture."
      : `Capturing the published checklist scope: ${[
        ...captureRequirements.renderedStrategies.map(strategy => `${strategy} page`),
        ...captureRequirements.lighthouseStrategies.map(strategy => `${strategy} Lighthouse`),
        ...(captureRequirements.includeTechnical ? ["technical"] : []),
      ].join(", ")}.`,
    completed: resumeCheckpoint?.captured.filter(result => result.ok).length || 0,
    total,
    checkpoint: {
      phase: "capturing",
      pages: selectedPages,
      snapshotId,
      recheckPlan: recheckPlan as unknown as Json,
      captureRequirements: captureRequirements as unknown as Json,
    },
  });

  const captures: CaptureResult[] = resumeCheckpoint && resumeRank >= SERVICE_CHECKUP_PHASE_RANK.checking
    ? selectedPages.map(page => ({
      url: page.url,
      ok: !resumeCheckpoint.failedPages.some(failed => failed.url === page.url),
      itemCount: 0,
      error: resumeCheckpoint.failedPages.find(failed => failed.url === page.url)?.error,
    }))
    : (resumeCheckpoint?.captured || []).map(result => ({ ...result, itemCount: 0 }));
  const captureUrls = captureRequirements.renderedStrategies.length > 0
    ? pageUrls
    : captureRequirements.includeTechnical
      ? pageUrls.slice(0, 1)
      : [];
  const remainingUrls = serviceCheckupRemainingCaptureUrls(
    resumeCheckpoint?.phase ?? null,
    captureUrls,
    captures,
  );
  for (let index = 0; index < remainingUrls.length; index += 2) {
    const batch = remainingUrls.slice(index, index + 2);
    const batchResults = await Promise.all(
      batch.map(url => capturePage(
        input,
        snapshotId,
        url,
        captureRequirements.includeTechnical && pageUrls.indexOf(url) === 0,
        captureRequirements.renderedStrategies,
      )),
    );
    captures.push(...batchResults);
    await transition(input, {
      state: "capturing",
      eventKind: "workflow.capture_progress",
      eventKey: `workflow.capture_progress.${captures.length}`,
      message: `${captures.length} of ${selectedPages.length} page targets captured.`,
      completed: captures.length,
      total,
      checkpoint: {
        phase: "capturing",
        pages: selectedPages,
        snapshotId,
        captured: captures.map(result => ({ url: result.url, ok: result.ok })),
        captureRequirements: captureRequirements as unknown as Json,
      },
    });
  }

  const lighthouseRequired = captureRequirements.lighthouseStrategies.length > 0;
  const lighthouse: LighthouseResult = !lighthouseRequired
    ? { ok: true, itemCount: 0 }
    : resumeCheckpoint && resumeRank >= SERVICE_CHECKUP_PHASE_RANK.checking
    ? {
      ok: resumeCheckpoint.lighthouseAvailable === true,
      itemCount: 0,
      ...(resumeCheckpoint.lighthouseAvailable === true ? {} : { error: "Lighthouse was unavailable before recovery." }),
    }
    : await captureLighthouse(input, snapshotId, pageUrls[0], captureRequirements.lighthouseStrategies);
  const completed = total;
  const successfulTargets = captures.filter(result => result.ok).length + (lighthouseRequired && lighthouse.ok ? 1 : 0);
  const coverage = captureTotal ? successfulTargets / captureTotal : 0;
  const failedPages = captures.filter(result => !result.ok);
  const partial = failedPages.length > 0 || lighthouseRequired && !lighthouse.ok;

  await transition(input, {
    state: "checking",
    eventKind: "workflow.checking",
    eventKey: "workflow.checking",
    message: "Checking evidence coverage and provenance.",
    completed,
    total,
    checkpoint: {
      phase: "checking",
      pages: selectedPages,
      snapshotId,
      failedPages: failedPages.map(result => ({ url: result.url, error: result.error })),
      lighthouseAvailable: lighthouse.ok,
      coverage,
      captureRequirements: captureRequirements as unknown as Json,
    },
  });

  await finalizeSnapshot(input, snapshotId, partial ? "partial" : "ready", coverage, {
    pages: selectedPages,
    failedPages,
    lighthouse,
    coverage,
  });

  let analysisSummary: Json = {
    passed: 0,
    failed: 0,
    unverified: 0,
    notApplicable: 0,
    deterministic: 0,
    total: 0,
    analysisPending: context.service_kind !== "website",
  };
  let analysisPending = context.service_kind !== "website";
  if (context.service_kind === "website") {
    const evidence = await loadEvidenceBundle(input, snapshotId);
    const analysis = await analyzeWebsiteSnapshot(input.runId, evidence);
    const selectedKeys = recheckPlan
      ? new Set(recheckPlan.targets.map(target => target.stableKey))
      : null;
    const deterministicResults = selectedKeys
      ? analysis.results.filter(result => selectedKeys.has(result.stable_key))
      : analysis.results;
    const persisted = deterministicResults.length
      ? await persistCheckRevisions(input, snapshotId, deterministicResults)
      : { inserted: 0, replayed: 0, total: 0 };
    const agentContext = await beginGovernedAgentRun(input, snapshotId);
    let agentResult: Awaited<ReturnType<typeof executeGovernedAgentReview>>;
    let agentCompletion: Awaited<ReturnType<typeof completeGovernedAgentRun>>;
    try {
      agentResult = await executeGovernedAgentReview(input, context, agentContext, evidence);
      agentCompletion = await completeGovernedAgentRun(input, agentContext.agentRun.id, agentResult);
    } catch (error) {
      const errorMessage = workflowErrorMessage(error, "The governed review failed.");
      await failGovernedAgentRun(input, agentContext.agentRun.id, errorMessage);
      analysisSummary = {
        ...analysis.summary,
        persisted,
        governed: {
          definition: `${agentContext.definition.stableKey}@${agentContext.definition.version}`,
          targetCount: agentContext.targets.length,
          resultCount: 0,
          persisted: { inserted: 0, replayed: 0, total: 0 },
          reviewCount: agentContext.targets.length,
          state: "failed",
        },
        analysisPending: true,
      };
      await transition(input, {
        state: "partial",
        eventKind: "workflow.partial",
        eventKey: "workflow.partial.governed-agent",
        message: "The verified checklist is saved; qualitative review needs a retry.",
        completed,
        total,
        checkpoint: {
          phase: "checking",
          pages: selectedPages,
          snapshotId,
          captured: captures.map(result => ({ url: result.url, ok: result.ok })),
          failedPages: failedPages.map(result => ({ url: result.url, error: result.error })),
          lighthouseAvailable: lighthouse.ok,
          coverage,
          captureRequirements: captureRequirements as unknown as Json,
          analysis: analysisSummary,
          agentFailure: errorMessage,
        },
        blockerCode: /timed? ?out/i.test(errorMessage)
          ? "governed_agent_timeout"
          : "governed_agent_failed",
        blockerSummary: "Qualitative review did not complete after the verified checklist was saved.",
        recoveryAction: "Retry the governed review from saved evidence; recapture only if the source changed.",
      });
      console.log(`[serviceCheckupWorkflow] DONE runId=${input.runId} state=partial agent=failed`);
      return {
        runId: input.runId,
        state: "partial",
        captured: successfulTargets,
        failed: captureTotal - successfulTargets,
      };
    }
    const governedRevisions = agentCheckRevisions(
      input.runId,
      snapshotId,
      agentContext.definition,
      agentResult.findings,
    );
    const governedPersisted = governedRevisions.length
      ? await persistCheckRevisions(input, snapshotId, governedRevisions)
      : { inserted: 0, replayed: 0, total: 0 };
    const unresolvedAgentFindings = agentResult.findings.filter(
      finding => finding.requiresHumanReview || finding.status === "unverified",
    ).length;
    analysisSummary = {
      ...analysis.summary,
      persisted,
      governed: {
        definition: `${agentContext.definition.stableKey}@${agentContext.definition.version}`,
        targetCount: agentContext.targets.length,
        resultCount: agentResult.findings.length,
        persisted: governedPersisted,
        reviewCount: agentCompletion.reviewCount,
      },
      analysisPending: unresolvedAgentFindings > 0,
    };
    analysisPending = unresolvedAgentFindings > 0;
  }

  await transition(input, {
    state: "reviewing",
    eventKind: "workflow.reviewing",
    eventKey: "workflow.reviewing",
    message: context.service_kind === "website"
      ? "Deterministic checklist results are saved; unsupported items await governed review."
      : "Preparing the verified evidence set for service-specific checklist evaluation.",
    completed,
    total,
    checkpoint: {
      phase: "reviewing",
      snapshotId,
      coverage,
      partial,
      analysis: analysisSummary,
    },
  });

  if (partial) {
    const missing = [
      failedPages.length ? `${failedPages.length} page capture${failedPages.length === 1 ? "" : "s"}` : "",
      !lighthouse.ok ? "Lighthouse" : "",
    ].filter(Boolean).join(" and ");
    await transition(input, {
      state: "partial",
      eventKind: "workflow.partial",
      eventKey: "workflow.partial",
      message: `Evidence is usable, with ${missing} unavailable.`,
      completed,
      total,
      checkpoint: {
        phase: "checking",
        pages: selectedPages,
        snapshotId,
        captured: captures.map(result => ({ url: result.url, ok: result.ok })),
        failedPages: failedPages.map(result => ({ url: result.url, error: result.error })),
        lighthouseAvailable: lighthouse.ok,
        coverage,
        captureRequirements: captureRequirements as unknown as Json,
      },
      blockerCode: "partial_evidence",
      blockerSummary: `${missing} remained unavailable after bounded retries.`,
      recoveryAction: "Recheck only the unavailable targets; keep the verified evidence from this run.",
    });
    console.log(`[serviceCheckupWorkflow] DONE runId=${input.runId} state=partial coverage=${coverage}`);
    return { runId: input.runId, state: "partial", captured: successfulTargets, failed: captureTotal - successfulTargets };
  }

  await transition(input, {
    state: "ready",
    eventKind: "workflow.ready",
    eventKey: "workflow.ready",
    message: analysisPending
      ? "The verified baseline is ready for governed review."
      : "Evidence capture and checklist evaluation are complete.",
    completed,
    total,
    checkpoint: { phase: "ready", snapshotId, coverage, analysis: analysisSummary },
  });
  if (analysisPending) {
    console.log(`[serviceCheckupWorkflow] DONE runId=${input.runId} state=ready coverage=${coverage} review=pending`);
    return { runId: input.runId, state: "ready", captured: successfulTargets, failed: 0 };
  }

  await transition(input, {
    state: "current",
    eventKind: "workflow.current",
    eventKey: "workflow.current",
    message: "This evidence baseline is current.",
    completed,
    total,
    checkpoint: { phase: "current", snapshotId, coverage },
  });

  console.log(`[serviceCheckupWorkflow] DONE runId=${input.runId} state=current coverage=${coverage}`);
  return { runId: input.runId, state: "current", captured: successfulTargets, failed: 0 };
}
