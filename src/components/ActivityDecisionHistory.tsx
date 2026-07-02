import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Clock, FileText, MessageSquare, Send, Upload, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { AssetFile, Project, Task } from "../types";
import { allGates, allTasksComplete, gateStatusLabel } from "../lib/projectUtils";
import { formatDashboardDate, sortDashboardDate } from "../lib/dateDisplay";
import { Panel, PanelHeader, StatusBadge } from "./shared";

type HistoryRole = "admin" | "client";
type HistoryTone = "neutral" | "attention" | "good";
type HistoryBadge = "is-success" | "is-progress" | "is-review" | "is-locked" | "is-pending";

type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  date: string;
  sort: number;
  icon: LucideIcon;
  tone?: HistoryTone;
};

type DecisionItem = {
  id: string;
  title: string;
  detail: string;
  date: string;
  sort: number;
  status: HistoryBadge;
  statusLabel: string;
};

type AssetStatus = NonNullable<AssetFile["status"]>;
type TodoTone = "neutral" | "attention" | "good";

type TodoItem = {
  id: string;
  title: string;
  detail: string;
  date: string;
  sort: number;
  priority: number;
  icon: LucideIcon;
  tone: TodoTone;
};

type CalendarTodoItem = TodoItem & {
  calendarDate: Date;
  status: Task["status"];
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function stableOffset(id: string, index: number) {
  let hash = index + 7;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) % 17;
  return 1 + (hash % 12);
}

function calendarDateForTask(task: Task, fallback: Date, index: number) {
  const raw = task.dueDate ?? task.updatedAt;
  const parsed = sortDate(raw);
  if (parsed > 0) {
    const date = new Date(parsed);
    const today = new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate()).getTime();
    if (date.getTime() >= today - 30 * 86400000) return date;
  }
  return addDays(fallback, stableOffset(task.id, index));
}

function assetStatus(asset: AssetFile): AssetStatus {
  if (asset.status) return asset.status;
  return asset.sharedWithClient ? "shared" : "internal";
}

function readableDate(raw?: string) {
  return formatDashboardDate(raw, "No date");
}

function sortDate(raw?: string) {
  return sortDashboardDate(raw);
}

function phaseShortTitle(title: string) {
  return title.replace(/^\d+\.\d+\s+/, "");
}

function latestPhaseTaskDate(phase: Project["milestones"][number]["phases"][number]) {
  if (phase.completedAt) return phase.completedAt;
  for (let index = phase.tasks.length - 1; index >= 0; index -= 1) {
    const updatedAt = phase.tasks[index]?.updatedAt;
    if (updatedAt) return updatedAt;
  }
  for (let index = phase.tasks.length - 1; index >= 0; index -= 1) {
    const dueDate = phase.tasks[index]?.dueDate;
    if (dueDate) return dueDate;
  }
  return "";
}

function workflowActivityTitle(type: string, target: string) {
  const labels: Record<string, string> = {
    cocoon_link_sent: "Cocoon Consult link sent",
    audit_generated: "Cocoon report generated",
    wise_payment_sent: "Wise payment email sent",
    wise_payment_confirmed: "Wise payment confirmed",
    booking_unlocked: "Booking link unlocked",
    access_updated: "Dashboard access updated",
    wiaw_unlocked: "WIAW workspace opened",
    in_full_flight: "In Full Flight opened",
    dashboard_deleted: "Dashboard access ended",
  };
  return labels[type] ?? target;
}

