import { ALL_PROJECTS } from "./data";
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

export function clientHasEngineAccess(state: PortalAccessState) {
  if (state.role !== "client") return true;
  const baseProject = ALL_PROJECTS.find(project => project.client === state.clientName);
  const service = state.projectOverrides[state.clientName]?.service ?? baseProject?.service;
  return service === "iff";
}

export function canAccessPortalView(state: PortalAccessState, view: View) {
  if (!BASE_ROLE_VIEWS[state.role].has(view)) return false;
  if (state.role === "client" && (view === "audit" || view === "funnels")) {
    return clientHasEngineAccess(state);
  }
  return true;
}
