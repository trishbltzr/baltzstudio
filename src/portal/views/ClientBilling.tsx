"use client";

import { useMemo, useState } from "react";
import { css } from "../helpers";
import type { PortalActions, PortalState } from "../store";

const BANNER: Record<string, [string, string, string]> = {
  awaiting_you: ["Awaiting your transfer", "var(--lane-gate)", "var(--lane-gate-soft)"],
  awaiting_studio: ["Awaiting studio confirmation", "var(--lane-ai)", "var(--lane-ai-soft)"],
  confirmed: ["Payment confirmed", "var(--success)", "var(--success-soft)"],
};
const INVOICES = [
  { id: "Wise · Winged in a Week deposit", date: "June 23, 2026", amount: "£1,200", status: "Confirmed" },
  { id: "Wise · Cocoon Consult", date: "June 2, 2026", amount: "£450", status: "Confirmed" },
];

// 21×21 QR-like matrix (deterministic), ported from the prototype qrMatrix().
function qrMatrix(): boolean[] {
  const N = 21; const cells: boolean[] = [];
  const finder = (r: number, c: number): boolean | null => {
    let rr: number, cc: number;
    if (r < 7 && c < 7) { rr = r; cc = c; }
    else if (r < 7 && c >= N - 7) { rr = r; cc = c - (N - 7); }
    else if (r >= N - 7 && c < 7) { rr = r - (N - 7); cc = c; }
    else return null;
    return rr === 0 || rr === 6 || cc === 0 || cc === 6 || (rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4);
  };
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const f = finder(r, c); cells.push(f !== null ? f : (r * 3 + c * 7 + (r * c) % 5) % 3 === 0); }
  return cells;
}

export function ClientBilling({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const [status, setStatus] = useState("awaiting_you");
  const banner = BANNER[status];
  const grid = useMemo(() => qrMatrix(), []);
  const cols = state.isMobile ? "minmax(0,1fr)" : "minmax(0,1.55fr) minmax(0,1fr)";

  return (
    <div style={{ display: "grid", gridTemplateColumns: cols, gap: "0.85rem" }}>
      <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);padding:var(--space-5);display:flex;flex-direction:column")}>
        <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-4)")}>
          <div>
            <div style={css("font-size:var(--text-2xs);letter-spacing:0.02em;color:var(--fg-faint);font-weight:500")}>Amount Due · Winged in a Week</div>
            <div style={css("font-size:var(--text-4xl);font-weight:500;margin-top:0.15rem;line-height:1")}>£2,400</div>
          </div>
          <span style={css("display:inline-flex;align-items:center;gap:0.35rem;font-size:var(--text-xs);font-weight:500;padding:0.28rem 0.6rem;border-radius:999px;background:" + banner[2] + ";color:" + banner[1])}>{banner[0]}</span>
        </div>
        <div style={css("display:flex;gap:1.1rem;margin-top:1.1rem;align-items:center;flex-wrap:wrap")}>
          <div style={css("width:8.5rem;height:8.5rem;background:#fff;border:1px solid var(--border-soft);border-radius:var(--radius);padding:var(--space-2);flex-shrink:0")}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(21,1fr)", width: "100%", height: "100%" }}>
              {grid.map((on, i) => <span key={i} style={{ aspectRatio: "1", background: on ? "var(--fg)" : "transparent" }} />)}
            </div>
          </div>
          <div style={css("flex:1;min-width:11rem;display:flex;flex-direction:column;gap:var(--space-2);font-size:var(--text-base)")}>
            <div style={css("display:flex;justify-content:space-between;gap:var(--space-2)")}><span style={{ color: "var(--fg-muted)" }}>Pay to</span><span style={{ fontWeight: 500 }}>Baltazar Studio Ltd</span></div>
            <div style={css("display:flex;justify-content:space-between;gap:var(--space-2)")}><span style={{ color: "var(--fg-muted)" }}>Wise reference</span><span style={{ fontWeight: 500 }}>FLORA-WIAW-02</span></div>
            <div style={css("display:flex;justify-content:space-between;gap:var(--space-2)")}><span style={{ color: "var(--fg-muted)" }}>Currency</span><span style={{ fontWeight: 500 }}>GBP (£)</span></div>
            <p style={css("margin:0.2rem 0 0;font-size:0.74rem;color:var(--fg-faint);line-height:1.45")}>Scan the QR in your Wise app, or send to the details above using the reference.</p>
          </div>
        </div>
        {status === "awaiting_you" ? (
          <button onClick={() => { setStatus("awaiting_studio"); actions.showToast("Thanks — we'll confirm your transfer shortly"); }} className="pt-op" style={css("margin-top:1rem;width:100%;height:2.4rem;border-radius:var(--radius-pill);border:none;background:var(--accent);color:#fff;font-weight:500;font-size:0.85rem;cursor:pointer")}>I&apos;ve sent the transfer</button>
        ) : (
          <div style={css("margin-top:1rem;padding:0.7rem;border-radius:var(--radius);background:var(--surface-alt);font-size:0.8rem;color:var(--fg-muted);text-align:center")}>{banner[0]} — thank you.</div>
        )}
      </div>

      <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden")}>
        <div style={css("padding:0.9rem 1.1rem;border-bottom:1px solid var(--border-soft)")}><h3 style={css("margin:0;font-size:var(--text-lg);font-weight:500")}>Payment history</h3></div>
        <div style={css("display:grid;grid-template-columns:1fr auto 6rem;gap:var(--space-3);align-items:center;padding:0.6rem 1.1rem;border-bottom:1px solid var(--border-soft);font-size:0.64rem;letter-spacing:0.02em;color:var(--fg-faint);font-weight:500")}>
          <span>Invoice</span><span style={{ textAlign: "right" }}>Amount</span><span style={{ textAlign: "right" }}>Status</span>
        </div>
        {INVOICES.map(i => (
          <div key={i.id} style={css("display:grid;grid-template-columns:1fr auto 6rem;gap:var(--space-3);align-items:center;padding:0.8rem 1.1rem;border-bottom:1px solid var(--border-soft)")}>
            <div style={{ minWidth: 0 }}><div style={css("font-weight:500;font-size:var(--text-base)")}>{i.id}</div><div style={css("font-size:var(--text-xs);color:var(--fg-muted)")}>{i.date}</div></div>
            <span style={css("font-size:0.85rem;font-weight:500;text-align:right")}>{i.amount}</span>
            <span style={css("justify-self:end;display:inline-flex;align-items:center;font-size:0.68rem;font-weight:500;padding:0.14rem 0.5rem;border-radius:999px;background:var(--success-soft);color:var(--success)")}>{i.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
