"use client";

import { Icon } from "../icons";
import { css, statusPill, svcBadge } from "../helpers";
import { ALL_PROJECTS, SVC_META } from "../data";
import type { PortalActions, PortalState } from "../store";

const parseAmt = (a: string) => parseInt(a.replace(/[^0-9]/g, ""), 10) || 0;
const isRecurring = (a: string) => a.includes("/mo");
const fmtK = (n: number) => (n >= 1000 ? "£" + (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : "£" + n);

export function Billing({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const mobile = state.isMobile;

  const rows = ALL_PROJECTS.map(p => {
    const lifecycle = actions.workspaceForClient(p.client).serviceLifecycle;
    const status = lifecycle.paymentState;
    const num = parseAmt(p.amount);
    const ref = lifecycle.paymentConfirmationReference || "";
    const statusMeta = {
      not_started: ["Not requested", "waiting"],
      email_prepared: ["Email prepared", "review"],
      email_sent: ["Email sent", "progress"],
      pending: ["Pending", "waiting"],
      confirmed: ["Confirmed", "done"],
      failed: ["Failed", "blocked"],
      manual_review: ["Manual review", "review"],
    }[status] as [string, string];
    const [stLabel, stKind] = statusMeta;
    return { ...p, status, num, ref, hasRef: !!ref, stLabel, stKind, recurring: isRecurring(p.amount) };
  });

  const mrr = rows.filter(r => r.recurring && r.status === "confirmed").reduce((a, r) => a + r.num, 0);
  const collected = rows.filter(r => r.status === "confirmed").reduce((a, r) => a + r.num, 0);
  const awaitingRows = rows.filter(r => ["email_sent", "pending", "failed", "manual_review"].includes(r.status));
  const awaiting = awaitingRows.reduce((a, r) => a + r.num, 0);
  const refCount = rows.filter(r => r.status === "manual_review").length;

  const stats = [
    { label: "Recurring (IFF)", value: fmtK(mrr) + "/mo", sub: rows.filter(r => r.recurring && r.status === "confirmed").length + " In Full Flight", subColor: "var(--success)" },
    { label: "Awaiting Wise", value: fmtK(awaiting), sub: awaitingRows.length + " transfers pending", subColor: "var(--lane-ai)" },
    { label: "Collected", value: fmtK(collected), sub: rows.filter(r => r.status === "confirmed").length + " confirmed", subColor: "var(--fg-faint)" },
    { label: "Overdue", value: "£0", sub: "None — all on time", subColor: "var(--success)" },
  ];

  const prepareEmail = (client: string) => {
    actions.patch({ invoiceClientName: client });
    actions.setView("invoices");
  };

  return (
    <div style={css("display:flex;flex-direction:column;gap:0.85rem")}>
      <div style={css("display:grid;grid-template-columns:" + (mobile ? "repeat(2,minmax(0,1fr))" : "repeat(auto-fit,minmax(10rem,1fr))") + ";gap:0.55rem")}>
        {stats.map(s => (
          <div key={s.label} style={css("padding:" + (mobile ? "0.78rem" : "0.9rem") + ";border:1px solid transparent;border-radius:var(--radius);background:var(--surface)")}>
            <div style={css("font-size:var(--text-2xs);font-weight:500;color:var(--fg-muted)")}>{s.label}</div>
            <div style={css("font-size:" + (mobile ? "1.12rem" : "1.35rem") + ";font-weight:500;line-height:1.1;margin-top:0.2rem")}>{s.value}</div>
            <div style={css("font-size:var(--text-2xs);margin-top:0.1rem;color:" + s.subColor)}>{s.sub}</div>
          </div>
        ))}
      </div>

      {refCount > 0 && (
        <div style={css("display:flex;align-items:" + (mobile ? "flex-start" : "center") + ";gap:0.6rem;padding:" + (mobile ? "0.72rem 0.82rem" : "0.7rem 1rem") + ";border-radius:var(--radius);background:var(--warn-soft);border:1px solid color-mix(in srgb,var(--warn) 30%,white 70%)")}>
          <span style={{ color: "var(--warn)", display: "flex" }}><Icon name="alert" size={16} /></span>
          <span style={css("font-size:var(--text-base);color:var(--fg);flex:1")}><strong style={{ fontWeight: 500 }}>{refCount} transfer(s) need matching</strong> — a client has submitted a Wise reference. Confirm to reconcile.</span>
        </div>
      )}

      <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden")}>
        <div style={css("padding:0.9rem 1.1rem;border-bottom:1px solid var(--border-soft);display:flex;align-items:center;gap:var(--space-2)")}><span style={{ color: "var(--lane-ai)" }}><Icon name="wallet" size={16} /></span><h3 style={css("margin:0;font-size:var(--text-lg);font-weight:500")}>Wise transfers by client</h3></div>
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: "42rem" }}>
            <div style={css("display:grid;grid-template-columns:1.5fr 0.7fr 1fr 0.7fr 1.3fr;gap:var(--space-3);padding:0.6rem 1.1rem;border-bottom:1px solid var(--border-soft);font-size:var(--text-2xs);letter-spacing:0.02em;color:var(--fg-faint);font-weight:500")}>
              <span>Client</span><span>Service</span><span>Due</span><span style={{ textAlign: "right" }}>Amount</span><span style={{ textAlign: "right" }}>Status</span>
            </div>
            {rows.map(p => (
              <div key={p.id} className="pt-row" style={css("display:grid;grid-template-columns:1.5fr 0.7fr 1fr 0.7fr 1.3fr;gap:var(--space-3);padding:0.7rem 1.1rem;border-bottom:1px solid var(--border-soft);align-items:center")}>
                <div style={css("display:flex;align-items:center;gap:0.6rem;min-width:0")}>
                  <span style={css("width:1.8rem;height:1.8rem;border-radius:var(--radius-sm);background:var(--accent-soft);color:var(--accent);font-weight:500;font-size:var(--text-xs);display:grid;place-items:center;flex-shrink:0")}>{p.client[0]}</span>
                  <div style={{ minWidth: 0 }}><div style={css("font-weight:500;font-size:var(--text-base);overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{p.client}</div>{p.hasRef && <div style={css("font-size:var(--text-2xs);color:var(--fg-faint);overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{p.ref}</div>}</div>
                </div>
                <span style={css(svcBadge(p.service))}>{SVC_META[p.service].short}</span>
                <span style={css("font-size:var(--text-xs);font-weight:500;color:var(--fg-muted)")}>{p.status === "confirmed" ? "—" : "Due " + p.due}</span>
                <span style={css("justify-self:end;font-size:var(--text-base);font-weight:500")}>{p.amount}</span>
                <span style={css("justify-self:end;display:flex;align-items:center;gap:0.4rem")}>
                  <span style={css(statusPill(p.stKind))}>{p.stLabel}</span>
                  {(p.status === "manual_review" || p.status === "failed") && <button onClick={() => actions.openClientDetail(p.client)} className="pt-op" style={css("font-size:var(--text-2xs);font-weight:500;padding:0.2rem 0.55rem;border-radius:var(--radius-pill);border:none;background:var(--fg);color:#fff;cursor:pointer;white-space:nowrap")}>Review</button>}
                  {p.status !== "confirmed" && <button onClick={() => prepareEmail(p.client)} className="pt-iconbtn" style={css("font-size:var(--text-2xs);font-weight:500;padding:0.2rem 0.55rem;border-radius:var(--radius-pill);border:1px solid var(--border);background:var(--surface);color:var(--fg-muted);cursor:pointer;white-space:nowrap")}>Prepare email</button>}
                </span>
              </div>
            ))}
            {rows.length === 0 && <div style={css("padding:2rem 1rem;text-align:center;color:var(--fg-faint);font-size:var(--text-xs)")}>No invoices or Wise transfers yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
