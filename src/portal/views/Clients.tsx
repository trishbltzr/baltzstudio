"use client";

import { useState } from "react";
import { Icon } from "../icons";
import { css, healthMap, initials, statusPill, svcBadge } from "../helpers";
import { SVC_META } from "../data";
import { DEFAULT_CLIENT_NAME, STUDIO_CLIENTS } from "../clients";
import { roleProjects } from "../selectors";
import { FilterDropdown } from "../components/FilterDropdown";
import type { PortalActions, PortalState } from "../store";
import type { ClientProject } from "../types";

const SVC_LABELS: [string, string][] = [["all", "All Services"], ["cocoon", "Cocoon Consult"], ["wiaw", "Winged in a Week"], ["iff", "In Full Flight"]];

export function Clients({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const projects = roleProjects(state);
  const cf = state.clientFilter;
  const filterActive = cf.service !== "all" || cf.health !== "all";
  const roster = state.role === "client" ? STUDIO_CLIENTS.filter(client => client.name === DEFAULT_CLIENT_NAME) : STUDIO_CLIENTS;
  const projectRows = roster
    .map(client => {
      const project = projects.find(item => item.client === client.name);
      if (project) return { ...project, placeholder: false };
      return {
        id: `client-${client.id}`,
        client: client.name,
        name: "No active project",
        service: "cocoon",
        stage: "Not started",
        progress: 0,
        dev: client.owner,
        health: "on_track",
        due: "—",
        amount: "—",
        wise: "awaiting",
        placeholder: true,
      } satisfies ClientProject & { placeholder: boolean };
    })
    .filter(project => !filterActive || !project.placeholder);
  const svcLabel = SVC_LABELS.find(([k]) => k === cf.service)?.[1] || "All Services";
  const canManage = state.role === "admin";
  const [notesClient, setNotesClient] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const notesWorkspace = notesClient ? actions.workspaceForClient(notesClient) : null;

  const closeNotes = () => {
    setNotesClient(null);
    setNoteDraft("");
  };

  const saveNote = () => {
    if (!notesClient || !noteDraft.trim()) return;
    actions.addClientNote(notesClient, noteDraft);
    setNoteDraft("");
  };

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
          <span style={css("font-size:0.74rem;color:var(--fg-faint)")}>{projectRows.length}{projectRows.length === 1 ? " client" : " clients"}</span>
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
        {projectRows.map(p => {
          const hm = p.placeholder ? ["muted", "Not started"] : healthMap(p.health); const sm = SVC_META[p.service];
          const noteCount = actions.workspaceForClient(p.client).notes.length;
          return (
            <div key={p.id} style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden;display:flex;flex-direction:column")}>
              <div aria-hidden="true" style={css("height:0.24rem;background:" + (p.placeholder ? "var(--border-soft)" : "linear-gradient(90deg," + sm.color + " 0%,color-mix(in srgb," + sm.color + " 72%,var(--surface) 28%) 72%,color-mix(in srgb," + sm.color + " 20%,var(--surface) 80%) 100%)") + ";flex-shrink:0")} />
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
                  <span style={p.placeholder ? css("font-size:0.68rem;font-weight:500;color:var(--fg-faint)") : css(svcBadge(p.service))}>{p.stage}</span>
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
                    <button onClick={() => setNotesClient(p.client)} className="pt-softbtn" style={css("flex:1;padding:0.6rem;border:none;border-right:1px solid var(--border-soft);background:transparent;color:var(--fg-muted);font-size:0.74rem;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:0.3rem")}><Icon name="file" size={14} />Notes{noteCount > 0 ? ` · ${noteCount}` : ""}</button>
                    <button onClick={actions.previewAsClient} aria-label={`Preview ${p.client}`} className="pt-softbtn" style={css("width:2.7rem;padding:0.6rem;border:none;background:transparent;color:var(--fg-muted);cursor:pointer;display:grid;place-items:center")}><Icon name="eye" size={15} /></button>
                  </>
                ) : (
                  <>
                    <button onClick={() => actions.openClientDetail(p.client)} className="pt-softbtn" style={css("flex:1;padding:0.6rem;border:none;border-right:1px solid var(--border-soft);background:transparent;color:var(--fg-muted);font-size:0.74rem;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:0.3rem")}>Open Workspace <Icon name="arrow" size={13} /></button>
                    <button onClick={() => setNotesClient(p.client)} className="pt-softbtn" style={css("flex:1;padding:0.6rem;border:none;background:transparent;color:var(--fg-muted);font-size:0.74rem;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:0.3rem")}><Icon name="file" size={14} />Notes{noteCount > 0 ? ` · ${noteCount}` : ""}</button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {notesClient && notesWorkspace && (
        <div role="presentation" onClick={closeNotes} style={css("position:fixed;inset:0;z-index:80;background:rgba(35,24,22,.28);backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;padding:1rem")}>
          <section role="dialog" aria-modal="true" aria-label={`${notesClient} notes`} onClick={e => e.stopPropagation()} style={css("width:min(36rem,100%);max-height:min(44rem,calc(100vh - 2rem));display:flex;flex-direction:column;border:1px solid var(--border);border-radius:var(--radius-panel);background:var(--surface);box-shadow:0 24px 70px rgba(35,24,22,.22);overflow:hidden")}>
            <div style={css("display:flex;align-items:flex-start;gap:0.75rem;padding:1rem 1.1rem;border-bottom:1px solid var(--border-soft)")}>
              <span style={css("width:2rem;height:2rem;border-radius:var(--radius-sm);background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;font-weight:500;font-size:0.78rem;flex-shrink:0")}>{notesClient[0]}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={css("font-size:0.95rem;font-weight:500;color:var(--fg)")}>{notesClient} notes</div>
                <div style={css("font-size:0.72rem;color:var(--fg-faint);margin-top:0.12rem")}>Shared client memory for decisions, preferences, and important context.</div>
              </div>
              <button type="button" aria-label="Close notes" onClick={closeNotes} className="pt-iconbtn" style={css("width:1.9rem;height:1.9rem;border:1px solid var(--border-soft);border-radius:50%;background:transparent;color:var(--fg-muted);display:grid;place-items:center;cursor:pointer;flex-shrink:0")}><Icon name="x" size={13} /></button>
            </div>

            <div style={css("padding:1rem 1.1rem;border-bottom:1px solid var(--border-soft);background:var(--surface-alt)")}>
              <label style={css("display:block;font-size:0.72rem;font-weight:500;color:var(--fg-muted);margin-bottom:0.35rem")}>Add a note</label>
              <textarea value={noteDraft} onChange={e => setNoteDraft(e.target.value)} placeholder="Add a preference, decision, reminder, or useful client context…" rows={4} style={css("width:100%;box-sizing:border-box;resize:vertical;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);color:var(--fg);font:inherit;font-size:0.8rem;line-height:1.5;padding:0.65rem 0.7rem;outline:none")} />
              <div style={css("display:flex;justify-content:flex-end;margin-top:0.55rem")}>
                <button type="button" disabled={!noteDraft.trim()} onClick={saveNote} style={css("display:inline-flex;align-items:center;gap:0.35rem;height:2rem;padding:0 0.85rem;border:0;border-radius:var(--radius-pill);background:var(--accent);color:#fff;font-size:0.74rem;font-weight:500;cursor:pointer;opacity:" + (noteDraft.trim() ? "1" : "0.45"))}><Icon name="plus" size={12} />Save note</button>
              </div>
            </div>

            <div style={css("overflow:auto;padding:0.9rem 1.1rem;display:flex;flex-direction:column;gap:0.55rem") }>
              {notesWorkspace.notes.length === 0 ? (
                <div style={css("padding:1.4rem 1rem;text-align:center;border:1px dashed var(--border);border-radius:var(--radius);color:var(--fg-faint);font-size:0.76rem")}>No notes yet. Add the first piece of client context above.</div>
              ) : notesWorkspace.notes.map(note => (
                <article key={note.id} style={css("padding:0.72rem 0.8rem;border:1px solid var(--border-soft);border-radius:var(--radius);background:var(--surface)")}>
                  <div style={css("font-size:0.78rem;color:var(--fg);line-height:1.55;white-space:pre-wrap")}>{note.text}</div>
                  <div style={css("display:flex;align-items:center;gap:0.55rem;margin-top:0.5rem;font-size:0.66rem;color:var(--fg-faint)")}><span>{note.author}</span><time dateTime={note.createdAt}>{new Date(note.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time><button type="button" aria-label="Delete note" onClick={() => actions.deleteClientNote(notesClient, note.id)} style={css("margin-left:auto;border:0;background:transparent;color:var(--fg-faint);font-size:0.66rem;cursor:pointer;padding:0.1rem 0.2rem")}>Delete</button></div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
