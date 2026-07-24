"use client";

import { useState } from "react";
import { Icon } from "../icons";
import { css } from "../helpers";
import type { PortalActions, PortalState } from "../store";
import { ApprovalOutputCard } from "../components/ApprovalOutputCard";
import { pendingApprovalsForRole, studioReviewQueueItems, type StudioReviewQueueItem } from "../selectors";
import type { PortalApprovalRecord } from "@/lib/portalWorkspacePersistence";

export function Approvals({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const [activeApprovalId, setActiveApprovalId] = useState<string | null>(null);
  if (state.role === "client") {
    const approvals = actions.workspaceForClient(state.clientName).approvals.filter(item => item.sent);
    return (
      <div style={css("display:flex;flex-direction:column;gap:0.85rem") }>
        <section style={css("padding:1.15rem 1.2rem;border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface-alt)") }>
          <div style={css("display:flex;align-items:center;gap:var(--space-2);color:var(--accent)")}><Icon name="flag" size={16} /><span style={css("font-size:var(--text-xs);font-weight:500;text-transform:uppercase;letter-spacing:0.04em")}>Approvals</span></div>
          <h2 style={css("margin:0.35rem 0 0;font-size:var(--text-2xl);font-weight:500")}>Final work ready for you</h2>
          <p style={css("margin:0.4rem 0 0;font-size:var(--text-base);line-height:1.55;color:var(--fg-muted)")}>Audit reports and builder outputs appear here only after the studio shares the finished version.</p>
        </section>
        {approvals.map(approval => <ApprovalOutputCard key={approval.id} approval={approval} />)}
        {approvals.length === 0 && <div style={css("padding:2.4rem 1rem;border:1px dashed var(--border);border-radius:var(--radius-panel);text-align:center;color:var(--fg-faint);font-size:var(--text-base)")}>Nothing is waiting for approval yet.</div>}
      </div>
    );
  }
  const reviewItems = pendingApprovalsForRole(state, actions.workspaceForClient);
  const queueItems = studioReviewQueueItems(state, actions.workspaceForClient);
  const highPriorityCount = queueItems.filter(item => item.priority === "high").length;
  const sorted = [...queueItems].sort((left, right) => (left.priority === "high" ? 0 : 1) - (right.priority === "high" ? 0 : 1));
  const activeApproval = activeApprovalId ? reviewItems.find(approval => approval.id === activeApprovalId) ?? null : null;
  const openItem = (item: StudioReviewQueueItem) => {
    if (item.kind === "output") setActiveApprovalId(item.id.replace("output:", ""));
    else if (item.kind === "payment") actions.openClientDetail(item.clientName);
    else actions.setView(item.target);
  };
  return (
    <div style={css("display:flex;flex-direction:column;gap:.85rem") }>
      <section style={css("padding:1.15rem 1.2rem;border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface)") }>
        <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-4);flex-wrap:wrap") }>
          <div style={css("min-width:0")}>
            <div style={css("display:flex;align-items:center;gap:.4rem;color:var(--accent)")}><Icon name="flag" size={14}/><span style={css("font-size:var(--text-label);font-weight:500;text-transform:uppercase;letter-spacing:.05em")}>Approvals</span></div>
            <h2 style={css("margin:.3rem 0 0;font-size:var(--text-xl);font-weight:500;line-height:1.2")}>What needs your review</h2>
            <p style={css("margin:.3rem 0 0;max-width:44rem;font-size:var(--text-xs);line-height:1.5;color:var(--fg-muted)")}>{queueItems.length === 0
              ? "You’re all caught up — new work will appear here. Nothing sends, publishes, or approves on its own."
              : <><strong style={css("color:var(--fg);font-weight:500")}>{queueItems.length} item{queueItems.length === 1 ? "" : "s"}</strong> need a decision{highPriorityCount ? ` · ${highPriorityCount} high priority` : ""}. Nothing sends, publishes, or approves on its own.</>}</p>
          </div>
          <span style={css("flex-shrink:0;display:inline-flex;align-items:center;gap:.35rem;padding:.28rem .6rem;border-radius:999px;background:var(--surface-alt);border:1px solid var(--border-soft);color:var(--fg-muted);font-size:var(--text-2xs);font-weight:500")}><Icon name="lock" size={11}/>Human review only</span>
        </div>
      </section>
      <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden")}>
        <div style={css("display:flex;align-items:center;justify-content:space-between;gap:.7rem;padding:.9rem 1.1rem;border-bottom:1px solid var(--border-soft)")}><h3 style={css("margin:0;font-size:var(--text-lg);font-weight:500")}>Review queue</h3><span style={css("font-size:var(--text-xs);color:var(--fg-faint)")}>{sorted.length ? "Most urgent first" : ""}</span></div>
        {sorted.map((item, index) => <QueueRow key={item.id} item={item} last={index === sorted.length - 1} onOpen={() => openItem(item)} />)}
        {sorted.length === 0 && <div style={css("padding:2.6rem 1rem;text-align:center;color:var(--fg-faint);font-size:var(--text-xs)")}>You’re all caught up. Nothing needs a decision right now.</div>}
      </div>
      {activeApproval && <OutputReviewModal approval={activeApproval} onClose={() => setActiveApprovalId(null)} onSend={() => { actions.sendApproval(activeApproval.id); setActiveApprovalId(null); }} />}
    </div>
  );
}