function buildActivity(project: Project, role: HistoryRole): ActivityItem[] {
  const items: ActivityItem[] = [];

  project.workflow?.notifications
    .filter(item => role === "admin" || item.clientVisible)
    .forEach(item => {
      items.push({
        id: `workflow-${item.id}`,
        title: workflowActivityTitle(item.type, item.target),
        detail: role === "admin" ? `${project.clientName} - ${item.target}` : item.target,
        date: readableDate(item.date),
        sort: sortDate(item.date),
        icon: item.type.includes("payment") || item.type === "booking_unlocked" ? Send : Clock,
        tone: item.type.includes("confirmed") || item.type === "access_updated" || item.type === "wiaw_unlocked" ? "good" : "neutral",
      });
    });

  project.milestones.forEach(milestone => {
    milestone.phases.forEach(phase => {
      if (phase.completedAt || allTasksComplete(phase.tasks)) {
        const completedDate = latestPhaseTaskDate(phase);
        items.push({
          id: `phase-${phase.id}`,
          title: `Completed ${phaseShortTitle(phase.title)}`,
          detail: role === "admin" ? `${project.clientName} - M${milestone.number} ${milestone.clientLabel}` : `M${milestone.number} ${milestone.clientLabel}`,
          date: readableDate(completedDate),
          sort: sortDate(completedDate),
          icon: CheckCircle2,
          tone: "good",
        });
      }

      const activeTask = phase.tasks.find(task => task.status === "in_progress" || task.status === "blocked");
      if (activeTask) {
        items.push({
          id: `task-${activeTask.id}`,
          title: activeTask.status === "blocked" ? `Blocked: ${activeTask.title}` : `Started ${activeTask.title}`,
          detail: role === "admin" ? `${project.clientName} - ${phaseShortTitle(phase.title)}` : phaseShortTitle(phase.title),
          date: readableDate(activeTask.updatedAt ?? activeTask.dueDate),
          sort: sortDate(activeTask.updatedAt ?? activeTask.dueDate),
          icon: Clock,
          tone: activeTask.status === "blocked" ? "attention" : "neutral",
        });
      }

      if (!phase.gate) return;
      const gate = phase.gate;

      if (gate.sentAt) {
        items.push({
          id: `gate-sent-${gate.id}`,
          title: role === "admin" ? `Sent ${gate.label}` : gate.clientLabel,
          detail: role === "admin" ? "Awaiting client decision" : "Ready for your review",
          date: readableDate(gate.sentAt),
          sort: sortDate(gate.sentAt),
          icon: Send,
          tone: gate.status === "sent" ? "attention" : "neutral",
        });
      }

      if (gate.clientFeedback) {
        items.push({
          id: `feedback-${gate.id}`,
          title: gate.clientFeedback.approved ? `Approved ${gate.label}` : `Revision notes for ${gate.label}`,
          detail: gate.clientFeedback.approved ? "Client approved this gate" : "Client requested updates",
          date: readableDate(gate.clientFeedback.submittedAt),
          sort: sortDate(gate.clientFeedback.submittedAt),
          icon: MessageSquare,
          tone: gate.clientFeedback.approved ? "good" : "attention",
        });
      } else if (gate.approvedAt) {
        items.push({
          id: `gate-approved-${gate.id}`,
          title: `Approved ${gate.label}`,
          detail: "Gate decision locked",
          date: readableDate(gate.approvedAt),
          sort: sortDate(gate.approvedAt),
          icon: CheckCircle2,
          tone: "good",
        });
      }
    });
  });

  project.assets.forEach(asset => {
    const status = assetStatus(asset);
    if (role === "client" && !asset.sharedWithClient && status !== "requested") return;

    const isRequest = status === "requested";
    items.push({
      id: `asset-${asset.id}`,
      title: isRequest ? `Requested ${asset.name}` : `${asset.source === "client" ? "Uploaded" : "Shared"} ${asset.name}`,
      detail: isRequest
        ? role === "client" ? "Material needed from you" : "Client material request"
        : `${asset.category} - ${status}`,
      date: readableDate(asset.uploadedAt),
      sort: sortDate(asset.uploadedAt),
      icon: isRequest ? Upload : FileText,
      tone: isRequest ? "attention" : "neutral",
    });
  });

  return items
    .sort((a, b) => b.sort - a.sort)
    .slice(0, 6);
}

