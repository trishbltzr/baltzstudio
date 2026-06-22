import {
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  Clock,
  CircleDashed,
  Lock,
  LoaderCircle,
  MessageSquare,
  RefreshCw,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import React, { useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { TaskAssignee, MilestoneStatus, TaskStatus } from "../types";

// ─────────────────────────────────────────────
// SHARED COMPONENTS — small UI primitives reused across admin & client views
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// STATUS DESIGN SYSTEM — single source of truth for the icon + canonical label
// that pairs with each status class. Colours live in src/styles/status.css.
// Every status surface (phase cards, gates, milestones, tasks) reads from here
// so "Done / In progress / Awaiting / Soon / Locked / Blocked" stay consistent.
// Context-specific wording (e.g. "Approved" vs "Done") is still supplied by the
// caller's `label`; this map only guarantees an icon + a sensible default.
export const STATUS_META: Record<string, { icon: LucideIcon; label: string }> = {
  "is-success":  { icon: CheckCircle2,  label: "Done" },
  "is-complete": { icon: CheckCircle2,  label: "Complete" },
  "is-progress": { icon: LoaderCircle,  label: "In progress" },
  "is-active":   { icon: LoaderCircle,  label: "In progress" },
  "is-review":   { icon: Clock,         label: "Awaiting" },
  "is-waiting":  { icon: CircleDashed,  label: "Soon" },
  "is-pending":  { icon: CircleDashed,  label: "Soon" },
  "is-locked":   { icon: Lock,          label: "Locked" },
  "is-blocked":  { icon: AlertTriangle, label: "Blocked" },
};

// Tiny inline progress ring — a circle whose stroke fills proportionally to
// `value` (0–100). Inherits the pill's text colour via currentColor, and is
// sized to sit flush with the 12px status icons. Used as the in-progress
// StatusBadge icon so the circle literally symbolises the percentage.
export function ProgressRing({ value, size = 13, strokeWidth = 2.25 }: { value: number; size?: number; strokeWidth?: number }) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(100, value)) / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)", flexShrink: 0 }} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.25} strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" />
    </svg>
  );
}

type ProgressDotState = TaskStatus | "is-done" | "is-active" | "is-empty";

function progressDotClass(state: ProgressDotState) {
  if (state === "complete" || state === "is-done") return "is-done";
  if (state === "in_progress" || state === "blocked" || state === "is-active") return "is-active";
  return "is-empty";
}

export function progressDotsFromCounts(done: number, total: number, showActive = done < total, markerCount = 5): TaskStatus[] {
  if (total <= 0) return Array.from({ length: markerCount }, () => "not_started" as TaskStatus);
  const safeDone = Math.max(0, Math.min(done, total));
  const completeMarkers = safeDone === total ? markerCount : Math.floor((safeDone / total) * markerCount);

  return Array.from({ length: markerCount }, (_, index) => {
    if (index < completeMarkers) return "complete" as TaskStatus;
    if (showActive && safeDone < total && index === completeMarkers) return "in_progress" as TaskStatus;
    return "not_started" as TaskStatus;
  });
}

export function ProgressDots({
  markers,
  variant = "card",
  id,
}: {
  markers: ProgressDotState[];
  variant?: "card" | "modal";
  id?: string;
}) {
  return (
    <span className={variant === "modal" ? "phase-detail-progress" : "phase-dot-progress"} aria-hidden="true">
      {markers.map((state, index) => (
        <span
          key={id ? `${id}-marker-${index}` : index}
          className={`${variant === "modal" ? "phase-detail-progress-dot" : "phase-dot"} ${progressDotClass(state)}`}
        />
      ))}
    </span>
  );
}

export function StatusBadge({ status, label, detail, icon, className = "", size = "md", style }: { status: string; label: string; detail?: string; icon?: ReactNode; className?: string; size?: "sm" | "md"; style?: React.CSSProperties }) {
  // Every status maps to an icon so the mobile icon-only view never renders an
  // empty pill. The first class token is matched against STATUS_META; callers
  // can pass `icon` to override it (e.g. a ProgressRing for in-progress %).
  const Icon = STATUS_META[status.trim().split(/\s+/)[0]]?.icon ?? null;
  // On mobile the label is hidden via CSS; tapping the badge briefly surfaces
  // a small popover with the full label (+ a short explanation) so users can
  // still read it. Badges frequently sit inside `overflow: hidden` cards
  // (milestone/gate/phase containers), so the popover can't be a normal
  // absolutely-positioned child — it would get visually clipped. Instead we
  // portal it to <body> with `position: fixed` coords computed from the
  // badge's live rect, exactly like AccountMenu's popover does.
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);

  const reposition = useCallback(() => {
    const el = badgeRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCoords({ top: r.bottom + 6, left: r.left + r.width / 2 });
  }, []);

  useEffect(() => {
    if (!popoverOpen) return;
    reposition();
    const onScrollOrResize = () => reposition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    const t = setTimeout(() => setPopoverOpen(false), 2200);
    return () => {
      clearTimeout(t);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [popoverOpen, reposition]);

  return (
    <span
      ref={badgeRef}
      className={`dashboard-status ${status} ${size === "sm" ? "is-compact" : ""} ${className} ${popoverOpen ? "is-popover-open" : ""}`}
      style={style}
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={e => { e.stopPropagation(); setPopoverOpen(o => !o); }}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPopoverOpen(o => !o); } }}
    >
      {icon ?? (Icon && <Icon size={12} />)}
      <span className="dashboard-status-label">{label}</span>
      {popoverOpen && coords && createPortal(
        <span className="dashboard-status-popover" style={{ position: "fixed", top: coords.top, left: coords.left, transform: "translateX(-50%)" }}>
          <strong>{label}</strong>
          {detail && <span className="dashboard-status-popover-detail">{detail}</span>}
        </span>,
        document.body
      )}
    </span>
  );
}