const QUEUE_TONE: Record<StudioReviewQueueItem["kind"], { icon: string; color: string; soft: string }> = {
  output: { icon: "file", color: "var(--accent)", soft: "var(--accent-soft)" },
  payment: { icon: "wallet", color: "var(--lane-ai)", soft: "var(--lane-ai-soft)" },
  process: { icon: "layers", color: "var(--warn)", soft: "var(--warn-soft)" },
  task: { icon: "checklist", color: "var(--success)", soft: "var(--success-soft)" },
  escalation: { icon: "alert", color: "var(--danger)", soft: "var(--danger-soft)" },
  inbox: { icon: "inbox", color: "var(--fg-muted)", soft: "var(--surface-alt)" },
};

function QueueRow({ item, onOpen, last }: { item: StudioReviewQueueItem; onOpen: () => void; last?: boolean }) {
  const tone = QUEUE_TONE[item.kind];
  const primary = item.kind === "output";
  return <button type="button" onClick={onOpen} style={css("width:100%;display:flex;align-items:center;gap:.8rem;padding:.85rem 1.1rem;border:0;background:var(--surface);color:var(--fg);font:inherit;text-align:left;cursor:pointer" + (last ? "" : ";border-bottom:1px solid var(--border-soft)"))}>
    <span style={css("width:2.15rem;height:2.15rem;border-radius:.6rem;display:grid;place-items:center;flex-shrink:0;background:" + tone.soft + ";color:" + tone.color)}><Icon name={tone.icon} size={15}/></span>
    <span style={css("flex:1;min-width:0")}>
      <span style={css("display:flex;align-items:center;gap:.45rem;min-width:0;flex-wrap:wrap")}><strong style={css("font-size:var(--text-base);font-weight:500")}>{item.title}</strong><span style={css("flex-shrink:0;padding:.12rem .45rem;border-radius:999px;background:" + tone.soft + ";color:" + tone.color + ";font-size:var(--text-2xs);font-weight:500;white-space:nowrap")}>{item.statusLabel}</span></span>
      <span style={css("display:block;margin-top:.16rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:var(--text-xs);color:var(--fg-muted)")}><strong style={css("color:var(--fg);font-weight:500")}>{item.clientName}</strong> · {item.detail}</span>
    </span>
    <span style={css("flex-shrink:0;display:inline-flex;align-items:center;gap:.35rem;font-size:var(--text-xs);font-weight:500;padding:.42rem .8rem;border-radius:999px;white-space:nowrap;" + (primary ? "background:var(--accent);color:#fff" : "background:var(--surface);color:var(--fg);border:1px solid var(--border)"))}>{primary ? "Review & send" : item.actionLabel}<Icon name="arrowright" size={11}/></span>
  </button>;
}

function OutputReviewModal({ approval, onClose, onSend }: { approval: PortalApprovalRecord; onClose: () => void; onSend: () => void }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(18, 14, 11, 0.28)", zIndex: 120, display: "grid", placeItems: "center", padding: "1rem" }}>
      <div onClick={event => event.stopPropagation()} style={css("width:min(34rem,100%);max-height:88vh;overflow:auto;border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);padding:var(--space-4);display:flex;flex-direction:column;gap:var(--space-3)")}>
        <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3)")}>
          <div style={css("min-width:0")}>
            <div style={css("font-size:var(--text-label);color:var(--fg-faint);text-transform:uppercase;letter-spacing:.05em;font-weight:500")}>Client-safe preview · {approval.clientName}</div>
            <div style={css("margin-top:.15rem;font-size:var(--text-lg);font-weight:500")}>{approval.title}</div>
          </div>
          <button type="button" onClick={onClose} className="pt-iconbtn" style={css("flex-shrink:0;width:1.9rem;height:1.9rem;border-radius:50%;border:1px solid var(--border);background:var(--surface);color:var(--fg-muted);cursor:pointer;display:grid;place-items:center")}><Icon name="x" size={14}/></button>
        </div>
        <ApprovalOutputCard approval={approval} />
        <p style={css("margin:0;display:flex;align-items:flex-start;gap:.4rem;font-size:var(--text-2xs);line-height:1.45;color:var(--fg-faint)")}><Icon name="lock" size={12}/>This exact preview is what the client receives. Prompts, internal notes, memory, and evidence traces are never included.</p>
        <div style={css("display:flex;gap:.55rem;justify-content:flex-end;flex-wrap:wrap")}>
          <button type="button" onClick={onClose} className="pt-softbtn" style={css("height:2.2rem;padding:0 .9rem;border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);font-size:var(--text-xs);font-weight:500;cursor:pointer")}>Cancel</button>
          <button type="button" onClick={onSend} className="pt-op" style={css("height:2.2rem;padding:0 1rem;border:none;border-radius:var(--radius-pill);background:var(--accent);color:#fff;font-size:var(--text-xs);font-weight:500;cursor:pointer")}>Approve &amp; send to client</button>
        </div>
      </div>
    </div>
  );
}
