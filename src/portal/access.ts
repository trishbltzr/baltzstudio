import type { ClientProject, Role, View } from "./types";

export type PortalAccessState = {
  role: Role;
  clientName: string;
  projectOverrides: Record<string, Partial<ClientProject>>;
};

export const BASE_ROLE_VIEWS: Record<Role, ReadonlySet<View>> = {
  admin: new Set(["progress", "clients", "tasks", "inbox", "audits_new", "funnels", "activity", "team", "playbooks", "invoices", "billing", "profile", "settings", "onboarding"]),
  dev: new Set(["progress", "clients", "tasks", "review", "inbox", "audits_new", "funnels", "playbooks", "profile", "settings", "onboarding"]),
  client: new Set(["progress", "review", "milestones", "tasks", "inbox", "activity", "audit", "funnels", "files", "assistant", "profile", "settings"]),
};

export function clientHasEngineAccess(_state: PortalAccessState) {
  // Every authenticated portal role can use the engine workspaces. Client data
  // remains scoped by clientsVisibleToRole, so clients can create and edit only
  // audits and builds belonging to their own brand.
  return true;
}

export function canAccessPortalView(state: PortalAccessState, view: View) {
  if (!BASE_ROLE_VIEWS[state.role].has(view)) return false;
  if (state.role === "client" && (view === "audit" || view === "funnels")) {
    return clientHasEngineAccess(state);
  }
  return true;
}
