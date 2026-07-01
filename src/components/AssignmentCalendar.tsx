"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Check } from "lucide-react";
import type { Project, TaskAssignee, TaskStatus } from "../types";
import { type ClientColor, clientColorFor, clientColorVars, hashId } from "../lib/projectUtils";
import { Panel } from "./shared";

type CalendarRole = "admin" | "manager";

type Assignment = {
  id: string;
  taskId: string;
  projectId: string;
  title: string;
  clientName: string;
  clientInitials: string;
  milestone: string;
  assignee: TaskAssignee;
  status: TaskStatus;
  date: Date;
  clientColor: ClientColor;
};

type ClientLegendItem = {
  id: string;
  name: string;
  initials: string;
  color: ClientColor;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dayDiff(date: Date, today: Date) {
  const a = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const b = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.round((a - b) / 86400000);
}

function floraDemoDeadlineOffset(taskId: string) {
  const demoOffsets: Record<string, number> = {
    "m3-p1-1": 2,
    "m3-p1-2": 5,
    "m3-p2-1": 8,
  };
  return demoOffsets[taskId] ?? null;
}

// The mock data rarely carries `dueDate`, so we seed a believable one by status.
// Deterministic per task id so the calendar is stable across renders.
function dueDateFor(task: { id: string; dueDate?: string; status: TaskStatus }, today: Date): { date: Date; seeded: boolean } {
  if (task.dueDate) {
    const parsed = new Date(task.dueDate);
    if (!Number.isNaN(parsed.getTime()) && dayDiff(parsed, today) > -30) return { date: parsed, seeded: false };
  }
  const h = hashId(task.id);
  let offset: number;
  // Only active human/studio work reaches this calendar, so keep it near now.
  if (task.status === "blocked") offset = -(h % 2);
  else if (task.status === "in_progress") offset = h % 4;
  else offset = 1 + (h % 13);
  return { date: addDays(new Date(today.getFullYear(), today.getMonth(), today.getDate()), offset), seeded: true };
}

function buildAssignments(projects: Project[], today: Date): Assignment[] {
  const out: Assignment[] = [];
  for (const project of projects.filter(p => p.status !== "complete")) {
    for (const milestone of project.milestones) {
      for (const phase of milestone.phases) {
        for (const task of phase.tasks) {
          if (task.assignee !== "human" || task.status === "complete") continue;
          const { date } = dueDateFor(task, today);
          const clientColor = clientColorFor(project.id);
          out.push({
            id: task.id,
            taskId: task.id,
            projectId: project.id,
            title: task.title,
            clientName: project.clientName,
            clientInitials: project.clientInitials,
            milestone: `M${milestone.number} · ${milestone.title}`,
            assignee: task.assignee,
            status: task.status,
            date,
            clientColor,
          });
        }
      }
    }
  }
  for (const project of projects.filter(p => p.clientName === "Flora & Co.")) {
    const hasOpenFloraTasks = out.some(a => a.projectId === project.id);
    if (hasOpenFloraTasks) continue;
    for (const milestone of project.milestones) {
      for (const phase of milestone.phases) {
        for (const task of phase.tasks) {
          if (task.assignee !== "human") continue;
          const offset = floraDemoDeadlineOffset(task.id);
          if (offset === null) continue;
          const date = addDays(new Date(today.getFullYear(), today.getMonth(), today.getDate()), offset);
          const clientColor = clientColorFor(project.id);
          out.push({
            id: `${task.id}-flora-demo`,
            taskId: task.id,
            projectId: project.id,
            title: task.title,
            clientName: project.clientName,
            clientInitials: project.clientInitials,
            milestone: `M${milestone.number} · ${milestone.title}`,
            assignee: task.assignee,
            status: "not_started",
            date,
            clientColor,
          });
        }
      }
    }
  }
  return out;
}

function assigneeClass(assignee: TaskAssignee) {
  return assignee === "AI" ? "is-ai" : "is-studio";
}

function statusClass(status: TaskStatus) {
  if (status === "complete") return "is-complete";
  if (status === "in_progress") return "is-progress";
  if (status === "blocked") return "is-blocked";
  return "is-upcoming";
}

export function AssignmentCalendar({
  projects,
  role = "admin",
  onProjectTaskStatusChange,
}: {
  projects: Project[];
  role?: CalendarRole;
  onProjectTaskStatusChange?: (projectId: string, taskId: string, status: TaskStatus) => void;
}) {
  const today = useMemo(() => new Date(), []);
  const assignments = useMemo(() => buildAssignments(projects, today), [projects, today]);
  const clientLegend = useMemo<ClientLegendItem[]>(() => {
    const byProject = new Map<string, ClientLegendItem>();
    for (const assignment of assignments) {
      if (byProject.has(assignment.projectId)) continue;
      byProject.set(assignment.projectId, {
        id: assignment.projectId,
        name: assignment.clientName,
        initials: assignment.clientInitials,
        color: assignment.clientColor,
      });
    }
    return Array.from(byProject.values());
  }, [assignments]);

  const byDay = useMemo(() => {
    const map = new Map<string, Assignment[]>();
    for (const a of assignments) {
      const key = dayKey(a.date);
      const list = map.get(key) ?? [];
      list.push(a);
      map.set(key, list);
    }
    return map;
  }, [assignments]);

  const [monthCursor, setMonthCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<Date>(today);

  const gridStart = useMemo(() => {
    const first = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
    return addDays(first, -first.getDay());
  }, [monthCursor]);

  const cells = useMemo(() => Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)), [gridStart]);

  const selectedAssignments = (byDay.get(dayKey(selectedDay)) ?? [])
    .slice()
    .sort((a, b) => a.clientName.localeCompare(b.clientName));

  const monthLabel = `${MONTHS[monthCursor.getMonth()]} ${monthCursor.getFullYear()}`;

  return (
    <Panel className="assignment-calendar">
      <div className="assignment-cal-head">
        <div className="assignment-cal-title">
          <CalendarDays size={15} aria-hidden="true" />
          <h2>{role === "manager" ? "My assignments" : "Assignment calendar"}</h2>
        </div>
        <div className="assignment-cal-nav">
          <span className="assignment-cal-month">{monthLabel}</span>
          <button
            type="button"
            className="assignment-cal-step"
            aria-label="Previous month"
            onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            className="assignment-cal-step"
            aria-label="Next month"
            onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className="assignment-cal-weekrow">
        {WEEKDAYS.map(w => <span key={w} className="assignment-cal-weekday">{w}</span>)}
      </div>

      <div className="assignment-cal-grid">
        {cells.map(cell => {
          const items = byDay.get(dayKey(cell)) ?? [];
          const outside = cell.getMonth() !== monthCursor.getMonth();
          const isToday = isSameDay(cell, today);
          const isSelected = isSameDay(cell, selectedDay);
          return (
            <button
              type="button"
              key={dayKey(cell)}
              className={`assignment-cal-day ${outside ? "is-outside" : ""} ${isToday ? "is-today" : ""} ${isSelected ? "is-selected" : ""}`}
              onClick={() => setSelectedDay(cell)}
              aria-label={`${cell.toDateString()} — ${items.length} assignment${items.length === 1 ? "" : "s"}`}
            >
              <span className="assignment-cal-daynum">{cell.getDate()}</span>
              <span className="assignment-cal-chips">
                {items.slice(0, 3).map(a => (
                  <span key={a.id} className={`assignment-cal-chip ${assigneeClass(a.assignee)} ${statusClass(a.status)}`} style={clientColorVars(a.clientColor)}>
                    <span className="assignment-cal-chip-dot" />
                    <span className="assignment-cal-chip-text">{a.title}</span>
                  </span>
                ))}
                {items.length > 3 && <span className="assignment-cal-more">+{items.length - 3} more</span>}
              </span>
            </button>
          );
        })}
      </div>

      <div className="assignment-cal-footer">
        <div className="assignment-cal-legend">
          {clientLegend.map(client => (
            <span key={client.id} className="assignment-cal-legend-item" style={clientColorVars(client.color)}>
              <span className="assignment-cal-client-dot">{client.initials}</span>
              {client.name}
            </span>
          ))}
        </div>
      </div>

      <div className="assignment-cal-detail">
        <div className="assignment-cal-detail-head">
          <strong>{isSameDay(selectedDay, today) ? "Today" : selectedDay.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</strong>
          <span>{selectedAssignments.length} agent task{selectedAssignments.length === 1 ? "" : "s"}</span>
        </div>
        {selectedAssignments.length === 0 ? (
          <p className="assignment-cal-detail-empty">No agent-needed tasks scheduled for this day.</p>
        ) : (
          <ul className="assignment-cal-detail-list">
            {selectedAssignments.map(a => (
              <li key={a.id} className={`assignment-cal-detail-item ${statusClass(a.status)}`} style={clientColorVars(a.clientColor)}>
                <span className={`assignment-cal-client-dot ${assigneeClass(a.assignee)}`}>{a.clientInitials}</span>
                <div className="assignment-cal-detail-body">
                  <span className="assignment-cal-detail-title">{a.title}</span>
                  <span className="assignment-cal-detail-meta">{a.clientName} · {a.milestone}</span>
                </div>
                <div className="assignment-cal-detail-side">
                  {onProjectTaskStatusChange && (
                    <button
                      type="button"
                      className="assignment-cal-done"
                      onClick={() => onProjectTaskStatusChange(a.projectId, a.taskId, "complete")}
                    >
                      <Check size={12} />Done
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}
