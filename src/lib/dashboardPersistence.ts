import type { Project } from "@/types";

export const DASHBOARD_USER_EMAIL_HEADER = "x-dashboard-user-email";

export type DashboardStatePayload = {
  projects: Project[] | null;
  selectedProjectId: string | null;
  updatedAt: string | null;
};

export function normalizeDashboardUserEmail(email: string | null | undefined) {
  const normalized = email?.trim().toLowerCase();
  return normalized && normalized.includes("@") ? normalized : null;
}

export function coercePersistedProjects(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.filter((project): project is Project => (
    !!project
    && typeof project === "object"
    && typeof (project as Project).id === "string"
    && typeof (project as Project).clientEmail === "string"
  ));
}

export function mergeDashboardProjects(defaultProjects: Project[], persistedProjects: Project[]) {
  const mergedById = new Map(defaultProjects.map(project => [project.id, project]));

  persistedProjects.forEach(project => {
    mergedById.set(project.id, project);
  });

  const defaultIds = new Set(defaultProjects.map(project => project.id));
  const orderedDefaults = defaultProjects.map(project => mergedById.get(project.id) ?? project);
  const extraPersistedProjects = persistedProjects.filter(project => !defaultIds.has(project.id));

  return [...orderedDefaults, ...extraPersistedProjects];
}

export function findProjectIdForUser(projects: Project[], userEmail: string | null | undefined) {
  const normalizedEmail = normalizeDashboardUserEmail(userEmail);
  if (!normalizedEmail) return null;

  return projects.find(project => normalizeDashboardUserEmail(project.clientEmail) === normalizedEmail)?.id ?? null;
}
