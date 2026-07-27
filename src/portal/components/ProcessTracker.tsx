"use client";

import { useRef } from "react";
import { css } from "../helpers";
import { Icon } from "../icons";
import { processTrackerItems } from "../selectors";
import type { PortalActions, PortalState } from "../store";
import { usePortalStudioClients } from "../usePortalStudioClients";

const STATUS_TONE: Record<string, { color: string; background: string; icon: string }> = {
  Blocked: { color: "var(--danger)", background: "var(--danger-soft)", icon: "alert" },
  "Approval needed": { color: "var(--warn)", background: "var(--warn-soft)", icon: "alert" },
  "In progress": { color: "var(--accent)", background: "var(--accent-soft)", icon: "layers" },
  "Not started": { color: "var(--fg-muted)", background: "var(--surface-alt)", icon: "layers" },
  Complete: { color: "var(--success)", background: "var(--success-soft)", icon: "check" },
};

export function ProcessTracker({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const { clients } = usePortalStudioClients();
  const visibleClientIds = new Set((state.role === "client" ? clients.filter(client => client.name === state.clientName) : clients).map(client => client.id));
  const items = processTrackerItems(state)
    .filter(item => visibleClientIds.has(item.clientId))
    .slice(0, state.role === "client" ? 4 : 6);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (direction: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const first = el.firstElementChild as HTMLElement | null;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const step = (first?.offsetWidth || el.clientWidth) + gap;
    if (step <= 0) return;
    const max = el.scrollWidth - el.clientWidth;
    const lastRest = Math.floor((max + 1) / step) * step; // furthest exact card multiple
    const current = Math.round(el.scrollLeft / step);
    // Only ever rest on exact card multiples so a card is always flush to the
    // left inset (no bleed), and loop around at either end.
    const target = direction > 0
      ? ((current + 1) * step > max + 1 ? 0 : (current + 1) * step)
      : (current <= 0 ? lastRest : (current - 1) * step);
    el.scrollTo({ left: target, behavior: "smooth" });
  };

  return (
    <section className="pt-panel" style={css("overflow:hidden") }>
      <header style={css("padding:0.9rem 1rem;border-bottom:1px solid var(--border-soft);display:flex;align-items:center;justify-content:space-between;gap:0.8rem") }>
        <div style={css("min-width:0") }>
          <h3 style={css("margin:0;font-size:var(--text-lg);font-weight:500")}>Process tracker</h3>
          <p style={css("margin:0.18rem 0 0;font-size:var(--text-xs);color:var(--fg-muted)")}>Current stage, next owner, blockers, and what happens next.</p>
        </div>
        <div style={css("display:flex;align-items:center;gap:0.6rem;flex-shrink:0") }>
          <span style={css("font-size:var(--text-xs);color:var(--fg-faint);white-space:nowrap")}>{items.length} process{items.length === 1 ? "" : "es"}</span>
          {items.length > 1 && <div style={css("display:flex;align-items:center;gap:0.4rem") }>
            <button type="button" aria-label="Previous processes" onClick={() => scroll(-1)} className="pt-iconbtn" style={css("width:2.15rem;height:2.15rem;border-radius:50%;border:1px solid var(--border);background:var(--surface-alt);color:var(--fg-muted);display:grid;place-items:center;cursor:pointer")}><Icon name="chevleft" size={16} /></button>
            <button type="button" aria-label="Next processes" onClick={() => scroll(1)} className="pt-iconbtn" style={css("width:2.15rem;height:2.15rem;border-radius:50%;border:1px solid var(--border);background:var(--surface-alt);color:var(--fg-muted);display:grid;place-items:center;cursor:pointer")}><Icon name="chevright" size={16} /></button>
          </div>}
        </div>
      </header>
      {!items.length && (
        <div style={css("padding:1.2rem 1.05rem;color:var(--fg-muted);font-size:var(--text-sm)")}>
          No active processes in your assigned clients.
        </div>
      )}
      {!!items.length && (
      <div ref={scrollRef} className="pt-suggest-row" style={css("display:flex;gap:var(--space-4);overflow-x:auto;scroll-snap-type:x mandatory;scroll-padding:0 1rem;padding:var(--space-4)")}>
        {items.map(item => {
          const tone = STATUS_TONE[item.statusLabel] || STATUS_TONE["Not started"];
          const isComplete = item.statusLabel === "Complete";
          const progressWidth = Math.max(item.progress, item.statusLabel === "Not started" ? 0 : 3);
          const eyebrow = isComplete ? "Delivered" : `Next · ${item.ownerLabel}`;
          return (
            <button
              key={`${item.clientId}-${item.id}`}
              type="button"
              onClick={() => actions.setView(item.target)}
              className="pt-card-soft"
              style={css("font-family:inherit;text-align:left;border:1px solid var(--border-soft);border-radius:0.9rem;background:var(--surface);padding:1rem 1.05rem;cursor:pointer;display:flex;flex-direction:column;gap:0.85rem;flex-shrink:0;width:18.5rem;scroll-snap-align:start")}
            >
              <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:0.6rem;width:100%") }>
                <div style={css("min-width:0;display:flex;align-items:center;gap:0.65rem") }>
                  <span style={css("width:2.15rem;height:2.15rem;border-radius:0.6rem;display:grid;place-items:center;flex-shrink:0;background:var(--surface-alt);color:var(--fg-muted)")}><Icon name={tone.icon} size={15} /></span>
                  <div style={css("min-width:0") }>
                    <div style={css("font-size:var(--text-base);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{item.processName}</div>
                    <div style={css("margin-top:0.1rem;font-size:var(--text-2xs);color:var(--fg-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{state.role === "client" ? item.stageLabel : `${item.clientName} · ${item.stageLabel}`}</div>
                  </div>
                </div>
                <span style={css("flex-shrink:0;display:inline-flex;align-items:center;gap:0.3rem;border-radius:999px;padding:0.22rem 0.55rem;font-size:var(--text-2xs);font-weight:500;background:" + tone.background + ";color:" + tone.color)}><span style={css("width:0.4rem;height:0.4rem;border-radius:50%;background:" + tone.color)} />{item.statusLabel}</span>
              </div>

              <div style={css("width:100%;height:0.3rem;border-radius:999px;background:color-mix(in srgb," + tone.color + " 12%,var(--surface-alt) 88%);overflow:hidden") }>
                <div style={css("height:100%;width:" + progressWidth + "%;border-radius:999px;background:" + tone.color)} />
              </div>

              <div style={css("display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:.55rem;width:100%") }>
                <StageSummary label="Current" value={item.stageLabel} />
                <StageSummary label="Next" value={item.nextStageLabel} />
              </div>

              <div style={css("border-top:1px solid var(--border-soft);padding-top:0.75rem;display:flex;flex-direction:column;gap:0.3rem") }>
                <div style={css("display:flex;align-items:baseline;justify-content:space-between;gap:var(--space-2)") }>
                  <span style={css("min-width:0;font-size:var(--text-label);text-transform:uppercase;letter-spacing:0.055em;color:var(--fg-faint);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{eyebrow}</span>
                  <span style={css("flex-shrink:0;font-size:var(--text-2xs);color:var(--fg-faint);white-space:nowrap")}>{item.dueLabel}</span>
                </div>
                <div style={css("font-size:var(--text-xs);line-height:1.4;color:var(--fg);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden")}>{item.nextAction}</div>
                {item.blocker && <span title={item.blockerDetail || item.blocker} aria-label={item.blockerDetail || item.blocker} style={css("display:inline-flex;align-items:center;gap:0.3rem;max-width:100%;margin-top:0.1rem;border-radius:999px;padding:0.16rem 0.5rem;background:var(--warn-soft);color:var(--warn);font-size:var(--text-2xs);font-weight:500;align-self:flex-start;white-space:nowrap;overflow:hidden;text-overflow:ellipsis") }><Icon name="alert" size={10} />{item.blocker}</span>}
              </div>
            </button>
          );
        })}
      </div>
      )}
    </section>
  );
}

function StageSummary({ label, value }: { label: string; value: string }) {
  return (
    <span style={css("min-width:0;padding:.48rem .55rem;border:1px solid var(--border-soft);border-radius:.62rem;background:var(--surface-alt)") }>
      <span style={css("display:block;font-size:var(--text-label);font-weight:500;letter-spacing:.055em;text-transform:uppercase;color:var(--fg-faint)")}>{label}</span>
      <strong style={css("display:block;margin-top:.14rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:var(--text-2xs);font-weight:500;color:var(--fg)")} title={value}>{value}</strong>
    </span>
  );
}
