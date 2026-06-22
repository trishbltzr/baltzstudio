import { CalendarDays, Check, ChevronDown, ChevronRight, FileText, Pencil, Plus, Send, User } from "lucide-react";
import { useState } from "react";
import type { AuditCategory, AuditPriority, Milestone, Phase, Project, Task, TaskStatus } from "../types";
import { allTasksComplete, auditCategoryLabel, groupAuditItems, phaseProgress, phaseProgressMarkers, taskStatusDetail } from "../lib/projectUtils";
import { AssigneeBadge, AssigneeEditor, ProgressDots, StatusBadge } from "./shared";
import { DateRangePicker } from "./DateRangePicker";
import { DashboardModalShell } from "./DashboardModalShell";

export function PhaseDetailModal({ phaseId, milestoneId, project, onClose, onTaskStatusChange, initialFiles, onFilesChange, auditCategories }: { phaseId: string; milestoneId?: string; project: Project; onClose: () => void; onTaskStatusChange?: (taskId: string, status: TaskStatus) => void; initialFiles?: string[]; onFilesChange?: (files: string[]) => void; auditCategories?: AuditCategory[] }) {
  const [isEditing, setIsEditing] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(true);
  const [completedTasksOpen, setCompletedTasksOpen] = useState(false);
  const [attachmentsOpen, setAttachmentsOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<{ text: string; author: string; time: string }[]>([]);
  const [componentEdits, setComponentEdits] = useState<{ description?: string; assignees?: string[]; dateFrom?: string; dateTo?: string; files?: string[] }>({ files: initialFiles ?? [] });
  const [taskStatusOverrides, setTaskStatusOverrides] = useState<Record<string, TaskStatus>>({});
  const [openTaskBranchId, setOpenTaskBranchId] = useState<string | null>(null);

  // Find the phase and its parent milestone
  let phase: Phase | null = null;
  let milestone: Milestone | null = null;

  for (const m of project.milestones) {
    if (milestoneId && m.id !== milestoneId) continue;
    const p = m.phases.find(ph => ph.id === phaseId);
    if (p) {
      phase = p;
      milestone = m;
      break;
    }
  }

  if (!phase || !milestone) return null;

  const workingTasks = phase.tasks.map(task => {
    const status = taskStatusOverrides[task.id] ?? task.status;
    return status === task.status ? task : { ...task, status };
  });
  const pp = phaseProgress(workingTasks);
  const phaseDone = allTasksComplete(workingTasks);
  const shortTitle = phase.title.replace(/^\d+\.\d+\s+/, "");
  const derivedStatus: TaskStatus = phaseDone
    ? "complete"
    : workingTasks.some(task => task.status === "blocked")
      ? "blocked"
      : workingTasks.some(task => task.status === "in_progress" || task.status === "complete")
        ? "in_progress"
        : "not_started";
  const displayStatus: TaskStatus = derivedStatus;
  const progressPercent = pp.total ? Math.round((pp.done / pp.total) * 100) : 0;
  const orderedTasks = [...workingTasks].sort((a, b) => {
    if (a.status === "complete" && b.status !== "complete") return 1;
    if (a.status !== "complete" && b.status === "complete") return -1;
    const priority: Record<TaskStatus, number> = { in_progress: 0, blocked: 1, not_started: 2, complete: 3 };
    return priority[a.status] - priority[b.status];
  });
  const activeTasks = orderedTasks.filter(task => task.status !== "complete");
  const completedTasks = orderedTasks.filter(task => task.status === "complete");
  const activeTasksByTitle = new Map(activeTasks.map(task => [task.title, task]));
  const auditCategory = (auditCategories ?? project.workflow?.audit.categories ?? []).find(category => auditCategoryLabel(category.title) === auditCategoryLabel(phase.title));
  const auditPriorityByTitle = new Map(auditCategory?.items.map(item => [item.label, item.priority]) ?? []);
  const auditTaskItems = auditCategory?.items.map(item => ({ label: item.label, priority: item.priority, task: activeTasksByTitle.get(item.label) })) ?? [];
  const activeAuditItems = auditTaskItems.filter(item => Boolean(item.task));
  const auditTaskGroups = auditCategory && activeTasks.length > 10
    ? groupAuditItems(auditCategory.title, auditTaskItems, activeAuditItems)
    : null;
  const activeTaskGroups = auditTaskGroups?.map(group => ({
    id: group.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    label: group.title,
    items: group.items.flatMap(item => item.task ? [{ task: item.task, priority: item.priority }] : []),
  })) ?? [];
  const useTaskBranches = activeTaskGroups.length > 0;
  const currentOpenTaskBranchId = openTaskBranchId ?? activeTaskGroups[0]?.id ?? null;
  const toggleTaskStatus = (taskId: string, currentStatus: TaskStatus) => {
    const nextStatus: TaskStatus = currentStatus === "complete" ? "not_started" : "complete";
    let nextTasks = workingTasks.map(task => {
      if (task.id === taskId) return { ...task, status: nextStatus };
      return task;
    });

    if (nextStatus === "complete") {
      const completedTaskIndex = nextTasks.findIndex(task => task.id === taskId);
      const nextWaitingIndex = nextTasks.findIndex((task, index) => index > completedTaskIndex && task.status === "not_started");
      nextTasks = nextTasks.map((task, index) => {
        if (task.status === "in_progress") return { ...task, status: "not_started" as TaskStatus };
        if (index === nextWaitingIndex) return { ...task, status: "in_progress" as TaskStatus };
        return task;
      });
    } else if (nextStatus === "not_started") {
      const firstWaitingIndex = nextTasks.findIndex(task => task.status === "not_started");
      const hasActive = nextTasks.some(task => task.status === "in_progress");
      if (!hasActive && firstWaitingIndex !== -1) {
        nextTasks = nextTasks.map((task, index) => index === firstWaitingIndex ? { ...task, status: "in_progress" as TaskStatus } : task);
      }
    }

    setTaskStatusOverrides(prev => {
      const next = { ...prev };
      nextTasks.forEach(task => {
        const original = phase.tasks.find(sourceTask => sourceTask.id === task.id);
        if (original && original.status === task.status) {
          delete next[task.id];
        } else {
          next[task.id] = task.status;
        }
      });
      return next;
    });
    onTaskStatusChange?.(taskId, nextStatus);
  };
  const applyTaskStatuses = (nextTasks: Task[]) => {
    setTaskStatusOverrides(() => {
      const next: Record<string, TaskStatus> = {};
      nextTasks.forEach(task => {
        const original = phase.tasks.find(sourceTask => sourceTask.id === task.id);
        if (!original || original.status !== task.status) next[task.id] = task.status;
      });
      return next;
    });
    nextTasks.forEach(task => {
      const previous = workingTasks.find(sourceTask => sourceTask.id === task.id);
      if (previous && previous.status !== task.status) onTaskStatusChange?.(task.id, task.status);
    });
  };
  const setPhaseStatus = (status: TaskStatus) => {
    if (workingTasks.length === 0) return;

    if (status === "complete") {
      applyTaskStatuses(workingTasks.map(task => ({ ...task, status: "complete" })));
      return;
    }

    if (status === "not_started") {
      applyTaskStatuses(workingTasks.map(task => ({ ...task, status: "not_started" })));
      return;
    }

    const nextActiveIndex = workingTasks.findIndex(task => task.status !== "complete");
    const activeIndex = nextActiveIndex === -1 ? 0 : nextActiveIndex;
    applyTaskStatuses(workingTasks.map(task => {
      const taskIndex = workingTasks.findIndex(sourceTask => sourceTask.id === task.id);
      if (taskIndex < activeIndex && task.status === "complete") return task;
      if (taskIndex === activeIndex) {
        return { ...task, status };
      }
      return { ...task, status: "not_started" };
    }));
  };
  const enterInlineEdit = () => setIsEditing(true);
  const renderTaskRow = (task: Task, priority?: AuditPriority) => {
    const isUrgent = priority === "urgent-important" || priority === "urgent";
    return (
    <div key={task.id} className={`phase-detail-task-row is-${task.status}`}>
      <button
        className="phase-detail-task-check"
        type="button"
        onClick={() => toggleTaskStatus(task.id, task.status)}
        aria-label={`${task.status === "complete" ? "Reopen" : "Complete"} ${task.title}`}
      >
        {task.status === "complete" && <Check size={8} style={{ color: "white", strokeWidth: 3 }} />}
      </button>
      <span className="phase-detail-task-title">{task.title}</span>
      <AssigneeBadge assignee={task.assignee} />
      {priority && (
        <svg className={`audit-item-flag ${isUrgent ? "is-red" : "is-yellow"}`} width="13" height="13" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
          <line x1="4" y1="22" x2="4" y2="15" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
      )}
    </div>
    );
  };

  // Shared field-row styles
  const row: React.CSSProperties = {
    display: "flex", alignItems: "center",
    padding: "0.7rem 0",
    borderBottom: "1px solid var(--border)",
  };
  const lbl: React.CSSProperties = {
    width: "36%", minWidth: "36%",
    fontSize: "var(--text-base)", color: "var(--fg-muted)", fontWeight: 400,
  };
  const val: React.CSSProperties = {
    flex: 1, fontSize: "var(--text-md)", color: "var(--fg)", fontWeight: 500,
  };
  const inp: React.CSSProperties = {
    flex: 1, padding: "0.35rem 0.55rem",
    borderRadius: "var(--radius)",
    border: "1px solid var(--border)",
    backgroundColor: "var(--surface)",
    color: "var(--fg)", fontSize: "var(--text-base)",
    fontFamily: "inherit", fontWeight: 500,
    outline: "none", width: "100%",
    transition: "border-color 0.15s",
  };

  return (
    <DashboardModalShell
      ariaLabel={`${shortTitle} phase details`}
      onClose={onClose}
      headerEnd={
        <>
          <ProgressDots markers={phaseProgressMarkers(workingTasks)} variant="modal" id={`${phase.id}-modal`} />
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            style={{
              background: isEditing ? "var(--accent-soft)" : "none",
              border: isEditing ? "1px solid var(--accent)" : "1px solid var(--border)",
              cursor: "pointer",
              color: isEditing ? "var(--accent)" : "var(--fg-muted)",
              width: "1.75rem", height: "1.75rem",
              display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: "50%", transition: "all 0.15s", flexShrink: 0,
            }}
            onMouseEnter={e => { if (!isEditing) { e.currentTarget.style.background = "var(--bg)"; e.currentTarget.style.color = "var(--fg)"; }}}
            onMouseLeave={e => { if (!isEditing) { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--fg-muted)"; }}}
          >
            <Pencil size={13} />
          </button>
        </>
      }
    >
        {/* ── Component header ── */}
        <div style={{ padding: "1.25rem 1.5rem 0" }}>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--fg-muted)", marginBottom: "0.3rem" }}>
            M{milestone.number} · {milestone.title}
          </div>
          <div className="phase-detail-heading-row">
            <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 500, margin: 0, color: "var(--fg)", lineHeight: 1.3 }}>{shortTitle}</h2>
            <span className="phase-detail-percentage">{progressPercent}%</span>
          </div>
        </div>

        {/* ── Field rows ── */}
        <div style={{ padding: "0.25rem 1.5rem 0" }}>

          {/* Status + Deadline — one line */}
          <div className="phase-detail-field-row phase-detail-status-row" style={{ ...row, cursor: "text" }} onClickCapture={enterInlineEdit} onDoubleClickCapture={enterInlineEdit} onClick={enterInlineEdit} onDoubleClick={enterInlineEdit} title="Click to edit status and deadline">
            <span style={lbl}>Status</span>
            <div style={{ ...val, display: "flex", alignItems: "center", gap: "1rem" }}>
              {isEditing ? (
                <select
                  className="dashboard-select dashboard-select-field"
                  value={displayStatus}
                  onChange={e => setPhaseStatus(e.target.value as TaskStatus)}
                  onClick={e => e.stopPropagation()}
                  style={{ maxWidth: "10rem" }}
                >
                  <option value="not_started">Not started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="complete">Done</option>
                  <option value="blocked">Blocked</option>
                </select>
              ) : (
                <StatusBadge status={displayStatus === "complete" ? "is-success" : displayStatus === "blocked" ? "is-review" : displayStatus === "not_started" ? "is-waiting" : "is-progress"} label={displayStatus === "complete" ? "Done" : displayStatus === "blocked" ? "Blocked" : displayStatus === "not_started" ? "Not started" : "In Progress"} detail={taskStatusDetail(displayStatus)} size="sm" />
              )}
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "var(--text-base)", color: "var(--fg-muted)", fontWeight: 400 }}>
                <CalendarDays size={12} />
                {componentEdits.dateFrom || componentEdits.dateTo
                  ? <>{componentEdits.dateFrom || "—"} → {componentEdits.dateTo || "—"}</>
                  : "No deadline"}
              </span>
            </div>
          </div>

          {/* Assignee */}
          <div className="phase-detail-field-row phase-detail-assignee-row" style={{ ...row, cursor: "text" }} onClickCapture={enterInlineEdit} onDoubleClickCapture={enterInlineEdit} onClick={enterInlineEdit} onDoubleClick={enterInlineEdit} title="Click to edit assignee">
            <span style={lbl}>Assignee</span>
            <div style={val}>
              {isEditing
                ? <AssigneeEditor
                    value={componentEdits.assignees ?? []}
                    onChange={names => setComponentEdits(p => ({ ...p, assignees: names }))}
                  />
                : (componentEdits.assignees && componentEdits.assignees.length > 0
                    ? <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.35rem" }}>
                        {componentEdits.assignees.map(name => (
                          <span key={name} style={{
                            display: "inline-flex", alignItems: "center", gap: "0.3rem",
                            padding: "0.22rem 0.55rem", borderRadius: "999px",
                            background: "var(--surface-alt)", border: "1px solid var(--border)",
                            fontSize: "var(--text-sm)", color: "var(--fg)", fontWeight: 500,
                          }}>
                            <User size={11} style={{ color: "var(--fg-muted)" }} />
                            {name}
                          </span>
                        ))}
                      </div>
                    : <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--fg-muted)" }}><User size={13} style={{ color: "var(--fg-muted)" }} />Unassigned</span>
                  )
              }
            </div>
          </div>

          {/* Deadline */}
          <div className="phase-detail-field-row phase-detail-deadline-row" style={{ ...row, cursor: "text" }} onClickCapture={enterInlineEdit} onDoubleClickCapture={enterInlineEdit} onClick={enterInlineEdit} onDoubleClick={enterInlineEdit} title="Click to edit deadline">
            <span style={lbl}>Deadline</span>
            <div style={{ ...val }}>
              {isEditing
                ? <DateRangePicker
                    value={{ from: componentEdits.dateFrom, to: componentEdits.dateTo }}
                    onChange={range => setComponentEdits(p => ({ ...p, dateFrom: range.from, dateTo: range.to }))}
                  />
                : <span style={{ color: componentEdits.dateFrom || componentEdits.dateTo ? "var(--fg)" : "var(--fg-muted)", fontWeight: componentEdits.dateFrom || componentEdits.dateTo ? 500 : 400 }}>
                    {componentEdits.dateFrom || componentEdits.dateTo ? `${componentEdits.dateFrom || "—"} → ${componentEdits.dateTo || "—"}` : "Not set"}
                  </span>
              }
            </div>
          </div>

          {/* Description */}
          <div className="phase-detail-field-row phase-detail-description-row" style={{ ...row, alignItems: "flex-start", borderBottom: "none", paddingBottom: "1rem", cursor: "text" }} onClickCapture={enterInlineEdit} onDoubleClickCapture={enterInlineEdit} onClick={enterInlineEdit} onDoubleClick={enterInlineEdit} title="Click to edit description">
            <span style={{ ...lbl, paddingTop: "0.25rem" }}>Description</span>
            <div style={{ ...val }}>
              {isEditing
                ? <textarea value={componentEdits.description ?? ""} onChange={e => setComponentEdits(p => ({ ...p, description: e.target.value }))}
                    placeholder="Add notes or context…" rows={3}
                    style={{ ...inp, resize: "vertical", lineHeight: 1.5 }}
                    onFocus={e => e.currentTarget.style.borderColor = "var(--accent)"}
                    onBlur={e => e.currentTarget.style.borderColor = "var(--border)"} />
                : <span style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, color: componentEdits.description ? "var(--fg)" : "var(--fg-muted)", fontWeight: componentEdits.description ? 500 : 400 }}>
                    {componentEdits.description || "—"}
                  </span>
              }
            </div>
          </div>
        </div>

        {/* ── Tasks section ── */}
        <div style={{ borderTop: "1px solid var(--border)" }}>
          <button
            onClick={() => setTasksOpen(!tasksOpen)}
            style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1.5rem", color: "var(--fg)" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              {tasksOpen ? <ChevronDown size={13} style={{ color: "var(--fg-muted)" }} /> : <ChevronRight size={13} style={{ color: "var(--fg-muted)" }} />}
              <span style={{ fontSize: "var(--text-base)", fontWeight: 500 }}>Tasks</span>
            </div>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--fg-muted)", fontWeight: 400 }}>{pp.done}/{pp.total}</span>
          </button>

          {tasksOpen && (
            <div className="phase-detail-task-list">
              {useTaskBranches ? (
                <div className="phase-detail-task-branches">
                  {activeTaskGroups.map(group => (
                    <div key={group.id} className={`phase-detail-task-branch ${currentOpenTaskBranchId === group.id ? "is-open" : ""}`}>
                      <button
                        type="button"
                        className="phase-detail-task-branch-heading"
                        aria-expanded={currentOpenTaskBranchId === group.id}
                        onClick={() => setOpenTaskBranchId(currentOpenTaskBranchId === group.id ? null : group.id)}
                      >
                        {currentOpenTaskBranchId === group.id ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                        <span>{group.label}</span>
                        <small>{group.items.length}</small>
                      </button>
                      {currentOpenTaskBranchId === group.id && (
                        <div className="phase-detail-task-branch-items">
                          {group.items.map(item => renderTaskRow(item.task, item.priority))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                activeTasks.map(task => renderTaskRow(task, auditPriorityByTitle.get(task.title)))
              )}

              {completedTasks.length > 0 && (
                <div className="phase-detail-completed-group">
                  <button
                    type="button"
                    className={`phase-detail-completed-toggle ${completedTasksOpen ? "is-open" : ""}`}
                    onClick={() => setCompletedTasksOpen(open => !open)}
                    aria-expanded={completedTasksOpen}
                  >
                    <span className="phase-detail-completed-check"><Check size={10} /></span>
                    <span>{completedTasks.length} completed {completedTasks.length === 1 ? "check" : "checks"}</span>
                    {completedTasksOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  </button>

                  {completedTasksOpen && (
                    <div className="phase-detail-completed-items">
                      {completedTasks.map(task => (
                        <div key={task.id} className="phase-detail-task-row is-complete is-collapsed">
                          <button
                            className="phase-detail-task-check"
                            type="button"
                            onClick={() => toggleTaskStatus(task.id, task.status)}
                            aria-label={`Reopen ${task.title}`}
                            disabled={!onTaskStatusChange}
                          >
                            <Check size={8} style={{ color: "white", strokeWidth: 3 }} />
                          </button>
                          <span className="phase-detail-task-title">{task.title}</span>
                          <AssigneeBadge assignee={task.assignee} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Attachments section ── */}
        <div style={{ borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1.5rem", cursor: "pointer" }}
            onClick={() => setAttachmentsOpen(!attachmentsOpen)}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              {attachmentsOpen ? <ChevronDown size={13} style={{ color: "var(--fg-muted)" }} /> : <ChevronRight size={13} style={{ color: "var(--fg-muted)" }} />}
              <span style={{ fontSize: "var(--text-base)", fontWeight: 500, color: "var(--fg)" }}>Attachments</span>
            </div>
            <label htmlFor="modal-file-input" onClick={e => e.stopPropagation()}
              style={{ cursor: "pointer", color: "var(--fg-muted)", display: "flex", padding: "0.25rem", borderRadius: "0.4rem", transition: "background 0.15s" }}
              onMouseEnter={(e: React.MouseEvent<HTMLLabelElement>) => e.currentTarget.style.background = "var(--bg)"}
              onMouseLeave={(e: React.MouseEvent<HTMLLabelElement>) => e.currentTarget.style.background = "none"}>
              <Plus size={14} />
              <input id="modal-file-input" type="file" multiple style={{ display: "none" }} onChange={e => {
                const newFiles = Array.from(e.target.files || []).map(f => f.name);
                const updated = [...(componentEdits.files || []), ...newFiles];
                setComponentEdits(p => ({ ...p, files: updated }));
                onFilesChange?.(updated);
                setAttachmentsOpen(true);
              }} />
            </label>
          </div>

          {attachmentsOpen && (
            <div style={{ padding: "0 1.5rem 1.25rem" }}>
              {componentEdits.files && componentEdits.files.length > 0
                ? componentEdits.files.map((file, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: "0.6rem",
                      padding: "0.55rem 0.65rem", borderRadius: "0.5rem",
                      backgroundColor: "var(--bg)", border: "1px solid var(--border)",
                      marginBottom: "0.35rem",
                    }}>
                      <div style={{
                        width: "1.8rem", height: "1.8rem", borderRadius: "0.35rem",
                        backgroundColor: "var(--accent-soft)",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        <FileText size={12} style={{ color: "var(--accent)" }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "var(--text-base)", fontWeight: 500, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file}</div>
                      </div>
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--success)", fontWeight: 500, display: "flex", alignItems: "center", gap: "0.25rem", flexShrink: 0 }}>
                        <Check size={10} /> Added
                      </span>
                    </div>
                  ))
                : <div style={{ textAlign: "center", padding: "1rem 0", color: "var(--fg-muted)", fontSize: "var(--text-base)" }}>
                    Click + to attach files
                  </div>
              }
            </div>
          )}
        </div>

        {/* ── Chat section ── */}
        <div style={{ borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1.5rem", cursor: "pointer" }}
            onClick={() => setChatOpen(!chatOpen)}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              {chatOpen ? <ChevronDown size={13} style={{ color: "var(--fg-muted)" }} /> : <ChevronRight size={13} style={{ color: "var(--fg-muted)" }} />}
              <span style={{ fontSize: "var(--text-base)", fontWeight: 500, color: "var(--fg)" }}>Notes</span>
            </div>
            {messages.length > 0 && <span style={{ fontSize: "var(--text-xs)", color: "var(--fg-muted)" }}>{messages.length}</span>}
          </div>

          {chatOpen && (
            <div style={{ padding: "0 1.5rem 1.25rem" }}>
              {/* Message list */}
              {messages.length > 0 && (
                <div style={{ marginBottom: "0.75rem", display: "grid", gap: "0.5rem" }}>
                  {messages.map((msg, i) => (
                    <div key={i} style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
                      <div style={{ width: "1.5rem", height: "1.5rem", borderRadius: "50%", backgroundColor: "var(--accent-soft)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "var(--text-2xs)", fontWeight: 500, color: "var(--accent)" }}>
                        {msg.author[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.2rem" }}>
                          <span style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--fg)" }}>{msg.author}</span>
                          <span style={{ fontSize: "var(--text-xs)", color: "var(--fg-muted)" }}>{msg.time}</span>
                        </div>
                        <div style={{ fontSize: "var(--text-base)", color: "var(--fg)", lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{msg.text}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Input */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <textarea
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey && chatInput.trim()) {
                      e.preventDefault();
                      const now = new Date();
                      const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                      setMessages(prev => [...prev, { text: chatInput.trim(), author: "Studio", time }]);
                      setChatInput("");
                    }
                  }}
                  placeholder="Add a note…"
                  rows={2}
                  style={{
                    width: "100%", padding: "0.55rem 0.65rem", borderRadius: "var(--radius)",
                    border: "1px solid var(--border)", backgroundColor: "var(--bg)",
                    color: "var(--fg)", fontSize: "var(--text-base)", fontFamily: "inherit",
                    resize: "none", lineHeight: 1.4, outline: "none", boxSizing: "border-box",
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = "var(--accent)"}
                  onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
                />
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <button
                    onClick={() => {
                      if (!chatInput.trim()) return;
                      const now = new Date();
                      const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                      setMessages(prev => [...prev, { text: chatInput.trim(), author: "Studio", time }]);
                      setChatInput("");
                    }}
                    style={{
                      padding: "0.45rem 0.9rem", borderRadius: "999px",
                      border: "none", backgroundColor: "var(--accent)", color: "white",
                      fontSize: "var(--text-sm)", fontWeight: 500, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: "0.3rem", fontFamily: "inherit",
                    }}
                  >
                    <Send size={11} /> Send
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
    </DashboardModalShell>
  );
}
