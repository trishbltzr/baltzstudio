"use client";

import type { ReactNode } from "react";
import { css } from "../helpers";
import { Icon } from "../icons";

// Canonical section header for the dashboard. `inset` = sits inside a bordered
// panel (adds panel padding + a bottom divider); otherwise it's a standalone
// section label. Provide either an actionLabel link OR a custom `right` slot
// (e.g. carousel arrows).
export function SectionHeader({ title, sub, icon, iconColor, actionLabel, onAction, right, inset = false }: {
  title: string;
  sub?: string;
  icon?: string;
  iconColor?: string;
  actionLabel?: string;
  onAction?: () => void;
  right?: ReactNode;
  inset?: boolean;
}) {
  return (
    <div style={css("display:flex;align-items:" + (sub ? "flex-end" : "center") + ";justify-content:space-between;gap:0.8rem;" + (inset ? "padding:0.9rem 1.1rem;border-bottom:1px solid var(--border-soft)" : "padding:0 0.15rem"))}>
      <div style={css("display:flex;align-items:center;gap:0.5rem;min-width:0")}>
        {icon && <span style={css("display:inline-flex;flex-shrink:0;color:" + (iconColor || "var(--fg-muted)"))}><Icon name={icon} size={16} /></span>}
        <div style={css("min-width:0")}>
          <h3 style={css("margin:0;font-size:var(--text-lg);font-weight:500;line-height:1.2")}>{title}</h3>
          {sub && <div style={css("margin-top:0.12rem;font-size:var(--text-xs);color:var(--fg-muted);line-height:1.4")}>{sub}</div>}
        </div>
      </div>
      {right ? <div style={css("display:flex;align-items:center;gap:0.5rem;flex-shrink:0")}>{right}</div>
        : actionLabel && <button type="button" onClick={onAction} className="pt-link" style={css("display:inline-flex;align-items:center;gap:var(--space-1);flex-shrink:0;font-size:var(--text-xs);font-weight:500;color:var(--accent);background:none;border:none;cursor:pointer;white-space:nowrap")}>{actionLabel}<Icon name="arrow" size={13} /></button>}
    </div>
  );
}
