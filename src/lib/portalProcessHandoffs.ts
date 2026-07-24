import type { PortalClientWorkspace } from "./portalWorkspacePersistence";
import { mergePortalClientWorkspace } from "./portalWorkspacePersistence";
import type { PortalProcessRun } from "./portalProcessRuns";
import type { ProcessId } from "@/portal/processDefinitions";

export type PortalProcessHandoffStatus = "ready" | "accepted";
export type PortalProcessHandoffApprovalStatus = "pending" | "approved" | "changes_requested";
export type PortalProcessHandoffContext = Record<string, string | string[]>;

export interface PortalProcessHandoffParty {
  role: "studio" | "manager" | "client" | "system";
  label: string;
}

export interface CreatePortalProcessHandoffOptions {
  approvedScope?: string[];
  includedRecommendations?: string[];
  unresolvedItems?: string[];
  approvalStatus?: PortalProcessHandoffApprovalStatus;
  sender?: PortalProcessHandoffParty;
  receiver?: PortalProcessHandoffParty;
  createdAt?: string;
}

export interface PortalProcessHandoff {
  id: string;
  clientId: string;
  clientName: string;
  sourceProcessId: ProcessId;
  sourceRunId: string;
  sourceTemplateVersion: number;
  targetProcessId: ProcessId;
  status: PortalProcessHandoffStatus;
  finalOutput: string;
  sourceOutputVersion: number;
  context: PortalProcessHandoffContext;
  approvedScope: string[];
  includedRecommendations: string[];
  unresolvedItems: string[];
  approvalStatus: PortalProcessHandoffApprovalStatus;
  approvedAt?: string;
  approvedBy?: PortalProcessHandoffParty;
  sender: PortalProcessHandoffParty;
  receiver: PortalProcessHandoffParty;
  createdTaskIds: string[];
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string;
}

export function portalProcessHandoffSender(role: "admin" | "dev" | "client", clientName: string): PortalProcessHandoffParty {
  if (role === "client") return { role: "client", label: clientName };
  if (role === "dev") return { role: "manager", label: "Manager" };
  return { role: "studio", label: "Trish Baltazar" };
}

function safeContext(value: Record<string, unknown>): PortalProcessHandoffContext {
  return Object.entries(value).reduce<PortalProcessHandoffContext>((context, [key, item]) => {
    if (typeof item === "string") context[key] = item;
    else if (Array.isArray(item) && item.every(entry => typeof entry === "string")) context[key] = [...item];
    return context;
  }, {});
}

function cleanList(values: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(values)) return fallback;
  return [...new Set(values.map(value => typeof value === "string" ? value.trim() : "").filter(Boolean))];
}

function defaultScope(sourceProcessId: ProcessId): string[] {
  if (sourceProcessId === "brand-audit") return ["Brand positioning, messaging, voice, and visual priorities"];
  if (sourceProcessId === "website-audit") return ["Website findings, page priorities, and implementation recommendations"];
  return [];
}

export function portalProcessHandoffRecommendations(aiResults: Record<string, unknown> | undefined): string[] {
  if (!aiResults) return [];
  const values = Object.values(aiResults).flatMap(result => {
    if (!result || typeof result !== "object") return [];
    const record = result as Record<string, unknown>;
    const recommendations = Array.isArray(record.recommendations) ? record.recommendations : [];
    const priorities = Array.isArray(record.priorities) ? record.priorities : [];
    return [...recommendations, ...priorities].flatMap(item => {
      if (!item || typeof item !== "object") return [];
      const entry = item as Record<string, unknown>;
      const title = typeof entry.title === "string" ? entry.title.trim() : "";
      const action = typeof entry.action === "string" ? entry.action.trim() : "";
      return title && action ? [`${title}: ${action}`] : title ? [title] : action ? [action] : [];
    });
  });
  return cleanList(values);
}

export function portalProcessHandoffPages(aiResults: Record<string, unknown> | undefined): string[] {
  if (!aiResults) return [];
  return cleanList(Object.values(aiResults).flatMap(result => {
    if (!result || typeof result !== "object") return [];
    const pages = (result as Record<string, unknown>).pagesReviewed;
    return Array.isArray(pages) ? pages : [];
  }));
}

export function portalProcessHandoffUnresolvedItems(aiResults: Record<string, unknown> | undefined): string[] {
  if (!aiResults) return [];
  const items = Object.values(aiResults).flatMap(result => {
    if (!result || typeof result !== "object") return [];
    const categories = (result as Record<string, unknown>).categories;
    if (!Array.isArray(categories)) return [];
    return categories.flatMap(category => {
      if (!category || typeof category !== "object") return [];
      const checks = (category as Record<string, unknown>).checks;
      if (!Array.isArray(checks)) return [];
      return checks.flatMap(check => {
        if (!check || typeof check !== "object") return [];
        const entry = check as Record<string, unknown>;
        return entry.status === "unverified" && typeof entry.label === "string" ? [entry.label] : [];
      });
    });
  });
  return cleanList(items);
}

