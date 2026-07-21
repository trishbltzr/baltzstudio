import { UNASSIGNED_WORK_CLIENT, type StudioClient } from "./clients";
import type { Role } from "./types";
import { mergePortalClientWorkspace, type PortalClientWorkspace, type PortalEngineWorkKey, type PortalEngineWorkRecord } from "@/lib/portalWorkspacePersistence";
import type { GuidedAuditSession } from "@/lib/portalAuditPersistence";

type UpdatedWork = { updatedAt?: string };
type ClientWork = { clientId: string };

export function clientsForEngineWork(role: Role, visibleClients: StudioClient[]): StudioClient[] {
  if (role === "client") return visibleClients;
  return visibleClients.some(client => client.id === UNASSIGNED_WORK_CLIENT.id)
    ? visibleClients
    : [...visibleClients, UNASSIGNED_WORK_CLIENT];
}

export function startClientForEngine(role: Role, visibleClients: StudioClient[]): StudioClient | null {
  if (role === "client") return visibleClients[0] || null;
  return UNASSIGNED_WORK_CLIENT;
}

export function latestEngineWork<T extends UpdatedWork>(items: T[]): T | null {
  return items.reduce<T | null>((latest, item) => {
    if (!latest) return item;
    return (item.updatedAt || "").localeCompare(latest.updatedAt || "") > 0 ? item : latest;
  }, null);
}

export function assignedEngineWork<T extends ClientWork>(items: T[], visibleClients: StudioClient[]): T[] {
  const assignedIds = new Set(visibleClients.map(client => client.id));
  return items.filter(item => assignedIds.has(item.clientId));
}

export function isUnassignedEngineClient(client: StudioClient | null | undefined): boolean {
  return client?.id === UNASSIGNED_WORK_CLIENT.id;
}

export function saveEngineWork(
  workspaces: Record<string, PortalClientWorkspace>,
  clientId: string,
  key: PortalEngineWorkKey,
  record: PortalEngineWorkRecord | null,
): Record<string, PortalClientWorkspace> {
  const workspace = mergePortalClientWorkspace(clientId, workspaces[clientId]);
  const engineWork = { ...workspace.engineWork };
  if (record) engineWork[key] = record;
  else delete engineWork[key];
  return { ...workspaces, [clientId]: { ...workspace, engineWork } };
}

export function engineWorkFromGuidedSession(session: GuidedAuditSession): PortalEngineWorkRecord {
  const complete = !!session.proposal;
  const progress = complete
    ? 100
    : session.stage > 0
      ? Math.min(92, 35 + session.stage * 24)
      : session.entered
        ? 18
        : 0;
  return {
    status: complete ? "complete" : progress > 0 ? "in_progress" : "intake",
    progress,
    updatedAt: new Date().toISOString(),
    payload: { session },
  };
}
