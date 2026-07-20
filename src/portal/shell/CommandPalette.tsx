"use client";

import { useEffect, useRef } from "react";
import { Icon } from "../icons";
import { css } from "../helpers";
import { quickActionsForState, runQuickAction } from "../navigation";
import { roleProjects, roleTasks } from "../selectors";
import type { PortalActions, PortalState } from "../store";

interface PalItem { cat: string; label: string; sub: string; icon: string; tint: string; color: string; run: () => void }
interface PaletteAction { label: string; sub: string; icon: string; run: () => void }

export function CommandPalette({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const q = (state.paletteQuery || "").toLowerCase();
  const match = (...parts: string[]) => !q || parts.some(p => (p || "").toLowerCase().includes(q));
  const run = (fn: () => void) => { actions.patch({ paletteOpen: false, paletteQuery: "" }); fn(); };

  useEffect(() => { const t = setTimeout(() => inputRef.current?.focus(), 20); return () => clearTimeout(t); }, []);

  const role = state.role;
  const actionsSrc: PaletteAction[] = [
    ...quickActionsForState(state).map(action => ({ label: action.label, sub: action.sub, icon: action.icon, run: () => runQuickAction(action, state, actions) })),
    ...(role === "admin" ? [{ label: "Settings", sub: "Studio preferences", icon: "sliders", run: () => actions.setView("settings") }] : []),
    { label: "Profile", sub: "Your account", icon: "user", run: () => actions.setView("profile") },
  ];

  const items: PalItem[] = [];
  actionsSrc.filter(a => match(a.label, a.sub)).forEach(a => items.push({ cat: "Actions", label: a.label, sub: a.sub, icon: a.icon, tint: "var(--surface-alt)", color: "var(--fg-muted)", run: () => run(a.run) }));
  if (role !== "client") roleProjects(state).filter(p => match(p.client, p.stage)).slice(0, 6).forEach(p => items.push({ cat: "Clients", label: p.client, sub: p.stage, icon: "briefcase", tint: "var(--accent-soft)", color: "var(--accent)", run: () => run(() => actions.openClientDetail(p.client)) }));
  roleTasks(state).filter(t => match(t.title, t.project)).slice(0, 6).forEach(t => items.push({ cat: "To-do's", label: t.title, sub: t.project, icon: "checklist", tint: "var(--surface-alt)", color: "var(--fg-muted)", run: () => run(() => actions.patch({ view: "tasks", taskModal: t.id })) }));

  const cats = ["Actions", "Clients", "To-do's"].filter(c => items.some(i => i.cat === c));

  return (
    <div onClick={() => actions.patch({ paletteOpen: false })} style={{ ...css("position:fixed;inset:0;background:rgba(30,22,15,.42);z-index:96;display:flex;align-items:flex-start;justify-content:center;padding:8vh 1.5rem 1.5rem"), animation: "pt-fadein .15s ease" }}>
      <div onClick={e => e.stopPropagation()} style={{ ...css("width:34rem;max-width:100%;background:var(--surface);border:1px solid var(--border-soft);border-radius:var(--radius-panel);overflow:hidden"), animation: "pt-ddin .18s ease" }}>
        <div style={css("display:flex;align-items:center;gap:0.7rem;padding:0.9rem 1.1rem;border-bottom:1px solid var(--border-soft)")}>
          <span style={{ color: "var(--fg-faint)", display: "flex" }}><Icon name="search" size={17} /></span>
          <input ref={inputRef} value={state.paletteQuery} onChange={e => actions.patch({ paletteQuery: e.target.value })} placeholder="Search Clients, To-do's, Actions…" style={css("flex:1;border:none;background:transparent;font-size:var(--text-lg);color:var(--fg)")} />
          <span style={css("display:inline-flex;align-items:center;padding:0.1rem 0.4rem;border-radius:0.3rem;background:var(--surface-alt);border:1px solid var(--border-soft);font-size:0.7rem;color:var(--fg-faint)")}>Esc</span>
        </div>
        <div style={css("max-height:22rem;overflow-y:auto;padding:0.4rem")}>
          {cats.length === 0 && <div style={css("padding:2.5rem 1rem;text-align:center;color:var(--fg-faint);font-size:0.85rem")}>No matches.</div>}
          {cats.map(cat => (
            <div key={cat}>
              <div style={css("padding:0.55rem 0.7rem 0.3rem;font-size:0.62rem;font-weight:500;letter-spacing:0.02em;color:var(--fg-faint)")}>{cat}</div>
              {items.filter(i => i.cat === cat).map(it => (
                <button key={`${it.cat}-${it.label}-${it.sub}`} onClick={it.run} className="pt-dditem" style={css("display:flex;align-items:center;gap:0.7rem;width:100%;padding:0.5rem 0.7rem;border:0;background:transparent;border-radius:var(--radius);cursor:pointer;text-align:left")}>
                  <span style={css("width:1.9rem;height:1.9rem;border-radius:var(--radius-sm);display:grid;place-items:center;flex-shrink:0;background:" + it.tint + ";color:" + it.color)}><Icon name={it.icon} size={16} /></span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={css("display:block;font-size:0.85rem;font-weight:500")}>{it.label}</span>
                    <span style={css("display:block;font-size:var(--text-xs);color:var(--fg-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{it.sub}</span>
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