function gateDecisionStatus(status: string): { status: HistoryBadge; label: string } {
  if (status === "approved") return { status: "is-success", label: "Approved" };
  if (status === "revision") return { status: "is-review", label: "Revision" };
  if (status === "sent") return { status: "is-review", label: "Awaiting" };
  if (status === "ready") return { status: "is-progress", label: "Ready" };
  return { status: "is-locked", label: "Locked" };
}

function buildDecisions(project: Project): DecisionItem[] {
  const decisions: DecisionItem[] = [];

  allGates(project)
    .filter(({ gate }) => gate.status !== "locked")
    .forEach(({ gate, milestone }) => {
      const status = gateDecisionStatus(gate.status);
      const date = gate.approvedAt ?? gate.clientFeedback?.submittedAt ?? gate.sentAt ?? "";
      decisions.push({
        id: `decision-${gate.id}`,
        title: gate.label,
        detail: `M${milestone.number} ${milestone.clientLabel} - ${gateStatusLabel(gate.status)}`,
        date: readableDate(date),
        sort: sortDate(date),
        status: status.status,
        statusLabel: status.label,
      });
    });

  project.milestones.forEach(milestone => {
    milestone.phases.forEach(phase => {
      const platformTask = phase.tasks.find(task => task.title.toLowerCase().includes("platform selection") && task.status === "complete");
      const briefTask = phase.tasks.find(task => task.title.toLowerCase().includes("lock project brief") && task.status === "complete");
      const copyTask = phase.tasks.find(task => task.title.toLowerCase().includes("approves copy direction") && task.status === "complete");
      const date = phase.completedAt ?? "";

      const majorDecisions = [
        platformTask && { id: `platform-${platformTask.id}`, title: `Platform confirmed: ${project.platform}`, detail: `M${milestone.number} ${milestone.clientLabel}`, date },
        briefTask && { id: `brief-${briefTask.id}`, title: "Project brief locked", detail: `M${milestone.number} ${milestone.clientLabel}`, date },
        copyTask && { id: `copy-${copyTask.id}`, title: "Copy direction approved", detail: `M${milestone.number} ${milestone.clientLabel}`, date },
      ].filter((item): item is { id: string; title: string; detail: string; date: string } => Boolean(item));

      majorDecisions.forEach(decision => {
        decisions.push({
          ...decision,
          date: readableDate(decision.date),
          sort: sortDate(decision.date),
          status: "is-success",
          statusLabel: "Locked",
        });
      });
    });
  });

  return decisions
    .sort((a, b) => b.sort - a.sort)
    .slice(0, 5);
}

function taskPriority(task: Task) {
  if (task.status === "blocked") return 0;
  if (task.assignee === "client") return 2;
  return 3;
}

function taskOwnerLabel(task: Task, role: HistoryRole) {
  if (task.assignee === "client") return role === "admin" ? "Client task" : "Your task";
  if (task.assignee === "AI") return "AI task";
  return "Studio task";
}

function buildNextTodos(project: Project, role: HistoryRole): TodoItem[] {
  const todos: TodoItem[] = [];
  const isRelevantTask = (task: Task) => role === "client" ? task.assignee === "client" : task.assignee !== "client";

  project.milestones.forEach(milestone => {
    milestone.phases.forEach(phase => {
      phase.tasks
        .filter(task => task.status !== "complete" && task.status !== "in_progress" && isRelevantTask(task))
        .forEach(task => {
          const date = task.dueDate ?? task.updatedAt ?? phase.completedAt ?? "";
          todos.push({
            id: `todo-${milestone.id}-${phase.id}-${task.id}`,
            title: task.status === "blocked" ? `Blocked: ${task.title}` : task.title,
            detail: `M${milestone.number} ${milestone.clientLabel} - ${taskOwnerLabel(task, role)}`,
            date: readableDate(date),
            sort: sortDate(date),
            priority: taskPriority(task),
            icon: task.status === "blocked" ? Clock : ClipboardList,
            tone: task.status === "blocked" || task.assignee === "client" ? "attention" : "neutral",
          });
        });
    });
  });

  return todos
    .sort((a, b) => {
      const priority = a.priority - b.priority;
      if (priority !== 0) return priority;
      return a.sort - b.sort;
    })
    .slice(0, 6);
}

