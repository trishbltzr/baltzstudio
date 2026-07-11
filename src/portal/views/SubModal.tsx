"use client";

import { Icon } from "../icons";
import { css } from "../helpers";
import { FUNNEL } from "../data";
import type { PortalActions, PortalState } from "../store";
import type { Owner } from "../types";

function ownerTag(o: Owner) {
  const m: Record<string, [string, string, string, string]> = {
    studio: ["Studio", "replay", "var(--lane-studio)", "var(--lane-studio-soft)"],
    client: ["Client", "msg", "var(--fg-muted)", "oklch(0.95 0.004 50)"],
    ai: ["Assistant", "layers", "var(--lane-ai)", "var(--lane-ai-soft)"],
  };
  const t = m[o] || m.studio;
  return { label: t[0], icon: t[1], style: css("display:inline-flex;align-items:center;gap:0.3rem;font-size:var(--text-xs);font-weight:500;padding:0.28rem 0.6rem;border-radius:999px;flex-shrink:0;background:" + t[3] + ";color:color-mix(in srgb," + t[2] + " 62%,black 38%)") };
}
function radioFor(state: string): string {
  if (state === "done") return "width:1.15rem;height:1.15rem;border-radius:50%;flex-shrink:0;display:grid;place-items:center;background:var(--success);color:#fff;border:none";
  if (state === "progress") return "width:1.15rem;height:1.15rem;border-radius:50%;flex-shrink:0;box-sizing:border-box;border:1.6px dotted var(--accent);background:transparent";
  return "width:1.15rem;height:1.15rem;border-radius:50%;flex-shrink:0;box-sizing:border-box;border:1.6px solid var(--border);background:transparent";
}

