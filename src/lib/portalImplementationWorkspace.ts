import type { PortalProcessHandoff } from "./portalProcessHandoffs";
import type { JourneyGate, TaskImportDraft } from "../portal/types";

export interface PortalImplementationMilestone {
  id: string;
  title: string;
  purpose: string;
  approvalGate?: string;
  tasks: TaskImportDraft[];
}

export interface PortalImplementationWorkspaceSeed {
  milestones: PortalImplementationMilestone[];
  journeyGates: JourneyGate[];
  tasks: TaskImportDraft[];
}

function slug(value: string) {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
}

function unique(values: string[], limit: number) {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))].slice(0, limit);
}

export function generatePortalImplementationWorkspace(handoff: PortalProcessHandoff): PortalImplementationWorkspaceSeed {
  const seedId = slug(handoff.id);
  const scope = unique(handoff.approvedScope, 6);
  const recommendations = unique(handoff.includedRecommendations, 12);
  const scopeTasks = (scope.length ? scope : ["Confirm the approved implementation scope"]).map((item, index): TaskImportDraft => ({
    title: scope.length ? `Prepare ${item}` : item,
    description: `Source: ${handoff.finalOutput} v${handoff.sourceOutputVersion}.`,
    project: handoff.clientName,
    assignee: "Studio",
    assignment: { role: "studio_admin", label: "Studio Admin" },
    owner: "studio",
    priority: index === 0 ? "high" : "med",
    due: "To schedule",
    milestone: "Scope & content preparation",
    source: "audit",
    sourceId: `${seedId}:scope:${index + 1}`,
    completionEventType: "studio_foundation_task_completed",
  }));
  const buildTasks = (recommendations.length ? recommendations : ["Implement the approved website direction"]).map((item, index): TaskImportDraft => ({
    title: recommendations.length ? item : "Implement the approved website direction",
    description: `Approved recommendation from ${handoff.finalOutput} v${handoff.sourceOutputVersion}.`,
    project: handoff.clientName,
    assignee: "Studio",
    assignment: { role: "studio_admin", label: "Studio Admin" },
    owner: "studio",
    priority: index < 3 ? "high" : "med",
    due: "To schedule",
    milestone: "Page design & build",
    source: "audit",
    sourceId: `${seedId}:build:${index + 1}`,
  }));
  const designGateId = `${seedId}:gate:design-preview`;
  const siteGateId = `${seedId}:gate:full-site-preview`;
  const handoffGateId = `${seedId}:gate:handoff-package`;
  const approvalTask = (
    title: string,
    milestone: string,
    sourceId: string,
    gateId: string,
    doneStage: string,
    reopenedStage: string,
    doneProgress: number,
    reopenedProgress: number,
    doneDeliverableState: "review" | "approved" | "delivered",
    reopenedDeliverableState: "draft" | "review" | "approved",
    completionEventType: "client_approval_completed" | "handoff_package_sent" = "client_approval_completed",
  ): TaskImportDraft => ({
    title,
    project: handoff.clientName,
    assignee: "Client",
    assignment: { role: "client", label: "Client" },
    owner: "client",
    priority: "high",
    due: "To schedule",
    milestone,
    source: "manual",
    sourceId: `${seedId}:${sourceId}`,
    completionEventType,
    workflowEffects: {
      journeyGate: { id: gateId, doneStatus: "approved", reopenedStatus: "awaiting" },
      project: {
        service: "wiaw",
        doneStage,
        reopenedStage,
        doneProgress,
        reopenedProgress,
      },
      lifecycle: {
        doneDeliverableState,
        reopenedDeliverableState,
        doneDashboardAccessState: "active",
        reopenedDashboardAccessState: "active",
        doneCurrentStage: doneStage,
        reopenedCurrentStage: reopenedStage,
        doneNextStage: doneProgress === 100 ? "Ongoing support" : doneStage,
        reopenedNextStage: doneStage,
        doneNextAction: doneProgress === 100 ? "Review ongoing support needs" : `Begin ${doneStage.toLowerCase()}`,
        reopenedNextAction: title,
      },
    },
  });
  const designApproval = approvalTask("Approve design preview", "Design-system approval", "approval:design", designGateId, "Page design & build", "Design-system approval", 40, 25, "approved", "review");
  const fullSiteApproval = approvalTask("Approve full site preview", "Content population & QA", "approval:site", siteGateId, "Launch preparation", "Full site review", 85, 75, "approved", "review");
  const handoffApproval = approvalTask("Approve handoff package", "Launch & measurement", "approval:handoff", handoffGateId, "Delivered", "Launch preparation", 100, 90, "delivered", "approved", "handoff_package_sent");
  const qaTask: TaskImportDraft = {
    title: "Complete content, responsive, accessibility, and launch QA",
    project: handoff.clientName,
    assignee: "Studio",
    assignment: { role: "shared", label: "Client + Studio Admin" },
    owner: "studio",
    priority: "high",
    due: "To schedule",
    milestone: "Content population & QA",
    source: "manual",
    sourceId: `${seedId}:qa`,
    completionEventType: "build_qa_completed",
  };
  const launchTask: TaskImportDraft = {
    title: "Prepare launch, training, and measurement handoff",
    project: handoff.clientName,
    assignee: "Studio",
    assignment: { role: "studio_admin", label: "Studio Admin" },
    owner: "studio",
    priority: "high",
    due: "To schedule",
    milestone: "Launch & measurement",
    source: "manual",
    sourceId: `${seedId}:launch`,
    completionEventType: "launch_prep_completed",
  };
  const milestones: PortalImplementationMilestone[] = [
    { id: `${seedId}:milestone:scope`, title: "Scope & content preparation", purpose: "Confirm approved findings, content, access, and dependencies.", tasks: scopeTasks },
    { id: `${seedId}:milestone:design`, title: "Design-system approval", purpose: "Turn the approved direction into a client decision.", approvalGate: "Design Preview", tasks: [designApproval] },
    { id: `${seedId}:milestone:build`, title: "Page design & build", purpose: "Implement only the approved scope and recommendations.", tasks: buildTasks },
    { id: `${seedId}:milestone:qa`, title: "Content population & QA", purpose: "Verify the complete experience before launch.", approvalGate: "Full Site Preview", tasks: [qaTask, fullSiteApproval] },
    { id: `${seedId}:milestone:launch`, title: "Launch & measurement", purpose: "Launch, train, transfer, and define measurement.", approvalGate: "Handoff Package", tasks: [launchTask, handoffApproval] },
  ];
  const gate = (id: string, g: number, title: string, next: string): JourneyGate => ({
    id,
    g,
    title,
    sub: handoff.clientName,
    status: "awaiting",
    when: "When the milestone is ready",
    eta: "To schedule",
    thumb: "",
    next,
  });
  const journeyGates = [
    gate(designGateId, 1, "Design Preview", "Begin page design and build"),
    gate(siteGateId, 2, "Full Site Preview", "Prepare launch and handoff"),
    gate(handoffGateId, 3, "Handoff Package", "Continue into ongoing support when selected"),
  ];
  return {
    milestones,
    journeyGates,
    tasks: milestones.flatMap(milestone => milestone.tasks),
  };
}
