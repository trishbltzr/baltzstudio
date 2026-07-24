import type { Role, Task, TaskStatus } from "../portal/types";

export function applyTaskStatusLifecycle(
  task: Task,
  status: TaskStatus,
  actorRole: Role,
  occurredAt = new Date().toISOString(),
): Task {
  if (task.status === status) return task;
  if (status !== "done") return { ...task, status };
  const type = task.completionEventType || "task_completed";
  return {
    ...task,
    status,
    completionHistory: [
      ...(task.completionHistory || []),
      {
        id: `${task.id}:${occurredAt}:${type}`,
        type,
        occurredAt,
        fromStatus: task.status,
        toStatus: "done" as const,
        actorRole,
      },
    ].slice(-25),
  };
}

export function initializeTaskLifecycle(task: Task, actorRole: Role): Task {
  if (task.status !== "done" || task.completionHistory?.length) return task;
  return applyTaskStatusLifecycle({ ...task, status: "todo" }, "done", actorRole);
}
