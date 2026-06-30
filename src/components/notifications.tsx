import { Bell, Check, ChevronLeft, MoreVertical, Settings } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import type { Project, GateFeedback, Phase } from "../types";
import { allTasksComplete } from "../lib/projectUtils";
import { currentDashboardTimestamp, formatDashboardDate } from "../lib/dateDisplay";
import { Btn, Panel } from "./shared";

// ─────────────────────────────────────────────
// NOTIFICATION HELPERS
// ─────────────────────────────────────────────

export interface AppNotification {
  id: string;
  type: "gate_sent" | "revision" | "approved" | "phase_done" | "cocoon_link_sent" | "audit_generated" | "wise_payment_sent" | "wise_payment_confirmed" | "booking_unlocked" | "access_updated" | "wiaw_unlocked" | "in_full_flight" | "dashboard_deleted";
  actor: string;           // who triggered it (Studio name or Client name)
  actorInitials: string;
  action: string;          // action verb fragment, e.g. "sent for review"
  target: string;          // the gate/phase label
  projectName: string;
  projectInitials: string;
  date: string;
  gateId?: string;         // for approve/deny action buttons
  phaseId?: string;        // for navigating to a specific phase
}

function workflowNotifications(project: Project, clientOnly: boolean): AppNotification[] {
  return (project.workflow?.notifications ?? [])
    .filter(item => !clientOnly || item.clientVisible)
    .map(item => ({
      id: item.id,
      type: item.type,
      actor: item.actor,
      actorInitials: item.actor === "Baltazar Studio" ? "BS" : project.clientInitials,
      action: item.action,
      target: item.target,
      projectName: project.clientName,
      projectInitials: project.clientInitials,
      date: item.date,
    }));
}

function latestPhaseTaskDate(phase: Phase): string {
  if (phase.completedAt) return phase.completedAt;
  for (let i = phase.tasks.length - 1; i >= 0; i--) {
    const updatedAt = phase.tasks[i]?.updatedAt;
    if (updatedAt) return updatedAt;
  }
  for (let i = phase.tasks.length - 1; i >= 0; i--) {
    const dueDate = phase.tasks[i]?.dueDate;
    if (dueDate) return dueDate;
  }
  return "";
}

function formatNotificationDate(value: string): string {
  return formatDashboardDate(value, "Date pending");
}

function NotificationAvatar({ notification, className }: { notification: AppNotification; className: string }) {
  const initials = (notification.actorInitials || notification.projectInitials || "BS").slice(0, 2).toUpperCase();
  const label = `${notification.actor} notification for ${notification.projectName}`;
  return (
    <span className={className} title={label} aria-label={label}>
      {initials}
    </span>
  );
}

export function deriveAdminNotifications(project: Project): AppNotification[] {
  const notifs: AppNotification[] = [...workflowNotifications(project, false)];
  for (const m of project.milestones) {
    for (const phase of m.phases) {
      if (phase.gate) {
        const g = phase.gate;
        if (g.status === "sent") notifs.push({ id: `sent-${g.id}`, type: "gate_sent", actor: "Studio", actorInitials: "BS", action: "sent for review", target: g.label, projectName: project.clientName, projectInitials: project.clientInitials, date: g.sentAt ?? "", gateId: g.id, phaseId: phase.id });
        if (g.status === "revision") notifs.push({ id: `rev-${g.id}`, type: "revision", actor: project.clientName, actorInitials: project.clientInitials, action: "requested revisions on", target: g.label, projectName: project.clientName, projectInitials: project.clientInitials, date: g.clientFeedback?.submittedAt ?? "" });
        if (g.status === "approved") notifs.push({ id: `app-${g.id}`, type: "approved", actor: project.clientName, actorInitials: project.clientInitials, action: "approved", target: g.label, projectName: project.clientName, projectInitials: project.clientInitials, date: g.approvedAt ?? "" });
      }
      if (allTasksComplete(phase.tasks)) {
        notifs.push({ id: `done-${phase.id}`, type: "phase_done", actor: "Studio", actorInitials: "BS", action: "completed", target: phase.title.replace(/^\d+\.\d+\s+/, ""), projectName: project.clientName, projectInitials: project.clientInitials, date: latestPhaseTaskDate(phase) });
      }
    }
  }
  return notifs;
}

