import {
  getProcessDefinition,
  PROCESS_DEFINITIONS,
  type ProcessAccess,
  type ProcessCategory,
  type ProcessId,
  type ProcessOwner,
  type ProcessExceptionKind,
  type ProcessExceptionPolicy,
  type ProcessStageKind,
} from "@/portal/processDefinitions";
import type { Service } from "@/portal/types";
import { evaluatePortalProcessTransition } from "./portalProcessTransitions";

export type PortalProcessRunStatus = "not_started" | "in_progress" | "awaiting_approval" | "blocked" | "complete";
export type PortalProcessRunStageStatus = "pending" | "active" | "awaiting_approval" | "blocked" | "complete";
export type PortalProcessRunEventType = "created" | "stage_changed" | "approval_waiting" | "approval_rejected" | "stage_reopened" | "exception_opened" | "exception_resolved" | "automation_failed" | "recommendation_converted" | "task_completed" | "completed" | "handoff_linked";

export interface PortalProcessRunEvent {
  id: string;
  type: PortalProcessRunEventType;
  at: string;
  stageId?: string;
  fromStageId?: string;
  handoffId?: string;
  exceptionId?: string;
  count?: number;
}

export interface PortalProcessException {
  id: string;
  kind: ProcessExceptionKind;
  label: string;
  stageId: string;
  owner: ProcessOwner;
  detail: string;
  recoveryAction: string;
  status: "open" | "resolved";
  openedAt: string;
  resolvedAt?: string;
}

export interface PortalProcessTemplateStageSnapshot {
  id: string;
  label: string;
  icon: string;
  kind: ProcessStageKind;
  owner: ProcessOwner;
  access: ProcessAccess;
  requirements: string[];
  outputs: string[];
  nextAction: string;
  gate?: {
    id: string;
    label: string;
    approvers: ProcessOwner[];
    blocksProgress: boolean;
  };
}

export interface PortalProcessTemplateSnapshot {
  processId: ProcessId;
  version: number;
  service: Service;
  category: ProcessCategory;
  name: string;
  description: string;
  templateId: string;
  stages: PortalProcessTemplateStageSnapshot[];
  finalOutput: string;
  handoffTarget?: ProcessId;
  exceptionPolicies: ProcessExceptionPolicy[];
}

export interface PortalProcessRunStage {
  stageId: string;
  status: PortalProcessRunStageStatus;
  completedAt?: string;
}

export interface PortalProcessRun {
  id: string;
  clientId: string;
  clientName: string;
  processId: ProcessId;
  templateVersion: number;
  template: PortalProcessTemplateSnapshot;
  status: PortalProcessRunStatus;
  currentStageId: string;
  stages: PortalProcessRunStage[];
  createdAt: string;
  updatedAt: string;
  events: PortalProcessRunEvent[];
  completedAt?: string;
  dueAt?: string;
  sourceHandoffId?: string;
  exceptions: PortalProcessException[];
}

export interface SyncPortalProcessRunInput {
  processId: ProcessId;
  runId: string;
  clientId: string;
  clientName: string;
  currentStageId: string;
  approvedStageIds?: string[];
  started?: boolean;
  awaitingApproval?: boolean;
  complete?: boolean;
  updatedAt?: string;
  dueAt?: string;
  sourceHandoffId?: string;
}

function templateSnapshot(processId: ProcessId): PortalProcessTemplateSnapshot {
  const process = getProcessDefinition(processId);
  return {
    processId: process.id,
    version: process.version,
    service: process.service,
    category: process.category,
    name: process.name,
    description: process.description,
    templateId: process.templateId,
    stages: process.stages.map(stage => ({
      id: stage.id,
      label: stage.label,
      icon: stage.icon,
      kind: stage.kind,
      owner: stage.owner,
      access: stage.access,
      requirements: [...stage.requirements],
      outputs: [...stage.outputs],
      nextAction: stage.nextAction,
      gate: stage.gate ? { ...stage.gate, approvers: [...stage.gate.approvers] } : undefined,
    })),
    finalOutput: process.finalOutput,
    handoffTarget: process.handoffTarget,
    exceptionPolicies: process.exceptionPolicies.map(policy => ({ ...policy })),
  };
}

