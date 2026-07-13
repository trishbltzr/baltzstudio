"use client";

import { useState } from "react";
import { PhaseDetailModal, type PhaseDetailEdit } from "../../components/PhaseDetailModal";
import type { Project, TaskAssignee, TaskStatus as DashboardTaskStatus } from "../../types";
import { clientsVisibleToRole } from "../clients";
import { CHECKLIST_TEMPLATES, TASK_DESCRIPTIONS } from "../data";
import { css, laneMeta, roleMeta } from "../helpers";
import { NEW_TASK_DRAFT_ID, type PortalActions, type PortalState } from "../store";
import type { Owner, Priority, TaskStatus, TaskSubtask } from "../types";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const PRIORITY_LABEL: Record<Priority, string> = { high: "High", med: "Medium", low: "Low" };

function portalStatus(status: DashboardTaskStatus): TaskStatus {
  if (status === "complete") return "done";
  if (status === "blocked") return "review";
  if (status === "in_progress") return "in_progress";
  return "todo";
}

function dashboardStatus(status: TaskStatus): DashboardTaskStatus {
  if (status === "done") return "complete";
  if (status === "review") return "blocked";
  if (status === "in_progress") return "in_progress";
  return "not_started";
}

function dashboardAssignee(owner: Owner): TaskAssignee {
  if (owner === "ai") return "AI";
  if (owner === "client") return "client";
  return "human";
}

function dueToIso(due: string) {
  const match = due.match(/^([A-Za-z]+)\s+(\d{1,2})$/);
  if (!match) return undefined;
  const month = MONTHS.findIndex(item => item.toLowerCase() === match[1].toLowerCase());
  if (month < 0) return undefined;
  return `2026-${String(month + 1).padStart(2, "0")}-${String(Number(match[2])).padStart(2, "0")}`;
}

function isoToDue(iso?: string) {
  if (!iso) return "";
  const [, month, day] = iso.split("-").map(Number);
  return month && day ? `${MONTHS[month - 1]} ${day}` : "";
}