function buildCalendarTodos(project: Project, role: HistoryRole, today: Date): CalendarTodoItem[] {
  const items: CalendarTodoItem[] = [];
  const completedItems: CalendarTodoItem[] = [];
  const isRelevantTask = (task: Task) => role === "client" ? task.assignee === "client" : task.assignee !== "client";
  let index = 0;

  project.milestones.forEach(milestone => {
    milestone.phases.forEach(phase => {
      phase.tasks
        .filter(isRelevantTask)
        .forEach(task => {
          const calendarDate = calendarDateForTask(task, today, index);
          index += 1;
          const item: CalendarTodoItem = {
            id: `calendar-${milestone.id}-${phase.id}-${task.id}`,
            title: task.status === "blocked" ? `Blocked: ${task.title}` : task.title,
            detail: `M${milestone.number} ${milestone.clientLabel} - ${taskOwnerLabel(task, role)}`,
            date: formatDashboardDate(calendarDate.toISOString()),
            sort: calendarDate.getTime(),
            priority: taskPriority(task),
            icon: task.status === "blocked" ? Clock : ClipboardList,
            tone: task.status === "blocked" || task.assignee === "client" ? "attention" : task.status === "complete" ? "good" : "neutral",
            calendarDate,
            status: task.status,
          };

          if (task.status === "complete") completedItems.push(item);
          else items.push(item);
        });
    });
  });

  const source = items.length > 0 ? items : completedItems;
  return source
    .sort((a, b) => {
      const priority = a.priority - b.priority;
      if (priority !== 0) return priority;
      return a.sort - b.sort;
    })
    .slice(0, 8);
}

