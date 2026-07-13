"use client";

import { useState } from "react";
import { Icon } from "../icons";
import { css } from "../helpers";
import { MOBILE_PRIMARY_VIEWS, navItemMeta, quickActionsForRole, runQuickAction } from "../navigation";
import { inboxUnread } from "../selectors";
import type { PortalActions, PortalState } from "../store";
import type { View } from "../types";

// Five equal slots: two nav items, a centered action, then two nav items.
export function MobileTabBar({ state, actions, onLogout: _onLogout }: { state: PortalState; actions: PortalActions; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const role = state.role;
  const unread = inboxUnread(state);
  const badgeFor = (id: View): number | null => {
    if ((role === "admin" || role === "dev") && id === "inbox") return unread || null;
    if (role === "dev" && id === "review") return 2;
    return null;
  };
  const go = (v: View) => { setOpen(false); actions.setView(v); };

  const primaryLeft = MOBILE_PRIMARY_VIEWS[role].slice(0, 2);
  const primaryRight = MOBILE_PRIMARY_VIEWS[role].slice(2);
  const trayItems = quickActionsForRole(role).slice(0, 5);
  const navItem = (id: View) => {
    const item = navItemMeta(id); const active = state.view === id; const badge = badgeFor(id);
    return (
      <button key={id} onClick={() => go(id)} aria-current={active ? "page" : undefined} aria-label={item.label} title={item.label}
        style={css("position:relative;flex:1;display:flex;align-items:center;justify-content:center;min-width:0;height:2.75rem;border:0;border-radius:999px;background:transparent;cursor:pointer;color:" + (active ? "var(--fg)" : "var(--fg-faint)") + ";transition:color .18s ease,transform .16s ease")}>
        <span style={css("width:calc(100% - 0.32rem);height:2.32rem;border-radius:999px;display:flex;align-items:center;justify-content:center;background:" + (active ? "color-mix(in srgb,var(--accent-soft) 62%,white 38%)" : "transparent") + ";transition:background .18s ease")}>
          <span style={css("position:relative;display:grid;place-items:center;width:1.45rem;height:1.45rem;flex-shrink:0")}>
            <Icon name={item.icon} size={21} />
            {badge != null && <span style={css("position:absolute;top:-0.52rem;right:-0.72rem;min-width:1rem;height:1rem;padding:0 0.25rem;border-radius:999px;background:var(--accent);color:#fff;font-size:0.56rem;font-weight:500;display:grid;place-items:center;box-shadow:0 0 0 2px var(--surface)")}>{badge > 9 ? "9+" : badge}</span>}
          </span>
        </span>
      </button>
    );
  };

  return (
    <>
      {open && (
        <div onClick={() => setOpen(false)} style={{ ...css("position:fixed;inset:0;background:rgba(34,25,18,.12);z-index:58"), animation: "pt-fadein .15s ease" }} />
      )}

      {open && (
        <div style={{ ...css("position:fixed;left:50%;bottom:calc(4.85rem + env(safe-area-inset-bottom));z-index:61;transform:translateX(-50%);width:min(19.2rem,calc(100vw - 2.4rem));border:1px solid color-mix(in srgb,var(--border-soft) 80%,white 20%);border-radius:1.35rem;background:color-mix(in srgb,white 95%,var(--surface) 5%);padding:0.64rem 0.62rem;display:flex;flex-direction:column;gap:0.04rem;backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px)"), animation: "pt-actionbubble .2s cubic-bezier(.2,.8,.2,1)" }}>
          {trayItems.map(q => (
            <button key={q.label} onClick={() => { setOpen(false); runQuickAction(q, state, actions); }} className="pt-menuitem" style={css("position:relative;min-width:0;border:0;border-radius:0.9rem;background:transparent;color:var(--fg-muted);padding:0.48rem 0.54rem;display:grid;grid-template-columns:1.9rem minmax(0,1fr) auto;align-items:center;gap:0.58rem;cursor:pointer;text-align:left;transition:background .16s ease,color .16s ease")}>
              <span style={css("width:1.62rem;height:1.62rem;border-radius:0.48rem;color:var(--fg-muted);display:grid;place-items:center")}>
                <Icon name={q.icon} size={18} />
              </span>
              <span style={css("display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:0.9rem;font-weight:450;color:var(--fg-muted)")}>{q.label}</span>
              <span style={css("width:1.46rem;height:1.46rem;border-radius:50%;display:grid;place-items:center;color:var(--fg-faint);background:color-mix(in srgb,white 74%,var(--surface-alt) 26%)")}>
                <Icon name="arrow" size={12} />
              </span>
            </button>
          ))}
          <span style={css("position:absolute;left:50%;bottom:-0.56rem;width:1.1rem;height:1.1rem;transform:translateX(-50%) rotate(45deg);background:color-mix(in srgb,white 95%,var(--surface) 5%);border-right:1px solid color-mix(in srgb,var(--border-soft) 80%,white 20%);border-bottom:1px solid color-mix(in srgb,var(--border-soft) 80%,white 20%);border-bottom-right-radius:0.18rem")} />
        </div>
      )}

      <nav aria-label="Primary navigation"
        style={css("position:fixed;left:50%;bottom:calc(0.7rem + env(safe-area-inset-bottom));z-index:62;transform:translateX(-50%);display:grid;grid-template-columns:repeat(5,minmax(0,1fr));align-items:center;gap:0;width:min(22.35rem,calc(100vw - 1rem));height:3.18rem;padding:0.16rem 0.18rem;border:1px solid color-mix(in srgb,var(--border-soft) 82%,white 18%);border-radius:999px;background:color-mix(in srgb,white 97%,var(--surface) 3%);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)")}>
        {primaryLeft.map(navItem)}
        <button onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label="Quick actions"
          style={css("position:relative;display:flex;align-items:center;justify-content:center;min-width:0;height:2.75rem;border:0;border-radius:999px;background:transparent;color:var(--fg);cursor:pointer;transition:color .18s ease")}>
          <span style={css("display:grid;place-items:center;width:calc(100% - 0.32rem);height:2.35rem;border-radius:999px;background:transparent;transition:background .18s ease")}>
            <span style={css("display:grid;place-items:center;transition:transform .18s ease;transform:rotate(" + (open ? "45deg" : "0deg") + ")")}>
              <Icon name="plus" size={22} />
            </span>
          </span>
        </button>
        {primaryRight.map(navItem)}
      </nav>

    </>
  );
}