export function SubModal({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const flat = FUNNEL.flatMap((p, pi) => p.subs.map(s => ({ ...s, phaseLabel: "M" + (pi + 1) + " · " + p.title })));
  const smd = flat.find(s => s.id === state.subModal);
  if (!smd) return null;
  const statusLabel = smd.status === "active" ? "In Progress" : smd.status === "soon" ? "Not Started" : "Locked";
  const statusColor = smd.status === "active" ? "var(--accent)" : "var(--fg-muted)";
  const statusBg = smd.status === "active" ? "var(--accent-soft)" : "oklch(0.95 0.004 50)";
  const close = () => actions.patch({ subModal: null });

  return (
    <div onClick={close} style={{ ...css("position:fixed;inset:0;background:rgba(30,22,15,.42);z-index:95;display:flex;align-items:center;justify-content:center;padding:var(--space-6)"), animation: "pt-fadein .15s ease" }}>
      <div onClick={e => e.stopPropagation()} style={{ ...css("width:32.5rem;max-width:100%;max-height:88vh;overflow-y:auto;background:var(--surface);border-radius:var(--radius-panel)"), animation: "pt-ddin .18s ease" }}>
        <div style={css("padding:0.9rem 1.5rem 0;display:flex;align-items:center;justify-content:space-between")}>
          <button onClick={close} className="pt-menuitem" style={css("width:1.9rem;height:1.9rem;border-radius:50%;border:none;background:transparent;display:grid;place-items:center;cursor:pointer;color:var(--fg-muted)")}><Icon name="x" size={15} /></button>
          <div style={css("display:flex;align-items:center;gap:0.45rem")}>
            <span style={css("width:0.7rem;height:0.7rem;border-radius:50%;box-sizing:border-box;border:1.4px dotted var(--accent)")} />
            {[0, 1, 2, 3].map(i => <span key={i} style={css("width:0.45rem;height:0.45rem;border-radius:50%;background:oklch(0.9 0.006 50)")} />)}
            <span style={css("width:1.75rem;height:1.75rem;border-radius:50%;border:1px solid var(--border);display:grid;place-items:center;color:var(--fg-muted);margin-left:0.35rem")}><Icon name="edit" size={14} /></span>
          </div>
        </div>
        <div style={css("padding:0.5rem 1.5rem 0.35rem")}>
          <div style={css("font-size:var(--text-xs);color:var(--fg-muted);margin-bottom:0.3rem")}>{smd.phaseLabel} · {smd.code}</div>
          <div style={css("display:flex;align-items:center;justify-content:space-between;gap:var(--space-4)")}>
            <h2 style={css("margin:0;font-size:var(--text-xl);font-weight:500;line-height:1.3")}>{smd.title}</h2>
            <span style={css("font-size:var(--text-sm);font-weight:500;padding:0.15rem 0.6rem;border-radius:999px;flex-shrink:0;background:" + statusBg + ";color:" + statusColor)}>{smd.pct}%</span>
          </div>
        </div>
        <div style={css("padding:0.25rem 1.5rem 0")}>
          <div style={css("display:flex;align-items:center;padding:0.7rem 0;border-bottom:1px solid var(--border-soft)")}>
            <span style={css("width:36%;min-width:36%;font-size:var(--text-base);color:var(--fg-muted)")}>Status</span>
            <div style={css("flex:1;display:flex;align-items:center;gap:var(--space-4)")}>
              <span style={css("display:inline-flex;align-items:center;gap:0.4rem;font-weight:500;font-size:var(--text-sm);padding:0.25rem 0.65rem;border-radius:999px;background:" + statusBg + ";color:" + statusColor)}><Icon name="replay" size={12} />{statusLabel}</span>
              <span style={css("display:inline-flex;align-items:center;gap:0.35rem;color:var(--fg-muted);font-size:var(--text-base)")}><Icon name="cal" size={12} />No deadline</span>
            </div>
          </div>
          <div style={css("display:flex;align-items:center;padding:0.7rem 0;border-bottom:1px solid var(--border-soft)")}><span style={css("width:36%;min-width:36%;font-size:var(--text-base);color:var(--fg-muted)")}>Assignee</span><span style={css("flex:1;display:inline-flex;align-items:center;gap:0.4rem;color:var(--fg-muted);font-size:var(--text-base)")}><Icon name="user" size={13} />Unassigned</span></div>
          <div style={css("display:flex;align-items:center;padding:0.7rem 0;border-bottom:1px solid var(--border-soft)")}><span style={css("width:36%;min-width:36%;font-size:var(--text-base);color:var(--fg-muted)")}>Deadline</span><span style={css("flex:1;color:var(--fg-muted);font-size:var(--text-base)")}>Not set</span></div>
          <div style={css("display:flex;align-items:flex-start;padding:0.7rem 0")}><span style={css("width:36%;min-width:36%;font-size:var(--text-base);color:var(--fg-muted)")}>Description</span><span style={css("flex:1;color:var(--fg-faint);font-size:var(--text-base)")}>—</span></div>
        </div>
        <div style={css("border-top:1px solid var(--border-soft);padding:0.75rem 1.5rem")}>
          <div style={css("display:flex;align-items:center;justify-content:space-between;margin-bottom:0.6rem")}><div style={css("display:inline-flex;align-items:center;gap:0.4rem;font-weight:500;font-size:var(--text-base)")}><Icon name="chev" size={14} />Tasks</div><span style={css("font-size:var(--text-xs);color:var(--fg-muted)")}>{smd.done}/{smd.total}</span></div>
          <div style={css("display:flex;flex-direction:column;gap:0.1rem")}>
            {smd.tasks.map((t, i) => {
              const ot = ownerTag(t.owner);
              return (
                <div key={i} className="pt-row" style={css("display:flex;align-items:center;gap:0.65rem;padding:0.55rem 0.6rem;border-radius:var(--radius);background:" + (t.state === "progress" ? "oklch(0.985 0.012 22)" : "transparent"))}>
                  <button onClick={() => actions.showToast(t.state === "done" ? "Reopened: " + t.t : "Marked done: " + t.t)} style={{ ...css(radioFor(t.state)), background: "transparent", padding: 0, cursor: "pointer" }}>{t.state === "done" && <Icon name="checkmark" size={9} />}</button>
                  <span style={css("flex:1;min-width:0;font-size:var(--text-base)")}>{t.t}</span>
                  <span style={ot.style}><Icon name={ot.icon} size={11} />{ot.label}</span>
                </div>
              );
            })}
            {smd.completed > 0 && (
              <div className="pt-row" style={css("display:flex;align-items:center;gap:0.65rem;padding:0.55rem 0.6rem;border-radius:var(--radius);background:oklch(0.965 0.03 155 / 0.4);cursor:pointer")}>
                <span style={css("width:1.05rem;height:1.05rem;border-radius:50%;background:var(--success);color:#fff;display:grid;place-items:center;flex-shrink:0")}><Icon name="checkmark" size={11} /></span>
                <span style={css("flex:1;font-size:var(--text-base);color:var(--fg)")}>{smd.completed} completed check</span>
                <span style={{ color: "var(--fg-faint)" }}><Icon name="arrow" size={13} /></span>
              </div>
            )}
          </div>
        </div>
        <div style={css("border-top:1px solid var(--border-soft);padding:0.75rem 1.5rem;display:flex;align-items:center;justify-content:space-between")}><div style={css("display:inline-flex;align-items:center;gap:0.4rem;font-weight:500;font-size:var(--text-base)")}><Icon name="chev" size={14} />Attachments</div><button onClick={() => actions.showToast("Add an attachment")} className="pt-iconbtn" style={css("width:1.75rem;height:1.75rem;border-radius:50%;border:1px solid var(--border);background:var(--surface);display:grid;place-items:center;cursor:pointer;color:var(--fg-muted)")}><Icon name="plus" size={13} /></button></div>
      </div>
    </div>
  );
}
