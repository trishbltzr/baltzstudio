"use client";

import { Icon } from "../icons";
import { css, healthMap, initials, statusPill, svcBadge } from "../helpers";
import { SVC_META } from "../data";
import { roleProjects } from "../selectors";
import { FilterDropdown } from "../components/FilterDropdown";
import type { PortalActions, PortalState } from "../store";

const SVC_LABELS: [string, string][] = [["all", "All Services"], ["cocoon", "Cocoon"], ["wiaw", "Winged in a Week"], ["iff", "In Full Flight"]];

export function Clients({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const projects = roleProjects(state);
  const cf = state.clientFilter;
  const filterActive = cf.service !== "all" || cf.health !== "all";
  const svcLabel = SVC_LABELS.find(([k]) => k === cf.service)?.[1] || "All Services";
  const canManage = state.role === "admin";

  const svMatch = (f: { service: string; health: string }) => f.service === cf.service && f.health === cf.health;
  const canSave = filterActive && !state.savedViews.clients.some(v => svMatch(v.filter));
  const viewName = () => {
    const parts: string[] = [];
    if (cf.service !== "all") parts.push(SVC_META[cf.service].short);
    if (cf.health !== "all") parts.push(cf.health === "on_track" ? "On Track" : "At Risk");
    return parts.join(" · ") || "All Clients";
  };

  return (
    <div style={css("display:flex;flex-direction:column;gap:0.85rem")}>
      {/* filter toolbar */}
      <div style={css("display:flex;align-items:center;gap:0.6rem;flex-wrap:wrap")}>
        <FilterDropdown id="csvc" label="Service" valueLabel={svcLabel} state={state} actions={actions}
          options={SVC_LABELS.map(([k, l]) => ({ label: l, active: cf.service === k, onClick: () => actions.setClientFilter("service", k) }))} />
        <div style={css("display:flex;align-items:center;gap:var(--space-2);margin-left:auto")}>
          <span style={css("font-size:0.74rem;color:var(--fg-faint)")}>{projects.length}{projects.length === 1 ? " client" : " clients"}</span>
          {canSave && <button onClick={() => actions.saveView("clients", viewName(), { service: cf.service, health: cf.health })} style={css("display:inline-flex;align-items:center;gap:0.3rem;font-size:0.74rem;font-weight:500;padding:0.32rem 0.75rem;border-radius:var(--radius-pill);border:1px solid var(--accent);background:var(--accent-soft);color:var(--accent);cursor:pointer")}>Save View</button>}
          {filterActive && <button onClick={() => actions.patch({ clientFilter: { service: "all", health: "all" } })} style={css("font-size:0.74rem;font-weight:500;padding:0.32rem 0.7rem;border-radius:var(--radius-pill);border:1px solid var(--border);background:var(--surface);color:var(--fg-muted);cursor:pointer")}>Clear</button>}
        </div>
      </div>

      {/* saved views */}
      {state.savedViews.clients.length > 0 && (
        <div style={css("display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap")}>
          <span style={css("font-size:var(--text-2xs);font-weight:500;letter-spacing:0.02em;color:var(--fg-faint)")}>Saved</span>
          {state.savedViews.clients.map((v, i) => {
            const on = svMatch(v.filter);
            return (
              <span key={i} style={css("display:inline-flex;align-items:center;gap:0.4rem;padding:0.32rem 0.7rem;border-radius:var(--radius-pill);border:1px solid " + (on ? "var(--accent)" : "var(--border-soft)") + ";background:" + (on ? "var(--accent-soft)" : "var(--surface-alt)") + ";color:" + (on ? "var(--accent)" : "var(--fg-muted)") + ";font-size:0.74rem;font-weight:500;cursor:pointer")}>
                <span onClick={() => actions.patch({ clientFilter: { ...v.filter } })} style={{ cursor: "pointer" }}>{v.name}</span>
                <span onClick={() => actions.removeView("clients", i)} style={css("cursor:pointer;opacity:0.55;font-size:0.9rem;line-height:1")}>×</span>
              </span>
            );
          })}
        </div>
      )}

      {/* card grid */}
      <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(17rem,1fr));gap:var(--space-3)")}>
        {projects.map(p => {
          const hm = healthMap(p.health); const sm = SVC_META[p.service];
          return (
            <div key={p.id} style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden;display:flex;flex-direction:column")}>
              <div aria-hidden="true" style={css("height:0.24rem;background:linear-gradient(90deg," + sm.color + " 0%,color-mix(in srgb," + sm.color + " 72%,var(--surface) 28%) 72%,color-mix(in srgb," + sm.color + " 20%,var(--surface) 80%) 100%);flex-shrink:0")} />
              <div style={css("padding:1rem 1.1rem")}>
                <div style={css("display:flex;align-items:center;gap:0.65rem;margin-bottom:0.85rem")}>
                  <span style={css("width:1.95rem;height:1.95rem;border-radius:var(--radius-sm);background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;font-weight:500;font-size:0.8rem;flex-shrink:0")}>{p.client[0]}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={css("font-weight:500;font-size:var(--text-md);overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{p.client}</div>
                    <div style={css("font-size:0.74rem;color:var(--fg-muted)")}>{p.name}</div>
                  </div>
                  <span style={css(statusPill(hm[0]))}>{hm[1]}</span>
                </div>
                <div style={css("display:flex;align-items:center;gap:0.6rem;margin-bottom:0.85rem")}>
                  <span style={css(svcBadge(p.service))}>{p.stage}</span>
                  <div style={css("flex:1;height:0.35rem;border-radius:999px;background:oklch(0.94 0.006 50);overflow:hidden")}><div style={css("width:" + p.progress + "%;height:100%;background:" + sm.color)} /></div>
                  <span style={css("font-size:0.7rem;color:var(--fg-muted)")}>{p.progress}%</span>
                </div>
                <div style={css("display:flex;align-items:center;gap:var(--space-2);font-size:0.74rem;color:var(--fg-muted)")}>
                  <span style={css("width:1.5rem;height:1.5rem;border-radius:50%;background:oklch(0.95 0.004 50);color:var(--fg-muted);font-size:0.6rem;font-weight:500;display:grid;place-items:center")}>{initials(p.dev)}</span>{p.dev}
                  <span style={css("margin-left:auto;display:inline-flex;align-items:center;gap:0.3rem")}><Icon name="cal" size={12} />{p.due}</span>
                </div>
              </div>
              <div style={css("margin-top:auto;border-top:1px solid var(--border-soft);display:flex")}>
                {canManage ? (
                  <>
                    <button onClick={() => actions.openClientDetail(p.client)} className="pt-softbtn" style={css("flex:1;padding:0.6rem;border:none;border-right:1px solid var(--border-soft);background:transparent;color:var(--fg-muted);font-size:0.74rem;font-weight:500;cursor:pointer")}>View Details</button>
                    <button onClick={actions.previewAsClient} className="pt-softbtn" style={css("flex:1;padding:0.6rem;border:none;background:transparent;color:var(--fg-muted);font-size:0.74rem;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:0.3rem")}><Icon name="eye" size={15} />Preview</button>
                  </>
                ) : (
                  <button onClick={() => actions.openClientDetail(p.client)} className="pt-softbtn" style={css("flex:1;padding:0.6rem;border:none;background:transparent;color:var(--fg-muted);font-size:0.74rem;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:0.3rem")}>Open Workspace <Icon name="arrow" size={13} /></button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