export function normalizePortalProcessHandoff(handoff: PortalProcessHandoff): PortalProcessHandoff {
  const createdAt = typeof handoff.createdAt === "string" ? handoff.createdAt : new Date(0).toISOString();
  const approvalStatus = handoff.approvalStatus || "approved";
  const sender = handoff.sender || { role: "system", label: "Baltz Studio" };
  return {
    ...handoff,
    sourceOutputVersion: handoff.sourceOutputVersion || handoff.sourceTemplateVersion || 1,
    approvedScope: cleanList(handoff.approvedScope, defaultScope(handoff.sourceProcessId)),
    includedRecommendations: cleanList(handoff.includedRecommendations),
    unresolvedItems: cleanList(handoff.unresolvedItems),
    approvalStatus,
    approvedAt: handoff.approvedAt || (approvalStatus === "approved" ? createdAt : undefined),
    approvedBy: handoff.approvedBy || (approvalStatus === "approved" ? sender : undefined),
    sender,
    receiver: handoff.receiver || { role: "studio", label: "Website Lab" },
    createdTaskIds: cleanList(handoff.createdTaskIds),
    createdAt,
    updatedAt: handoff.updatedAt || handoff.acceptedAt || createdAt,
  };
}

export function createPortalProcessHandoff(
  sourceRun: PortalProcessRun | undefined,
  context: Record<string, unknown> = {},
  options: CreatePortalProcessHandoffOptions | string = {},
): PortalProcessHandoff | null {
  const targetProcessId = sourceRun?.template.handoffTarget;
  if (!sourceRun || sourceRun.status !== "complete" || !targetProcessId) return null;
  const resolvedOptions = typeof options === "string" ? { createdAt: options } : options;
  const createdAt = resolvedOptions.createdAt || new Date().toISOString();
  const sender = resolvedOptions.sender || { role: "system", label: "Baltz Studio" };
  const approvalStatus = resolvedOptions.approvalStatus || "approved";
  return {
    id: `${sourceRun.id}--${targetProcessId}`,
    clientId: sourceRun.clientId,
    clientName: sourceRun.clientName,
    sourceProcessId: sourceRun.processId,
    sourceRunId: sourceRun.id,
    sourceTemplateVersion: sourceRun.templateVersion,
    targetProcessId,
    status: "ready",
    finalOutput: sourceRun.template.finalOutput,
    sourceOutputVersion: sourceRun.templateVersion,
    context: safeContext(context),
    approvedScope: cleanList(resolvedOptions.approvedScope, defaultScope(sourceRun.processId)),
    includedRecommendations: cleanList(resolvedOptions.includedRecommendations),
    unresolvedItems: cleanList(resolvedOptions.unresolvedItems),
    approvalStatus,
    approvedAt: approvalStatus === "approved" ? createdAt : undefined,
    approvedBy: approvalStatus === "approved" ? sender : undefined,
    sender,
    receiver: resolvedOptions.receiver || { role: "studio", label: "Website Lab" },
    createdTaskIds: [],
    createdAt,
    updatedAt: createdAt,
  };
}

export function latestPortalProcessHandoff(
  handoffs: PortalProcessHandoff[],
  targetProcessId: ProcessId,
): PortalProcessHandoff | undefined {
  const latest = handoffs
    .filter(handoff => handoff.targetProcessId === targetProcessId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
  return latest ? normalizePortalProcessHandoff(latest) : undefined;
}

export function savePortalProcessHandoff(
  workspaces: Record<string, PortalClientWorkspace>,
  handoff: PortalProcessHandoff,
): Record<string, PortalClientWorkspace> {
  const workspace = mergePortalClientWorkspace(handoff.clientId, workspaces[handoff.clientId]);
  return {
    ...workspaces,
    [handoff.clientId]: {
      ...workspace,
      handoffs: [handoff, ...workspace.handoffs.filter(item => item.id !== handoff.id)],
    },
  };
}

export function acceptPortalProcessHandoff(
  workspaces: Record<string, PortalClientWorkspace>,
  clientId: string,
  handoffId: string,
  acceptedAt = new Date().toISOString(),
): Record<string, PortalClientWorkspace> {
  const workspace = mergePortalClientWorkspace(clientId, workspaces[clientId]);
  return {
    ...workspaces,
    [clientId]: {
      ...workspace,
      handoffs: workspace.handoffs.map(item => {
        const handoff = normalizePortalProcessHandoff(item);
        return handoff.id === handoffId
          ? { ...handoff, status: "accepted", acceptedAt, updatedAt: acceptedAt }
          : handoff;
      }),
    },
  };
}

export function linkPortalProcessHandoffTasks(
  workspaces: Record<string, PortalClientWorkspace>,
  clientId: string,
  handoffId: string,
  taskIds: string[],
  updatedAt = new Date().toISOString(),
): Record<string, PortalClientWorkspace> {
  const workspace = mergePortalClientWorkspace(clientId, workspaces[clientId]);
  return {
    ...workspaces,
    [clientId]: {
      ...workspace,
      handoffs: workspace.handoffs.map(item => {
        const handoff = normalizePortalProcessHandoff(item);
        return handoff.id === handoffId
          ? { ...handoff, createdTaskIds: cleanList([...handoff.createdTaskIds, ...taskIds]), updatedAt }
          : handoff;
      }),
    },
  };
}

export function removePortalProcessHandoffs(
  workspaces: Record<string, PortalClientWorkspace>,
  clientId: string,
  sourceProcessId: ProcessId,
): Record<string, PortalClientWorkspace> {
  const workspace = mergePortalClientWorkspace(clientId, workspaces[clientId]);
  return {
    ...workspaces,
    [clientId]: {
      ...workspace,
      handoffs: workspace.handoffs.filter(handoff => handoff.sourceProcessId !== sourceProcessId),
    },
  };
}
