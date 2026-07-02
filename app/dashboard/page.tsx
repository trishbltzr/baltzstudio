"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { ClientLifecycleStage, DashboardUserRole, Project, ClientNav } from "@/types";
import { LIFECYCLE_PROJECTS, applyLifecycleStageToProject } from "@/data/mockProjects";
import { updateTask, sendGate, approveGate, submitFeedback, finishMilestone } from "@/lib/projectMutations";
import { currentDashboardTimestamp } from "@/lib/dateDisplay";
import { Toast, ImpersonationBanner } from "@/components/shared";
import { AdminView } from "@/admin/AdminView";
import { ClientView, buildOnboardingSeed, type OnboardingStorageMode } from "@/client/ClientTabs";
import { InFullFlightAssistantWidget } from "@/components/InFullFlightAssistantWidget";
import type { InFullFlightWorkspace } from "@/lib/inFullFlightPrototype";
import {
  DASHBOARD_USER_EMAIL_HEADER,
  coercePersistedProjects,
  findProjectIdForUser,
  mergeDashboardProjects,
  normalizeDashboardUserEmail,
  type DashboardStatePayload,
} from "@/lib/dashboardPersistence";

const PROJECTS = LIFECYCLE_PROJECTS;
type DashboardSessionUser = { email: string; role: DashboardUserRole; name: string };
type StoredDashboardSessionUser = { email: string; role: DashboardUserRole | "manager"; name: string };
const DEVELOPER_EMAIL = "developer@baltazarstudio.co";
const LEGACY_MANAGER_EMAIL = "manager@baltazarstudio.co";

type WorkflowNudge = {
  eyebrow: string;
  title: string;
  body: string;
  actionLabel: string;
};

function normalizeDashboardRole(role: DashboardUserRole | "manager"): DashboardUserRole {
  return role === "manager" ? "developer" : role;
}

function normalizeSessionUser(user: StoredDashboardSessionUser): DashboardSessionUser {
  const role = normalizeDashboardRole(user.role);
  return {
    ...user,
    role,
    email: role === "developer" && normalizeDashboardUserEmail(user.email) === LEGACY_MANAGER_EMAIL
      ? DEVELOPER_EMAIL
      : user.email,
    name: role === "developer" && user.name === "Studio Manager" ? "Studio Developer" : user.name,
  };
}

function isAssignedDeveloper(project: Project, userEmail: string) {
  const normalizedUserEmail = normalizeDashboardUserEmail(userEmail);
  const assignedEmail = normalizeDashboardUserEmail(project.assignedDeveloperEmail)
    ?? normalizeDashboardUserEmail(project.assignedManagerEmail);
  return assignedEmail === normalizedUserEmail
    || (assignedEmail === LEGACY_MANAGER_EMAIL && normalizedUserEmail === DEVELOPER_EMAIL);
}

function studioProjectsForUser(projects: Project[], user: DashboardSessionUser | null) {
  if (!user) return [];
  if (user.role === "developer") {
    return projects.filter(project => isAssignedDeveloper(project, user.email));
  }
  return user.role === "admin" ? projects : [];
}

