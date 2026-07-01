import { AlertCircle, CalendarDays, CheckCircle2, ClipboardList, Clock3, Lock, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { Milestone, Phase, Project, Task, TaskStatus } from "../types";
import { allGates, bucketTaskStatus, isTaskOverdue, clientColorFor, clientColorVars } from "../lib/projectUtils";
import { AssigneeBadge, Panel, PanelHeader, StatusBadge, TruncatedText } from "./shared";

type TaskBucket = "action" | "progress" | "upcoming" | "complete";
type TaskAudienceRole = "admin" | "manager" | "client";

type TaskRow = {
  task: Task;
  phase: Phase;
  milestone: Milestone;
  bucket: TaskBucket;
};

const bucketMeta: Record<TaskBucket, { title: string; icon: LucideIcon; emptyClient: string; emptyAdmin: string }> = {
  action: {
    title: "Action needed",
    icon: AlertCircle,
    emptyClient: "No client tasks are waiting on you. Approval requests will appear below when they need your response.",
    emptyAdmin: "No client blockers or blocked tasks right now.",
  },
  progress: {
    title: "In progress",
    icon: Clock3,
    emptyClient: "No studio work is currently marked in progress.",
    emptyAdmin: "No active work is marked in progress.",
  },
  upcoming: {
    title: "Upcoming",
    icon: CalendarDays,
    emptyClient: "Upcoming work will show here once the studio queues the next steps.",
    emptyAdmin: "No queued tasks yet.",
  },
  complete: {
    title: "Completed",
    icon: CheckCircle2,
    emptyClient: "Completed tasks will collect here as the project moves forward.",
    emptyAdmin: "No completed tasks yet.",
  },
};

function taskBucket(task: Task, milestone: Milestone, role: TaskAudienceRole): TaskBucket {
  if (task.status === "complete") return "complete";
  if (task.status === "blocked") return "action";
  if (role === "client" && task.assignee === "client") return "action";
  if (role !== "client" && task.assignee === "client") return "action";
  if (task.status === "in_progress") return "progress";
  if (milestone.status === "active") return "upcoming";
  return "upcoming";
}

function deriveTaskRows(project: Project, role: TaskAudienceRole, milestoneFilter?: Milestone) {
  const rows: TaskRow[] = [];
  const milestones = milestoneFilter ? [milestoneFilter] : project.milestones;
  for (const milestone of milestones) {
    for (const phase of milestone.phases) {
      for (const task of phase.tasks) {
        if (role === "manager" && task.assignee !== "human") continue;
        rows.push({ task, phase, milestone, bucket: taskBucket(task, milestone, role) });
      }
    }
  }
  return rows;
}

function displayDate(date?: string) {
  if (!date) return null;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function phaseLabel(phase: Phase) {
  return phase.title.replace(/^\d+\.\d+\s+/, "");
}

function assigneeAudience(role: TaskAudienceRole) {
  return role === "client" ? "client" : "admin";
}

function TaskGroup({
  bucket,
  bucketRows,
  role,
  draggingTaskId,
  isDragOver,
  onTaskStatusChange,
  onRowDragStart,
  onRowDragEnd,
  onGroupDragOver,
  onGroupDragLeave,
  onGroupDrop,
}: {
  bucket: TaskBucket;
  bucketRows: TaskRow[];
  role: TaskAudienceRole;
  draggingTaskId: string | null;
  isDragOver: boolean;
  onTaskStatusChange?: (taskId: string, status: TaskStatus) => void;
  onRowDragStart: (row: TaskRow) => void;
  onRowDragEnd: () => void;
  onGroupDragOver: (bucket: TaskBucket) => void;
  onGroupDragLeave: (bucket: TaskBucket) => void;
  onGroupDrop: (bucket: TaskBucket) => void;
}) {
  const meta = bucketMeta[bucket];
  const Icon = meta.icon;
  const draggable = Boolean(onTaskStatusChange);

  return (
    <section
      className={`task-group is-${bucket} ${isDragOver ? "is-drag-over" : ""}`}
      onDragOver={event => {
        if (!draggable || !draggingTaskId) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        onGroupDragOver(bucket);
      }}
      onDragLeave={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          onGroupDragLeave(bucket);
        }
      }}
      onDrop={event => {
        event.preventDefault();
        onGroupDrop(bucket);
      }}
    >
      <div className="task-group-header">
        <div>
          <Icon size={14} />
          <span>{meta.title}</span>
        </div>
        <span>{bucketRows.length}</span>
      </div>

      <div className="task-list">
        {bucketRows.length === 0 ? (
          <div className="task-empty">{role === "client" ? meta.emptyClient : meta.emptyAdmin}</div>
        ) : (
          bucketRows.map(row => (
            <div
              key={row.task.id}
              className={`task-row ${row.task.status === "complete" ? "is-complete" : ""} ${draggingTaskId === row.task.id ? "is-dragging" : ""}`}
              draggable={draggable}
              onDragStart={event => {
                if (!draggable) return;
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", row.task.id);
                onRowDragStart(row);
              }}
              onDragEnd={onRowDragEnd}
            >
              <div className="task-row-main">
                <TruncatedText text={row.task.title} className="task-row-title" />
                <div className="task-row-meta">
                  <span>{phaseLabel(row.phase)}</span>
                  <AssigneeBadge assignee={row.task.assignee} audience={assigneeAudience(role)} />
                </div>
              </div>
              {displayDate(row.task.dueDate) && (
                <div className="task-row-foot">
                  <span className={`task-row-due ${isTaskOverdue(row.task) ? "is-overdue" : ""}`}>
                    <CalendarDays size={11} />
                    {displayDate(row.task.dueDate)}
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export function TaskActionCenter({
  project,
  role,
  onTaskStatusChange,
  children,
}: {
  project: Project;
  role: TaskAudienceRole;
  onTaskStatusChange?: (taskId: string, status: TaskStatus) => void;
  children?: ReactNode;
}) {
  const allRows = deriveTaskRows(project, role);
  const sentApprovals = allGates(project).filter(({ gate }) => gate.status === "sent").length;
  const completed = allRows.filter(row => row.bucket === "complete").length;
  const progress = allRows.length === 0 ? 0 : Math.round((completed / allRows.length) * 100);

  const bucketCounts = {
    action: allRows.filter(row => row.bucket === "action").length,
    progress: allRows.filter(row => row.bucket === "progress").length,
    upcoming: allRows.filter(row => row.bucket === "upcoming").length,
    complete: completed,
  };
  const visibleActionCount = role === "client" ? bucketCounts.action + sentApprovals : bucketCounts.action;
  const visibleBuckets: TaskBucket[] = ["upcoming", "progress", "complete", "action"];

  const activeMilestone = project.milestones.find(m => m.status === "active");
  const milestoneRows = activeMilestone ? deriveTaskRows(project, role, activeMilestone) : allRows;

  const [draggingRow, setDraggingRow] = useState<TaskRow | null>(null);
  const [dragOverBucket, setDragOverBucket] = useState<TaskBucket | null>(null);

  function handleDrop(bucket: TaskBucket) {
    if (draggingRow && draggingRow.bucket !== bucket && onTaskStatusChange) {
      onTaskStatusChange(draggingRow.task.id, bucketTaskStatus(bucket));
    }
    setDraggingRow(null);
    setDragOverBucket(null);
  }

  return (
    <div className="task-center">
      <Panel>
        <PanelHeader
          title="Task action center"
          icon={ClipboardList}
          action={<StatusBadge status="is-progress" label={`${progress}% complete`} />}
        />
        <div className="task-center-summary">
          <div className="task-summary-item">
            <span>{bucketCounts.upcoming}</span>
            <p>Upcoming</p>
          </div>
          <div className="task-summary-item">
            <span>{bucketCounts.progress}</span>
            <p>In progress</p>
          </div>
          <div className="task-summary-item">
            <span>{bucketCounts.complete}</span>
            <p>Completed</p>
          </div>
          <div className="task-summary-item is-priority">
            <span>{visibleActionCount}</span>
            <p>Action needed</p>
          </div>
        </div>
      </Panel>

      {role !== "client" && (
        <div className="task-center-groups" style={clientColorVars(clientColorFor(project.id))}>
          {activeMilestone && (
            <div className="task-center-milestone-label">
              Milestone {activeMilestone.number} — {activeMilestone.title}
            </div>
          )}
          {visibleBuckets.map(bucket => (
            <TaskGroup
              key={bucket}
              bucket={bucket}
              bucketRows={milestoneRows.filter(row => row.bucket === bucket)}
              role={role}
              draggingTaskId={draggingRow?.task.id ?? null}
              isDragOver={dragOverBucket === bucket}
              onTaskStatusChange={onTaskStatusChange}
              onRowDragStart={setDraggingRow}
              onRowDragEnd={() => { setDraggingRow(null); setDragOverBucket(null); }}
              onGroupDragOver={setDragOverBucket}
              onGroupDragLeave={targetBucket => setDragOverBucket(current => (current === targetBucket ? null : current))}
              onGroupDrop={handleDrop}
            />
          ))}
        </div>
      )}

      {role === "client" && (
        <section className="task-approval-section" id="approval-requests">
          <div className="task-approval-heading">
            <div>
              <AlertCircle size={14} />
              <span>Approval requests</span>
            </div>
            <span>{sentApprovals} pending</span>
          </div>
          {children ?? (
            <Panel>
              <div className="empty-state">
                <div className="empty-state-icon"><Lock /></div>
                <strong>No approval requests yet</strong>
                <p>Approval gates will appear here when a deliverable is ready for review.</p>
              </div>
            </Panel>
          )}
        </section>
      )}
    </div>
  );
}
