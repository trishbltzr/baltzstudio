"use client";

import { useState } from "react";
import { Icon } from "../icons";
import { css, initials, svcBadge } from "../helpers";
import { formatDashboardDate } from "@/lib/dateDisplay";
import { ALL_PROJECTS, BRAND_SYSTEMS, DETAIL_BIRTHDAYS, DETAIL_CITIES, DETAIL_NOTES, DETAIL_SINCE, STUDIO_SYSTEM, SVC_META, emailSlug } from "../data";
import { STUDIO_CLIENTS } from "../clients";
import type { PortalActions, PortalState } from "../store";
import type { ClientProject } from "../types";

interface AccessUser { name: string; email: string; access: string; studio: boolean }

function accessUsers(clientName: string, i: number, dev: string): AccessUser[] {
  const slug = emailSlug(clientName);
  const devFirst = (dev || "").split(" ")[0].toLowerCase();
  const users: AccessUser[] = [
    { name: clientName.replace(/\s*(&|and)\s*Co\.?$/i, "") + " (owner)", email: "hello@" + slug + ".com", access: "Client", studio: false },
  ];
  if (i % 2 === 0) users.push({ name: "Client collaborator", email: "team@" + slug + ".com", access: "Client", studio: false });
  users.push({ name: dev, email: devFirst + "@baltazar.studio", access: "Development", studio: true });
  return users;
}

const FOLDERS = [["Design Files", 0], ["Brand Assets", 0], ["Deliverables", 0], ["Audits", 0]] as const;
const FILES: { name: string; ext: string; project: string; size: string; by: string; updated: string; status: string }[] = [];

