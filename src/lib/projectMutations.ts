import type { Project, GateStatus, TaskStatus, GateFeedback } from "../types";

export function updateTask(project: Project, taskId: string, status: TaskStatus): Project {
  return {
    ...project,
    milestones: project.milestones.map(m => ({
      ...m,
      phases: m.phases.map(p => {
        if (!p.tasks.some(t => t.id === taskId)) return p;

        let tasks = p.tasks.map(t => {
          if (t.id === taskId) return { ...t, status };
          if (status === "in_progress" && t.status === "in_progress") return { ...t, status: "not_started" as TaskStatus };
          return t;
        });

        // Keep each phase to one active task. Completing a task unlocks only
        // the next waiting task, which prevents several rows from being active.
        if (status === "complete") {
          const completedTaskIndex = tasks.findIndex(t => t.id === taskId);
          const nextNotStartedIndex = tasks.findIndex((t, i) => i > completedTaskIndex && t.status === "not_started");
          tasks = tasks.map((t, i) => {
            if (t.status === "in_progress") return { ...t, status: "not_started" as TaskStatus };
            if (i === nextNotStartedIndex) return { ...t, status: "in_progress" as TaskStatus };
            return t;
          });
        } else if (status === "not_started") {
          const firstWaitingIndex = tasks.findIndex(t => t.status === "not_started");
          const hasActive = tasks.some(t => t.status === "in_progress");
          if (!hasActive && firstWaitingIndex !== -1) {
            tasks = tasks.map((t, i) => i === firstWaitingIndex ? { ...t, status: "in_progress" as TaskStatus } : t);
          }
        }

        const allDone = tasks.every(t => t.status === "complete");
        const gate = p.gate ? (p.gate.status === "locked" && allDone ? { ...p.gate, status: "ready" as GateStatus } : p.gate.status === "ready" && !allDone ? { ...p.gate, status: "locked" as GateStatus } : p.gate) : undefined;
        return { ...p, tasks, gate };
      }),
    })),
  };
}

export function finishMilestone(project: Project, milestoneId: string): Project {
  const targetIndex = project.milestones.findIndex(milestone => milestone.id === milestoneId);
  if (targetIndex === -1) return project;

  return {
    ...project,
    milestones: project.milestones.map((milestone, index) => {
      if (index === targetIndex) {
        return {
          ...milestone,
          status: "complete",
          phases: milestone.phases.map(phase => ({
            ...phase,
            tasks: phase.tasks.map(task => ({ ...task, status: "complete" as TaskStatus })),
            gate: phase.gate ? { ...phase.gate, status: "approved" as GateStatus, approvedAt: phase.gate.approvedAt ?? new Date().toLocaleDateString() } : undefined,
          })),
        };
      }

      if (index === targetIndex + 1 && milestone.status === "locked") {
        return { ...milestone, status: "active" };
      }

      return milestone;
    }),
  };
}

export function sendGate(project: Project, gateId: string): Project {
  return { ...project, milestones: project.milestones.map(m => ({ ...m, phases: m.phases.map(p => ({ ...p, gate: p.gate?.id === gateId ? { ...p.gate, status: "sent" as GateStatus, sentAt: "Jun 6, 2025 at 10:30 AM" } : p.gate })) })) };
}

export function approveGate(project: Project, gateId: string): Project {
  return { ...project, milestones: project.milestones.map(m => ({ ...m, phases: m.phases.map(p => ({ ...p, gate: p.gate?.id === gateId ? { ...p.gate, status: "approved" as GateStatus, approvedAt: "Jun 6, 2025" } : p.gate })) })) };
}

export function submitFeedback(project: Project, gateId: string, feedback: GateFeedback): Project {
  return { ...project, milestones: project.milestones.map(m => ({ ...m, phases: m.phases.map(p => ({ ...p, gate: p.gate?.id === gateId ? { ...p.gate, status: feedback.approved ? "approved" as GateStatus : "revision" as GateStatus, clientFeedback: feedback, approvedAt: feedback.approved ? feedback.submittedAt : undefined } : p.gate })) })) };
}
