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
  type DashboardStatePayload,
} from "@/lib/dashboardPersistence";

const PROJECTS = LIFECYCLE_PROJECTS;

type WorkflowNudge = {
  eyebrow: string;
  title: string;
  body: string;
  actionLabel: string;
};

export default function Dashboard() {
  const router = useRouter();
  const [userLoaded, setUserLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ email: string; role: DashboardUserRole; name: string } | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("bs-user");
    if (saved) {
      try {
        setCurrentUser(JSON.parse(saved) as { email: string; role: DashboardUserRole; name: string });
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
  // Studio users (admin/manager) can preview a client's portal read-only.
  const [impersonatingClientId, setImpersonatingClientId] = useState<string | null>(null);
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
    revisionPolicy: "Fast content edits and light layout refinements are in scope. Bigger repositioning opens a new studio round.",
    autoPreviewRule: "Copy, images, testimonials, banners, and section order can auto-preview. Structural redesign requests pause for studio review.",
    allowedEdits: [],
    pushbackRules: [
      "Whole-site redesign requests become a separate scope",
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
        const nextSelectedProjectId = clientProjectId
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

  function selectProject(id: string) {
    setSelectedProjectId(id);
  }

  function setClientLifecycleMode(stage: ClientLifecycleStage) {
    updateProject(p => applyLifecycleStageToProject(p, stage));
  }

  function changeProjectLifecycleStage(stage: ClientLifecycleStage) {
    updateProject(p => applyLifecycleStageToProject(p, stage));
    showToast("Client plan updated.");
  }

  function handleLogout() {
    sessionStorage.removeItem("bs-user");
    setCurrentUser(null);
    router.push("/login");
  }

  if (!userLoaded || !currentUser || !dashboardStateLoaded) return null;

  const isStudio = currentUser.role === "admin" || currentUser.role === "manager";
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
          workspaceRole={currentUser.role === "manager" ? "manager" : "admin"}
          onViewAsClient={(id) => setImpersonatingClientId(id)}
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectProject={selectProject}
          onTaskStatusChange={(id, status) => {
            updateProject(p => updateTask(p, id, status));
            showToast("Task updated.");
          }}
          onProjectTaskStatusChange={(projectId, taskId, status) => {
            setProjects(prev => prev.map(p => (p.id === projectId ? updateTask(p, taskId, status) : p)));
            showToast("Task updated.");
          }}
          onSendGate={id => {
            updateProject(p => sendGate(p, id));
            showToast("Review sent to client.");
          }}
          onApproveGate={id => {
            updateProject(p => approveGate(p, id));
            showToast("Gate approved.");
          }}
          onDenyGate={id => {
            updateProject(p => submitFeedback(p, id, { whatWorked: "", adjustments: "Revision requested by studio.", approved: false, submittedAt: currentDashboardTimestamp() }));
            showToast("Gate moved to revisions.");
          }}
          onFinishMilestone={milestoneId => {
            updateProject(p => finishMilestone(p, milestoneId));
            showToast("Milestone marked finished.");
          }}
          onBrandChange={brand => updateProject(p => ({ ...p, brand }))}
          onChangeProjectStage={changeProjectLifecycleStage}
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
