"use client";

import { Icon } from "../icons";
import { css } from "../helpers";
import type { PortalActions, PortalState } from "../store";

export interface DDOption { label: string; active: boolean; onClick: () => void }

// Compact dropdown filter (e.g. "Service · WIAW", "Owner · Studio"), ported from
// the prototype's _mkDD helper.
export function FilterDropdown({ id, label, valueLabel, options, state, actions, icon }: {
  id: string; label: string; valueLabel: string; options: DDOption[]; state: PortalState; actions: PortalActions; icon?: string;
}) {
  const open = state.pop === id;
  const btn = "display:inline-flex;align-items:center;gap:0.35rem;height:2.1rem;padding:0 0.6rem 0 0.85rem;border:1px solid " + (open ? "var(--accent-dim)" : "var(--border)") + ";border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);font-size:var(--text-xs);font-weight:500;cursor:pointer;white-space:nowrap";
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => actions.togglePop(id)} style={css(btn)}>
        {icon && <Icon name={icon} size={14} />}
        {label} · <strong style={css("color:var(--fg);font-weight:500")}>{valueLabel}</strong><Icon name="chev" size={15} />
      </button>
      {open && (
        <>
          <div onClick={() => actions.closePop()} style={{ position: "fixed", inset: 0, zIndex: 54 }} />
          <div style={{ ...css("position:absolute;top:2.55rem;left:0;min-width:11.5rem;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);z-index:55;padding:0.3rem"), animation: "pt-ddin .15s ease" }}>
            {options.map(o => (
              <button key={o.label} onClick={() => { actions.closePop(); o.onClick(); }} style={css("display:flex;align-items:center;justify-content:space-between;gap:0.9rem;width:100%;text-align:left;padding:0.5rem 0.7rem;border:none;border-radius:calc(var(--radius) - 3px);background:" + (o.active ? "var(--accent-soft)" : "transparent") + ";color:" + (o.active ? "var(--accent)" : "var(--fg)") + ";font-size:var(--text-xs);font-weight:500;cursor:pointer")}>
                {o.label}{o.active && <span style={{ display: "flex" }}><Icon name="checkmark" size={13} /></span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