function newPortalProcessRun(input: SyncPortalProcessRunInput, now: string): PortalProcessRun {
  const template = templateSnapshot(input.processId);
  return {
    id: input.runId,
    clientId: input.clientId,
    clientName: input.clientName,
    processId: input.processId,
    templateVersion: template.version,
    template,
    status: "not_started",
    currentStageId: template.stages[0]?.id || "intake",
    stages: template.stages.map(stage => ({ stageId: stage.id, status: "pending" })),
    createdAt: now,
    updatedAt: now,
    events: [{ id: `${input.runId}:created:${now}`, type: "created", at: now, stageId: template.stages[0]?.id }],
    dueAt: input.dueAt,
    sourceHandoffId: input.sourceHandoffId,
    exceptions: [],
  };
}

export function syncPortalProcessRun(existing: PortalProcessRun | undefined, input: SyncPortalProcessRunInput): PortalProcessRun {
  const now = input.updatedAt || new Date().toISOString();
  const base = existing?.processId === input.processId
    ? existing
    : newPortalProcessRun(input, now);
  const approved = new Set(input.approvedStageIds || []);
  const openExceptions = (base.exceptions || []).filter(exception => exception.status === "open");
  const complete = input.complete === true;
  const transition = complete
    ? { effectiveStageId: input.currentStageId }
    : evaluatePortalProcessTransition(base, input.currentStageId, approved);
  const currentStageId = transition.effectiveStageId;
  const activeIndex = Math.max(0, base.template.stages.findIndex(stage => stage.id === currentStageId));
  const started = input.started !== false;
  const stages = base.template.stages.map((stage, index) => {
    const previous = base.stages.find(item => item.stageId === stage.id);
    const stageComplete = complete || approved.has(stage.id) || index < activeIndex;
    const stageBlocked = openExceptions.some(exception => exception.stageId === stage.id);
    const status: PortalProcessRunStageStatus = stageComplete
      ? "complete"
      : stageBlocked
        ? "blocked"
      : started && index === activeIndex
        ? input.awaitingApproval ? "awaiting_approval" : "active"
        : "pending";
    return {
      stageId: stage.id,
      status,
      completedAt: stageComplete ? previous?.completedAt || now : undefined,
    };
  });
  const hasProgress = complete || started;
  const status: PortalProcessRunStatus = complete
    ? "complete"
    : openExceptions.length > 0
      ? "blocked"
    : input.awaitingApproval
      ? "awaiting_approval"
      : hasProgress
        ? "in_progress"
        : "not_started";
  const events = Array.isArray(base.events)
    ? [...base.events]
    : [{ id: `${base.id}:created:${base.createdAt}`, type: "created" as const, at: base.createdAt, stageId: base.template.stages[0]?.id }];
  const addEvent = (event: Omit<PortalProcessRunEvent, "id" | "at">) => {
    const signature = [event.type, event.stageId, event.fromStageId, event.handoffId].filter(Boolean).join(":");
    const previous = events.at(-1);
    const previousSignature = previous
      ? [previous.type, previous.stageId, previous.fromStageId, previous.handoffId].filter(Boolean).join(":")
      : "";
    if (signature === previousSignature) return;
    events.push({ ...event, id: `${base.id}:${event.type}:${now}:${events.length}`, at: now });
  };
  if (currentStageId !== base.currentStageId) {
    addEvent({ type: "stage_changed", stageId: currentStageId, fromStageId: base.currentStageId });
  }
  if (status === "awaiting_approval" && base.status !== "awaiting_approval") {
    addEvent({ type: "approval_waiting", stageId: currentStageId });
  }
  if (status === "complete" && base.status !== "complete") {
    addEvent({ type: "completed", stageId: currentStageId });
  }
  if (input.sourceHandoffId && input.sourceHandoffId !== base.sourceHandoffId) {
    addEvent({ type: "handoff_linked", stageId: currentStageId, handoffId: input.sourceHandoffId });
  }
  return {
    ...base,
    clientId: input.clientId || base.clientId,
    clientName: input.clientName || base.clientName,
    status,
    currentStageId,
    stages,
    updatedAt: now,
    events,
    completedAt: complete ? base.completedAt || now : undefined,
    dueAt: input.dueAt || base.dueAt,
    sourceHandoffId: input.sourceHandoffId || base.sourceHandoffId,
    exceptions: base.exceptions || [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function normalizePortalProcessRun(value: unknown): PortalProcessRun | undefined {
  if (!isRecord(value)) return undefined;
  if (typeof value.processId !== "string" || !(value.processId in PROCESS_DEFINITIONS)) return undefined;
  const processId = value.processId as ProcessId;
  const template = isRecord(value.template) ? value.template as unknown as PortalProcessTemplateSnapshot : null;
  if (!template || template.processId !== processId || !Array.isArray(template.stages)) return undefined;
  const normalizedTemplate: PortalProcessTemplateSnapshot = {
    ...template,
    exceptionPolicies: Array.isArray(template.exceptionPolicies)
      ? template.exceptionPolicies
      : getProcessDefinition(processId).exceptionPolicies.map(policy => ({ ...policy })),
  };
  if (typeof value.id !== "string" || typeof value.clientId !== "string" || typeof value.clientName !== "string") return undefined;
  const currentStageId = typeof value.currentStageId === "string" ? value.currentStageId : template.stages[0]?.id;
  if (!currentStageId) return undefined;
  const statuses = new Set<PortalProcessRunStageStatus>(["pending", "active", "awaiting_approval", "blocked", "complete"]);
  const stages = Array.isArray(value.stages)
    ? value.stages.flatMap(item => {
      if (!isRecord(item) || typeof item.stageId !== "string" || !statuses.has(item.status as PortalProcessRunStageStatus)) return [];
      return [{ stageId: item.stageId, status: item.status as PortalProcessRunStageStatus, completedAt: typeof item.completedAt === "string" ? item.completedAt : undefined }];
    })
    : [];
  const runStatuses = new Set<PortalProcessRunStatus>(["not_started", "in_progress", "awaiting_approval", "blocked", "complete"]);
  const createdAt = typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString();
  const eventTypes = new Set<PortalProcessRunEventType>(["created", "stage_changed", "approval_waiting", "approval_rejected", "stage_reopened", "exception_opened", "exception_resolved", "automation_failed", "recommendation_converted", "task_completed", "completed", "handoff_linked"]);
  const events = Array.isArray(value.events)
    ? value.events.flatMap(event => {
      if (!isRecord(event) || typeof event.id !== "string" || typeof event.at !== "string" || !eventTypes.has(event.type as PortalProcessRunEventType)) return [];
      return [{
        id: event.id,
        type: event.type as PortalProcessRunEventType,
        at: event.at,
        stageId: typeof event.stageId === "string" ? event.stageId : undefined,
        fromStageId: typeof event.fromStageId === "string" ? event.fromStageId : undefined,
        handoffId: typeof event.handoffId === "string" ? event.handoffId : undefined,
        exceptionId: typeof event.exceptionId === "string" ? event.exceptionId : undefined,
        count: typeof event.count === "number" && Number.isFinite(event.count) ? Math.max(0, Math.floor(event.count)) : undefined,
      }];
    })
    : [{ id: `${value.id}:created:${createdAt}`, type: "created" as const, at: createdAt, stageId: template.stages[0]?.id }];
  const exceptionKinds = new Set<ProcessExceptionKind>(["missing_access_or_assets", "failed_crawl_or_generation", "unsupported_evidence", "client_inactivity", "rejected_approval", "scope_change", "reopened_stage", "failed_handoff", "overdue_work"]);
  const exceptions = Array.isArray(value.exceptions)
    ? value.exceptions.flatMap(exception => {
      if (!isRecord(exception) || typeof exception.id !== "string" || !exceptionKinds.has(exception.kind as ProcessExceptionKind)) return [];
      const policy = normalizedTemplate.exceptionPolicies.find(item => item.kind === exception.kind);
      return [{
        id: exception.id,
        kind: exception.kind as ProcessExceptionKind,
        label: typeof exception.label === "string" ? exception.label : policy?.label || "Process blocker",
        stageId: typeof exception.stageId === "string" ? exception.stageId : currentStageId,
        owner: ["admin", "studio", "client", "assistant", "shared"].includes(String(exception.owner)) ? exception.owner as ProcessOwner : policy?.defaultOwner || "studio",
        detail: typeof exception.detail === "string" ? exception.detail : "This process needs a named recovery decision.",
        recoveryAction: typeof exception.recoveryAction === "string" ? exception.recoveryAction : policy?.recoveryAction || "Assign an owner and recovery action.",
        status: exception.status === "resolved" ? "resolved" as const : "open" as const,
        openedAt: typeof exception.openedAt === "string" ? exception.openedAt : createdAt,
        resolvedAt: typeof exception.resolvedAt === "string" ? exception.resolvedAt : undefined,
      }];
    })
    : [];
  const normalizedStatus = runStatuses.has(value.status as PortalProcessRunStatus) ? value.status as PortalProcessRunStatus : "in_progress";
  return {
    id: value.id,
    clientId: value.clientId,
    clientName: value.clientName,
    processId,
    templateVersion: typeof value.templateVersion === "number" ? value.templateVersion : template.version,
    template: normalizedTemplate,
    status: exceptions.some(exception => exception.status === "open") && normalizedStatus !== "complete" ? "blocked" : normalizedStatus,
    currentStageId,
    stages,
    createdAt,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString(),
    events,
    completedAt: typeof value.completedAt === "string" ? value.completedAt : undefined,
    dueAt: typeof value.dueAt === "string" ? value.dueAt : undefined,
    sourceHandoffId: typeof value.sourceHandoffId === "string" ? value.sourceHandoffId : undefined,
    exceptions,
  };
}

function appendRunEvent(run: PortalProcessRun, event: Omit<PortalProcessRunEvent, "id" | "at">, at: string) {
  return [...run.events, { ...event, id: `${run.id}:${event.type}:${at}:${run.events.length}`, at }];
}

export function openPortalProcessException(
  run: PortalProcessRun,
  input: { kind: ProcessExceptionKind; owner?: ProcessOwner; detail: string; recoveryAction?: string; stageId?: string; at?: string },
): PortalProcessRun {
  const at = input.at || new Date().toISOString();
  const policy = run.template.exceptionPolicies.find(item => item.kind === input.kind);
  const exception: PortalProcessException = {
    id: `${run.id}:${input.kind}:${at}`,
    kind: input.kind,
    label: policy?.label || "Process blocker",
    stageId: input.stageId || run.currentStageId,
    owner: input.owner || policy?.defaultOwner || "studio",
    detail: input.detail.trim() || "This process needs a named recovery decision.",
    recoveryAction: input.recoveryAction?.trim() || policy?.recoveryAction || "Assign an owner and recovery action.",
    status: "open",
    openedAt: at,
  };
  return {
    ...run,
    status: "blocked",
    updatedAt: at,
    stages: run.stages.map(stage => stage.stageId === exception.stageId && stage.status !== "complete" ? { ...stage, status: "blocked" } : stage),
    exceptions: [...run.exceptions, exception],
    events: appendRunEvent(run, { type: input.kind === "rejected_approval" ? "approval_rejected" : input.kind === "reopened_stage" ? "stage_reopened" : input.kind === "failed_crawl_or_generation" ? "automation_failed" : "exception_opened", stageId: exception.stageId, exceptionId: exception.id }, at),
  };
}

export function resolvePortalProcessException(run: PortalProcessRun, exceptionId: string, at = new Date().toISOString()): PortalProcessRun {
  const target = run.exceptions.find(exception => exception.id === exceptionId && exception.status === "open");
  if (!target) return run;
  const exceptions = run.exceptions.map(exception => exception.id === exceptionId ? { ...exception, status: "resolved" as const, resolvedAt: at } : exception);
  const stillBlocked = exceptions.some(exception => exception.status === "open");
  return {
    ...run,
    status: stillBlocked ? "blocked" : "in_progress",
    updatedAt: at,
    stages: run.stages.map(stage => stage.stageId === target.stageId && stage.status === "blocked" ? { ...stage, status: "active" } : stage),
    exceptions,
    events: appendRunEvent(run, { type: "exception_resolved", stageId: target.stageId, exceptionId }, at),
  };
}

export interface PortalOperationalMetrics {
  timeInCurrentStageMinutes: number;
  blockedMinutes: number;
  approvalTurnaroundMinutes: number | null;
  revisionCount: number;
  handoffSuccess: boolean | null;
  recommendationsConvertedToTasks: number;
  recommendationTasksCompleted: number;
  clientInactivityCount: number;
  automationFailureCount: number;
}

export function portalOperationalMetrics(run: PortalProcessRun): PortalOperationalMetrics {
  const end = Date.parse(run.updatedAt) || Date.now();
  const currentStageEvent = [...run.events].reverse().find(event => event.stageId === run.currentStageId && (event.type === "stage_changed" || event.type === "created"));
  const stageStart = Date.parse(currentStageEvent?.at || run.createdAt) || end;
  const blockedMinutes = run.exceptions.reduce((sum, exception) => {
    const start = Date.parse(exception.openedAt);
    const finish = Date.parse(exception.resolvedAt || run.updatedAt);
    return sum + (Number.isFinite(start) && Number.isFinite(finish) ? Math.max(0, Math.round((finish - start) / 60000)) : 0);
  }, 0);
  const approvalWait = [...run.events].reverse().find(event => event.type === "approval_waiting");
  const approvalResolution = approvalWait ? run.events.find(event => Date.parse(event.at) >= Date.parse(approvalWait.at) && ["stage_changed", "completed", "approval_rejected"].includes(event.type)) : undefined;
  const failedHandoff = run.exceptions.some(exception => exception.kind === "failed_handoff" && exception.status === "open");
  const linkedHandoff = run.events.some(event => event.type === "handoff_linked");
  return {
    timeInCurrentStageMinutes: Math.max(0, Math.round((end - stageStart) / 60000)),
    blockedMinutes,
    approvalTurnaroundMinutes: approvalWait && approvalResolution ? Math.max(0, Math.round((Date.parse(approvalResolution.at) - Date.parse(approvalWait.at)) / 60000)) : null,
    revisionCount: run.events.filter(event => event.type === "approval_rejected" || event.type === "stage_reopened").length,
    handoffSuccess: linkedHandoff ? !failedHandoff : failedHandoff ? false : null,
    recommendationsConvertedToTasks: run.events.filter(event => event.type === "recommendation_converted").reduce((sum, event) => sum + (event.count || 1), 0),
    recommendationTasksCompleted: run.events.filter(event => event.type === "task_completed").reduce((sum, event) => sum + (event.count || 1), 0),
    clientInactivityCount: run.exceptions.filter(exception => exception.kind === "client_inactivity").length,
    automationFailureCount: run.events.filter(event => event.type === "automation_failed").length,
  };
}
