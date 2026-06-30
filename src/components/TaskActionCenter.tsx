import { AlertCircle, CalendarDays, CheckCircle2, ClipboardList, Clock3, Lock, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Milestone, Phase, Project, Task, TaskStatus } from "../types";
import { allGates, taskStatusClass, taskStatusLabel } from "../lib/projectUtils";
import { AssigneeBadge, Panel, PanelHeader, StatusBadge, TruncatedText } from "./shared";

type TaskBucket = "action" | "progress" | "upcoming" | "complete";
type TaskAudienceRole = "admin" | "manager" | "client";

type TaskRow = {
  task: Task;
  phase: Phase;
  milestone: Milestone;
  bucket: TaskBucket;
};

const statusOptions: TaskStatus[] = ["not_started", "in_progress", "blocked", "complete"];

export function StatusMenu({ task, onTaskStatusChange }: { task: Task; onTaskStatusChange: (taskId: string, status: TaskStatus) => void }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  function positionOptions() {
    const trigger = summaryRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.max(rect.width, 168);
    const margin = 12;
    let left = rect.right - width;
    if (left < margin) left = margin;
    if (left + width > window.innerWidth - margin) left = window.innerWidth - width - margin;
    setCoords({ top: rect.bottom + 4, left, width });
  }

  useEffect(() => {
    if (!open) return;
    positionOptions();
    const handleReposition = () => positionOptions();
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (summaryRef.current?.contains(target) || optionsRef.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open]);

  return (
    <details className="task-status-menu" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
      <summary ref={summaryRef} className="dashboard-dropdown-control" aria-label={`Update ${task.title} status`}>
        <span>{taskStatusLabel(task.status)}</span>
      </summary>
      {open && coords && createPortal(
        <div
          ref={optionsRef}
          className="task-status-options"
          style={{ top: coords.top, left: coords.left, width: coords.width }}
        >
          {statusOptions.map(status => (
            <button
              key={status}
              type="button"
              className={status === task.status ? "is-active" : ""}
              onClick={() => {
                onTaskStatusChange(task.id, status);
                setOpen(false);
              }}
            >
              {taskStatusLabel(status)}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </details>
  );
}

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
  onTaskStatusChange,
}: {
  bucket: TaskBucket;
  bucketRows: TaskRow[];
  role: TaskAudienceRole;
  onTaskStatusChange?: (taskId: string, status: TaskStatus) => void;
}) {
  const meta = bucketMeta[bucket];
  const Icon = meta.icon;

  return (
    <section className={`task-group is-${bucket}`}>
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
          bucketRows.map(({ task, phase }) => (
            <div key={task.id} className={`task-row ${task.status === "complete" ? "is-complete" : ""}`}>
              <div className="task-row-main">
                <TruncatedText text={task.title} className="task-row-title" />
                <div className="task-row-meta">
                  <span>{phaseLabel(phase)}</span>
                  <AssigneeBadge assignee={task.assignee} audience={assigneeAudience(role)} />
                  {displayDate(task.dueDate) && <span>Due {displayDate(task.dueDate)}</span>}
                </div>
              </div>
              <div className="task-row-status">
                {onTaskStatusChange ? (
                  <StatusMenu task={task} onTaskStatusChange={onTaskStatusChange} />
                ) : (
                  <StatusBadge status={taskStatusClass(task.status)} label={taskStatusLabel(task.status)} />
                )}
              </div>
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
        <div className="task-center-groups">
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
              onTaskStatusChange={onTaskStatusChange}
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
