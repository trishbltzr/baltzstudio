import type { PortalState } from "../store";

export type SidebarShellState = Pick<PortalState,
  | "role"
  | "view"
  | "isMobile"
  | "navOpen"
  | "clientName"
  | "threads"
  | "escalations"
  | "sidePop"
  | "auditType"
  | "builderType"
  | "projectOverrides"
  | "clientWorkspaces"
>;

export type TopBarShellState = Pick<PortalState,
  | "role"
  | "view"
  | "isMobile"
  | "navOpen"
  | "sidebarCollapsed"
  | "notifOpen"
  | "notificationReadIds"
  | "notificationPreferences"
  | "taskView"
  | "taskFilter"
  | "pop"
  | "previewFrom"
  | "guidedSidebarActive"
  | "guidedSidebarExitTick"
  | "guidedTopBarInfo"
  | "canSwitchRoles"
  | "clientName"
  | "selectedThreadId"
  | "threads"
  | "escalations"
  | "journeyGates"
  | "tasks"
  | "projectOverrides"
  | "clientWorkspaces"
>;

export type MobileTabBarShellState = Pick<PortalState,
  | "role"
  | "view"
  | "clientName"
  | "selectedThreadId"
  | "threads"
  | "projectOverrides"
  | "clientWorkspaces"
>;