export function deriveClientNotifications(project: Project): AppNotification[] {
  const notifs: AppNotification[] = [...workflowNotifications(project, true)];
  for (const m of project.milestones) {
    for (const phase of m.phases) {
      if (phase.gate) {
        const g = phase.gate;
        if (g.status === "sent") notifs.push({ id: `sent-${g.id}`, type: "gate_sent", actor: "Baltazar Studio", actorInitials: "BS", action: "Review requested", target: g.label, projectName: project.clientName, projectInitials: project.clientInitials, date: g.sentAt ?? "", gateId: g.id, phaseId: phase.id });
        if (g.status === "approved") notifs.push({ id: `app-${g.id}`, type: "approved", actor: "Baltazar Studio", actorInitials: "BS", action: "Approval received", target: g.label, projectName: project.clientName, projectInitials: project.clientInitials, date: g.approvedAt ?? "", phaseId: phase.id });
      }
      if (allTasksComplete(phase.tasks)) {
        notifs.push({ id: `done-${phase.id}`, type: "phase_done", actor: "Baltazar Studio", actorInitials: "BS", action: "Milestone completed", target: phase.title.replace(/^\d+\.\d+\s+/, ""), projectName: project.clientName, projectInitials: project.clientInitials, date: latestPhaseTaskDate(phase), phaseId: phase.id });
      }
    }
  }
  return notifs;
}

export type NotificationPreferences = {
  gateReviews: boolean;
  phaseUpdates: boolean;
  emailDigest: boolean;
  quietHours: boolean;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  gateReviews: true,
  phaseUpdates: true,
  emailDigest: false,
  quietHours: false,
};

const notificationSettingsRows: Array<{ key: keyof NotificationPreferences; label: string; desc: string }> = [
  { key: "gateReviews", label: "Gate review requests", desc: "When the studio sends a milestone for your approval." },
  { key: "phaseUpdates", label: "Phase completions", desc: "Status changes inside the active milestone." },
  { key: "emailDigest", label: "Weekly email digest", desc: "Friday summary of activity and decisions waiting." },
  { key: "quietHours", label: "Quiet hours", desc: "Mute toasts and badges from 8pm to 8am." },
];

export function NotificationSettingsPanel({
  prefs,
  onToggle,
  onBack,
}: {
  prefs: NotificationPreferences;
  onToggle: (key: keyof NotificationPreferences) => void;
  onBack?: () => void;
}) {
  return (
    <Panel>
      <div className="dashboard-panel-header">
        <div className="dashboard-panel-title">
          <Settings size={15} />
          <h2>Notification settings</h2>
        </div>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "var(--text-base)", color: "var(--fg-muted)", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "0.25rem", padding: 0, fontWeight: 500 }}
          >
            <ChevronLeft size={13} /> Back
          </button>
        )}
      </div>
      <div>
        {notificationSettingsRows.map(row => (
          <label
            key={row.key}
            style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", padding: "0.85rem 1.1rem", cursor: "pointer", borderBottom: "1px solid var(--border-soft)" }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "var(--text-base)", fontWeight: 500, color: "var(--fg)" }}>{row.label}</div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--fg-muted)", marginTop: "0.15rem", lineHeight: 1.4 }}>{row.desc}</div>
            </div>
            <span
              role="switch"
              aria-checked={prefs[row.key]}
              onClick={event => { event.preventDefault(); onToggle(row.key); }}
              style={{
                flexShrink: 0,
                width: "2.1rem", height: "1.2rem", borderRadius: "999px",
                background: prefs[row.key] ? "var(--accent)" : "var(--border)",
                position: "relative", transition: "background 0.18s", marginTop: "0.1rem",
              }}
            >
              <span style={{
                position: "absolute", top: "0.15rem",
                left: prefs[row.key] ? "calc(100% - 1.05rem)" : "0.15rem",
                width: "0.9rem", height: "0.9rem", borderRadius: "50%",
                background: "var(--surface)", transition: "left 0.18s",
                boxShadow: "var(--shadow-xs)",
              }} />
            </span>
          </label>
        ))}
      </div>
    </Panel>
  );
}

