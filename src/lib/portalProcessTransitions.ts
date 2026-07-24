import type { PortalProcessRun, PortalProcessTemplateStageSnapshot } from "./portalProcessRuns";

export interface PortalProcessTransitionEvaluation {
  allowed: boolean;
  requestedStageId: string;
  effectiveStageId: string;
  blockers: string[];
  blockingStageIds: string[];
}

export interface PortalProcessReadiness {
  currentStage: PortalProcessTemplateStageSnapshot | undefined;
  nextStage: PortalProcessTemplateStageSnapshot | undefined;
  requirements: string[];
  blockers: string[];
  canAdvance: boolean;
}

function completedStageIds(run: PortalProcessRun, additional: Iterable<string> = []): Set<string> {
  return new Set([
    ...run.stages.filter(stage => stage.status === "complete").map(stage => stage.stageId),
    ...additional,
  ]);
}

function stageBlocker(stage: PortalProcessTemplateStageSnapshot): string {
  return stage.gate?.blocksProgress
    ? `${stage.gate.label} is required`
    : `Complete ${stage.label}`;
}

const exceptionOwner = (owner: string) => ({ admin: "Admin", studio: "Studio", client: "Client", assistant: "Assistant", shared: "Studio + client" }[owner] || owner);

export function evaluatePortalProcessTransition(
  run: PortalProcessRun,
  requestedStageId: string,
  additionalCompletedStageIds: Iterable<string> = [],
): PortalProcessTransitionEvaluation {
  const requestedIndex = run.template.stages.findIndex(stage => stage.id === requestedStageId);
  if (requestedIndex < 0) {
    return {
      allowed: false,
      requestedStageId,
      effectiveStageId: run.currentStageId,
      blockers: ["The requested process stage does not exist in this saved template."],
      blockingStageIds: [],
    };
  }

  const completed = completedStageIds(run, additionalCompletedStageIds);
  const openExceptions = (run.exceptions || []).filter(exception => exception.status === "open");
  const blockingStages = run.template.stages
    .slice(0, requestedIndex)
    .filter(stage => !completed.has(stage.id));

  return {
    allowed: blockingStages.length === 0 && openExceptions.length === 0,
    requestedStageId,
    effectiveStageId: openExceptions.length > 0 ? run.currentStageId : blockingStages[0]?.id || requestedStageId,
    blockers: [
      ...openExceptions.map(exception => `${exception.label} · Owner: ${exceptionOwner(exception.owner)} · ${exception.recoveryAction}`),
      ...blockingStages.map(stageBlocker),
    ],
    blockingStageIds: [...new Set([...openExceptions.map(exception => exception.stageId), ...blockingStages.map(stage => stage.id)])],
  };
}

export function portalProcessReadiness(run: PortalProcessRun): PortalProcessReadiness {
  const currentIndex = Math.max(0, run.template.stages.findIndex(stage => stage.id === run.currentStageId));
  const currentStage = run.template.stages[currentIndex];
  const currentState = run.stages.find(stage => stage.stageId === currentStage?.id);
  const nextStage = run.template.stages[currentIndex + 1];
  const blockers: string[] = [];

  (run.exceptions || []).filter(exception => exception.status === "open").forEach(exception => {
    blockers.push(`${exception.label} · Owner: ${exceptionOwner(exception.owner)} · ${exception.recoveryAction}`);
  });

  const dueAt = run.dueAt ? Date.parse(run.dueAt) : Number.NaN;
  if (run.status !== "complete" && Number.isFinite(dueAt) && dueAt < Date.now() && !(run.exceptions || []).some(exception => exception.kind === "overdue_work" && exception.status === "open")) {
    const policy = run.template.exceptionPolicies?.find(item => item.kind === "overdue_work");
    blockers.push(`${policy?.label || "Overdue work"} · Owner: ${exceptionOwner(policy?.defaultOwner || "studio")} · ${policy?.recoveryAction || "Reset the due date."}`);
  }

  run.template.stages.slice(0, currentIndex).forEach(stage => {
    if (run.stages.find(item => item.stageId === stage.id)?.status !== "complete") blockers.push(stageBlocker(stage));
  });

  if (currentState?.status === "awaiting_approval" && currentStage?.gate) {
    blockers.push(`${currentStage.gate.label} is awaiting approval`);
  }

  return {
    currentStage,
    nextStage,
    requirements: [...(currentStage?.requirements || [])],
    blockers,
    canAdvance: run.status !== "complete" && !!nextStage && currentState?.status === "complete" && blockers.length === 0,
  };
}
