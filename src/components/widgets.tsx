import { Check, Globe, Lock, Plus, Send, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import type { Task, TaskStatus, ApprovalGate, Project } from "../types";
import { allTasksComplete, milestoneProgress, taskStatusClass, taskStatusLabel, gateStatusClass, gateStatusLabel, gateStatusDetail } from "../lib/projectUtils";
import { formatDashboardDate } from "../lib/dateDisplay";
import { StatusBadge, Panel, Btn } from "./shared";

// ─────────────────────────────────────────────
// TASK ROW
// ─────────────────────────────────────────────

export function TaskRow({ task, isAdmin, onStatusChange, locked }: { task: Task; isAdmin: boolean; onStatusChange?: (id: string, s: TaskStatus) => void; locked?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const statuses: TaskStatus[] = ["not_started", "in_progress", "complete", "blocked"];

  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  const currentIndex = statuses.indexOf(task.status);
  const nextStatus = statuses[(currentIndex + 1) % statuses.length];

  return (
    <div className={`task-row ${task.status === "complete" ? "is-complete" : ""} ${locked ? "is-locked" : ""}`}>
      <button
        type="button"
        className={`task-check ${task.status === "complete" ? "is-done" : ""}`}
        onClick={() => isAdmin && !locked && onStatusChange?.(task.id, nextStatus)}
        style={{ cursor: isAdmin && !locked ? "pointer" : "default" }}
        title={isAdmin && !locked ? `Click to cycle: ${task.status} → ${nextStatus}` : ""}
      >
        {task.status === "complete" && <Check />}
      </button>
      <span className={`task-title ${task.status === "complete" ? "is-done" : ""}`}>{task.title}</span>
      {isAdmin && (
        <div className="task-status-menu" ref={ref}>
          <button type="button" className={`dashboard-status task-status-trigger ${taskStatusClass(task.status)}`} onClick={() => !locked && setOpen(v => !v)}>
            {taskStatusLabel(task.status)}
          </button>
          {open && (
            <div className="dropdown-menu">
              {statuses.map(s => (
                <button key={s} type="button" className={`dropdown-item ${s === task.status ? "is-active" : ""}`} onClick={() => { onStatusChange?.(task.id, s); setOpen(false); }}>
                  {s === task.status && <Check size={11} />}
                  {taskStatusLabel(s)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// GATE BLOCK
// ─────────────────────────────────────────────

export function GateBlock({ gate, isAdmin, phaseDone, onSend, onApprove }: { gate: ApprovalGate; isAdmin: boolean; phaseDone: boolean; onSend?: () => void; onApprove?: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [adminNote, setAdminNote] = useState(gate.adminNotes ?? "");
  const [links, setLinks] = useState<Array<{ label: string; url: string }>>(gate.adminLinks ?? []);
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const effectiveStatus = gate.status === "locked" && phaseDone ? "ready" : gate.status;
  const canSend = isAdmin && Boolean(onSend);
  const canApprove = isAdmin && Boolean(onApprove);

  return (
    <div className={`gate-block is-${effectiveStatus}`}>
      <div className="gate-header">
        <div className="gate-label-row">
          <Send size={13} style={{ color: effectiveStatus === "approved" ? "var(--success)" : effectiveStatus === "sent" ? "oklch(0.5 0.1 75)" : "var(--accent)" }} />
          <span className="gate-label">{gate.label}</span>
        </div>
        <StatusBadge status={gateStatusClass(effectiveStatus)} label={gateStatusLabel(effectiveStatus)} detail={gateStatusDetail(effectiveStatus)} className="gate-status-badge" />
        {isAdmin && (
          <div className="gate-admin-actions">
            {effectiveStatus === "ready" && canSend && (
              <>
                <Btn variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
                  {showForm ? "Close" : "Add notes & links"}
                </Btn>
                <Btn variant="primary" size="sm" onClick={() => { gate.adminNotes = adminNote; gate.adminLinks = links; onSend?.(); }}>
                  <Send size={12} />Approve for client review
                </Btn>
              </>
            )}
            {effectiveStatus === "revision" && canApprove && <Btn size="sm" onClick={onApprove}><Check size={12} />Approve</Btn>}
            {effectiveStatus === "approved" && gate.approvedAt && <span className="gate-admin-note is-approved">Approved {formatDashboardDate(gate.approvedAt)}</span>}
          </div>
        )}
      </div>

      {/* Admin note + link builder (before sending) */}
      {showForm && effectiveStatus === "ready" && canSend && (
        <div className="gate-builder">
          <div>
            <label className="gate-builder-label">Studio approval notes for client</label>
            <textarea
              value={adminNote}
              onChange={e => setAdminNote(e.target.value)}
              placeholder="Add the Admin decision, review context, or anything the client should know before reviewing..."
              rows={3}
              className="gate-builder-field gate-builder-textarea"
            />
          </div>

          <div>
            <label className="gate-builder-label">Links to share</label>
            {links.map((link, i) => (
              <div key={i} className="gate-builder-link">
                <Globe size={12} style={{ color: "var(--fg-faint)", flexShrink: 0 }} />
                <span className="gate-builder-link-copy">{link.label} — {link.url}</span>
                <button type="button" className="gate-builder-remove" onClick={() => setLinks(prev => prev.filter((_, j) => j !== i))} aria-label={`Remove ${link.label}`}>
                  <X size={12} />
                </button>
              </div>
            ))}
            <div className="gate-builder-fields">
              <input value={newLinkLabel} onChange={e => setNewLinkLabel(e.target.value)} placeholder="Label (e.g. Preview)" className="gate-builder-field" />
              <input value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)} placeholder="URL (e.g. houseofhazel.webflow.io)" className="gate-builder-field" />
              <Btn size="sm" onClick={() => { if (newLinkLabel && newLinkUrl) { setLinks(prev => [...prev, { label: newLinkLabel, url: newLinkUrl }]); setNewLinkLabel(""); setNewLinkUrl(""); } }}>
                <Plus size={12} />Add
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* Persisted notes/links once saved or sent */}
      {(gate.adminNotes || (gate.adminLinks && gate.adminLinks.length > 0)) && effectiveStatus !== "locked" && !showForm && (
        <div className="gate-supporting">
          {gate.adminNotes && (
            <div className="gate-note-preview">
              {gate.adminNotes}
            </div>
          )}
          {gate.adminLinks?.map((link, i) => (
            <a key={i} href={link.url.startsWith("http") ? link.url : `https://${link.url}`} target="_blank" rel="noopener noreferrer"
              className="gate-link-preview">
              <Globe size={12} />{link.label} →
            </a>
          ))}
        </div>
      )}

      {effectiveStatus === "revision" && gate.clientFeedback && (
        <div className="gate-feedback-box">
          <strong>Client feedback</strong>
          {gate.clientFeedback.whatWorked && <p><b>What's working: </b>{gate.clientFeedback.whatWorked}</p>}
          {gate.clientFeedback.adjustments && <p className="gate-feedback-adjustments"><b>Adjustments: </b>{gate.clientFeedback.adjustments}</p>}
          <p className="gate-feedback-meta">Submitted {formatDashboardDate(gate.clientFeedback.submittedAt)}</p>
          <div className="gate-feedback-actions">
            {canApprove && (
            <Btn size="sm" onClick={onApprove}><Check size={12} />Approve after revisions</Btn>
            )}
          </div>
        </div>
      )}
      {effectiveStatus === "locked" && (
        <p className="gate-locked-hint"><Lock size={11} />Unlocks automatically when all tasks in this phase are complete.</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// CLIENT STAGE STEPPER
// ─────────────────────────────────────────────

export function ClientStageStepper({ project }: { project: Project }) {
  const currentM = project.milestones.find(m => m.status === "active");
  const currentPhase = currentM?.phases.find(p => !allTasksComplete(p.tasks));
  const prog = currentM ? milestoneProgress(currentM) : null;
  const pct = prog ? Math.round((prog.done / prog.total) * 100) : 0;

  return (
    <Panel>
      <div className="stage-stepper">
        <div className="stage-stepper-label">Your project stage</div>
        <div className="stage-track">
          {project.milestones.map((m) => (
            <div key={m.id} className={`stage-item is-${m.status}`}>
              <div className={`stage-dot is-${m.status}`}>
                {m.status === "complete" ? <Check /> : <span>{m.number}</span>}
              </div>
              <span className="stage-name">{m.clientLabel}</span>
              <span className="stage-status">
                {m.status === "complete" ? "Complete" : m.status === "active" ? "In progress" : "Coming up"}
              </span>
            </div>
          ))}
        </div>
      </div>
      {currentM && prog && (
        <div className="stage-summary">
          <div className="stage-summary-row">
            <span className="stage-summary-copy">
              {currentPhase ? currentPhase.title.replace(/^\d+\.\d+\s+/, "") : "Milestone complete"} · {pct}% done
            </span>
            <span className="stage-summary-count">{prog.done}/{prog.total} tasks</span>
          </div>
          <div className="welcome-progress-bar">
            <div className="welcome-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
    </Panel>
  );
}
