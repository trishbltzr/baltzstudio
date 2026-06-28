import type { DashboardUserRole } from "../types";

export type RolePermission =
  | "viewPortfolio"
  | "switchClients"
  | "manageClientAssignments"
  | "changeClientPlan"
  | "editGlobalConfigurations"
  | "manageProjectWork"
  | "manageFiles"
  | "manageMilestones"
  | "reviewGates"
  | "viewClientWorkspace";

export const ROLE_PERMISSIONS: Record<DashboardUserRole, Record<RolePermission, boolean>> = {
  admin: {
    viewPortfolio: true,
    switchClients: true,
    manageClientAssignments: true,
    changeClientPlan: true,
    editGlobalConfigurations: true,
    manageProjectWork: true,
    manageFiles: true,
    manageMilestones: true,
    reviewGates: true,
    viewClientWorkspace: true,
  },
  manager: {
    viewPortfolio: true,
    switchClients: true,
    manageClientAssignments: true,
    changeClientPlan: false,
    editGlobalConfigurations: false,
    manageProjectWork: true,
    manageFiles: true,
    manageMilestones: true,
    reviewGates: true,
    viewClientWorkspace: true,
  },
  client: {
    viewPortfolio: false,
    switchClients: false,
    manageClientAssignments: false,
    changeClientPlan: false,
    editGlobalConfigurations: false,
    manageProjectWork: false,
    manageFiles: false,
    manageMilestones: false,
    reviewGates: false,
    viewClientWorkspace: true,
  },
};

export function can(role: DashboardUserRole, permission: RolePermission) {
  return ROLE_PERMISSIONS[role][permission];
}
