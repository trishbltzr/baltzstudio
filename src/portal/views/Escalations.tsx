"use client";

import { Icon } from "../icons";
import { css } from "../helpers";
import type { PortalActions, PortalState } from "../store";

const ESC_KIND: Record<string, string> = {
  danger: "background:var(--danger-soft);color:var(--danger)",
  gate: "background:var(--lane-gate-soft);color:var(--lane-gate)",
  accent: "background:var(--accent-soft);color:var(--accent)",
};

export function Escalations({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const all = state.escalations;
  const open = all.filter(e => !e.resolved);
  const done = all.filter(e => e.resolved);
  const clientLine = (e: typeof all[number]) => e.client + (e.by && e.by !== e.client ? " · " + e.by : "");
  const reopen = (id: string) => { actions.update(s => ({ escalations: s.escalations.map(e => e.id === id ? { ...e, resolved: false } : e) })); actions.showToast("Escalation reopened"); };

  return (
    <div style={css("display:flex;flex-direction:column;gap:0.85rem")}>
      <div style={css("display:flex;align-items:center;gap:0.6rem;padding:0.85rem 1.1rem;border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:oklch(0.985 0.012 22);box-shadow:inset 0 0 0 1px oklch(0.88 0.04 20 / 0.25)")}>
        <span style={{ color: "var(--accent)", display: "flex" }}><Icon name="alert" size={16} /></span>
        <div style={{ flex: 1, minWidth: 0 }}><div style={css("font-weight:500;font-size:0.9rem")}>You&apos;re the final tier</div><div style={css("font-size:0.78rem;color:var(--fg-muted)")}>Development escalates plan, billing, access and out-of-scope calls to you. Nothing routes higher.</div></div>
        <span style={css("font-size:var(--text-xs);font-weight:500;padding:0.25rem 0.6rem;border-radius:999px;background:var(--accent-soft);color:var(--accent);flex-shrink:0")}>{open.length} open</span>
      </div>

      <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface-alt);padding:0.9rem;display:flex;flex-direction:column;gap:0.6rem")}>
        <div style={css("font-size:var(--text-2xs);font-weight:500;letter-spacing:0.02em;color:var(--fg-faint);padding:0.1rem 0.3rem")}>Open Decisions</div>
        {open.length === 0 && <div style={css("padding:2.5rem 1rem;text-align:center;border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);color:var(--fg-faint);font-size:0.85rem")}>Nothing needs your decision right now.</div>}
        <div style={css("display:grid;grid-template-columns:repeat(auto-fill,minmax(17rem,1fr));gap:0.6rem")}>
          {open.map(e => (
            <div key={e.id} style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);padding:1.05rem 1.15rem")}>
              <div style={css("display:flex;align-items:center;gap:var(--space-2);margin-bottom:0.45rem")}>
                <span style={css("font-size:0.62rem;font-weight:500;letter-spacing:0.02em;padding:0.1rem 0.42rem;border-radius:5px;" + (ESC_KIND[e.kind] || ESC_KIND.accent))}>{e.level}</span>
                <span style={css("font-size:var(--text-xs);color:var(--fg-faint)")}>{clientLine(e)}</span>
                <span style={{ flex: 1 }} />
                <span style={css("font-size:var(--text-xs);color:var(--fg-faint);flex-shrink:0")}>{e.time}</span>
              </div>
              <div style={css("font-weight:500;font-size:var(--text-lg);line-height:1.3")}>{e.title}</div>
              <p style={css("margin:0.3rem 0 0.9rem;font-size:var(--text-base);color:var(--fg-muted);line-height:1.5")}>{e.reason}</p>
              <button onClick={() => actions.resolveEscalation(e.id)} className="pt-op" style={css("display:inline-flex;align-items:center;gap:0.35rem;height:2rem;padding:0 0.95rem;border-radius:var(--radius-pill);border:none;background:var(--accent);color:#fff;font-weight:500;font-size:0.78rem;cursor:pointer")}><Icon name="checkmark" size={15} /> Resolve</button>
            </div>
          ))}
        </div>
      </div>

      {done.length > 0 && (
        <>
          <div style={css("font-size:0.62rem;letter-spacing:0.02em;color:var(--fg-faint);font-weight:500;padding:0.5rem 0.15rem 0.1rem")}>Resolved</div>
          {done.map(e => (
            <div key={e.id} style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface-alt);padding:0.8rem 1.15rem;display:flex;align-items:center;gap:0.6rem")}>
              <span style={css("width:1.3rem;height:1.3rem;border-radius:50%;background:var(--success);color:#fff;display:grid;place-items:center;flex-shrink:0")}><Icon name="checkmark" size={13} /></span>
              <div style={{ flex: 1, minWidth: 0 }}><div style={css("font-size:0.85rem;color:var(--fg-muted);text-decoration:line-through")}>{e.title}</div><div style={css("font-size:var(--text-xs);color:var(--fg-faint)")}>{clientLine(e)}</div></div>
              <button onClick={() => reopen(e.id)} className="pt-iconbtn" style={css("font-size:0.74rem;font-weight:500;color:var(--fg-muted);background:transparent;border:1px solid var(--border);border-radius:var(--radius-pill);padding:0.3rem 0.75rem;cursor:pointer;flex-shrink:0")}>Reopen</button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