function ProjectTaskCalendar({ items, clientInitials }: { items: CalendarTodoItem[]; clientInitials: string }) {
  const today = useMemo(() => new Date(), []);
  const initialDate = items[0]?.calendarDate ?? today;
  const [selectedDay, setSelectedDay] = useState(initialDate);
  const [monthCursor, setMonthCursor] = useState(() => new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
  useEffect(() => {
    setSelectedDay(initialDate);
    setMonthCursor(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
  }, [initialDate]);
  const gridStart = useMemo(() => addDays(monthCursor, -monthCursor.getDay()), [monthCursor]);
  const cells = useMemo(() => Array.from({ length: 35 }, (_, index) => addDays(gridStart, index)), [gridStart]);
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarTodoItem[]>();
    items.forEach(item => {
      const key = dayKey(item.calendarDate);
      const current = map.get(key) ?? [];
      current.push(item);
      map.set(key, current);
    });
    return map;
  }, [items]);
  const selectedItems = byDay.get(dayKey(selectedDay)) ?? [];
  const selectedItem = selectedItems[0];
  const monthLabel = monthCursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <Panel className="history-panel project-task-calendar-panel">
      <PanelHeader title="Project calendar" icon={CalendarDays} />
      <div className="project-task-calendar">
        <div className="project-task-calendar-board">
          <div className="project-task-calendar-head">
            <span>{items.length} scheduled</span>
            <div className="project-task-calendar-nav">
              <span className="project-task-calendar-month">{monthLabel}</span>
              <button
                type="button"
                className="project-task-cal-step"
                aria-label="Previous month"
                onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                className="project-task-cal-step"
                aria-label="Next month"
                onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
          <div className="project-task-weekrow">
            {WEEKDAYS.map(day => <span key={day}>{day}</span>)}
          </div>
          <div className="project-task-cal-grid">
            {cells.map(cell => {
              const dayItems = byDay.get(dayKey(cell)) ?? [];
              const outside = cell.getMonth() !== monthCursor.getMonth();
              return (
                <button
                  key={dayKey(cell)}
                  type="button"
                  className={`project-task-cal-day ${outside ? "is-outside" : ""} ${isSameDay(cell, today) ? "is-today" : ""} ${isSameDay(cell, selectedDay) ? "is-selected" : ""}`}
                  onClick={() => setSelectedDay(cell)}
                  aria-label={`${cell.toDateString()} - ${dayItems.length} task${dayItems.length === 1 ? "" : "s"}`}
                >
                  <span className="project-task-cal-daynum">{cell.getDate()}</span>
                  <span className="project-task-cal-dots">
                    {dayItems.slice(0, 3).map(item => <span key={item.id} className={`project-task-cal-dot is-${item.tone}`} />)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="project-task-cal-detail">
          <div className="project-task-cal-detail-head">
            <strong>{isSameDay(selectedDay, today) ? "Today" : selectedDay.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</strong>
            <span>{selectedItems.length} task{selectedItems.length === 1 ? "" : "s"}</span>
          </div>
          {!selectedItem ? (
            <p>No tasks scheduled for this day.</p>
          ) : (
            <div className="project-task-cal-list">
              <div className={`project-task-cal-item is-${selectedItem.tone}`}>
                <span className="project-task-cal-avatar">{clientInitials}</span>
                <div className="project-task-cal-item-copy">
                  <strong>{selectedItem.title}</strong>
                  <span>{selectedItem.detail}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

function EmptyHistory({ label }: { label: string }) {
  return (
    <div className="history-empty">
      <ClipboardList />
      <span>{label}</span>
    </div>
  );
}

export function ActivityDecisionHistory({ project, role, showDecisionLog = true }: { project: Project; role: HistoryRole; showDecisionLog?: boolean }) {
  const today = useMemo(() => new Date(), []);
  const activity = buildActivity(project, role);
  const nextTodos = buildNextTodos(project, role);
  const calendarTodos = useMemo(() => buildCalendarTodos(project, role, today), [project, role, today]);
  const decisions = buildDecisions(project);
  const primaryItems = showDecisionLog ? activity : nextTodos;

  return (
    <div className={`history-grid ${showDecisionLog ? "" : "is-activity-only"}`}>
      {showDecisionLog ? <Panel className="history-panel">
        <PanelHeader title={showDecisionLog ? "Recent Activity" : "Next tasks"} icon={showDecisionLog ? Clock : ClipboardList} />
        <div className="history-list">
          {primaryItems.length === 0 ? (
            <EmptyHistory label={showDecisionLog ? "Activity will appear here as the project moves." : "Next tasks will appear here as the project moves."} />
          ) : primaryItems.map(item => {
            const Icon = item.icon;
            return (
              <div key={item.id} className={`history-row is-${item.tone ?? "neutral"}`}>
                <span className="history-icon"><Icon /></span>
                <span className="history-copy">
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                </span>
                <time>{item.date}</time>
              </div>
            );
          })}
        </div>
      </Panel> : <ProjectTaskCalendar items={calendarTodos} clientInitials={project.clientInitials} />}

      {showDecisionLog && <Panel className="history-panel">
        <PanelHeader title="Decision Log" icon={ClipboardList} />
        <div className="history-list decision-list">
          {decisions.length === 0 ? (
            <EmptyHistory label="Key approvals and scope decisions will collect here." />
          ) : decisions.map(item => (
            <div key={item.id} className="decision-row">
              <span className="history-copy">
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
                <time>{item.date}</time>
              </span>
              <StatusBadge status={item.status} label={item.statusLabel} />
            </div>
          ))}
        </div>
      </Panel>}
    </div>
  );
}