export default function Dashboard() {
  const router = useRouter();
  const [userLoaded, setUserLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState<DashboardSessionUser | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("bs-user");
    if (saved) {
      try {
        setCurrentUser(normalizeSessionUser(JSON.parse(saved) as StoredDashboardSessionUser));
      } catch {
        sessionStorage.removeItem("bs-user");
      }
    }
    setUserLoaded(true);
  }, []);

  useEffect(() => {
    if (userLoaded && !currentUser) {
      router.replace("/login");
    }
  }, [userLoaded, currentUser, router]);

  const devParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const devNav = devParams?.get("nav");
  const devSeed = devParams?.get("seed");
  const devAssistant = devParams?.get("assistant");

  const [selectedProjectId, setSelectedProjectId] = useState(PROJECTS[0]?.id ?? "");
  const [projects, setProjects] = useState<Project[]>(PROJECTS);
  // Studio users can preview a client's portal read-only when their role allows it.
  const [impersonatingClientId, setImpersonatingClientId] = useState<string | null>(null);
  const [studioProjectContextOpened, setStudioProjectContextOpened] = useState(false);
  const [dashboardStateLoaded, setDashboardStateLoaded] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [workflowNudge, setWorkflowNudge] = useState<WorkflowNudge | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workflowNudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const devOnboardingSeed = useMemo(
    () => (devSeed === "onboarding-done" ? buildOnboardingSeed() : undefined),
    [devSeed],
  );
  const devOnboardingStorageMode: OnboardingStorageMode =
    devSeed === "scratch" ? "scratch" : devSeed === "onboarding-done" ? "completed" : "default";

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }

  function showWorkflowNudge(nudge: WorkflowNudge) {
    setWorkflowNudge(nudge);
    if (workflowNudgeTimer.current) clearTimeout(workflowNudgeTimer.current);
    workflowNudgeTimer.current = setTimeout(() => setWorkflowNudge(null), 8500);
  }

  const updateProject = useCallback(
    (updater: (p: Project) => Project) => {
      setProjects(prev => prev.map(p => (p.id === selectedProjectId ? updater(p) : p)));
    },
    [selectedProjectId],
  );

  const project = projects.find(p => p.id === selectedProjectId) ?? projects[0]!;
  const dashboardAssistantWorkspace: InFullFlightWorkspace = {
    slug: project.id,
    clientName: project.clientName,
    siteName: project.workflow?.lead.businessName || project.clientName,
    supportTier: project.workflow?.planLabel || "In Full Flight Assistant Preview",
    launchDate: project.startDate,
    liveUrl: project.workflow?.lead.website || `${project.clientName.toLowerCase().replace(/\s+/g, "-")}.example`,
    revisionPolicy: "Fast content edits and light funnel refinements are in scope. Bigger repositioning opens a new studio round.",
    autoPreviewRule: "Copy, images, testimonials, banners, and single-page section order can auto-preview. Structural redesign requests pause for studio review.",
    allowedEdits: [],
    pushbackRules: [
      "Multi-page site or full redesign requests become a separate scope",
      "Brand repositioning needs studio review before preview",
      "Post-approval structural changes open a new round",
    ],
  };

  useEffect(() => {
    if (!userLoaded || !currentUser) return;

    let cancelled = false;
    const activeUser = currentUser;

    async function loadDashboardState() {
      try {
        const response = await fetch("/api/dashboard-state", {
          cache: "no-store",
          headers: { [DASHBOARD_USER_EMAIL_HEADER]: activeUser.email },
        });
        if (!response.ok) throw new Error(`Dashboard state load failed: ${response.status}`);
        const data = await response.json() as DashboardStatePayload;
        if (cancelled) return;
        const persistedProjects = coercePersistedProjects(data.projects);
        const mergedProjects = mergeDashboardProjects(PROJECTS, persistedProjects);
        const persistedProjectId = typeof data.selectedProjectId === "string" ? data.selectedProjectId : null;
        const clientProjectId = activeUser.role === "client"
          ? findProjectIdForUser(mergedProjects, activeUser.email)
          : null;
        const visibleStudioProjects = studioProjectsForUser(mergedProjects, activeUser);
        const nextSelectedProjectId = clientProjectId
          ?? (activeUser.role === "developer"
            ? (persistedProjectId && visibleStudioProjects.some(project => project.id === persistedProjectId)
              ? persistedProjectId
              : visibleStudioProjects[0]?.id)
            : null)
          ?? (persistedProjectId && mergedProjects.some(project => project.id === persistedProjectId)
            ? persistedProjectId
            : mergedProjects[0]?.id);

        setProjects(mergedProjects);
        if (nextSelectedProjectId) setSelectedProjectId(nextSelectedProjectId);
      } catch (error) {
        console.error("Unable to load dashboard state from Supabase.", error);
      } finally {
        if (!cancelled) setDashboardStateLoaded(true);
      }
    }

    void loadDashboardState();

    return () => {
      cancelled = true;
    };
  }, [currentUser, userLoaded]);

  useEffect(() => {
    if (!currentUser || !dashboardStateLoaded) return;

    const saveTimer = setTimeout(() => {
      void fetch("/api/dashboard-state", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          [DASHBOARD_USER_EMAIL_HEADER]: currentUser.email,
        },
        body: JSON.stringify({ projects, selectedProjectId }),
      }).catch(error => {
        console.error("Unable to save dashboard state to Supabase.", error);
      });
    }, 700);

    return () => clearTimeout(saveTimer);
  }, [currentUser, dashboardStateLoaded, projects, selectedProjectId]);

  useEffect(() => {
    if (currentUser?.role !== "client") return;
    const matchingProject = projects.find(p => p.clientEmail === currentUser.email);
    if (matchingProject && matchingProject.id !== selectedProjectId) {
      setSelectedProjectId(matchingProject.id);
    }
  }, [currentUser, projects, selectedProjectId]);

  const isStudio = currentUser?.role === "admin" || currentUser?.role === "developer";
  const isAdminUser = currentUser?.role === "admin";
  const studioProjects = isStudio ? studioProjectsForUser(projects, currentUser) : [];
  const selectedStudioProjectId = studioProjects.some(project => project.id === selectedProjectId)
    ? selectedProjectId
    : studioProjects[0]?.id ?? "";

  useEffect(() => {
    if (currentUser?.role !== "developer") return;
    if (!selectedStudioProjectId) {
      if (selectedProjectId) setSelectedProjectId("");
      return;
    }
    if (selectedProjectId !== selectedStudioProjectId) {
      setSelectedProjectId(selectedStudioProjectId);
    }
  }, [currentUser, selectedProjectId, selectedStudioProjectId]);

  function selectProject(id: string) {
    if (currentUser?.role === "developer" && !studioProjects.some(project => project.id === id)) {
      return;
    }
    if (currentUser?.role === "admin" || currentUser?.role === "developer") {
      setStudioProjectContextOpened(true);
    }
    setSelectedProjectId(id);
  }

  function setClientLifecycleMode(stage: ClientLifecycleStage) {
    updateProject(p => applyLifecycleStageToProject(p, stage));
  }

  function changeProjectLifecycleStage(stage: ClientLifecycleStage) {
    updateProject(p => applyLifecycleStageToProject(p, stage));
    showToast("Client plan updated.");
  }

  function assignProjectDeveloper(projectId: string, assignedDeveloperEmail: string | null, assignedDeveloperName: string | null) {
    setProjects(prev => prev.map(project => (
      project.id === projectId
        ? { ...project, assignedDeveloperEmail, assignedDeveloperName, assignedManagerEmail: null, assignedManagerName: null }
        : project
    )));
    showToast(assignedDeveloperEmail ? `Assigned to ${assignedDeveloperName}.` : "Developer assignment cleared.");
  }

  function handleLogout() {
    sessionStorage.removeItem("bs-user");
    setCurrentUser(null);
    router.push("/login");
  }

  if (!userLoaded || !currentUser || !dashboardStateLoaded) return null;
  if (currentUser.role === "developer" && studioProjects.length === 0) {
    return (
      <div className="bs-app">
        <div className="client-dashboard-shell">
          <section className="dashboard-workspace">
            <div className="dashboard-topbar">
              <div className="dashboard-topbar-left">
                <div className="dashboard-topbar-heading-row">
                  <div className="dashboard-topbar-title">Developer Workspace</div>
                </div>
              </div>
            </div>
            <div className="dashboard-main">
              <div style={{ padding: "1.5rem", border: "1px solid var(--border)", borderRadius: "1rem", background: "var(--surface)", display: "grid", gap: "0.5rem", maxWidth: "32rem" }}>
                <strong style={{ fontSize: "var(--text-lg)", fontWeight: 500 }}>No clients assigned yet</strong>
                <p style={{ margin: 0, color: "var(--fg-muted)", lineHeight: 1.6 }}>
                  This developer workspace only shows assigned client accounts. Ask the Studio Admin to assign a client so day-to-day delivery work can start here.
                </p>
              </div>
            </div>
          </section>
        </div>
        {toast && <Toast message={toast} />}
      </div>
    );
  }

  const impersonatedProject = impersonatingClientId
    ? projects.find(p => p.id === impersonatingClientId) ?? null
    : null;
  const showImpersonation = isStudio && impersonatedProject !== null;
  const readonlyNotice = () => showToast("Read-only preview — exit to make changes.");

  return (
    <div className="bs-app">
      {showImpersonation && impersonatedProject && (
        <ImpersonationBanner
          clientName={impersonatedProject.clientName}
          onExit={() => setImpersonatingClientId(null)}
        />
      )}
      {showImpersonation && impersonatedProject ? (
        <ClientView
          project={impersonatedProject}
          onSubmitFeedback={readonlyNotice}
          onBrandChange={readonlyNotice}
          onTaskStatusChange={readonlyNotice}
          onFinishMilestone={readonlyNotice}
          onConfirmCocoonPayment={readonlyNotice}
          onLogout={() => setImpersonatingClientId(null)}
          ownerName={impersonatedProject.clientName}
          ownerEmail={impersonatedProject.clientEmail}
        />
      ) : isStudio ? (
        <AdminView
          workspaceRole={currentUser.role === "developer" ? "developer" : "admin"}
          projectContextOpened={studioProjectContextOpened}
          onViewAsClient={isAdminUser ? ((id) => {
            setStudioProjectContextOpened(true);
            setImpersonatingClientId(id);
          }) : undefined}
          projects={studioProjects}
          selectedProjectId={selectedStudioProjectId}
          onSelectProject={selectProject}
          onAssignProjectDeveloper={assignProjectDeveloper}
          onTaskStatusChange={(id, status) => {
            updateProject(p => updateTask(p, id, status));
            showToast("Task updated.");
          }}
          onProjectTaskStatusChange={(projectId, taskId, status) => {
            setProjects(prev => prev.map(p => (p.id === projectId ? updateTask(p, taskId, status) : p)));
            showToast("Task updated.");
          }}
          onSendGate={id => {
            if (!isAdminUser) {
              showToast("Developer can prep approval windows, but Admin approves before anything goes to the client.");
              return;
            }
            updateProject(p => sendGate(p, id));
            showToast("Studio approved and sent to client.");
          }}
          onApproveGate={id => {
            if (!isAdminUser) {
              showToast("Escalate final approvals to Admin.");
              return;
            }
            updateProject(p => approveGate(p, id));
            showToast("Gate approved.");
          }}
          onDenyGate={id => {
            if (!isAdminUser) {
              showToast("Escalate final approval decisions to Admin.");
              return;
            }
            updateProject(p => submitFeedback(p, id, { whatWorked: "", adjustments: "Revision requested by studio.", approved: false, submittedAt: currentDashboardTimestamp() }));
            showToast("Gate moved to revisions.");
          }}
          onFinishMilestone={milestoneId => {
            updateProject(p => finishMilestone(p, milestoneId));
            showToast("Milestone marked finished.");
          }}
          onBrandChange={brand => updateProject(p => ({ ...p, brand }))}
          onChangeProjectStage={stage => {
            if (!isAdminUser) {
              showToast("Only Admin can change plan or stage.");
              return;
            }
            changeProjectLifecycleStage(stage);
          }}
          onLogout={handleLogout}
          initialNav={devNav ?? undefined}
        />
      ) : (
        <ClientView
          project={project}
          onSubmitFeedback={(id, fb) => {
            updateProject(p => submitFeedback(p, id, fb));
            showToast(fb.approved ? "Approved — thank you!" : "Feedback submitted.");
          }}
          onBrandChange={brand => updateProject(p => ({ ...p, brand }))}
          onTaskStatusChange={(id, status) => {
            updateProject(p => updateTask(p, id, status));
            showToast("Task updated.");
          }}
          onFinishMilestone={milestoneId => {
            if (project.workflow?.stage === "paid-cocoon" && milestoneId === "cocoon-consult") {
              showWorkflowNudge({
                eyebrow: "Foundation complete",
                title: "Your Cocoon Consult foundation is ready.",
                body: "If the Winged in a Week payment is already confirmed, move this client into the build workflow and continue the walkthrough there.",
                actionLabel: "I already paid",
              });
              return;
            }
            updateProject(p => finishMilestone(p, milestoneId));
            showToast("Milestone marked finished.");
          }}
          onConfirmCocoonPayment={() => {
            setClientLifecycleMode("paid-cocoon");
            showToast("Payment marked as paid.");
          }}
          onLogout={handleLogout}
          ownerName={currentUser.name}
          ownerEmail={currentUser.email}
          initialNav={devNav as ClientNav | undefined}
          devOnboardingSeed={devOnboardingSeed}
          devOnboardingStorageMode={devOnboardingStorageMode}
        />
      )}

      {toast && <Toast message={toast} />}
      {workflowNudge && (
        <div className="workflow-nudge-toast" role="status" aria-live="polite">
          <button type="button" className="workflow-nudge-close" aria-label="Dismiss" onClick={() => setWorkflowNudge(null)}>×</button>
          <div className="workflow-nudge-eyebrow">{workflowNudge.eyebrow}</div>
          <strong>{workflowNudge.title}</strong>
          <p>{workflowNudge.body}</p>
          <button type="button" onClick={() => setClientLifecycleMode("wiaw-active")}>{workflowNudge.actionLabel}</button>
        </div>
      )}
      {(currentUser.role === "client" || showImpersonation) && (
        <InFullFlightAssistantWidget
          workspace={dashboardAssistantWorkspace}
          shellClassName="iff-widget-anchor iff-dashboard-widget-shell"
          defaultOpen={devAssistant === "open"}
        />
      )}
    </div>
  );
}
