import { STUDIO_CLIENTS } from "@/portal/clients";

export const PORTAL_WORKSPACE_ROW_ID = "default";
export const PORTAL_WORKSPACE_FALLBACK_RUN_ID = "__portal_workspace__";
export const PORTAL_WORKSPACE_FALLBACK_CLIENT_ID = "__portal_workspace__";
export const PORTAL_UPLOAD_BUCKET = "portal-uploads";

export type PortalApprovalRecord = {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  thumb: string;
  sent: boolean;
  sentAt?: string;
  threadId?: string;
  escalated?: boolean;
};

export type PortalProposalRecord = {
  sent: boolean;
  sentAt?: string;
  iffOn: boolean;
  threadId?: string;
};

export type PortalCollaboratorRecord = {
  id: string;
  name: string;
  email: string;
  access: string;
  studio: boolean;
  invitedAt: string;
  status: "pending" | "invited";
};

export type PortalWorkspaceFile = {
  id: string;
  clientId: string;
  name: string;
  ext: string;
  folder: string;
  sizeBytes: number;
  sizeLabel: string;
  by: string;
  updated: string;
  status: "Ready" | "Uploaded" | "Attached";
  mimeType?: string;
  objectPath?: string;
  storageMode: "supabase" | "inline";
  contentBase64?: string;
  threadId?: string;
};

export type PortalFunnelPlanRecord = {
  id: string;
  buildId: string;
  type: "funnel_plan";
  clientId: string;
  clientName: string;
  title: string;
  statusLabel: string;
  due: string;
  generatedAt: string;
  updatedAt: string;
  content: unknown;
};

export type PortalClientNoteRecord = {
  id: string;
  text: string;
  author: string;
  createdAt: string;
};

export type PortalClientWorkspace = {
  approvals: PortalApprovalRecord[];
  proposal: PortalProposalRecord | null;
  collaborators: PortalCollaboratorRecord[];
  files: PortalWorkspaceFile[];
  funnelPlans: PortalFunnelPlanRecord[];
  notes: PortalClientNoteRecord[];
};

export type PersistedPortalWorkspaceState = {
  tasks: unknown[];
  journeyGates: unknown[];
  threads: unknown[];
  escalations: unknown[];
  ticketSeq: number;
  clientWorkspaces: Record<string, PortalClientWorkspace>;
  progressChatSessions: unknown[];
  activeProgressChatId: string | null;
};

export const DEFAULT_PORTAL_APPROVALS: PortalApprovalRecord[] = [
  {
    id: "approval-flora-full-site",
    clientId: "flora",
    clientName: "Flora & Co.",
    title: "Milestone 2 — Full Site",
    thumb: "oklch(0.8 0.1 70)",
    sent: false,
  },
  {
    id: "approval-plume-handoff",
    clientId: "plume",
    clientName: "Plume Studio",
    title: "Milestone 3 — Handoff",
    thumb: "oklch(0.8 0.07 165)",
    sent: false,
  },
  {
    id: "approval-saffron-readout",
    clientId: "saffron",
    clientName: "Saffron & Sage",
    title: "Cocoon readout",
    thumb: "oklch(0.8 0.1 40)",
    sent: false,
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function slugify(value: string) {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function asArray<T>(value: unknown) {
  return Array.isArray(value) ? value as T[] : [];
}

function asRecord<T>(value: unknown) {
  return isRecord(value) ? value as Record<string, T> : {};
}

export function portalClientId(name: string) {
  const studioClient = STUDIO_CLIENTS.find(client => client.name === name);
  return studioClient?.id || slugify(name) || "client";
}

export function emptyPortalClientWorkspace(clientId: string): PortalClientWorkspace {
  return {
    approvals: DEFAULT_PORTAL_APPROVALS.filter(approval => approval.clientId === clientId),
    proposal: null,
    collaborators: [],
    files: [],
    funnelPlans: [],
    notes: [],
  };
}

export function mergePortalApprovals(clientId: string, approvals: PortalApprovalRecord[]) {
  const defaults = DEFAULT_PORTAL_APPROVALS.filter(approval => approval.clientId === clientId);
  const byId = new Map(approvals.map(approval => [approval.id, approval]));
  return defaults.map(approval => ({ ...approval, ...(byId.get(approval.id) || {}) }));
}

export function mergePortalClientWorkspace(clientId: string, workspace?: Partial<PortalClientWorkspace> | null): PortalClientWorkspace {
  const base = emptyPortalClientWorkspace(clientId);
  return {
    approvals: mergePortalApprovals(clientId, asArray<PortalApprovalRecord>(workspace?.approvals)),
    proposal: isRecord(workspace?.proposal) ? workspace?.proposal as PortalProposalRecord : null,
    collaborators: asArray<PortalCollaboratorRecord>(workspace?.collaborators),
    files: asArray<PortalWorkspaceFile>(workspace?.files),
    funnelPlans: asArray<PortalFunnelPlanRecord>(workspace?.funnelPlans),
    notes: asArray<PortalClientNoteRecord>(workspace?.notes),
  };
}

export function normalizePersistedPortalWorkspaceState(value: unknown): PersistedPortalWorkspaceState | null {
  if (!isRecord(value)) return null;

  const clientWorkspaces = asRecord<PortalClientWorkspace>(value.clientWorkspaces);
  const mergedClientWorkspaces = Object.fromEntries(
    Object.entries(clientWorkspaces).map(([clientId, workspace]) => [clientId, mergePortalClientWorkspace(clientId, workspace)]),
  ) as Record<string, PortalClientWorkspace>;

  DEFAULT_PORTAL_APPROVALS.forEach(approval => {
    if (!mergedClientWorkspaces[approval.clientId]) {
      mergedClientWorkspaces[approval.clientId] = emptyPortalClientWorkspace(approval.clientId);
    }
  });

  return {
    tasks: asArray(value.tasks),
    journeyGates: asArray(value.journeyGates),
    threads: asArray(value.threads),
    escalations: asArray(value.escalations),
    ticketSeq: typeof value.ticketSeq === "number" && Number.isFinite(value.ticketSeq) ? Math.max(1, Math.floor(value.ticketSeq)) : 1,
    clientWorkspaces: mergedClientWorkspaces,
    progressChatSessions: asArray(value.progressChatSessions),
    activeProgressChatId: typeof value.activeProgressChatId === "string" ? value.activeProgressChatId : null,
  };
}