export function TopbarHeading({ title, meta }: { title: string; meta?: ReactNode }) {
  return (
    <div className="dashboard-topbar-left">
      <div className="dashboard-topbar-heading-row">
        <div className="dashboard-topbar-title">{title}</div>
      </div>
      {meta}
    </div>
  );
}

export function AssigneeBadge({ assignee, audience = "neutral" }: { assignee: TaskAssignee; audience?: "neutral" | "client" | "admin" }) {
  const map = {
    AI: {
      cls: "is-ai",
      icon: <Bot size={10} />,
      label: audience === "client" ? "Studio draft" : audience === "admin" ? "AI draft" : "AI",
    },
    human: {
      cls: "is-human",
      icon: <RefreshCw size={10} />,
      label: audience === "admin" ? "Studio task" : "Studio",
    },
    client: {
      cls: "is-client",
      icon: <MessageSquare size={10} />,
      label: audience === "client" ? "Your task" : audience === "admin" ? "Client task" : "Client",
    },
  };
  const { cls, icon, label } = map[assignee];
  return <span className={`assignee-badge ${cls}`}>{icon}{label}</span>;
}

export function AssigneeEditor({ value, onChange }: { value: string[]; onChange: (names: string[]) => void }) {
  const [input, setInput] = useState("");

  const addName = (raw: string) => {
    const name = raw.trim();
    if (!name) return;
    if (value.some(v => v.toLowerCase() === name.toLowerCase())) { setInput(""); return; }
    onChange([...value, name]);
    setInput("");
  };

  return (
    <div className="assignee-editor">
      {value.map(name => (
        <span key={name} className="assignee-editor-chip">
          <User size={11} />
          {name}
          <button
            type="button"
            onClick={() => onChange(value.filter(v => v !== name))}
            aria-label={`Remove ${name}`}
          >
            <X size={11} />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addName(input); }
          else if (e.key === "Backspace" && !input && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={() => addName(input)}
        placeholder={value.length ? "Add another…" : "Add a person…"}
      />
    </div>
  );
}

export function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="progress-row">
      <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
      <span className="progress-label">{done}/{total} done</span>
    </div>
  );
}

export function MilestoneDot({ status, style }: { status: MilestoneStatus; style?: React.CSSProperties }) {
  return (
    <span className={`milestone-dot is-${status}`} style={style}>
      {status === "complete" ? <Check size={10} /> : status === "locked" ? <Lock size={10} /> : null}
    </span>
  );
}

export function Panel({ children, className = "", style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return <div className={`dashboard-panel ${className}`} style={style}>{children}</div>;
}

export function PanelHeader({ title, icon: Icon, action }: { title: string; icon?: LucideIcon; action?: ReactNode }) {
  return (
    <div className="dashboard-panel-header">
      <div className="dashboard-panel-title">
        {Icon && <Icon size={15} />}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function Btn({ children, onClick, variant = "default", size = "md", disabled = false, type = "button", className = "" }: { children: ReactNode; onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void; variant?: "default" | "primary" | "ghost" | "deny"; size?: "sm" | "md"; disabled?: boolean; type?: "button" | "submit"; className?: string }) {
  const variantClass = variant === "primary" ? "btn-primary" : variant === "ghost" ? "btn-ghost" : variant === "deny" ? "btn-deny" : "";
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`btn ${variantClass} ${size === "sm" ? "btn-sm" : ""} ${className}`}>
      {children}
    </button>
  );
}

export function Toast({ message }: { message: string }) {
  return <div className="toast">{message}</div>;
}

export function RadialGauge({ value, size = 64, strokeWidth = 6, color = "var(--accent)", trackColor = "var(--border)" }: { value: number; size?: number; strokeWidth?: number; color?: string; trackColor?: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(100, value)) / 100);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size >= 50 ? "0.95rem" : "0.6rem", fontWeight: 500, color: "var(--fg)" }}>
        {value}%
      </div>
    </div>
  );
}

// Compact segmented horizontal bar — used for inline "microchart" breakdowns
// (e.g. critical / needs attention / passing) without the weight of a full chart.
export function MicroBar({ segments, height = 6 }: { segments: { value: number; color: string }[]; height?: number }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return null;
  return (
    <div style={{ display: "flex", height, borderRadius: 999, overflow: "hidden", background: "var(--surface-alt)" }}>
      {segments.filter(s => s.value > 0).map((s, i) => (
        <div key={i} style={{ flex: s.value, background: s.color }} />
      ))}
    </div>
  );
}

export function TruncatedText({ text, className, as: Tag = "div" }: { text: string; className?: string; as?: "div" | "span" | "p" }) {
  const ref = useRef<HTMLElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  const check = useCallback(() => {
    const el = ref.current;
    if (el) setIsTruncated(el.scrollWidth > el.clientWidth);
  }, []);

  useEffect(() => {
    check();
    const observer = new ResizeObserver(check);
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [check, text]);

  return (
    <Tag
      ref={ref as React.RefObject<any>}
      className={className}
      data-tooltip={isTruncated ? text : undefined}
      title={isTruncated ? text : undefined}
    >
      {text}
    </Tag>
  );
}
