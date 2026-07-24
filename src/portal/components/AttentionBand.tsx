"use client";

import type { ReactNode } from "react";
import { css } from "../helpers";
import { Icon } from "../icons";
import { pendingApprovalsForRole } from "../selectors";
import type { PortalActions, PortalState } from "../store";

// Compact "needs attention" strip pinned to the top of the Snapshot — only for
// studio roles, and only when there are unresolved escalations or pending
// approvals. Renders nothing (no layout shift) when everything is clear.
export function AttentionBand({ state, actions }: { state: PortalState; actions: PortalActions }) {
  if (state.role !== "admin" && state.role !== "dev") return null;
  const escN = state.escalations.filter(e => !e.resolved).length;
  const apprN = pendingApprovalsForRole(state, actions.workspaceForClient).length;
  if (escN === 0 && apprN === 0) return null;

  const urgent = escN > 0;
  const accent = urgent ? "var(--danger)" : "var(--warn)";
  const soft = urgent ? "var(--danger-soft)" : "var(--warn-soft)";
  const total = escN + apprN;
  const detail = [escN && `${escN} escalation${escN === 1 ? "" : "s"}`, apprN && `${apprN} approval${apprN === 1 ? "" : "s"} waiting`].filter(Boolean).join(" · ");

  const chip = (label: string, tone: string, onClick: () => void): ReactNode => (
    <button type="button" onClick={onClick} style={css("display:inline-flex;align-items:center;gap:0.4rem;min-height:2.1rem;padding:0 0.85rem;border-radius:var(--radius-pill);border:1px solid color-mix(in srgb," + tone + " 45%,var(--border));background:var(--surface);color:" + tone + ";font-size:var(--text-xs);font-weight:500;cursor:pointer;white-space:nowrap")}>{label}<Icon name="arrow" size={13} /></button>
  );

  return (
    <section aria-label="Needs attention" style={css("display:flex;align-items:center;gap:0.9rem;flex-wrap:wrap;padding:0.7rem 1.1rem;border:1px solid color-mix(in srgb," + accent + " 30%,var(--border-soft));border-radius:var(--radius-panel);background:linear-gradient(135deg,var(--surface)," + soft + ")")}>
      <span style={css("width:2rem;height:2rem;border-radius:50%;display:grid;place-items:center;flex-shrink:0;background:" + soft + ";color:" + accent)}><Icon name="alert" size={16} /></span>
      <div style={css("min-width:0;flex:1")}>
        <div style={css("font-size:var(--text-base);font-weight:500")}>{total} item{total === 1 ? "" : "s"} need{total === 1 ? "s" : ""} your attention</div>
        <div style={css("font-size:var(--text-xs);color:var(--fg-muted)")}>{detail}</div>
      </div>
      <div style={css("display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap")}>
        {escN > 0 && chip("Review escalations", "var(--danger)", () => { actions.patch({ inboxFilter: "tickets" }); actions.setView("inbox"); })}
        {apprN > 0 && chip("Review approvals", "var(--warn)", () => actions.setView("review"))}
      </div>
    </section>
  );
}
