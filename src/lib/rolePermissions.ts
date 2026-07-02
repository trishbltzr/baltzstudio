import type { DashboardUserRole } from "../types";

export type RolePermission =
  | "viewAllClients"
  | "viewAssignedClients"
  | "switchClients"
  | "manageClientAssignments"
  | "changeClientPlan"
  | "manageRoleAccess"
  | "editGlobalConfigurations"
  | "manageBilling"
  | "viewAllInbox"
  | "viewAssignedInbox"
  | "manageProjectWork"
  | "manageFiles"
  | "manageMilestones"
  | "sendReviewGates"
  | "approveReviewGates"
  | "viewClientWorkspace"
  | "viewClientWorkspacePreview"
  | "finalApprovals";

export const ROLE_PERMISSIONS: Record<DashboardUserRole, Record<RolePermission, boolean>> = {
  admin: {
    viewAllClients: true,
    viewAssignedClients: true,
    switchClients: true,
    manageClientAssignments: true,
    changeClientPlan: true,
    manageRoleAccess: true,
    editGlobalConfigurations: true,
    manageBilling: true,
    viewAllInbox: true,
    viewAssignedInbox: true,
    manageProjectWork: true,
    manageFiles: true,
    manageMilestones: true,
    sendReviewGates: true,
    approveReviewGates: true,
    viewClientWorkspace: true,
    viewClientWorkspacePreview: true,
    finalApprovals: true,
  },
  developer: {
    viewAllClients: false,
    viewAssignedClients: true,
    switchClients: true,
    manageClientAssignments: false,
    changeClientPlan: false,
    manageRoleAccess: false,
    editGlobalConfigurations: false,
    manageBilling: false,
    viewAllInbox: false,
    viewAssignedInbox: true,
    manageProjectWork: true,
    manageFiles: true,
    manageMilestones: true,
    sendReviewGates: false,
    approveReviewGates: false,
    viewClientWorkspace: true,
    viewClientWorkspacePreview: false,
    finalApprovals: false,
  },
  client: {
    viewAllClients: false,
    viewAssignedClients: false,
    switchClients: false,
    manageClientAssignments: false,
    changeClientPlan: false,
    manageRoleAccess: false,
    editGlobalConfigurations: false,
    manageBilling: false,
    viewAllInbox: false,
    viewAssignedInbox: false,
    manageProjectWork: false,
    manageFiles: false,
    manageMilestones: false,
    sendReviewGates: false,
    approveReviewGates: false,
    viewClientWorkspace: true,
    viewClientWorkspacePreview: false,
    finalApprovals: false,
  },
};

export function can(role: DashboardUserRole, permission: RolePermission) {
  return ROLE_PERMISSIONS[role][permission];
}
