import { AlertCircle, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronRight, Clock3, Globe, Lock, Paperclip, Pencil, Plus, Send, X } from "lucide-react";
import { useState } from "react";
import type { Milestone, Phase, Project, Task, TaskStatus, BrandIdentity } from "../types";
import { allTasksComplete, phaseProgress, phaseProgressMarkers, milestoneProgress, allGates, taskStatusDetail, gateStatusClass, gateStatusLabel, taskStatusClass, taskStatusLabel } from "../lib/projectUtils";
import { StatusBadge, MilestoneDot, Panel, PanelHeader, Btn, ProgressDots, ProgressRing, TruncatedText } from "../components/shared";
import { GateBlock } from "../components/widgets";
import { PhaseDetailModal } from "../components/PhaseDetailModal";
import { StatusMenu, TaskActionCenter } from "../components/TaskActionCenter";
import { SwatchPopover } from "../components/SwatchPopover";

export function AdminMilestonesTab({ project, onTaskStatusChange, onSendGate, onApproveGate, onFinishMilestone }: {
  project: Project;
  onTaskStatusChange: (taskId: string, status: TaskStatus) => void;
  onSendGate: (gateId: string) => void;
  onApproveGate: (gateId: string) => void;
  onFinishMilestone?: (milestoneId: string) => void;
}) {
  // Only one milestone can be expanded at a time (accordion behavior)
  const [expandedMilestoneId, setExpandedMilestoneId] = useState<string | null>(() => {
    const active = project.milestones.find(m => m.status === "active");
    return active?.id ?? null;
  });
  const [selectedPhase, setSelectedPhase] = useState<{ milestoneId: string; phaseId: string } | null>(null);
  // Per-phase attachment counts lifted here so phase cards can reflect updates
  const [phaseFiles, setPhaseFiles] = useState<Record<string, string[]>>({});

  function toggleMilestone(id: string) {
    setExpandedMilestoneId(id);
  }
  return (
    <div style={{ display: "grid", gap: "0.75rem" }}>
      {selectedPhase && (
        <PhaseDetailModal
          phaseId={selectedPhase.phaseId}
          milestoneId={selectedPhase.milestoneId}
          project={project}
          onClose={() => setSelectedPhase(null)}
          onTaskStatusChange={onTaskStatusChange}
          initialFiles={phaseFiles[selectedPhase.phaseId] ?? []}
          onFilesChange={(files) => setPhaseFiles(prev => ({ ...prev, [selectedPhase.phaseId]: files }))}
        />
      )}
      {project.milestones.map(milestone => {
        const prog = milestoneProgress(milestone);
        const isExpanded = expandedMilestoneId === milestone.id;
        const pct = prog.total === 0 ? 0 : Math.round((prog.done / prog.total) * 100);

        return (
          <div key={milestone.id} className={`milestone-card is-${milestone.status}`}>
            <button
              type="button"
              className={`milestone-header ${milestone.status === "locked" ? "is-locked" : ""}`}
              onClick={() => milestone.status !== "locked" && toggleMilestone(milestone.id)}
            >
              <MilestoneDot status={milestone.status} />
              <span className="milestone-title">Milestone {milestone.number} — {milestone.title}</span>
              <div className="milestone-progress-wrap">
                <span style={{ fontSize: "var(--text-sm)", color: "var(--fg-muted)" }}>{prog.done}/{prog.total}</span>
                <div className="milestone-bar">
                  <div className={`milestone-bar-fill is-${milestone.status}`} style={{ width: `${pct}%` }} />
                </div>
                {milestone.status !== "locked" && (
                  isExpanded ? <ChevronDown size={14} style={{ color: "var(--fg-muted)" }} /> : <ChevronRight size={14} style={{ color: "var(--fg-muted)" }} />
                )}
                {milestone.status === "locked" && <Lock size={13} style={{ color: "var(--fg-muted)" }} />}
              </div>
            </button>

            {isExpanded && (
              <div className="milestone-body">
              {onFinishMilestone && milestone.status === "active" && (
                <div className="milestone-dev-actions">
                  <span>Preview control</span>
                  <button type="button" onClick={() => onFinishMilestone(milestone.id)}>
                    Mark milestone finished
                  </button>
                </div>
              )}
              <div className="phase-cards-grid">
                {milestone.phases.map((phase, phaseIndex) => {
                  const pp = phaseProgress(phase.tasks);
                  const phaseDone = allTasksComplete(phase.tasks);
                  const priorPhasesComplete = milestone.phases.slice(0, phaseIndex).every(p => allTasksComplete(p.tasks));
                  const phaseLocked = milestone.status === "locked" || (!phaseDone && !priorPhasesComplete);

                  // Short display name: strip "1.1 " prefix
                  const shortTitle = phase.title.replace(/^\d+\.\d+\s+/, "");

                  const phaseFileCount = phaseFiles[phase.id]?.length ?? 0;

                  return (
                    <div key={phase.id} className="phase-grid-cell">
                      <div className={`phase-card ${phaseLocked ? "is-locked" : ""} ${phaseDone ? "is-complete" : ""}`}>
                        {/* Card header */}
                        <div
                          className="phase-card-header"
                          onClick={() => !phaseLocked && setSelectedPhase({ milestoneId: milestone.id, phaseId: phase.id })}
                          style={{ cursor: phaseLocked ? "default" : "pointer" }}
                        >
                          <span className="phase-tag">#{phase.title.split(" ")[0]}</span>
                          <span className="phase-card-title">{shortTitle}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            {phaseDone
                              ? <StatusBadge status="is-success" label="Done" detail={taskStatusDetail("complete")} size="sm" />
                              : pp.done > 0
                                ? <StatusBadge status="is-progress" icon={<ProgressRing value={Math.round((pp.done / pp.total) * 100)} />} label={`${Math.round((pp.done / pp.total) * 100)}%`} detail={taskStatusDetail("in_progress")} size="sm" />
                                : <StatusBadge status="is-waiting" label="Soon" detail="Hasn't started yet." size="sm" />
                            }
                          </div>
                        </div>


                        {/* Footer: dot progress + metadata */}
                        <div className="phase-card-footer">
                          <ProgressDots markers={phaseProgressMarkers(phase.tasks)} id={phase.id} />
                          <div className="phase-meta-row">
                            {phaseFileCount > 0 && (
                              <span className="phase-meta-item">
                                <Paperclip />{phaseFileCount}
                              </span>
                            )}
                            {pp.total > 0 && (
                              <span className="phase-meta-item">
                                <Check />{pp.done}/{pp.total}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>

              {/* Gates below the phase grid */}
              {milestone.phases.some(p => p.gate) && (
                <div className="milestone-gates">
                  {milestone.phases.filter(p => p.gate).map(phase => (
                    <GateBlock
                      key={phase.gate!.id}
                      gate={phase.gate!}
                      isAdmin
                      phaseDone={allTasksComplete(phase.tasks)}
                      onSend={() => onSendGate(phase.gate!.id)}
                      onApprove={() => onApproveGate(phase.gate!.id)}
                    />
                  ))}
                </div>
              )}
            </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ADMIN — REVIEWS TAB
// ─────────────────────────────────────────────

export function AdminReviewsTab({ project, onSendGate, onApproveGate, onTaskStatusChange }: { project: Project; onSendGate: (id: string) => void; onApproveGate: (id: string) => void; onTaskStatusChange: (taskId: string, status: TaskStatus) => void }) {
  const [selectedGateId, setSelectedGateId] = useState<string | null>(null);
  const [comments, setComments] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [reviewLinks, setReviewLinks] = useState<string[]>([]);

  const gates = allGates(project);
  const selectedGate = selectedGateId ? gates.find(g => g.gate.id === selectedGateId) : null;
  // Group all gates (including locked) by milestone so admins see the full
  // review roadmap, not just the actionable ones.
  const milestoneGroups = project.milestones
    .map(m => ({ milestone: m, items: gates.filter(g => g.milestone.id === m.id) }))
    .filter(g => g.items.length > 0);

  return (
    <TaskActionCenter project={project} role="admin" onTaskStatusChange={onTaskStatusChange}>
    <div style={{ display: "grid", gap: "1rem", position: "relative" }}>
      {milestoneGroups.map(({ milestone, items }) => {
        const groupApproved = items.filter(({ gate }) => gate.status === "approved").length;
        return (
        <div key={milestone.id} className="client-reviews-group">
          <div className="client-reviews-group-header">
            <span className="client-reviews-group-label">M{milestone.number}</span>
            <span className="client-reviews-group-title">{milestone.title}</span>
            <span className="client-reviews-group-progress">{groupApproved} of {items.length} approved</span>
          </div>
          <div style={{ display: "grid", gap: "0.6rem" }}>
      {items.map(({ gate, milestone, phase }) => {
        return (
          <div
            key={gate.id}
            className="admin-review-row"
            onClick={() => { setSelectedGateId(gate.id); setComments(""); }}
            style={{ cursor: "pointer" }}
          >
            <Panel className={gate.status === "sent" ? "is-action-needed" : ""}>
              <div style={{ padding: "1.1rem 1.25rem" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: "0.5rem" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <span style={{ fontWeight: 500, fontSize: "var(--text-lg)" }}>{gate.label}</span>
                      <StatusBadge status={gateStatusClass(gate.status)} label={gateStatusLabel(gate.status)} />
                    </div>
                    <div style={{ fontSize: "var(--text-base)", color: "var(--fg-muted)", marginTop: "0.2rem" }}>M{milestone.number} {milestone.title} · {phase.title}</div>
                  </div>
                </div>
                {gate.deliverableLink && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "var(--text-base)", color: "var(--primary)", marginBottom: "0.5rem" }}>
                    <Globe size={11} />{gate.deliverableLink}
                  </div>
                )}
              </div>
            </Panel>
          </div>
        );
      })}
          </div>
        </div>
        );
      })}

      {/* Gate Detail Modal */}
      {selectedGate && (
        <>
        {/* Backdrop */}
        <div onClick={() => setSelectedGateId(null)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", zIndex: 1000 }} />
        {/* Modal card */}
        <div onClick={e => e.stopPropagation()} style={{
          position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          backgroundColor: "var(--surface)", borderRadius: "1rem", border: "1px solid var(--border)",
          width: "90%", maxWidth: "520px", maxHeight: "88vh", overflow: "auto",
          zIndex: 1001, padding: 0, display: "flex", flexDirection: "column",
        }}>
          {/* Sticky top bar — matches PhaseDetailModal */}
          <div style={{ position: "sticky", top: 0, zIndex: 2, backgroundColor: "var(--surface)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.9rem 1.25rem" }}>
            <button onClick={() => setSelectedGateId(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-muted)", padding: "0.3rem", display: "flex", borderRadius: "0.5rem", transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--bg)"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}>
              <X size={18} />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <StatusBadge status={gateStatusClass(selectedGate.gate.status)} label={gateStatusLabel(selectedGate.gate.status)} />
              <button
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
              >
                {isEditing ? <Check size={13} /> : <Pencil size={13} />}
              </button>
            </div>
          </div>

          {/* Header */}
          <div style={{ padding: "1.25rem 1.5rem 0" }}>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--fg-muted)", marginBottom: "0.3rem" }}>
              M{selectedGate.milestone.number} · {selectedGate.milestone.title} · {selectedGate.phase.title}
            </div>
            <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 500, margin: 0, color: "var(--fg)", lineHeight: 1.3 }}>{selectedGate.gate.label}</h2>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflow: "auto", padding: "1rem 1.5rem", display: "grid", gap: "1rem" }}>
            {/* Review Links */}
            <div>
              <div style={{ fontSize: "var(--text-2xs)", fontWeight: 500, color: "var(--fg-muted)", textTransform: "uppercase", marginBottom: "0.35rem", letterSpacing: "0.5px" }}>Review links</div>
              <div style={{ display: "grid", gap: "0.3rem" }}>
                {selectedGate.gate.deliverableLink && (
                  <a href={`https://${selectedGate.gate.deliverableLink}`} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "var(--text-sm)", color: "var(--primary)", textDecoration: "none", padding: "0.4rem 0.6rem", background: "var(--accent-soft)", borderRadius: "var(--radius)" }}>
                    <Globe size={11} />{selectedGate.gate.deliverableLink}
                  </a>
                )}
                {reviewLinks.map((link, i) => (
                  <a key={i} href={link.startsWith("http") ? link : `https://${link}`} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "var(--text-sm)", color: "var(--primary)", textDecoration: "none", padding: "0.4rem 0.6rem", background: "var(--accent-soft)", borderRadius: "var(--radius)" }}>
                    <Globe size={11} />{link}
                  </a>
                ))}
                {isEditing && (
                  <input
                    type="text"
                    placeholder="Add review link..."
                    onKeyDown={(e) => { if (e.key === "Enter" && e.currentTarget.value) { setReviewLinks([...reviewLinks, e.currentTarget.value]); e.currentTarget.value = ""; } }}
                    style={{ fontSize: "var(--text-sm)", padding: "0.4rem 0.6rem", border: "1px solid var(--border)", borderRadius: "var(--radius)", width: "100%" }}
                  />
                )}
              </div>
            </div>

            {/* File Attachments */}
            <div>
              <div style={{ fontSize: "var(--text-2xs)", fontWeight: 500, color: "var(--fg-muted)", textTransform: "uppercase", marginBottom: "0.35rem", letterSpacing: "0.5px" }}>Attachments</div>
              <input
                type="file"
                id="file-upload"
                multiple
                style={{ display: "none" }}
              />
              <label
                htmlFor="file-upload"
                style={{
                  display: "block",
                  padding: "0.5rem",
                  border: "1.5px dashed var(--border)",
                  borderRadius: "var(--radius)",
                  textAlign: "center",
                  cursor: "pointer",
                  fontSize: "var(--text-sm)",
                  color: "var(--fg-muted)"
                }}
              >
                + Add files
              </label>
            </div>

            {/* Status Info */}
            {selectedGate.gate.status === "sent" && selectedGate.gate.sentAt && (
              <div>
                <div style={{ fontSize: "var(--text-2xs)", fontWeight: 500, color: "var(--fg-muted)", textTransform: "uppercase", marginBottom: "0.15rem" }}>Sent</div>
                <div style={{ fontSize: "var(--text-sm)", color: "var(--fg)" }}>{selectedGate.gate.sentAt}</div>
              </div>
            )}

            {selectedGate.gate.status === "revision" && selectedGate.gate.clientFeedback && (
              <div>
                <div style={{ fontSize: "var(--text-2xs)", fontWeight: 500, color: "var(--fg-muted)", textTransform: "uppercase", marginBottom: "0.15rem" }}>Client feedback</div>
                <div style={{ padding: "0.5rem", background: "var(--accent-soft)", borderRadius: "var(--radius)", fontSize: "var(--text-sm)" }}>
                  {selectedGate.gate.clientFeedback.whatWorked && <div><b>Working:</b> {selectedGate.gate.clientFeedback.whatWorked}</div>}
                  {selectedGate.gate.clientFeedback.adjustments && <div style={{ marginTop: "0.2rem" }}><b>Adjust:</b> {selectedGate.gate.clientFeedback.adjustments}</div>}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <div style={{ fontSize: "var(--text-2xs)", fontWeight: 500, color: "var(--fg-muted)", textTransform: "uppercase", marginBottom: "0.35rem", letterSpacing: "0.5px" }}>Notes</div>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Add internal notes..."
                style={{
                  width: "100%",
                  minHeight: "80px",
                  padding: "0.5rem",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  fontFamily: "inherit",
                  fontSize: "var(--text-sm)",
                  color: "var(--fg)",
                  background: "var(--surface)",
                  resize: "vertical"
                }}
              />
            </div>
          </div>

          {/* Actions */}
          <div style={{ padding: "1rem 1.5rem 1.25rem", borderTop: "1px solid var(--border)", flexShrink: 0, display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            {selectedGate.gate.status === "ready" && allTasksComplete(selectedGate.phase.tasks) && (
              <Btn variant="primary" size="sm" onClick={() => { onSendGate(selectedGate.gate.id); setSelectedGateId(null); }}>
                <Send size={12} />Send to client
              </Btn>
            )}
            {selectedGate.gate.status === "revision" && (
              <Btn variant="primary" size="sm" onClick={() => { onApproveGate(selectedGate.gate.id); setSelectedGateId(null); }}>
                <Check size={12} />Approve
              </Btn>
            )}
            <Btn variant="ghost" size="sm" onClick={() => setSelectedGateId(null)}>Close</Btn>
          </div>
        </div>
        </>
      )}
    </div>
    </TaskActionCenter>
  );
}

type PortfolioTaskBucket = "action" | "progress" | "upcoming" | "complete";
type PortfolioTaskRole = "admin" | "manager";
type PortfolioTaskRow = {
  project: Project;
  milestone: Milestone;
  phase: Phase;
  task: Task;
  bucket: PortfolioTaskBucket;
};

const portfolioTaskBuckets: PortfolioTaskBucket[] = ["upcoming", "progress", "complete", "action"];

const portfolioBucketMeta: Record<PortfolioTaskBucket, { title: string; icon: typeof CalendarDays; empty: string }> = {
  action: { title: "Action needed", icon: AlertCircle, empty: "No studio blockers right now." },
  progress: { title: "In progress", icon: Clock3, empty: "No studio tasks are marked in progress." },
  upcoming: { title: "Upcoming", icon: CalendarDays, empty: "No queued studio tasks yet." },
  complete: { title: "Completed", icon: CheckCircle2, empty: "Completed studio tasks will collect here." },
};

function portfolioTaskBucket(task: Task, milestone: Milestone): PortfolioTaskBucket {
  if (task.status === "complete") return "complete";
  if (task.status === "blocked") return "action";
  if (task.status === "in_progress") return "progress";
  if (milestone.status === "active") return "upcoming";
  return "upcoming";
}

function derivePortfolioTasks(projects: Project[], role: PortfolioTaskRole = "admin") {
  const rows: PortfolioTaskRow[] = [];
  for (const project of projects.filter(item => item.status === "active")) {
    for (const milestone of project.milestones) {
      for (const phase of milestone.phases) {
        for (const task of phase.tasks) {
          if (task.assignee === "client") continue;
          if (role === "manager" && task.assignee !== "human") continue;
          rows.push({ project, milestone, phase, task, bucket: portfolioTaskBucket(task, milestone) });
        }
      }
    }
  }
  return rows;
}

function portfolioPhaseLabel(phase: Phase) {
  return phase.title.replace(/^\d+\.\d+\s+/, "");
}

function portfolioTaskDate(date?: string) {
  if (!date) return null;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function PortfolioTaskStatus({
  row,
  onProjectTaskStatusChange,
}: {
  row: PortfolioTaskRow;
  onProjectTaskStatusChange: (projectId: string, taskId: string, status: TaskStatus) => void;
}) {
  return (
    <StatusMenu
      task={row.task}
      onTaskStatusChange={(taskId, status) => onProjectTaskStatusChange(row.project.id, taskId, status)}
    />
  );
}

function PortfolioTaskGroup({
  bucket,
  rows,
  onProjectTaskStatusChange,
}: {
  bucket: PortfolioTaskBucket;
  rows: PortfolioTaskRow[];
  onProjectTaskStatusChange: (projectId: string, taskId: string, status: TaskStatus) => void;
}) {
  const meta = portfolioBucketMeta[bucket];
  const Icon = meta.icon;

  return (
    <section className={`task-group is-${bucket}`}>
      <div className="task-group-header">
        <div>
          <Icon size={14} />
          <span>{meta.title}</span>
        </div>
        <span>{rows.length}</span>
      </div>
      <div className="task-list">
        {rows.length === 0 ? (
          <div className="task-empty">{meta.empty}</div>
        ) : rows.map(row => (
          <div key={`${row.project.id}-${row.task.id}`} className={`task-row ${row.task.status === "complete" ? "is-complete" : ""}`}>
            <div className="task-row-main">
              <TruncatedText text={row.task.title} className="task-row-title" />
              <div className="task-row-meta">
                <span>{row.project.clientName}</span>
                <span>M{row.milestone.number} {row.milestone.clientLabel}</span>
                <span>{portfolioPhaseLabel(row.phase)}</span>
                {portfolioTaskDate(row.task.dueDate) && <span>Due {portfolioTaskDate(row.task.dueDate)}</span>}
              </div>
            </div>
            <div className="task-row-status">
              <PortfolioTaskStatus row={row} onProjectTaskStatusChange={onProjectTaskStatusChange} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AdminPortfolioTasks({
  projects,
  role = "admin",
  onProjectTaskStatusChange,
}: {
  projects: Project[];
  role?: PortfolioTaskRole;
  onProjectTaskStatusChange: (projectId: string, taskId: string, status: TaskStatus) => void;
}) {
  const rows = derivePortfolioTasks(projects, role);
  const completed = rows.filter(row => row.bucket === "complete").length;
  const progress = rows.length === 0 ? 0 : Math.round((completed / rows.length) * 100);
  const counts = {
    upcoming: rows.filter(row => row.bucket === "upcoming").length,
    progress: rows.filter(row => row.bucket === "progress").length,
    complete: completed,
    action: rows.filter(row => row.bucket === "action").length,
  };

  return (
    <div className="task-center">
      <Panel>
        <PanelHeader title={role === "manager" ? "Assigned manager tasks" : "All studio tasks"} icon={CalendarDays} action={<StatusBadge status="is-progress" label={`${progress}% complete`} />} />
        <div className="task-center-summary">
          <div className="task-summary-item">
            <span>{counts.upcoming}</span>
            <p>Upcoming</p>
          </div>
          <div className="task-summary-item">
            <span>{counts.progress}</span>
            <p>In progress</p>
          </div>
          <div className="task-summary-item">
            <span>{counts.complete}</span>
            <p>Completed</p>
          </div>
          <div className="task-summary-item is-priority">
            <span>{counts.action}</span>
            <p>Action needed</p>
          </div>
        </div>
      </Panel>
      <div className="task-center-milestone-label">
        {role === "manager" ? "Tasks reassigned to the manager across active clients" : "Studio-side work across all active clients"}
      </div>
      <div className="task-center-groups">
        {portfolioTaskBuckets.map(bucket => (
          <PortfolioTaskGroup
            key={bucket}
            bucket={bucket}
            rows={rows.filter(row => row.bucket === bucket)}
            onProjectTaskStatusChange={onProjectTaskStatusChange}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ADMIN — ASSETS TAB
// ─────────────────────────────────────────────

export function BrandGuidelinesPanel({ project, onBrandChange }: { project: Project; onBrandChange: (b: BrandIdentity) => void }) {
  const [editingColors, setEditingColors] = useState(false);
  const [editingFonts,  setEditingFonts]  = useState(false);
  const [editingStyle,  setEditingStyle]  = useState(false);
  const [activeColorId, setActiveColorId] = useState<string | null>(null);
  const { colors, fonts, style: swatchStyle } = project.brand;
  const colorPresets = ["#2D2926", "#C9A96E", "#F5F0EA", "#7C6F64", "#D86B74", "#7FB69A", "#F3C7B4", "#1F4E5F"];
  const normalizeHex = (value: string) => {
    const raw = value.trim();
    const withHash = raw.startsWith("#") ? raw : `#${raw}`;
    return /^#[0-9a-fA-F]{6}$/.test(withHash) ? withHash.toUpperCase() : value;
  };
  const updateColor = (index: number, patch: Partial<(typeof colors)[number]>) => {
    onBrandChange({ ...project.brand, colors: colors.map((x, j) => j === index ? { ...x, ...patch } : x) });
  };

  const EditBtn = ({ active, onToggle }: { active: boolean; onToggle: () => void }) => (
    <button onClick={onToggle} style={{ width: "1.6rem", height: "1.6rem", borderRadius: "50%", flexShrink: 0, border: active ? "1px solid var(--accent)" : "1px solid var(--border)", background: active ? "var(--accent-soft)" : "none", color: active ? "var(--accent)" : "var(--fg-muted)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s" }}>
      {active ? <Check size={10} /> : <Pencil size={10} />}
    </button>
  );
  const InlineInput = ({ value, onChange, placeholder = "" }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ background: "transparent", border: "none", borderBottom: "1px solid var(--border)", outline: "none", color: "var(--fg)", fontSize: "var(--text-base)", fontFamily: "inherit", fontWeight: 500, width: "100%", minHeight: "2.15rem", padding: "0.38rem 0" }} />
  );
  const rowS: React.CSSProperties = { display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.65rem 1.25rem", borderTop: "1px solid var(--border)" };

  return (
    <div style={{ display: "grid", gap: "0.75rem" }}>

      {/* ── Brand Identity ── */}
      {/* auto-fit/minmax instead of a fixed 3-up: lets the Colors/Typography/Logo
          panels reflow to 2-up then 1-up as the viewport narrows, instead of
          squeezing three columns down to an unreadable width on phones. */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
        {/* Colors */}
        <Panel>
          <div className="asset-panel-head">
            <span style={{ fontSize: "var(--text-xs)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--fg-muted)" }}>Brand Colors</span>
            <EditBtn active={editingColors} onToggle={() => setEditingColors(e => !e)} />
          </div>
          {colors.map((c, i) => (
            <div
              key={c.id}
              onDoubleClick={() => { setActiveColorId(c.id); setEditingColors(true); }}
              title="Double-click to edit swatch"
              style={{ ...rowS, position: "relative", cursor: "pointer" }}
            >
              <div style={{ position: "relative", flexShrink: 0 }}>
                <button
                  type="button"
                  className="brand-swatch-button"
                  style={{ backgroundColor: c.hex }}
                  onClick={event => {
                    event.stopPropagation();
                    setActiveColorId(activeColorId === c.id ? null : c.id);
                  }}
                  aria-label={`Edit ${c.name} swatch`}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {editingColors ? <InlineInput value={c.name} onChange={v => updateColor(i, { name: v })} /> : <div style={{ fontSize: "var(--text-base)", fontWeight: 500, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>}
                {!editingColors && <div style={{ fontSize: "var(--text-xs)", color: "var(--fg-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.usage}</div>}
                {editingColors && <InlineInput value={c.usage} onChange={v => updateColor(i, { usage: v })} placeholder="Usage" />}
              </div>
              {editingColors ? <input value={c.hex} onFocus={() => setActiveColorId(c.id)} onChange={e => updateColor(i, { hex: normalizeHex(e.target.value) })} style={{ width: "5rem", fontSize: "var(--text-2xs)", fontFamily: "monospace", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "0.2rem 0.4rem", background: "var(--bg)", color: "var(--fg)", outline: "none", textAlign: "center" }} /> : <span style={{ fontSize: "var(--text-2xs)", fontFamily: "monospace", color: "var(--fg-muted)" }}>{c.hex.toUpperCase()}</span>}
              {editingColors && <button onClick={() => onBrandChange({ ...project.brand, colors: colors.filter((_, j) => j !== i) })} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-muted)", padding: "0.2rem", display: "flex", flexShrink: 0 }}><X size={12} /></button>}
              {activeColorId === c.id && (
                <SwatchPopover onClose={() => setActiveColorId(null)} hex={c.hex} onHexChange={hex => updateColor(i, { hex: normalizeHex(hex) })} colorPresets={colorPresets} onPreset={hex => updateColor(i, { hex })} />
              )}
            </div>
          ))}
          {editingColors && <div style={{ padding: "0.5rem 1.25rem 0.75rem" }}><button onClick={() => onBrandChange({ ...project.brand, colors: [...colors, { id: `c${Date.now()}`, name: "New", hex: "#CCCCCC", usage: "" }] })} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", width: "100%", fontSize: "var(--text-sm)", color: "var(--accent)", background: "none", border: "1px dashed var(--border)", borderRadius: "var(--radius)", padding: "0.45rem", cursor: "pointer" }}><Plus size={11} /> Add color</button></div>}
        </Panel>

        {/* Fonts */}
        <Panel style={{ overflow: "hidden" }}>
          <div className="asset-panel-head">
            <span style={{ fontSize: "var(--text-xs)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--fg-muted)" }}>Typography</span>
            <EditBtn active={editingFonts} onToggle={() => setEditingFonts(e => !e)} />
          </div>
          {fonts.map((f, i) => (
            <div key={f.id} style={rowS}>
              <div style={{ width: "1.5rem", height: "1.5rem", borderRadius: "50%", flexShrink: 0, backgroundColor: "var(--bg)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "var(--text-2xs)", fontWeight: 500, color: "var(--fg)", fontFamily: f.style === "Serif" ? "Georgia, serif" : f.style === "Monospace" ? "monospace" : "inherit" }}>Aa</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {editingFonts ? <InlineInput value={f.name} onChange={v => onBrandChange({ ...project.brand, fonts: fonts.map((x, j) => j === i ? { ...x, name: v } : x) })} /> : <div style={{ fontSize: "var(--text-base)", fontWeight: 500, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>}
                {!editingFonts && <div style={{ fontSize: "var(--text-xs)", color: "var(--fg-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.style} · {f.usage}</div>}
                {editingFonts && (
                  <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.3rem" }}>
                    <select className="dashboard-select" value={f.style} onChange={e => onBrandChange({ ...project.brand, fonts: fonts.map((x, j) => j === i ? { ...x, style: e.target.value } : x) })}><option>Serif</option><option>Sans-serif</option><option>Monospace</option><option>Display</option></select>
                    <div style={{ flex: 1 }}><InlineInput value={f.usage} onChange={v => onBrandChange({ ...project.brand, fonts: fonts.map((x, j) => j === i ? { ...x, usage: v } : x) })} placeholder="Usage" /></div>
                  </div>
                )}
              </div>
              {editingFonts && <button onClick={() => onBrandChange({ ...project.brand, fonts: fonts.filter((_, j) => j !== i) })} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-muted)", padding: "0.2rem", display: "flex", flexShrink: 0 }}><X size={12} /></button>}
            </div>
          ))}
          {editingFonts && <div style={{ padding: "0.5rem 1.25rem 0.75rem" }}><button onClick={() => onBrandChange({ ...project.brand, fonts: [...fonts, { id: `f${Date.now()}`, name: "New Font", style: "Sans-serif", usage: "" }] })} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", width: "100%", fontSize: "var(--text-sm)", color: "var(--accent)", background: "none", border: "1px dashed var(--border)", borderRadius: "var(--radius)", padding: "0.45rem", cursor: "pointer" }}><Plus size={11} /> Add font</button></div>}
        </Panel>

        {/* Brand Style */}
        <Panel style={{ overflow: "hidden" }}>
          <div className="asset-panel-head">
            <span style={{ fontSize: "var(--text-xs)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--fg-muted)" }}>Brand Style</span>
            <EditBtn active={editingStyle} onToggle={() => setEditingStyle(e => !e)} />
          </div>
          <div style={{ padding: "0 1.25rem 1.25rem" }}>
            {editingStyle ? <textarea value={swatchStyle} onChange={e => onBrandChange({ ...project.brand, style: e.target.value })} rows={4} style={{ width: "100%", fontSize: "var(--text-base)", lineHeight: 1.6, border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "0.5rem 0.65rem", background: "var(--bg)", color: "var(--fg)", fontFamily: "inherit", resize: "none", outline: "none" }} onFocus={e => e.currentTarget.style.borderColor = "var(--accent)"} onBlur={e => e.currentTarget.style.borderColor = "var(--border)"} /> : (
              <div className="brand-style-summary">
                <div>
                  <span>Tone</span>
                  <strong>Warm, editorial, minimal</strong>
                </div>
                <div>
                  <span>Positioning</span>
                  <strong>Refined but approachable</strong>
                </div>
                <div>
                  <span>Brand voice</span>
                  <strong>High-contrast, luxe, never corporate</strong>
                </div>
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ADMIN — NOTES TAB
// ─────────────────────────────────────────────

export function AdminNotesTab({ project }: { project: Project }) {
  const [newNote, setNewNote] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  return (
    <div style={{ display: "grid", gap: "0.75rem" }}>
      {isAdding && (
        <Panel>
          <div style={{ padding: "1.15rem 1.25rem" }}>
            <div style={{ marginBottom: "0.75rem" }}>
              <label style={{ display: "block", fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.4rem" }}>New note</label>
              <textarea
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Add internal notes, decisions, context..."
                style={{ width: "100%", minHeight: "5rem", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "0.75rem", background: "oklch(0.99 0.004 55)", font: "inherit", fontSize: "var(--text-md)", color: "var(--fg)", resize: "none", transition: "border-color 0.12s", outline: "none" }}
                onFocus={e => e.currentTarget.style.borderColor = "var(--accent)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
              />
            </div>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <Btn variant="ghost" onClick={() => { setNewNote(""); setIsAdding(false); }}>Cancel</Btn>
              <Btn variant="primary" onClick={() => { if (newNote.trim()) { setNewNote(""); setIsAdding(false); } }} disabled={!newNote.trim()}>Save note</Btn>
            </div>
          </div>
        </Panel>
      )}

      {project.notes.map(note => (
        <Panel key={note.id}>
          <div style={{ padding: "1rem 1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem", paddingBottom: "0.75rem", borderBottom: "1px solid var(--border-soft)" }}>
              <div style={{ width: "2rem", height: "2rem", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: "var(--accent-soft)", color: "var(--accent)", fontSize: "var(--text-xs)", fontWeight: 500 }}>
                {note.author[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "var(--text-base)", fontWeight: 500, color: "var(--fg)" }}>{note.author}</div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--fg-faint)" }}>{note.date}</div>
              </div>
            </div>
            <p style={{ fontSize: "var(--text-md)", lineHeight: 1.6, color: "var(--fg)" }}>{note.content}</p>
          </div>
        </Panel>
      ))}

      {!isAdding && (
        <button
          onClick={() => setIsAdding(true)}
          style={{ border: "1.5px dashed var(--border)", borderRadius: "var(--radius-panel)", padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--fg-muted)", cursor: "pointer", background: "transparent", font: "inherit", transition: "all 0.12s" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--fg-faint)"; e.currentTarget.style.color = "var(--fg)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--fg-muted)"; }}
        >
          <Plus size={14} /><span style={{ fontSize: "var(--text-md)" }}>Add a note</span>
        </button>
      )}
    </div>
  );
}
