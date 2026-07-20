"use client";

import { Icon } from "../icons";
import { css } from "../helpers";
import type { PortalActions, PortalState } from "../store";
import { STUDIO_CLIENTS } from "../clients";
import { ApprovalOutputCard } from "../components/ApprovalOutputCard";

export function Approvals({ state, actions }: { state: PortalState; actions: PortalActions }) {
  if (state.role === "client") {
    const approvals = actions.workspaceForClient(state.clientName).approvals.filter(item => item.sent);
    return (
      <div style={css("display:flex;flex-direction:column;gap:0.85rem") }>
        <section style={css("padding:1.15rem 1.2rem;border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface-alt)") }>
          <div style={css("display:flex;align-items:center;gap:0.5rem;color:var(--accent)")}><Icon name="flag" size={16} /><span style={css("font-size:var(--text-xs);font-weight:500;text-transform:uppercase;letter-spacing:0.04em")}>Approvals</span></div>
          <h2 style={css("margin:0.35rem 0 0;font-size:1.25rem;font-weight:500")}>Final work ready for you</h2>
          <p style={css("margin:0.4rem 0 0;font-size:var(--text-base);line-height:1.55;color:var(--fg-muted)")}>Audit reports and builder outputs appear here only after the studio shares the finished version.</p>
        </section>
        {approvals.map(approval => <ApprovalOutputCard key={approval.id} approval={approval} />)}
        {approvals.length === 0 && <div style={css("padding:2.4rem 1rem;border:1px dashed var(--border);border-radius:var(--radius-panel);text-align:center;color:var(--fg-faint);font-size:var(--text-base)")}>Nothing is waiting for approval yet.</div>}
      </div>
    );
  }
  const cols = state.isMobile ? "minmax(0,1fr)" : "minmax(0,1.55fr) minmax(0,1fr)";
  const reviewItems = STUDIO_CLIENTS.flatMap(client => actions.workspaceForClient(client.name).approvals);
  return (
    <div style={{ display: "grid", gridTemplateColumns: cols, gap: "0.85rem" }}>
      <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden")}>
        <div style={css("padding:0.9rem 1.1rem;border-bottom:1px solid var(--border-soft)")}><h3 style={css("margin:0;font-size:var(--text-lg);font-weight:500")}>Ready for client review</h3></div>
        {reviewItems.map(a => (
          <div key={a.id} style={css("display:flex;align-items:center;gap:var(--space-3);padding:0.8rem 1.1rem;border-bottom:1px solid var(--border-soft)")}>
            <span style={css("width:2.4rem;height:2.4rem;border-radius:var(--radius-sm);flex-shrink:0;background:" + a.thumb)} />
            <div style={{ flex: 1, minWidth: 0 }}><div style={css("font-weight:500;font-size:var(--text-base)")}>{a.title}</div><div style={css("font-size:var(--text-xs);color:var(--fg-muted)")}>{a.clientName}</div></div>
            <button onClick={() => actions.sendApproval(a.id)} className="pt-op" style={css("font-size:var(--text-xs);font-weight:500;padding:0.35rem 0.75rem;border-radius:var(--radius-pill);border:none;background:" + (a.sent ? "var(--surface-alt)" : "var(--accent)") + ";color:" + (a.sent ? "var(--fg-muted)" : "#fff") + ";cursor:pointer")} disabled={a.sent}>{a.sent ? `Sent${a.sentAt ? ` · ${a.sentAt}` : ""}` : "Send to client"}</button>
          </div>
        ))}
        {reviewItems.length === 0 && <div style={css("padding:2rem 1rem;text-align:center;color:var(--fg-faint);font-size:0.78rem")}>No work is waiting for client review.</div>}
      </div>
      <div style={css("position:relative;overflow:hidden;border-radius:var(--radius-panel);background:oklch(0.985 0.012 22);padding:1.1rem;box-shadow:inset 0 0 0 1px oklch(0.88 0.04 20 / 0.32)")}>
        <div style={css("display:flex;align-items:center;gap:0.45rem;color:var(--accent);margin-bottom:0.5rem")}><Icon name="flag" size={16} /><h3 style={css("margin:0;font-size:var(--text-lg);font-weight:500")}>Review notes</h3></div>
        <p style={css("margin:0;font-size:var(--text-base);color:var(--fg-muted);line-height:1.55")}>This area will collect approval context once real projects and deliverables are added.</p>
      </div>
    </div>
  );
}
