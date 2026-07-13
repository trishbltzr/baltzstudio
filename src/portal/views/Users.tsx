"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "../icons";
import { css, healthMap, initials } from "../helpers";
import { ALL_PROJECTS, SVC_META, seedTasks } from "../data";
import type { PortalActions, PortalState } from "../store";
import type { Health } from "../types";

interface Member { name: string; access: string; load: number; prod: number; invited?: boolean; oversight?: boolean }
const TEAM: Member[] = [
  { name: "Trisha Baltazar", access: "Owner", load: 0, prod: 0, oversight: true },
  { name: "Kier Mangibin", access: "Member", load: 0, prod: 0 },
];

function workband(load: number): [string, string] {
  if (load >= 80) return ["Overworked", "var(--danger)"];
  if (load >= 55) return ["At capacity", "var(--warn)"];
  return ["Healthy", "var(--success)"];
}
const healthColor = (h: Health) => ({ on_track: "var(--success)", at_risk: "var(--warn)", delayed: "var(--danger)" }[h]);

export function Users({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteAccess, setInviteAccess] = useState("Member");
  const [inviteSending, setInviteSending] = useState(false);
  const inviteNameRef = useRef<HTMLInputElement>(null);
  const tasks = seedTasks();
  const allMembers: Member[] = [
    ...TEAM,
    ...state.teamInvites.map(invite => ({ name: invite.name, access: invite.access, load: 0, prod: 0, invited: true })),
  ];
  const overworked = allMembers.filter(m => m.load >= 80 && !m.invited);
  const atCap = allMembers.filter(m => m.load >= 55 && !m.invited).length;
  const activeMembers = allMembers.filter(m => !m.invited);

  useEffect(() => {
    if (state.quickActionIntent !== "invite_user") return;
    setInviteOpen(true);
    requestAnimationFrame(() => inviteNameRef.current?.focus());
    actions.patch({ quickActionIntent: null });
  }, [actions, state.quickActionIntent]);

  const submitInvite = async () => {
    const name = inviteName.trim();
    const email = inviteEmail.trim();
    if (!name || !email || !email.includes("@")) {
      actions.showToast("Add a name and valid email before sending the invite");
      return;
    }
    setInviteSending(true);
    const response = await fetch("/api/invite-request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        businessName: "Baltazar Studio",
        note: "Portal access: " + inviteAccess,
      }),
    }).catch(() => null);
    if (!response?.ok) {
      setInviteSending(false);
      actions.showToast("Unable to save the portal invite — please try again");
      return;
    }
    actions.update(s => ({
      teamInvites: [
        ...s.teamInvites,
        { id: "invite-" + Date.now(), name, email, access: inviteAccess },
      ],
    }));
    setInviteName("");
    setInviteEmail("");
    setInviteAccess("Member");
    setInviteSending(false);
    setInviteOpen(false);
    actions.showToast("Portal invite saved for " + email);
  };

  const stats = [
    { label: "Studio team", value: String(allMembers.length), sub: "active & invited", valColor: "var(--fg)" },
    { label: "At capacity", value: String(atCap), sub: overworked.length ? overworked.map(m => m.name.split(" ")[0]).join(", ") + " overworked" : "balanced", valColor: atCap ? "var(--warn)" : "var(--success)" },
    { label: "Active clients", value: String(ALL_PROJECTS.length), sub: "across the studio", valColor: "var(--fg)" },
    { label: "Avg productivity", value: Math.round(activeMembers.reduce((a, m) => a + m.prod, 0) / Math.max(1, activeMembers.length)) + "%", sub: "last 30 days", valColor: "var(--success)" },
  ];

  const members = allMembers.map(m => {
    const projs = m.oversight
      ? ALL_PROJECTS.filter(p => p.health !== "on_track")
      : ALL_PROJECTS.filter(p => p.dev === m.name);
    const [wkLabel, wkColor] = workband(m.load);
    return { ...m, init: initials(m.name), clients: m.oversight ? ALL_PROJECTS.length : projs.length, activeTasks: tasks.filter(t => t.assignee === m.name && t.status !== "done").length, wkLabel, wkColor, projs };
  });
  const teamCols = state.isMobile ? "minmax(0,1fr)" : "repeat(2,minmax(0,1fr))";

  return (
    <div style={css("display:flex;flex-direction:column;gap:1.1rem")}>
      <div style={css("display:flex;align-items:center;justify-content:space-between;gap:0.75rem;flex-wrap:wrap")}>
        <div>
          <div style={css("font-size:var(--text-lg);font-weight:500;color:var(--fg)")}>Team access</div>
          <div style={css("margin-top:0.15rem;font-size:var(--text-xs);color:var(--fg-muted)")}>Invite studio members and clients to the portal.</div>
        </div>
        <button type="button" onClick={() => { setInviteOpen(true); requestAnimationFrame(() => inviteNameRef.current?.focus()); }} className="pt-op" style={css("height:2.2rem;padding:0 0.9rem;border:none;border-radius:var(--radius-pill);background:var(--accent);color:#fff;font-size:0.78rem;font-weight:500;display:inline-flex;align-items:center;gap:0.4rem;cursor:pointer")}>
          <Icon name="user" size={15} /> Invite user
        </button>
      </div>

      {inviteOpen && (
        <form onSubmit={event => { event.preventDefault(); void submitInvite(); }} style={css("padding:1rem 1.05rem;border:1px solid color-mix(in srgb,var(--accent) 24%,var(--border-soft) 76%);border-radius:var(--radius-panel);background:color-mix(in srgb,var(--accent-soft) 35%,var(--surface) 65%);display:grid;grid-template-columns:repeat(auto-fit,minmax(12rem,1fr));gap:0.7rem;align-items:end")}>
          <label style={css("display:flex;flex-direction:column;gap:0.3rem;font-size:var(--text-xs);font-weight:500;color:var(--fg-muted)")}>
            Name
            <input ref={inviteNameRef} value={inviteName} onChange={event => setInviteName(event.target.value)} placeholder="Full name" className="pt-input" style={css("height:2.25rem;border:1px solid var(--border);border-radius:var(--radius);padding:0 0.7rem;background:var(--surface);color:var(--fg);font-size:0.8rem")} />
          </label>
          <label style={css("display:flex;flex-direction:column;gap:0.3rem;font-size:var(--text-xs);font-weight:500;color:var(--fg-muted)")}>
            Email
            <input type="email" value={inviteEmail} onChange={event => setInviteEmail(event.target.value)} placeholder="name@company.com" className="pt-input" style={css("height:2.25rem;border:1px solid var(--border);border-radius:var(--radius);padding:0 0.7rem;background:var(--surface);color:var(--fg);font-size:0.8rem")} />
          </label>
          <label style={css("display:flex;flex-direction:column;gap:0.3rem;font-size:var(--text-xs);font-weight:500;color:var(--fg-muted)")}>
            Access
            <select value={inviteAccess} onChange={event => setInviteAccess(event.target.value)} style={css("height:2.25rem;border:1px solid var(--border);border-radius:var(--radius);padding:0 0.7rem;background:var(--surface);color:var(--fg);font-size:0.8rem")}>
              <option>Member</option>
              <option>Admin</option>
              <option>Client</option>
            </select>
          </label>
          <div style={css("display:flex;align-items:center;gap:0.45rem;justify-content:flex-end")}>
            <button type="button" disabled={inviteSending} onClick={() => setInviteOpen(false)} style={css("height:2.25rem;padding:0 0.75rem;border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);font-size:0.76rem;font-weight:500;cursor:pointer")}>Cancel</button>
            <button type="submit" disabled={inviteSending} className="pt-op" style={css("height:2.25rem;padding:0 0.9rem;border:none;border-radius:var(--radius-pill);background:var(--accent);color:#fff;font-size:0.76rem;font-weight:500;cursor:pointer;opacity:" + (inviteSending ? ".65" : "1"))}>{inviteSending ? "Saving…" : "Send invite"}</button>
          </div>
        </form>
      )}

      <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(9.5rem,1fr));gap:0.6rem")}>
        {stats.map(s => (
          <div key={s.label} style={css("padding:0.9rem 1rem;border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface)")}>
            <div style={css("font-size:var(--text-2xs);font-weight:500;letter-spacing:0.02em;color:var(--fg-faint)")}>{s.label}</div>
            <div style={css("display:flex;align-items:baseline;gap:0.45rem;flex-wrap:wrap;margin-top:0.25rem")}>
              <div style={css("font-size:var(--text-3xl);font-weight:500;line-height:1.1;color:" + s.valColor)}>{s.value}</div>
              <div style={css("font-size:var(--text-xs);color:var(--fg-muted)")}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {overworked.length > 0 && (
        <div style={css("display:flex;align-items:center;gap:0.6rem;padding:0.7rem 1rem;border-radius:var(--radius);background:var(--warn-soft);border:1px solid color-mix(in srgb,var(--warn) 30%,white 70%)")}>
          <span style={{ color: "var(--warn)", display: "flex" }}><Icon name="alert" size={16} /></span>
          <span style={css("font-size:0.83rem;color:var(--fg);flex:1")}>{overworked.map(m => m.name.split(" ")[0]).join(" & ")} {overworked.length > 1 ? "are" : "is"} over capacity — consider reassigning a client to balance the load.</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: teamCols, gap: "0.7rem", alignItems: "stretch" }}>
        {members.map(p => (
          <div key={p.name} style={css("border:1px solid " + (p.load >= 80 ? "color-mix(in srgb,var(--danger) 35%,white 65%)" : "var(--border-soft)") + ";border-radius:var(--radius-panel);background:var(--surface);overflow:hidden;display:flex;flex-direction:column")}>
            <div style={css("padding:1rem 1.05rem;display:flex;flex-direction:column;gap:var(--space-3)")}>
              <div style={css("display:flex;align-items:center;gap:0.7rem")}>
                <span style={css("width:2.35rem;height:2.35rem;border-radius:50%;background:var(--accent-soft);color:var(--accent);font-weight:500;font-size:0.78rem;display:grid;place-items:center;flex-shrink:0")}>{p.init}</span>
                <div style={{ flex: 1, minWidth: 0 }}><div style={css("font-weight:500;font-size:var(--text-md);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{p.name}</div><div style={css("font-size:var(--text-xs);color:var(--fg-muted)")}>{p.access}</div></div>
                <span style={css("font-size:0.62rem;font-weight:500;padding:0.16rem 0.5rem;border-radius:999px;background:color-mix(in srgb," + p.wkColor + " 15%,white 85%);color:" + p.wkColor)}>{p.invited ? "Invited" : p.wkLabel}</span>
              </div>
              <div style={css("display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-2)")}>
                <div style={css("text-align:center;padding:0.5rem 0.3rem;background:var(--surface-alt);border-radius:var(--radius-sm)")}><div style={css("font-size:1.05rem;font-weight:500;line-height:1")}>{p.clients}</div><div style={css("font-size:0.62rem;color:var(--fg-faint);margin-top:0.15rem")}>Clients</div></div>
                <div style={css("text-align:center;padding:0.5rem 0.3rem;background:var(--surface-alt);border-radius:var(--radius-sm)")}><div style={css("font-size:1.05rem;font-weight:500;line-height:1")}>{p.activeTasks}</div><div style={css("font-size:0.62rem;color:var(--fg-faint);margin-top:0.15rem")}>Tasks</div></div>
                <div style={css("text-align:center;padding:0.5rem 0.3rem;background:var(--surface-alt);border-radius:var(--radius-sm)")}><div style={css("font-size:1.05rem;font-weight:500;line-height:1")}>{p.invited ? "—" : p.prod + "%"}</div><div style={css("font-size:0.62rem;color:var(--fg-faint);margin-top:0.15rem")}>Productivity</div></div>
              </div>
              <div>
                <div style={css("display:flex;justify-content:space-between;font-size:var(--text-2xs);color:var(--fg-muted);margin-bottom:0.1rem")}><span>Workload</span><span>{p.load}%</span></div>
                <div style={css("height:0.4rem;border-radius:999px;background:oklch(0.94 0.006 50);overflow:hidden")}><div style={css("width:" + p.load + "%;height:100%;border-radius:999px;background:" + p.wkColor)} /></div>
              </div>
              {p.invited ? (
                <div style={css("font-size:0.8rem;color:var(--fg-faint);font-style:italic")}>Onboarding — no projects assigned yet.</div>
              ) : (
                <div style={css("display:flex;flex-direction:column;gap:0.4rem")}>
                  {p.projs.map(pr => {
                    const hm = healthMap(pr.health);
                    const stageLabel = pr.stage.split(" · ").slice(-1)[0];
                    return (
                      <div key={pr.id} style={css("display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:0.6rem;padding:0.5rem 0.7rem;border-radius:var(--radius-sm);background:var(--surface-alt)")}>
                        <div style={css("display:flex;align-items:center;gap:0.6rem;min-width:0")}>
                          <span style={css("width:0.5rem;height:0.5rem;border-radius:50%;flex-shrink:0;background:" + SVC_META[pr.service].color)} />
                          <span style={css("font-weight:500;font-size:var(--text-base);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{pr.client}</span>
                        </div>
                        <div style={css("display:flex;align-items:center;justify-content:flex-end;gap:0.45rem;flex-wrap:wrap")}>
                          <span style={css("display:inline-flex;align-items:center;padding:0.16rem 0.48rem;border-radius:999px;background:oklch(0.96 0.006 50);color:var(--fg-muted);font-size:0.68rem;font-weight:500;white-space:nowrap")}>{stageLabel}</span>
                          <span style={css("display:inline-flex;align-items:center;padding:0.16rem 0.48rem;border-radius:999px;background:color-mix(in srgb," + healthColor(pr.health) + " 10%,white 90%);color:" + healthColor(pr.health) + ";font-size:0.68rem;font-weight:500;white-space:nowrap")}>{hm[1]}</span>
                          <span style={css("font-size:0.7rem;color:var(--fg-faint);min-width:2.9rem;text-align:right;white-space:nowrap")}>{pr.due}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