// ─── Notification panel component (shared between admin + client) ───
export function NotificationPanel({
  notifications, readIds, setReadIds, onClose, offsetLeft,
  canActOnGates = false, onApproveGate, onDenyGate,
}: {
  notifications: AppNotification[];
  readIds: Set<string>;
  setReadIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  onClose: () => void;
  offsetLeft: number;
  canActOnGates?: boolean;
  onApproveGate?: (gateId: string) => void;
  onDenyGate?: (gateId: string) => void;
}) {
  const [tab, setTab] = useState<"all" | "inbox">("all");
  const [settingsOpen, setSettingsOpen] = useState(false);
  // In-memory only — this popover lives across the whole app so wiring real
  // persistence is out of scope; toggles still feel responsive and reflect
  // intent in the same render cycle.
  const [prefs, setPrefs] = useState({
    gateReviews: true,
    phaseUpdates: true,
    emailDigest: false,
    quietHours: false,
  });
  const togglePref = (key: keyof typeof prefs) => setPrefs(p => ({ ...p, [key]: !p[key] }));
  const unread = notifications.filter(n => !readIds.has(n.id)).length;
  const visible = tab === "all" ? notifications : notifications.filter(n => !readIds.has(n.id));

  const projectColor = (init: string) => {
    // simple hash → hue for a brand-soft dot color
    let h = 0;
    for (let i = 0; i < init.length; i++) h = (h * 31 + init.charCodeAt(i)) % 360;
    return `oklch(0.72 0.12 ${h})`;
  };

  const settingsRows: Array<{ key: keyof typeof prefs; label: string; desc: string }> = [
    { key: "gateReviews", label: "Gate review requests", desc: "When the studio sends a milestone for your approval." },
    { key: "phaseUpdates", label: "Phase completions", desc: "Status changes inside the active milestone." },
    { key: "emailDigest", label: "Weekly email digest", desc: "Friday summary of activity and decisions waiting." },
    { key: "quietHours", label: "Quiet hours", desc: "Mute toasts and badges from 8pm to 8am." },
  ];

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 199 }} />
      <div style={{
        position: "fixed", left: `${offsetLeft}px`, top: "12px",
        width: "380px", maxHeight: "calc(100vh - 24px)",
        backgroundColor: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-panel)",
        zIndex: 200, display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "var(--shadow-popover)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.85rem 1.1rem 0.6rem", flexShrink: 0 }}>
          <span style={{ fontSize: "var(--text-lg)", fontWeight: 500, color: "var(--fg)" }}>
            {settingsOpen ? "Notification settings" : "Notifications"}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {!settingsOpen && unread > 0 && (
              <button onClick={() => setReadIds(new Set(notifications.map(n => n.id)))}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "var(--text-xs)", color: "var(--accent)", padding: 0, fontFamily: "inherit", fontWeight: 500 }}>
                Mark all as read
              </button>
            )}
            <button
              type="button"
              onClick={() => setSettingsOpen(o => !o)}
              title={settingsOpen ? "Back to notifications" : "Notification settings"}
              aria-label={settingsOpen ? "Back to notifications" : "Notification settings"}
              style={{
                background: settingsOpen ? "var(--accent-soft)" : "none",
                border: settingsOpen ? "1px solid var(--accent)" : "1px solid transparent",
                color: settingsOpen ? "var(--accent)" : "var(--fg-muted)",
                cursor: "pointer",
                width: "1.65rem", height: "1.65rem",
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: "50%", transition: "all 0.15s", flexShrink: 0,
              }}
              onMouseEnter={e => { if (!settingsOpen) { e.currentTarget.style.background = "var(--bg)"; e.currentTarget.style.color = "var(--fg)"; } }}
              onMouseLeave={e => { if (!settingsOpen) { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--fg-muted)"; } }}
            >
              {settingsOpen ? <ChevronLeft size={13} /> : <MoreVertical size={13} />}
            </button>
          </div>
        </div>

        {/* Tabs (hidden in settings mode) */}
        {!settingsOpen && (
        <div style={{ display: "flex", alignItems: "center", gap: "1.1rem", padding: "0 1.1rem", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          {(["all", "inbox"] as const).map(t => {
            const isActive = tab === t;
            const label = t === "all" ? "All" : "Inbox";
            return (
              <button key={t} onClick={() => setTab(t)} style={{
                background: "none", border: "none", cursor: "pointer", padding: "0.5rem 0",
                fontSize: "var(--text-base)", fontWeight: isActive ? 600 : 500,
                color: isActive ? "var(--fg)" : "var(--fg-muted)",
                borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                fontFamily: "inherit", display: "flex", alignItems: "center", gap: "0.35rem",
              }}>
                {label}
                {t === "inbox" && unread > 0 && (
                  <span style={{ background: "var(--accent)", color: "white", fontSize: "var(--text-2xs)", fontWeight: 500, padding: "0.1rem 0.35rem", borderRadius: "999px", minWidth: "1rem", textAlign: "center" }}>{unread}</span>
                )}
              </button>
            );
          })}
        </div>
        )}

        {/* Settings panel (toggleable) */}
        {settingsOpen && (
          <div style={{ flex: 1, overflow: "auto", padding: "0.5rem 0" }}>
            {settingsRows.map(row => (
              <label
                key={row.key}
                style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", padding: "0.7rem 1.1rem", cursor: "pointer", borderBottom: "1px solid var(--border-soft)" }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "var(--text-base)", fontWeight: 500, color: "var(--fg)" }}>{row.label}</div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--fg-muted)", marginTop: "0.15rem", lineHeight: 1.4 }}>{row.desc}</div>
                </div>
                <span
                  role="switch"
                  aria-checked={prefs[row.key]}
                  onClick={e => { e.preventDefault(); togglePref(row.key); }}
                  style={{
                    flexShrink: 0,
                    width: "2.1rem", height: "1.2rem", borderRadius: "999px",
                    background: prefs[row.key] ? "var(--accent)" : "var(--border)",
                    position: "relative", transition: "background 0.18s", marginTop: "0.1rem",
                  }}
                >
                  <span style={{
                    position: "absolute", top: "0.15rem",
                    left: prefs[row.key] ? "calc(100% - 1.05rem)" : "0.15rem",
                    width: "0.9rem", height: "0.9rem", borderRadius: "50%",
                    background: "var(--surface)", transition: "left 0.18s",
                    boxShadow: "var(--shadow-xs)",
                  }} />
                </span>
              </label>
            ))}
          </div>
        )}

        {/* List (hidden in settings mode) */}
        {!settingsOpen && (
        <div style={{ flex: 1, overflow: "auto" }}>
          {visible.length === 0 ? (
            <div style={{ padding: "2.5rem 1.25rem", textAlign: "center", color: "var(--fg-muted)", fontSize: "var(--text-base)" }}>
              {tab === "inbox" ? "You're all caught up." : "No notifications yet."}
            </div>
          ) : visible.map(n => {
            const isRead = readIds.has(n.id);
            const showActions = canActOnGates && n.type === "gate_sent" && n.gateId;
            return (
              <div key={n.id} onClick={() => setReadIds(prev => new Set([...prev, n.id]))}
                style={{ display: "flex", alignItems: "flex-start", gap: "0.7rem", padding: "0.85rem 1.1rem", borderBottom: "1px solid var(--border-soft)", cursor: "pointer", transition: "background 0.15s", position: "relative" }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--bg)"}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
              >
                {/* Avatar */}
                <NotificationAvatar notification={n} className="topbar-notif-avatar" />

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Action sentence */}
                  <div style={{ fontSize: "var(--text-base)", color: "var(--fg)", lineHeight: 1.4 }}>
                    <strong style={{ fontWeight: 500 }}>{n.actor}</strong>
                    <span style={{ color: "var(--fg-muted)" }}> {n.action} </span>
                    <strong style={{ fontWeight: 500 }}>{n.target}</strong>
                  </div>
                  {/* Meta row: time · project */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.25rem", fontSize: "var(--text-xs)", color: "var(--fg-muted)" }}>
                    {n.date && <span>{n.date}</span>}
                    {n.date && <span>·</span>}
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: projectColor(n.projectInitials), display: "inline-block" }} />
                    <span>{n.projectName}</span>
                  </div>
                  {/* Action buttons inline */}
                  {showActions && (
                    <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.6rem" }}>
                      <button onClick={(e) => { e.stopPropagation(); onDenyGate?.(n.gateId!); setReadIds(prev => new Set([...prev, n.id])); }}
                        style={{ padding: "0.35rem 0.8rem", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--fg)", fontSize: "var(--text-sm)", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                        Deny
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onApproveGate?.(n.gateId!); setReadIds(prev => new Set([...prev, n.id])); }}
                        style={{ padding: "0.35rem 0.8rem", borderRadius: "var(--radius)", border: "1px solid var(--accent)", background: "var(--accent)", color: "white", fontSize: "var(--text-sm)", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                        Approve
                      </button>
                    </div>
                  )}
                </div>

                {/* Unread dot */}
                {!isRead && (
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--accent)", flexShrink: 0, marginTop: "0.65rem" }} />
                )}
              </div>
            );
          })}
        </div>
        )}

        {/* Footer */}
        <div style={{ padding: "0.55rem 1.1rem", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "var(--text-xs)", color: "var(--fg-muted)", flexShrink: 0 }}>
          <span>{settingsOpen ? "Changes apply immediately" : "Use ↑ ↓ to navigate"}</span>
          <button
            type="button"
            onClick={() => setSettingsOpen(o => !o)}
            style={{ background: "none", border: "none", color: settingsOpen ? "var(--accent)" : "var(--fg-muted)", display: "flex", alignItems: "center", gap: "0.3rem", cursor: "pointer", fontSize: "var(--text-xs)", fontFamily: "inherit", fontWeight: 500 }}
          >
            <Settings size={11} /> {settingsOpen ? "Done" : "Notification settings"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// NOTIFICATIONS PAGE (shared admin + client)
// ─────────────────────────────────────────────

function NotificationRow({
  notification,
  variant,
  isRead,
  canAct = false,
  onOpen,
  onDeny,
  onApprove,
}: {
  notification: AppNotification;
  variant: "popover" | "page";
  isRead: boolean;
  canAct?: boolean;
  onOpen: () => void;
  onDeny?: () => void;
  onApprove?: () => void;
}) {
  const displayDate = formatNotificationDate(notification.date);
  const rowClass = variant === "popover"
    ? `topbar-notif-row${isRead ? " is-read" : " is-unread"}${canAct ? " has-actions" : ""}`
    : `notifications-row ${isRead ? "is-read" : "is-unread"}`;
  const avatarClass = variant === "popover" ? "topbar-notif-avatar" : "notifications-row-avatar";
  const bodyClass = variant === "popover" ? "topbar-notif-body" : "notifications-row-body";
  const textClass = variant === "popover" ? "topbar-notif-text" : "notifications-row-line";
  const titleClass = variant === "popover" ? "" : "notifications-row-title";
  const metaClass = variant === "popover" ? "topbar-notif-meta" : "notifications-row-date";
  const actionsClass = variant === "popover" ? "topbar-notif-actions" : "notifications-row-actions";

  const actions = canAct && notification.gateId && (
    <div className={actionsClass}>
      <Btn
        variant="deny"
        size="sm"
        onClick={e => {
          e.stopPropagation();
          onDeny?.();
        }}
      >
        Deny
      </Btn>
      <Btn
        variant="primary"
        size="sm"
        onClick={e => {
          e.stopPropagation();
          onApprove?.();
        }}
      >
        Approve
      </Btn>
    </div>
  );

  return (
    <div className={rowClass} onClick={onOpen}>
      <NotificationAvatar notification={notification} className={avatarClass} />
      <div className={bodyClass}>
        <div className={textClass}>
          <span className={titleClass || undefined}>
            <strong>{notification.actor}</strong>
            <span> {notification.action} </span>
            <strong>{notification.target}</strong>
          </span>
        </div>
        {variant === "popover" ? (
          <div className={metaClass}>
            <span>{displayDate}</span>
            {notification.projectName && <><span>·</span><span>{notification.projectName}</span></>}
          </div>
        ) : (
          <span className={metaClass}>
            {displayDate}
            {notification.projectName ? ` · ${notification.projectName}` : ""}
          </span>
        )}
      </div>
      {variant === "page" && actions ? (
        <span className="notifications-row-meta">{actions}</span>
      ) : actions}
    </div>
  );
}

// ─── Topbar notification bell ──────────────────────────────────────────────
// Bell icon + unread badge in the topbar right slot. Clicking opens a compact
// dropdown (portal) showing the 5 most recent notifications, a "Mark all read"
// action, and a "View all" footer button that navigates to NotificationsPage.
export function NotificationBell({
  notifications, readIds, setReadIds, dismissedIds, setDismissedIds, onViewAll, onSubmitFeedback, onOpenNotification, onApproveGate, onDenyGate,
}: {
  notifications: AppNotification[];
  readIds: Set<string>;
  setReadIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  dismissedIds?: Set<string>;
  setDismissedIds?: React.Dispatch<React.SetStateAction<Set<string>>>;
  onViewAll: () => void;
  onSubmitFeedback?: (gateId: string, feedback: GateFeedback) => void;
  onOpenNotification?: (phaseId?: string, type?: AppNotification["type"]) => void;
  onApproveGate?: (gateId: string) => void;
  onDenyGate?: (gateId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "updates" | "approvals">("all");
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const unread = notifications.filter(n => !readIds.has(n.id)).length;

  const reposition = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCoords({ top: r.bottom + 8, right: window.innerWidth - r.right });
  }, []);

  useEffect(() => {
    if (!open) return;
    reposition();
    const h = () => reposition();
    window.addEventListener("scroll", h, true);
    window.addEventListener("resize", h);
    return () => { window.removeEventListener("scroll", h, true); window.removeEventListener("resize", h); };
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || dropRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const activeNotifications = notifications.filter(n => !dismissedIds?.has(n.id));
  const filteredNotifications = activeNotifications.filter(n => {
    if (filter === "approvals") return n.type === "gate_sent";
    if (filter === "updates") return n.type !== "gate_sent";
    return true;
  });
  const recent = filteredNotifications.slice(0, 5);
  const counts = {
    all: activeNotifications.filter(n => !readIds.has(n.id)).length,
    updates: activeNotifications.filter(n => n.type !== "gate_sent" && !readIds.has(n.id)).length,
    approvals: activeNotifications.filter(n => n.type === "gate_sent" && !readIds.has(n.id)).length,
  };

  function handleGateDeny(notification: AppNotification) {
    if (!notification.gateId) return;
    if (onSubmitFeedback) {
      onSubmitFeedback(notification.gateId, { whatWorked: "", adjustments: "Revision requested", approved: false, submittedAt: currentDashboardTimestamp() });
    } else {
      onDenyGate?.(notification.gateId);
    }
    setDismissedIds?.(prev => new Set([...prev, notification.id]));
    setReadIds(prev => new Set([...prev, notification.id]));
  }

  function handleGateApprove(notification: AppNotification) {
    if (!notification.gateId) return;
    if (onSubmitFeedback) {
      onSubmitFeedback(notification.gateId, { whatWorked: "", adjustments: "", approved: true, submittedAt: currentDashboardTimestamp() });
    } else {
      onApproveGate?.(notification.gateId);
    }
    setDismissedIds?.(prev => new Set([...prev, notification.id]));
    setReadIds(prev => new Set([...prev, notification.id]));
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={`topbar-notif-btn${open ? " is-open" : ""}`}
        onClick={() => setOpen(v => !v)}
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell size={16} />
        {unread > 0 && <span className="topbar-notif-badge">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && coords && createPortal(
        <div
          ref={dropRef}
          className="topbar-notif-dropdown"
          style={{ position: "fixed", top: coords.top, right: coords.right, zIndex: 1300 }}
        >
          {/* Header */}
          <div className="topbar-notif-header">
            <span className="topbar-notif-title">Notifications</span>
            {unread > 0 && (
              <button
                type="button"
                className="topbar-notif-markall"
                onClick={() => setReadIds(prev => new Set([...prev, ...notifications.map(n => n.id)]))}
              >
                <Check size={11} />
                Mark all read
              </button>
            )}
          </div>

          <div className="topbar-notif-filters" role="tablist" aria-label="Notification filters">
            {([["all", "All", counts.all], ["updates", "Updates", counts.updates], ["approvals", "Approvals", counts.approvals]] as const).map(([key, label, count]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={filter === key}
                className={`topbar-notif-filter ${filter === key ? "is-active" : ""}`}
                onClick={() => setFilter(key)}
              >
                {label}
                {count > 0 && <span>{count}</span>}
              </button>
            ))}
          </div>

          {/* Notification rows */}
          <div className="topbar-notif-list">
            {recent.length === 0 ? (
              <div className="topbar-notif-empty">You're all caught up.</div>
            ) : recent.map(n => {
              const isRead = readIds.has(n.id);
              const isDismissed = dismissedIds?.has(n.id);
              if (isDismissed) return null;
              const canAct = n.type === "gate_sent" && n.gateId && (onSubmitFeedback || onApproveGate || onDenyGate);
              return (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  variant="popover"
                  isRead={isRead}
                  canAct={Boolean(canAct)}
                  onOpen={() => {
                    setReadIds(prev => new Set([...prev, n.id]));
                    setOpen(false);
                    onOpenNotification?.(n.phaseId, n.type);
                  }}
                  onDeny={() => handleGateDeny(n)}
                  onApprove={() => handleGateApprove(n)}
                />
              );
            })}
          </div>

          {/* Footer */}
          <div className="topbar-notif-footer">
            <button
              type="button"
              className="topbar-notif-viewall"
              onClick={() => { setOpen(false); onViewAll(); }}
            >
              View all notifications
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export function NotificationsPage({ notifications, readIds, setReadIds, dismissedIds, setDismissedIds, onSubmitFeedback, onNavigate, settingsOpen = false, setSettingsOpen, onOpenSettings, showSettingsShortcut = true }: {
  notifications: AppNotification[];
  readIds: Set<string>;
  setReadIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  dismissedIds: Set<string>;
  setDismissedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  onSubmitFeedback?: (gateId: string, feedback: GateFeedback) => void;
  onNavigate?: (phaseId?: string, type?: AppNotification["type"]) => void;
  settingsOpen?: boolean;
  setSettingsOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  onOpenSettings?: () => void;
  showSettingsShortcut?: boolean;
}) {
  const [tab, setTab] = useState<"all" | "updates" | "approvals">("all");
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const togglePref = (key: keyof NotificationPreferences) => setPrefs(current => ({ ...current, [key]: !current[key] }));
  const openSettings = () => {
    if (onOpenSettings) {
      onOpenSettings();
      return;
    }
    setSettingsOpen?.(true);
  };
  const approvals = notifications.filter(n => n.type === "gate_sent");
  const updates = notifications.filter(n => n.type !== "gate_sent");
  const allDisplayed = notifications.filter(n => !dismissedIds.has(n.id));
  const updateDisplayed = updates.filter(n => !dismissedIds.has(n.id));
  const approvalDisplayed = approvals.filter(n => !dismissedIds.has(n.id));
  const displayed = tab === "updates" ? updateDisplayed : tab === "approvals" ? approvalDisplayed : allDisplayed;
  const unread = allDisplayed.filter(n => !readIds.has(n.id)).length;
  const updateUnread = updateDisplayed.filter(n => !readIds.has(n.id)).length;
  const approvalUnread = approvalDisplayed.filter(n => !readIds.has(n.id)).length;

  function handleRowClick(n: AppNotification) {
    setReadIds(prev => new Set([...prev, n.id]));
    if (n.type !== "gate_sent") {
      // Non-review notifications dismiss on open and navigate to the relevant section
      setDismissedIds(prev => new Set([...prev, n.id]));
      onNavigate?.(n.phaseId, n.type);
    } else {
      onNavigate?.(n.phaseId, n.type);
    }
    // gate_sent stays visible until approved/denied
  }

  return (
    <div>
      {settingsOpen ? (
        <NotificationSettingsPanel prefs={prefs} onToggle={togglePref} onBack={setSettingsOpen ? () => setSettingsOpen(false) : undefined} />
      ) : (
        <div className="notifications-page">
          <section className="notifications-card">
            <div className="notifications-card-toolbar">
              <div className="notifications-tabs" role="tablist" aria-label="Notification filters">
                {([["all", "All", unread], ["updates", "Updates", updateUnread], ["approvals", "Approvals", approvalUnread]] as const).map(([key, label, count]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={tab === key}
                    onClick={() => setTab(key)}
                    className={`notifications-tab ${tab === key ? "is-active" : ""}`}
                  >
                    {label}
                    {count > 0 && <span>{count}</span>}
                  </button>
                ))}
              </div>
              <div className="notifications-actions">
                {unread > 0 && (
                  <button type="button" className="notifications-text-action" onClick={() => setReadIds(new Set(notifications.map(n => n.id)))}>
                    Mark all as read
                  </button>
                )}
                {showSettingsShortcut && (
                  <button type="button" className="notifications-settings-btn" onClick={openSettings} title="Notification settings" aria-label="Notification settings">
                    <MoreVertical size={13} />
                  </button>
                )}
              </div>
            </div>

            <div className="notifications-list">
              {displayed.length === 0 ? (
                <div className="notifications-empty">
                  {tab === "approvals" ? "Nothing needs your attention right now." : tab === "updates" ? "No updates yet." : "You're all caught up."}
                </div>
              ) : displayed.map(n => {
                const isRead = readIds.has(n.id);
                const canSubmitGate = n.type === "gate_sent" && n.gateId && onSubmitFeedback;
                return (
                  <NotificationRow
                    key={n.id}
                    notification={n}
                    variant="page"
                    isRead={isRead}
                    canAct={Boolean(canSubmitGate)}
                    onOpen={() => handleRowClick(n)}
                    onDeny={() => {
                      if (!n.gateId) return;
                      onSubmitFeedback?.(n.gateId, { whatWorked: "", adjustments: "Revision requested", approved: false, submittedAt: currentDashboardTimestamp() });
                      setDismissedIds(prev => new Set([...prev, n.id]));
                    }}
                    onApprove={() => {
                      if (!n.gateId) return;
                      onSubmitFeedback?.(n.gateId, { whatWorked: "", adjustments: "", approved: true, submittedAt: currentDashboardTimestamp() });
                      setDismissedIds(prev => new Set([...prev, n.id]));
                    }}
                  />
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