export function TaskModal({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const isDraft = state.taskModal === NEW_TASK_DRAFT_ID;
  const task = isDraft ? state.taskDraft : state.tasks.find(item => item.id === state.taskModal);
  if (!task) return null;

  const templates = CHECKLIST_TEMPLATES[task.owner || "studio"] || CHECKLIST_TEMPLATES.studio;
  const fallbackDone = task.status === "done" ? templates.length : task.status === "review" ? Math.ceil(templates.length * 0.8) : task.status === "in_progress" ? Math.ceil(templates.length * 0.5) : 0;
  const overrides = state.taskChecks[task.id] || {};
  const defaultSubtasks: TaskSubtask[] = templates.map((title, index) => ({
    id: `${task.id}-subtask-${index + 1}`,
    title,
    status: (index in overrides ? overrides[index] : index < fallbackDone) ? "done" : "todo",
  }));
  const subtasks = task.subtasks ?? defaultSubtasks;
  const checks = subtasks.map((subtask, index) => ({ ...subtask, index, done: subtask.status === "done" }));
  const baseStatus = dashboardStatus(task.status);
  const milestoneTitle = task.milestone || "General";
  const description = task.description ?? TASK_DESCRIPTIONS[task.id] ?? "";
  const lane = laneMeta(task.owner);
  const actor = roleMeta(state.role, state.clientName).name;
  const visibleClients = clientsVisibleToRole(state.role, state.clientName);

  const project: Project = {
    id: `task-project-${task.id}`,
    clientName: task.project,
    clientEmail: "",
    clientInitials: task.project.slice(0, 2).toUpperCase(),
    status: task.status === "done" ? "complete" : "active",
    startDate: "",
    platform: "",
    milestones: [{
      id: `task-milestone-${task.id}`,
      number: 1,
      title: milestoneTitle,
      clientLabel: milestoneTitle,
      status: task.status === "done" ? "complete" : "active",
      phases: [{
        id: task.id,
        title: task.title,
        tasks: checks.map((check, index) => ({
          id: check.id,
          title: check.title,
          assignee: dashboardAssignee(task.owner),
          status: check.done ? "complete" : index === checks.findIndex(item => !item.done) ? baseStatus : "not_started",
          dueDate: dueToIso(task.due),
        })),
      }],
    }],
    notes: [],
    assets: [],
    brand: { colors: [], fonts: [], style: "" },
  };

  const applyPhaseEdit = (edit: PhaseDetailEdit) => {
    if (edit.title !== undefined) actions.updateTask(task.id, { title: edit.title });
    if (edit.description !== undefined) actions.updateTask(task.id, { description: edit.description });
    if (edit.assignees !== undefined) actions.updateTask(task.id, { assignee: edit.assignees.at(-1) || "Unassigned" });
    if (edit.dateFrom !== undefined) actions.updateTask(task.id, { due: isoToDue(edit.dateFrom) });
  };

  const row = css("display:flex;align-items:center;min-height:3rem;padding:.7rem 0;border-bottom:1px solid var(--border)");
  const label = css("width:36%;min-width:36%;font-size:var(--text-base);color:var(--fg-muted);font-weight:400");
  const value = css("flex:1;font-size:var(--text-md);color:var(--fg);font-weight:500");
  const input = css("width:100%;min-height:2.15rem;padding:.35rem .55rem;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);color:var(--fg);font:inherit;font-size:var(--text-base);font-weight:500;outline:none");
  const pill = (background: string, color: string) => css("display:inline-flex;align-items:center;gap:.3rem;padding:.22rem .6rem;border-radius:999px;background:" + background + ";color:" + color + ";font-size:var(--text-sm);font-weight:500");

  return <PhaseDetailModal
    phaseId={task.id}
    milestoneId={`task-milestone-${task.id}`}
    project={project}
    onClose={() => isDraft ? actions.cancelTaskDraft() : actions.patch({ taskModal: null })}
    showProgressDots={false}
    initialEditing={isDraft}
    initialTitle={task.title}
    initialDescription={description}
    initialAssignees={[task.assignee]}
    initialDateFrom={dueToIso(task.due)}
    initialDateTo={dueToIso(task.due)}
    initialFiles={task.attachments || []}
    initialMessages={(state.taskComments[task.id] || []).map(comment => ({ text: comment.text, author: comment.who, time: comment.time }))}
    onPhaseEdit={applyPhaseEdit}
    onPhaseStatusChange={status => isDraft ? actions.updateTask(task.id, { status: portalStatus(status) }) : actions.moveTask(task.id, portalStatus(status))}
    onTaskStatusChange={(subtaskId, status) => actions.updateTask(task.id, { subtasks: subtasks.map(subtask => subtask.id === subtaskId ? { ...subtask, status: portalStatus(status) } : subtask) })}
    onAddTask={title => actions.updateTask(task.id, { subtasks: [...subtasks, { id: `${task.id}-subtask-${Date.now()}`, title, status: "todo" }] })}
    onDeleteTask={subtaskId => actions.updateTask(task.id, { subtasks: subtasks.filter(subtask => subtask.id !== subtaskId) })}
    onRenameTask={(subtaskId, title) => actions.updateTask(task.id, { subtasks: subtasks.map(subtask => subtask.id === subtaskId ? { ...subtask, title } : subtask) })}
    onFilesChange={files => actions.updateTask(task.id, { attachments: files })}
    onAddNote={text => actions.addTaskCommentText(task.id, actor, text)}
    renderMeta={editing => editing ? <div style={css("display:grid;grid-template-columns:1fr 1fr;gap:.45rem;margin-bottom:.5rem")}><select aria-label="Client or project" value={task.project} disabled={state.role === "client"} onChange={event => actions.updateTask(task.id, { project: event.target.value })} style={css(input + ";opacity:" + (state.role === "client" ? ".7" : "1") + ";cursor:" + (state.role === "client" ? "not-allowed" : "pointer"))}>{!visibleClients.some(client => client.name === task.project) && state.role === "admin" && <option value={task.project}>{task.project}</option>}{visibleClients.map(client => <option key={client.id} value={client.name}>{client.name}</option>)}</select><input aria-label="Milestone" value={milestoneTitle} onChange={event => actions.updateTask(task.id, { milestone: event.target.value })} style={input} /></div> : <div style={css("font-size:var(--text-xs);color:var(--fg-muted);margin-bottom:.3rem")}>{milestoneTitle} · {task.project}</div>}
    renderExtraFields={editing => <>
      <div style={row}><span style={label}>Priority</span><div style={value}>{editing ? <select aria-label="Priority" value={task.priority} onChange={event => actions.updateTask(task.id, { priority: event.target.value as Priority })} style={input}><option value="high">High</option><option value="med">Medium</option><option value="low">Low</option></select> : <span style={pill("var(--surface-alt)", "var(--fg-muted)")}>{PRIORITY_LABEL[task.priority]} priority</span>}</div></div>
      <div style={row}><span style={label}>Owner</span><div style={value}>{editing && state.role === "admin" ? <select aria-label="Owner" value={task.owner} onChange={event => actions.updateTask(task.id, { owner: event.target.value as Owner })} style={input}><option value="studio">Studio</option><option value="ai">Assistant</option><option value="client">Client</option><option value="gate">Milestone</option></select> : <span style={pill(lane.s, lane.c)}>{lane.label}</span>}</div></div>
      <div style={{ ...row, borderBottom: "none" }}><span style={label}>Blocked by</span><div style={value}>{editing ? <select aria-label="Blocked by" value={task.blockedBy || ""} onChange={event => actions.updateTask(task.id, { blockedBy: event.target.value || undefined })} style={input}><option value="">No blocker</option>{state.tasks.filter(item => item.id !== task.id).map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select> : (state.tasks.find(item => item.id === task.blockedBy)?.title || "—")}</div></div>
    </>}
    footer={<div style={css("display:flex;align-items:center;justify-content:flex-end;gap:.45rem;padding:1rem 1.5rem;border-top:1px solid var(--border)")}>{isDraft ? <><span style={css("margin-right:auto;font-size:var(--text-sm);color:var(--fg-muted)")}>Unsaved draft</span><button type="button" onClick={actions.cancelTaskDraft} style={css("height:2.1rem;padding:0 .8rem;border:1px solid var(--border);border-radius:999px;background:var(--surface);color:var(--fg-muted);font-size:var(--text-sm);font-weight:500;cursor:pointer")}>Cancel</button><button type="button" onClick={actions.saveTaskDraft} style={css("height:2.1rem;padding:0 .9rem;border:none;border-radius:999px;background:var(--accent);color:#fff;font-size:var(--text-sm);font-weight:500;cursor:pointer")}>Create task</button></> : deleteConfirm ? <><span style={css("margin-right:auto;font-size:var(--text-sm);color:var(--danger)")}>Delete this task?</span><button type="button" onClick={() => setDeleteConfirm(false)} style={css("height:2rem;padding:0 .75rem;border:1px solid var(--border);border-radius:999px;background:var(--surface);color:var(--fg-muted);font-size:var(--text-sm);font-weight:500;cursor:pointer")}>Cancel</button><button type="button" onClick={() => actions.deleteTask(task.id)} style={css("height:2rem;padding:0 .75rem;border:none;border-radius:999px;background:var(--danger);color:#fff;font-size:var(--text-sm);font-weight:500;cursor:pointer")}>Delete task</button></> : <button type="button" onClick={() => setDeleteConfirm(true)} style={css("height:2rem;padding:0 .75rem;border:1px solid color-mix(in srgb,var(--danger) 35%,var(--border) 65%);border-radius:999px;background:var(--surface);color:var(--danger);font-size:var(--text-sm);font-weight:500;cursor:pointer")}>Delete task</button>}</div>}
  />;
}
