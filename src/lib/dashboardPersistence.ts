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

function usesLegacyMultiPageWorkflow(project: Project) {
  const milestoneText = project.milestones
    ?.flatMap(milestone => [
      milestone.title,
      milestone.clientLabel,
      ...milestone.phases.flatMap(phase => [
        phase.title,
        phase.gate?.label ?? "",
        phase.gate?.clientLabel ?? "",
        phase.gate?.message ?? "",
        ...phase.tasks.map(task => task.title),
      ]),
    ])
    .join(" ")
    .toLowerCase() ?? "";

  return (
    milestoneText.includes("full site") ||
    milestoneText.includes("homepage") ||
    milestoneText.includes("services page") ||
    milestoneText.includes("about page") ||
    milestoneText.includes("site live + handoff")
  );
}

function usesSinglePageFunnelWorkflow(project: Project) {
  const milestoneText = project.milestones
    ?.flatMap(milestone => [
      milestone.title,
      milestone.clientLabel,
      ...milestone.phases.flatMap(phase => [
        phase.title,
        phase.gate?.label ?? "",
        phase.gate?.clientLabel ?? "",
        ...phase.tasks.map(task => task.title),
      ]),
    ])
    .join(" ")
    .toLowerCase() ?? "";

  return milestoneText.includes("funnel") || milestoneText.includes("functionality test");
}

export function mergeDashboardProjects(defaultProjects: Project[], persistedProjects: Project[]) {
  const mergedById = new Map(defaultProjects.map(project => [project.id, project]));

  persistedProjects.forEach(project => {
    const defaultProject = mergedById.get(project.id);
    const shouldRefreshWorkflow = !!defaultProject && (
      (usesLegacyMultiPageWorkflow(project) && !usesLegacyMultiPageWorkflow(defaultProject)) ||
      (defaultProject.workflow?.stage === "wiaw-active" && project.workflow?.stage !== "wiaw-active" && usesSinglePageFunnelWorkflow(project))
    );
    const mergedProject = defaultProject ? { ...defaultProject, ...project } : project;
    mergedById.set(
      project.id,
      shouldRefreshWorkflow && defaultProject
        ? {
            ...mergedProject,
            milestones: defaultProject.milestones,
            plan: defaultProject.plan,
            workflow: defaultProject.workflow,
            assets: defaultProject.assets,
            notes: defaultProject.notes,
          }
        : mergedProject,
    );
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
