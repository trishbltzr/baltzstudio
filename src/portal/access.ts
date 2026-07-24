import { getProcessDefinition, type ProcessId } from "./processDefinitions";
import { STUDIO_CLIENTS } from "./clients";
import { mergePortalClientWorkspace, type PortalClientWorkspace } from "../lib/portalWorkspacePersistence";
import type { ClientProject, Role, View } from "./types";

export type ClientAccessTier = "standard" | "collaborative" | "iff";
export type ProcessStageAccess = "manage" | "participate" | "view" | "locked" | "hidden";

export type PortalCapabilityProfile = {
  tier: ClientAccessTier | "studio";
  canViewProcessTracker: boolean;
  canEditCheckupIntake: boolean;
  canViewApprovedOutputs: boolean;
  canGiveFeedback: boolean;
  canUseLiveCheckups: boolean;
  canUseLiveLabs: boolean;
  canViewInternalEvidence: boolean;
  canApproveStudioWork: boolean;
  canPublishClientOutputs: boolean;
};

export type PortalAccessState = {
  role: Role;
  clientName: string;
  projectOverrides: Record<string, Partial<ClientProject>>;
  clientWorkspaces?: Record<string, PortalClientWorkspace>;
};

export type ClientEngineAccessDecision = {
  allowed: boolean;
  service: "cocoon" | "wiaw" | "iff";
  title: string;
  reason: string;
  requirements: string[];
};

export const BASE_ROLE_VIEWS: Record<Role, ReadonlySet<View>> = {
  admin: new Set(["progress", "clients", "tasks", "review", "inbox", "audits_new", "funnels", "activity", "team", "playbooks", "invoices", "billing", "profile", "settings", "onboarding"]),
  dev: new Set(["progress", "clients", "tasks", "review", "inbox", "audits_new", "funnels", "playbooks", "profile", "settings", "onboarding"]),
  client: new Set(["progress", "review", "milestones", "tasks", "inbox", "activity", "audit", "funnels", "files", "assistant", "profile", "settings"]),
};

export function clientAccessTier(state: PortalAccessState): ClientAccessTier {
  const service = state.projectOverrides[state.clientName]?.service;
  const labs = clientEngineAccessDecision(state, "labs");
  if (service === "iff" && labs.allowed) return "iff";
  if (service === "wiaw" && labs.allowed) return "collaborative";
  return "standard";
}

function accessWorkspace(state: PortalAccessState): PortalClientWorkspace | null {
  const client = STUDIO_CLIENTS.find(item => item.name === state.clientName);
  if (!client || !state.clientWorkspaces) return null;
  return mergePortalClientWorkspace(client.id, state.clientWorkspaces[client.id]);
}

function handoffIsInUse(workspace: PortalClientWorkspace, handoffId: string) {
  return Object.values(workspace.engineWork).some(record => record?.processRun?.sourceHandoffId === handoffId);
}

export function hasApprovedHandoffToService(workspace: PortalClientWorkspace, service: "wiaw" | "iff") {
  return workspace.handoffs.some(handoff => {
    const target = getProcessDefinition(handoff.targetProcessId);
    return target.service === service
      && handoff.approvalStatus === "approved"
      && (handoff.status === "accepted" || handoffIsInUse(workspace, handoff.id));
  });
}

function hasCompletedWiawDelivery(workspace: PortalClientWorkspace) {
  return workspace.engineWork.websiteBuilder?.status === "complete"
    || workspace.funnelPlans.some(plan => plan.statusLabel === "Complete" || plan.progress === 100);
}

