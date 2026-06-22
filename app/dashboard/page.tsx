"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { ClientLifecycleStage, Project, ClientNav } from "@/types";
import { INITIAL_PROJECT, LIFECYCLE_PROJECTS, applyLifecycleStageToProject } from "@/data/mockProjects";
import { updateTask, sendGate, approveGate, submitFeedback, finishMilestone } from "@/lib/projectMutations";
import { Toast } from "@/components/shared";
import { AdminView } from "@/admin/AdminView";
import { ClientView, buildOnboardingSeed, type OnboardingStorageMode } from "@/client/ClientTabs";

const PROJECTS = LIFECYCLE_PROJECTS;
type DevClientView = "cocoon" | "paid-cocoon" | "wiaw";

const DEV_VIEW_TO_STAGE: Record<DevClientView, ClientLifecycleStage> = {
  cocoon: "cocoon-audit",
  "paid-cocoon": "paid-cocoon",
  wiaw: "wiaw-active",
};

type WorkflowNudge = {
  eyebrow: string;
  title: string;
  body: string;
  actionLabel: string;
};

function isDevClientView(value: string | null | undefined): value is DevClientView {
  return value === "cocoon" || value === "paid-cocoon" || value === "wiaw";
}

export default function Dashboard() {
  const router = useRouter();
  const [userLoaded, setUserLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ email: string; role: "admin" | "client"; name: string } | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("bs-user");
    if (saved) {
      try {
        setCurrentUser(JSON.parse(saved) as { email: string; role: "admin" | "client"; name: string });
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
  const devView = devParams?.get("view");
  const devSeed = devParams?.get("seed");

  const initialClientView: DevClientView = isDevClientView(devView) ? devView : "paid-cocoon";
  const initialStage = DEV_VIEW_TO_STAGE[initialClientView];
  const initialProjects = PROJECTS.map((project, index) =>
    index === 0 ? applyLifecycleStageToProject(project, initialStage) : project,
  );
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjects[0]?.id ?? INITIAL_PROJECT.id);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
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

  function setClientLifecycleMode(mode: DevClientView) {
    updateProject(p => applyLifecycleStageToProject(p, DEV_VIEW_TO_STAGE[mode]));
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

  if (!userLoaded || !currentUser) return null;

  return (
    <div className="bs-app">
      {currentUser.role === "admin" ? (
        <AdminView
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectProject={selectProject}
          onTaskStatusChange={(id, status) => {
            updateProject(p => updateTask(p, id, status));
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
            updateProject(p => submitFeedback(p, id, { whatWorked: "", adjustments: "Revision requested by studio.", approved: false, submittedAt: new Date().toLocaleDateString() }));
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
            if (project.workflow?.stage === "paid-cocoon" && milestoneId === "cocoon-audit") {
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
          <button type="button" onClick={() => setClientLifecycleMode("wiaw")}>{workflowNudge.actionLabel}</button>
        </div>
      )}
    </div>
  );
}