function AvatarRow({ u }: { u: AccessUser }) {
  return (
    <div style={css("display:flex;align-items:center;gap:0.7rem;min-height:3.35rem;background:var(--surface-alt);border:1px solid var(--border-soft);border-radius:var(--radius);padding:0.7rem 0.8rem")}>
      <span style={css("width:2rem;height:2rem;border-radius:50%;display:grid;place-items:center;font-size:var(--text-2xs);font-weight:500;flex-shrink:0;background:" + (u.studio ? "var(--lane-studio-soft)" : "var(--accent-soft)") + ";color:" + (u.studio ? "var(--lane-studio)" : "var(--accent)"))}>{initials(u.name).toUpperCase()}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={css("font-size:var(--text-base);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{u.name}</div>
        <div style={css("font-size:0.7rem;color:var(--fg-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{u.email}</div>
      </div>
      <span style={css("font-size:0.62rem;font-weight:500;padding:0.12rem 0.5rem;border-radius:999px;background:" + (u.studio ? "var(--lane-studio-soft)" : "var(--surface-alt)") + ";color:" + (u.studio ? "var(--lane-studio)" : "var(--fg-muted)"))}>{u.access}</span>
    </div>
  );
}

export function ClientDetail({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteAccess, setInviteAccess] = useState("Client");
  const name = state.clientDetail;
  const rosterClient = STUDIO_CLIENTS.find(client => client.name === name);
  const existingProject = ALL_PROJECTS.find(p => p.client === name);
  if (!name || !rosterClient) return null;
  const pr: ClientProject = existingProject || { id: `client-${rosterClient.id}`, client: name, name: "Client workspace", service: "cocoon", stage: "Not started", progress: 0, dev: rosterClient.owner, health: "on_track", due: "—", amount: "—", wise: "awaiting" };
  const i = existingProject ? ALL_PROJECTS.indexOf(existingProject) : STUDIO_CLIENTS.indexOf(rosterClient);
  const slug = emailSlug(name);
  const city = DETAIL_CITIES[i % DETAIL_CITIES.length];
  const fields = [
    ["Client owner", pr.dev], ["Service · stage", pr.stage], ["Client since", DETAIL_SINCE[i % DETAIL_SINCE.length]],
    ["Birthday", DETAIL_BIRTHDAYS[i % DETAIL_BIRTHDAYS.length]], ["Email", "hello@" + slug + ".com"], ["Phone", "+44 20 7" + (100 + (i * 37) % 900) + " " + (2040 + (i * 53) % 9000)],
    ["Location", city[0]], ["Timezone", city[1]],
  ].filter(([, value]) => Boolean(value));
  const users = accessUsers(name, i, pr.dev);
  const workspace = actions.workspaceForClient(name);
  const usersWithCollaborators = [
    ...workspace.collaborators.map(collaborator => ({
      name: collaborator.name,
      email: collaborator.email,
      access: collaborator.access,
      studio: collaborator.studio,
    })),
    ...users,
  ];
  const notes = DETAIL_NOTES[i % DETAIL_NOTES.length];
  const allFiles = [
    ...workspace.files.map(file => ({ name: file.name, ext: file.ext, project: file.folder, size: file.sizeLabel, by: file.by, updated: formatDashboardDate(file.updated, file.updated), status: file.status })),
    ...FILES,
  ];

  const sys = BRAND_SYSTEMS[name] || STUDIO_SYSTEM;
  const secondary = sys.colors[1][1];
  const roleNames = ["Primary", "Secondary", "Neutral", "Utility"];

  return (
    <div style={css("display:flex;flex-direction:column;gap:var(--space-4)")}>
      <div style={css("display:flex;align-items:center;gap:0.6rem")}>
        <button onClick={actions.backToClients} className="pt-iconbtn" style={css("display:inline-flex;align-items:center;gap:0.3rem;padding:0.4rem 0.85rem 0.4rem 0.7rem;border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);font-size:0.78rem;font-weight:500;cursor:pointer")}>‹ All Clients</button>
        <button onClick={actions.previewAsClient} className="pt-iconbtn" style={css("margin-left:auto;display:inline-flex;align-items:center;gap:0.35rem;padding:0.4rem 0.9rem;border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);font-size:0.78rem;font-weight:500;cursor:pointer")}><Icon name="eye" size={15} />Preview Portal</button>
      </div>

      <div style={css("display:grid;grid-template-columns:" + (state.isMobile ? "minmax(0,1fr)" : "minmax(0,1.15fr) minmax(20rem,0.85fr)") + ";gap:0.9rem;align-items:stretch")}>
      {/* details */}
      <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden")}>
        <div style={css("display:flex;align-items:center;gap:0.8rem;padding:1rem 1.1rem;border-bottom:1px solid var(--border-soft)")}>
          <span style={css("width:2.6rem;height:2.6rem;border-radius:var(--radius-sm);background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;font-weight:500;font-size:1rem;flex-shrink:0")}>{name[0]}</span>
          <div style={{ flex: 1, minWidth: 0 }}><div style={css("font-weight:500;font-size:1.05rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{name}</div><div style={css("font-size:0.76rem;color:var(--fg-muted)")}>{pr.name} · {usersWithCollaborators.length} with access</div></div>
          <span style={css(svcBadge(pr.service))}>{SVC_META[pr.service].short}</span>
        </div>
        <div style={css("display:grid;grid-template-columns:" + (state.isMobile ? "minmax(0,1fr)" : "repeat(2,minmax(0,1fr))") + ";gap:0.55rem;padding:0.9rem")}>
          {fields.map(([label, value]) => (
            <div key={label} style={css("display:flex;flex-direction:column;justify-content:center;min-height:3.8rem;background:var(--surface-alt);border:1px solid var(--border-soft);border-radius:var(--radius);padding:0.68rem 0.8rem")}>
              <div style={css("font-size:0.62rem;letter-spacing:0;color:var(--fg-faint);font-weight:500;margin-bottom:0.28rem")}>{label}</div>
              <div style={css("font-size:0.85rem;color:var(--fg)")}>{value}</div>
            </div>
          ))}
          {notes && <div style={css("grid-column:1/-1;background:var(--surface-alt);border:1px solid var(--border-soft);border-radius:var(--radius);padding:0.7rem 0.85rem")}>
            <div style={css("font-size:0.62rem;letter-spacing:0;color:var(--fg-faint);font-weight:500;margin-bottom:0.28rem")}>Notes</div>
            <div style={css("font-size:0.85rem;color:var(--fg);line-height:1.5")}>{notes}</div>
          </div>}
        </div>
      </div>

      {/* access */}
      <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden;display:flex;flex-direction:column")}>
        <div style={css("display:flex;align-items:center;justify-content:space-between;gap:0.6rem;padding:1rem 1.1rem;border-bottom:1px solid var(--border-soft)")}>
          <div><div style={css("font-size:var(--text-md);font-weight:500;color:var(--fg)")}>People with access</div><div style={css("font-size:var(--text-xs);color:var(--fg-muted);margin-top:0.14rem")}>{usersWithCollaborators.length} collaborators</div></div>
          <button onClick={() => setInviteOpen(true)} className="pt-iconbtn" style={css("display:inline-flex;align-items:center;gap:0.3rem;padding:0.35rem 0.8rem;border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);font-size:0.74rem;font-weight:500;cursor:pointer")}><Icon name="plus" size={15} />Add collaborator</button>
        </div>
        <div style={css("display:flex;flex:1;flex-direction:column;gap:0.55rem;padding:0.9rem")}>
          {usersWithCollaborators.map(u => <AvatarRow key={u.email} u={u} />)}
        </div>
      </div>
      </div>

      {/* brand system */}
      <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden")}>
        <div style={css("display:flex;align-items:center;gap:0.6rem;padding:1rem 1.4rem;border-bottom:1px solid var(--border-soft)")}>
          <span style={css("width:2.1rem;height:2.1rem;border-radius:0.55rem;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;flex-shrink:0")}><Icon name="palette" size={15} /></span>
          <div style={{ flex: 1, minWidth: 0 }}><h3 style={css("margin:0;font-size:var(--text-lg);font-weight:500")}>Brand system</h3><div style={css("font-size:0.74rem;color:var(--fg-muted)")}>{name} · colours, type and voice</div></div>
        </div>
        <div style={css("display:grid;grid-template-columns:" + (state.isMobile ? "minmax(0,1fr)" : "repeat(3,minmax(0,1fr))") + ";gap:0.9rem;padding:1.1rem 1.4rem 1.4rem")}>
          <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius);background:var(--surface-alt);padding:var(--space-4)")}>
            <div style={css("font-size:0.62rem;letter-spacing:0;color:var(--fg-faint);font-weight:500;margin-bottom:0.85rem")}>Colours</div>
            <div style={css("display:flex;flex-direction:column;gap:var(--space-2)")}>
              {sys.colors.map(([cn, hex], ci) => (
                <div key={hex} style={css("display:flex;align-items:center;gap:0.6rem;padding:0.5rem 0.65rem;border:1px solid var(--border-soft);border-radius:var(--radius);background:var(--surface);min-width:0")}>
                  <span style={css("width:2.2rem;height:2.2rem;border-radius:0.55rem;flex-shrink:0;background:" + hex + ";border:1px solid oklch(0 0 0 / 0.1)")} />
                  <div style={{ minWidth: 0 }}><div style={css("font-weight:500;font-size:0.8rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{roleNames[ci] || cn}</div><div style={css("font-size:0.68rem;color:var(--fg-faint);font-family:'Courier New',monospace")}>{hex.toUpperCase()}</div></div>
                </div>
              ))}
            </div>
          </div>
          <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius);background:var(--surface-alt);padding:var(--space-4)")}>
            <div style={css("font-size:0.62rem;letter-spacing:0;color:var(--fg-faint);font-weight:500;margin-bottom:0.85rem")}>Typography</div>
            <div style={css("display:flex;flex-direction:column;gap:0.55rem")}>
              {sys.fonts.map(([fn, frole, ff]) => (
                <div key={fn} style={css("display:flex;align-items:center;gap:0.9rem;padding:0.65rem 0.9rem;border:1px solid var(--border-soft);border-radius:var(--radius);background:var(--surface)")}>
                  <span style={{ fontFamily: ff, fontSize: "1.5rem", lineHeight: 1, color: "var(--fg)", flexShrink: 0, width: "3rem", height: "3rem", borderRadius: "50%", border: "1px solid var(--border-soft)", display: "grid", placeItems: "center" }}>Aa</span>
                  <div style={{ minWidth: 0 }}><div style={{ fontWeight: 500, fontSize: "0.92rem", fontFamily: ff }}>{fn}</div><div style={css("font-size:0.74rem;color:var(--fg-muted)")}>{frole}</div></div>
                </div>
              ))}
            </div>
          </div>
          <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius);background:var(--surface-alt);padding:var(--space-4)")}>
            <div style={css("font-size:0.62rem;letter-spacing:0;color:var(--fg-faint);font-weight:500;margin-bottom:0.85rem")}>Brand Tone</div>
            <div style={css("display:flex;flex-wrap:wrap;gap:0.4rem;margin-bottom:1.15rem")}>
              {sys.tone.traits.map(t => <span key={t} style={{ fontSize: "0.74rem", fontWeight: 500, padding: "0.3rem 0.75rem", borderRadius: "999px", background: secondary + "22", color: "var(--fg)", border: "1px solid " + secondary + "66" }}>{t}</span>)}
            </div>
            <div style={css("display:flex;flex-direction:column;gap:0.8rem")}>
              {sys.tone.scales.map(([l, r, pct]) => (
                <div key={l}>
                  <div style={css("display:flex;justify-content:space-between;font-size:0.68rem;color:var(--fg-faint);margin-bottom:0.32rem")}><span>{l}</span><span>{r}</span></div>
                  <div style={css("position:relative;height:0.4rem;border-radius:999px;background:var(--surface);border:1px solid var(--border-soft)")}><span style={{ position: "absolute", top: "50%", left: pct + "%", width: "0.9rem", height: "0.9rem", borderRadius: "50%", transform: "translate(-50%,-50%)", background: secondary, boxShadow: "0 0 0 3px var(--surface),0 1px 2px rgba(0,0,0,0.25)" }} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* files */}
      <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden;display:grid;grid-template-columns:" + (state.isMobile ? "1fr" : "15rem 1fr") + ";min-height:16rem")}>
        <aside style={css("border-right:1px solid var(--border-soft);background:var(--surface-alt);padding:1.1rem 0.9rem;display:flex;flex-direction:column;gap:0.15rem")}>
          <div style={css("font-size:0.62rem;letter-spacing:0;color:var(--fg-faint);font-weight:500;padding:0 0.3rem 0.5rem")}>Folders</div>
          {FOLDERS.map(([label, count], fi) => (
            <div key={label} className="pt-menuitem" style={css("display:flex;align-items:center;gap:0.55rem;padding:0.5rem 0.55rem;border-radius:var(--radius);cursor:pointer;font-size:var(--text-base);font-weight:500;color:var(--fg);" + (fi === 0 ? "background:var(--surface)" : ""))}>
              <span style={{ display: "grid", placeItems: "center", flexShrink: 0, color: "var(--fg-muted)" }}><Icon name="folder" size={16} /></span>
              <span style={css("flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{label}</span>
              <span style={css("font-size:var(--text-2xs);color:var(--fg-faint)")}>{count}</span>
            </div>
          ))}
        </aside>
        <div style={css("display:flex;flex-direction:column;min-width:0")}>
          <div style={css("display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);padding:1rem 1.4rem;border-bottom:1px solid var(--border-soft)")}>
            <span style={css("font-weight:500;font-size:var(--text-lg)")}>Design Files</span>
            <div style={css("display:flex;gap:1.2rem;font-size:0.74rem;color:var(--fg-muted)")}><span><strong style={css("color:var(--fg);font-weight:500")}>{allFiles.length}</strong> ready</span></div>
          </div>
          <div>
            <div style={css("display:grid;grid-template-columns:2.6fr 1.1fr 0.7fr 0.9fr;gap:0.7rem;padding:0.55rem 1.4rem;border-bottom:1px solid var(--border-soft);font-size:0.62rem;letter-spacing:0;color:var(--fg-faint);font-weight:500")}>
              <span>Name</span><span>Project</span><span>Updated</span><span style={{ textAlign: "right" }}>Status</span>
            </div>
            {allFiles.map((f, index) => (
              <div key={f.name + "#" + index} className="pt-row" style={css("display:grid;grid-template-columns:2.6fr 1.1fr 0.7fr 0.9fr;gap:0.7rem;padding:0.75rem 1.4rem;border-bottom:1px solid var(--border-soft);align-items:center")}>
                <div style={css("display:flex;align-items:center;gap:0.65rem;min-width:0")}>
                  <span style={css("width:2rem;height:2rem;border-radius:var(--radius-sm);background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;flex-shrink:0;font-size:0.56rem;font-weight:500")}>{f.ext}</span>
                  <div style={{ minWidth: 0 }}><div style={css("font-weight:500;font-size:var(--text-base);overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{f.name}</div><div style={css("font-size:0.7rem;color:var(--fg-faint);white-space:nowrap")}>{f.size} · {f.by}</div></div>
                </div>
                <span style={css("font-size:0.8rem;color:var(--fg-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{f.project}</span>
                <span style={css("font-size:0.8rem;color:var(--fg-muted)")}>{f.updated}</span>
                <span style={{ justifySelf: "end", ...css(f.status === "Ready" ? "display:inline-flex;align-items:center;font-size:var(--text-2xs);font-weight:500;padding:0.16rem 0.5rem;border-radius:999px;background:var(--success-soft);color:var(--success)" : "display:inline-flex;align-items:center;font-size:var(--text-2xs);font-weight:500;padding:0.16rem 0.5rem;border-radius:999px;background:var(--accent-soft);color:var(--accent)") }}>{f.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {inviteOpen && (
        <div onClick={() => setInviteOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(18, 14, 11, 0.28)", zIndex: 120, display: "grid", placeItems: "center", padding: "1rem" }}>
          <div onClick={event => event.stopPropagation()} style={css("width:min(26rem,100%);border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);padding:var(--space-4);display:flex;flex-direction:column;gap:var(--space-3)")}>
            <div style={css("display:flex;align-items:center;justify-content:space-between;gap:var(--space-3)")}>
              <div>
                <div style={css("font-size:0.92rem;font-weight:500;color:var(--fg)")}>Add collaborator</div>
                <div style={css("font-size:var(--text-xs);color:var(--fg-muted);margin-top:0.12rem")}>{name} workspace access</div>
              </div>
              <button type="button" onClick={() => setInviteOpen(false)} className="pt-iconbtn" style={css("width:1.9rem;height:1.9rem;border-radius:50%;border:1px solid var(--border);background:var(--surface);color:var(--fg-muted);cursor:pointer;display:grid;place-items:center")}><Icon name="x" size={14} /></button>
            </div>
            <input value={inviteName} onChange={event => setInviteName(event.target.value)} placeholder="Collaborator name" style={css("height:2.5rem;border:1px solid var(--border);border-radius:var(--radius);padding:0 0.8rem;font-size:0.84rem;background:var(--surface-alt);color:var(--fg)")} />
            <input value={inviteEmail} onChange={event => setInviteEmail(event.target.value)} placeholder="name@example.com" style={css("height:2.5rem;border:1px solid var(--border);border-radius:var(--radius);padding:0 0.8rem;font-size:0.84rem;background:var(--surface-alt);color:var(--fg)")} />
            <select value={inviteAccess} onChange={event => setInviteAccess(event.target.value)} style={css("height:2.5rem;border:1px solid var(--border);border-radius:var(--radius);padding:0 0.8rem;font-size:0.84rem;background:var(--surface-alt);color:var(--fg)")}>
              <option>Client</option>
              <option>Collaborator</option>
              <option>Reviewer</option>
            </select>
            <div style={css("display:flex;justify-content:flex-end;gap:0.55rem")}>
              <button type="button" onClick={() => setInviteOpen(false)} className="pt-softbtn" style={css("height:2.2rem;padding:0 0.9rem;border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);font-size:0.78rem;font-weight:500;cursor:pointer")}>Cancel</button>
              <button
                type="button"
                onClick={() => {
                  actions.inviteCollaborator(name, { name: inviteName, email: inviteEmail, access: inviteAccess });
                  setInviteName("");
                  setInviteEmail("");
                  setInviteAccess("Client");
                  setInviteOpen(false);
                }}
                className="pt-op"
                style={css("height:2.2rem;padding:0 1rem;border:none;border-radius:var(--radius-pill);background:var(--accent);color:#fff;font-size:0.78rem;font-weight:500;cursor:pointer")}
              >
                Save invite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