export function clientEngineAccessDecision(state: PortalAccessState, engine: "checkups" | "labs" = "checkups"): ClientEngineAccessDecision {
  const service = state.projectOverrides[state.clientName]?.service || "cocoon";
  if (state.role !== "client" || engine === "checkups") {
    return { allowed: true, service, title: "Access available", reason: "This workspace is available for the current role.", requirements: [] };
  }

  const workspace = accessWorkspace(state);
  if (service === "wiaw") {
    const approvedHandoff = !!workspace && hasApprovedHandoffToService(workspace, "wiaw");
    const lifecycle = workspace?.serviceLifecycle;
    const engagementAllowsAccess = lifecycle?.wiawState === "confirmed"
      || (lifecycle?.wiawState === "paused" && lifecycle.wiawPauseAccessPolicy === "continue");
    const allowed = approvedHandoff && engagementAllowsAccess;
    return {
      allowed,
      service,
      title: allowed ? "Winged In A Week Labs are available" : "Winged In A Week is not ready yet",
      reason: allowed
        ? lifecycle?.wiawState === "paused"
          ? "The project is paused, but dashboard access continues under the recorded service policy."
          : "The service is confirmed and the approved Cocoon strategy handoff is linked to this build workspace."
        : approvedHandoff
          ? lifecycle?.wiawState === "cancelled"
            ? "Winged In A Week is cancelled, so its Labs workspace is no longer available."
            : lifecycle?.wiawState === "paused"
              ? "The project is paused and its recorded policy suspends Labs access."
              : "The approved strategy is ready, but live Labs stay locked until Winged In A Week is confirmed."
          : "Labs unlock only after the Cocoon Checkup is complete and the studio accepts its approved strategy handoff.",
      requirements: ["Complete the relevant Cocoon Checkup", "Approve and accept the strategy handoff", "Confirm Winged In A Week with the studio"],
    };
  }

  if (service === "iff") {
    const readyForCare = !!workspace && (hasCompletedWiawDelivery(workspace) || hasApprovedHandoffToService(workspace, "iff"));
    const lifecycle = workspace?.serviceLifecycle;
    const policyAllowsAccess = lifecycle?.iffAccessPolicy === "manual"
      ? lifecycle.dashboardAccessState === "active"
      : lifecycle?.iffState === "active";
    const allowed = readyForCare && policyAllowsAccess;
    return {
      allowed,
      service,
      title: allowed ? "In Full Flight Labs are available" : "In Full Flight is not ready yet",
      reason: allowed
        ? lifecycle?.iffAccessPolicy === "manual"
          ? "Staff explicitly enabled access after the completed delivery or approved care handoff."
          : "The care plan is active and an approved continuation source is recorded."
        : !readyForCare
          ? "Live retained-service Labs unlock after completed WIAW delivery or an accepted Cocoon SEO handoff is recorded."
          : lifecycle?.iffAccessPolicy === "manual"
            ? "The service is ready, but staff has not enabled manual dashboard access."
            : "The service is ready, but Labs stay locked until the In Full Flight care plan is active.",
      requirements: ["Complete WIAW delivery or approve the retained SEO strategy", "Activate the care plan or explicitly enable manual access", "Keep publishing and scope decisions studio-reviewed"],
    };
  }

  return {
    allowed: false,
    service,
    title: "Labs follow your Cocoon strategy",
    reason: "Your current Cocoon Consult includes Checkups, feedback, and studio-shared outputs. Live Labs begin only after the next service and its approved handoff are confirmed.",
    requirements: ["Complete the relevant Cocoon Checkup", "Review the client-safe output in Approvals", "Confirm the next service with the studio"],
  };
}

export function portalCapabilities(state: PortalAccessState): PortalCapabilityProfile {
  if (state.role !== "client") {
    return {
      tier: "studio",
      canViewProcessTracker: true,
      canEditCheckupIntake: true,
      canViewApprovedOutputs: true,
      canGiveFeedback: true,
      canUseLiveCheckups: true,
      canUseLiveLabs: true,
      canViewInternalEvidence: true,
      canApproveStudioWork: true,
      canPublishClientOutputs: true,
    };
  }

  const tier = clientAccessTier(state);
  const collaborative = tier === "collaborative" || tier === "iff";
  return {
    tier,
    canViewProcessTracker: true,
    canEditCheckupIntake: true,
    canViewApprovedOutputs: true,
    canGiveFeedback: true,
    canUseLiveCheckups: true,
    canUseLiveLabs: collaborative,
    canViewInternalEvidence: false,
    canApproveStudioWork: false,
    canPublishClientOutputs: false,
  };
}

export function clientHasEngineAccess(state: PortalAccessState, engine: "checkups" | "labs" = "checkups") {
  return clientEngineAccessDecision(state, engine).allowed;
}

export function processStageAccess(state: PortalAccessState, processId: ProcessId, stageId: string, approved = false): ProcessStageAccess {
  if (state.role !== "client") return "manage";

  const process = getProcessDefinition(processId);
  const stage = process.stages.find(item => item.id === stageId);
  if (!stage) return "hidden";
  if (stage.access === "internal") return "hidden";

  const tier = clientAccessTier(state);
  const firstStage = process.stages[0]?.id === stageId;
  if (tier === "standard") {
    if (process.category === "checkup" && firstStage) return "participate";
    if (stage.access === "client-visible" && approved) return "view";
    return "locked";
  }

  if (stage.access === "client-visible" && approved) return "view";
  if (stage.owner === "studio" && !stage.gate?.approvers.includes("client")) return "view";
  return "participate";
}

export function canAccessPortalView(state: PortalAccessState, view: View) {
  if (!BASE_ROLE_VIEWS[state.role].has(view)) return false;
  // Keep direct engine URLs routable so a locked client receives an explicit
  // prerequisite explanation instead of being silently redirected elsewhere.
  if (state.role === "client" && (view === "audit" || view === "funnels")) return true;
  return true;
}
