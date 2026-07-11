"use client";

import { Icon } from "../icons";
import { css } from "../helpers";
import type { PortalActions, PortalState } from "../store";

export function Approvals({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const cols = state.isMobile ? "minmax(0,1fr)" : "minmax(0,1.55fr) minmax(0,1fr)";
  const reviewItems = [
    ...actions.workspaceForClient("Flora & Co.").approvals,
    ...actions.workspaceForClient("Plume Studio").approvals,
    ...actions.workspaceForClient("Saffron & Sage").approvals,
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: cols, gap: "0.85rem" }}>
      <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden")}>
        <div style={css("padding:0.9rem 1.1rem;border-bottom:1px solid var(--border-soft)")}><h3 style={css("margin:0;font-size:var(--text-lg);font-weight:500")}>Ready for client review</h3></div>
        {reviewItems.map(a => (
          <div key={a.title} style={css("display:flex;align-items:center;gap:var(--space-3);padding:0.8rem 1.1rem;border-bottom:1px solid var(--border-soft)")}>
            <span style={css("width:2.4rem;height:2.4rem;border-radius:var(--radius-sm);flex-shrink:0;background:" + a.thumb)} />
            <div style={{ flex: 1, minWidth: 0 }}><div style={css("font-weight:500;font-size:var(--text-base)")}>{a.title}</div><div style={css("font-size:var(--text-xs);color:var(--fg-muted)")}>{a.clientName}</div></div>
            <button onClick={() => actions.sendApproval(a.id)} className="pt-op" style={css("font-size:var(--text-xs);font-weight:500;padding:0.35rem 0.75rem;border-radius:var(--radius-pill);border:none;background:" + (a.sent ? "var(--surface-alt)" : "var(--accent)") + ";color:" + (a.sent ? "var(--fg-muted)" : "#fff") + ";cursor:pointer")} disabled={a.sent}>{a.sent ? `Sent${a.sentAt ? ` · ${a.sentAt}` : ""}` : "Send to client"}</button>
          </div>
        ))}
      </div>
      <div style={css("position:relative;overflow:hidden;border-radius:var(--radius-panel);background:oklch(0.985 0.012 22);padding:1.1rem;box-shadow:inset 0 0 0 1px oklch(0.88 0.04 20 / 0.32)")}>
        <div style={css("display:flex;align-items:center;gap:0.45rem;color:var(--accent);margin-bottom:0.5rem")}><Icon name="flag" size={16} /><h3 style={css("margin:0;font-size:var(--text-lg);font-weight:500")}>Handoff notes</h3></div>
        <p style={css("margin:0 0 0.9rem;font-size:var(--text-base);color:var(--fg-muted);line-height:1.55")}>Flora &amp; Co. is ready for Milestone 2 — full site is built and QA&apos;d. Plume Studio handoff package is complete, pending the launch window. Saffron &amp; Sage audit needs an owner call on scope before quoting a Winged in a Week sprint.</p>
        <button onClick={() => actions.escalateDecision({ clientName: "Saffron & Sage", title: "Audit findings need owner sign-off", reason: "Cocoon readout needs an owner call on scope before quoting a Winged in a Week sprint.", by: "Emet Rowe" })} className="pt-iconbtn" style={css("width:100%;height:2.1rem;border-radius:var(--radius-pill);border:1px solid var(--accent);background:var(--surface);color:var(--accent);font-weight:500;font-size:0.8rem;cursor:pointer")}>Escalate a decision to Admin</button>
      </div>
    </div>
  );
}
