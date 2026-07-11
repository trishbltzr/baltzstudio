"use client";

import { useState } from "react";
import { Icon } from "../icons";
import { css, initials, laneMeta, prioTag, roleMeta } from "../helpers";
import { CHECKLIST_TEMPLATES, TASK_DESCRIPTIONS } from "../data";
import type { PortalActions, PortalState } from "../store";
import type { TaskStatus } from "../types";

const FRAC: Record<TaskStatus, number> = { todo: 0, in_progress: 0.5, review: 0.8, done: 1 };
const STATUS_BTNS: [TaskStatus, string][] = [["todo", "To Do"], ["in_progress", "In Progress"], ["review", "In Review"], ["done", "Done"]];

export function TaskModal({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const tmd = state.tasks.find(t => t.id === state.taskModal);
  if (!tmd) return null;
  const lm = laneMeta(tmd.owner || "studio");
  const bk = tmd.blockedBy ? state.tasks.find(x => x.id === tmd.blockedBy) : null;
  const isBlocked = !!(bk && bk.status !== "done");

  const clItems = CHECKLIST_TEMPLATES[tmd.owner || "studio"] || CHECKLIST_TEMPLATES.studio;
  const defDone = Math.round(clItems.length * FRAC[tmd.status]);
  const override = state.taskChecks[tmd.id] || {};
  const checklist = clItems.map((label, i) => {
    const done = i in override ? override[i] : i < defDone;
    return { label, done, i };
  });
  const chkDone = checklist.filter(c => c.done).length;
  const chkTotal = checklist.length;
  const chkPct = Math.round((chkDone / Math.max(chkTotal, 1)) * 100);

  const seed = [{ who: tmd.assignee, text: tmd.status === "done" ? "Marked this done — all set." : tmd.status === "review" ? "Ready for review whenever you have a moment." : "Started on this, will flag if anything blocks it.", time: "Yesterday", me: false }];
  const comments = [...seed, ...(state.taskComments[tmd.id] || [])];
  const assignees = Array.from(new Set(["Trish Baltazar", "Noa Vega", "Emet Rowe", "Assistant", ...state.tasks.map(t => t.assignee)]));

  const close = () => { setAssigneeOpen(false); actions.patch({ taskModal: null }); };

  return (
    <div onClick={close} style={{ ...css("position:fixed;inset:0;background:rgba(30,22,15,.42);z-index:95;display:flex;align-items:center;justify-content:center;padding:var(--space-6)"), animation: "pt-fadein .15s ease" }}>
      <div onClick={e => e.stopPropagation()} style={{ ...css("width:33rem;max-width:100%;max-height:88vh;overflow-y:auto;background:var(--surface);border-radius:var(--radius-panel)"), animation: "pt-ddin .18s ease" }}>
        <div style={css("padding:1.1rem 1.4rem 0;display:flex;align-items:center;justify-content:space-between")}>
          <span style={css("display:inline-flex;align-items:center;gap:0.35rem;font-size:0.62rem;font-weight:500;letter-spacing:0.02em;padding:0.15rem 0.5rem;border-radius:5px;background:" + lm.s + ";color:color-mix(in srgb," + lm.c + " 60%,black 40%)")}><span style={css("width:0.45rem;height:0.45rem;border-radius:50%;flex-shrink:0;background:" + lm.c)} />{lm.label}</span>
          <button onClick={close} className="pt-menuitem" style={css("width:2rem;height:2rem;border-radius:50%;border:none;background:transparent;display:grid;place-items:center;cursor:pointer;color:var(--fg-muted)")}><Icon name="x" size={16} /></button>
        </div>

        <div style={css("padding:0.5rem 1.4rem 1.1rem;border-bottom:1px solid var(--border-soft)")}>
          <h2 style={css("margin:0 0 0.3rem;font-size:var(--text-2xl);font-weight:500;line-height:1.25")}>{tmd.title}</h2>
          <div style={css("font-size:var(--text-base);color:var(--fg-muted)")}>{tmd.project}</div>
          <p style={css("margin:0.6rem 0 0;font-size:0.86rem;line-height:1.5;color:var(--fg-muted)")}>{TASK_DESCRIPTIONS[tmd.id] || "No description added yet."}</p>
        </div>

        <div style={css("padding:1.1rem 1.4rem;display:grid;grid-template-columns:1fr 1fr;gap:0.85rem 1.1rem;border-bottom:1px solid var(--border-soft)")}>
          <div>
            <div style={css("font-size:var(--text-2xs);letter-spacing:0.02em;color:var(--fg-faint);margin-bottom:0.3rem")}>Assignee</div>
            <div style={{ position: "relative" }}>
              <button onClick={() => setAssigneeOpen(v => !v)} style={css("display:inline-flex;align-items:center;gap:0.4rem;font-size:0.86rem;padding:0.34rem 0.55rem;border-radius:var(--radius-pill);border:1px solid var(--border);background:var(--surface);color:var(--fg);cursor:pointer")}>
                <span style={css("width:1.35rem;height:1.35rem;border-radius:50%;background:var(--accent-soft);color:var(--accent);font-size:0.55rem;font-weight:500;display:grid;place-items:center")}>{initials(tmd.assignee)}</span>
                <span>{tmd.assignee}</span>
                <Icon name="chev" size={13} />
              </button>
              {assigneeOpen && (
                <>
                  <div onClick={() => setAssigneeOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 97 }} />
                  <div style={css("position:absolute;top:calc(100% + 0.35rem);left:0;z-index:98;min-width:13rem;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;padding:0.2rem 0")}>
                    {assignees.map(name => (
                      <button
                        key={name}
                        onClick={() => { actions.assignTask(tmd.id, name); setAssigneeOpen(false); }}
                        className="pt-dditem"
                        style={css("display:flex;align-items:center;gap:var(--space-2);width:100%;padding:0.52rem 0.75rem;border:0;background:" + (tmd.assignee === name ? "var(--surface-alt)" : "transparent") + ";font-size:0.78rem;color:var(--fg);cursor:pointer;text-align:left")}
                      >
                        <span style={css("width:1.3rem;height:1.3rem;border-radius:50%;background:var(--accent-soft);color:var(--accent);font-size:0.54rem;font-weight:500;display:grid;place-items:center;flex-shrink:0")}>{initials(name)}</span>
                        <span style={css("flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{name}</span>
                        {tmd.assignee === name && <Icon name="checkmark" size={13} />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          <div>
            <div style={css("font-size:var(--text-2xs);letter-spacing:0.02em;color:var(--fg-faint);margin-bottom:0.3rem")}>Due</div>
            <span style={css("display:inline-flex;align-items:center;gap:0.35rem;font-size:0.86rem;color:var(--fg-muted)")}><Icon name="cal" size={12} />{tmd.due || "Not set"}</span>
          </div>
          <div>
            <div style={css("font-size:var(--text-2xs);letter-spacing:0.02em;color:var(--fg-faint);margin-bottom:0.3rem")}>Priority</div>
            <span style={css(prioTag(tmd.priority))}>{tmd.priority.charAt(0).toUpperCase() + tmd.priority.slice(1)}</span>
          </div>
          {isBlocked && bk && (
            <div>
              <div style={css("font-size:var(--text-2xs);letter-spacing:0.02em;color:var(--fg-faint);margin-bottom:0.3rem")}>Blocked By</div>
              <button onClick={() => actions.patch({ taskModal: bk.id })} style={css("display:flex;align-items:center;gap:0.4rem;text-align:left;padding:0.35rem 0.55rem;border-radius:var(--radius-sm);border:1px solid var(--warn);background:var(--warn-soft);cursor:pointer;max-width:100%")}>
                <span style={css("width:0.45rem;height:0.45rem;border-radius:50%;flex-shrink:0;background:var(--warn)")} />
                <span style={css("min-width:0;font-size:0.78rem;font-weight:500;color:var(--fg);overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{bk.title}</span>
              </button>
            </div>
          )}
        </div>

        <div style={css("padding:1.1rem 1.4rem;border-bottom:1px solid var(--border-soft)")}>
          <div style={css("display:flex;align-items:center;justify-content:space-between;margin-bottom:0.6rem")}>
            <div style={css("font-size:0.7rem;font-weight:500;letter-spacing:0.02em;color:var(--fg-faint)")}>Checklist</div>
            <div style={css("font-size:var(--text-xs);color:var(--fg-muted)")}>{chkDone} of {chkTotal}</div>
          </div>
          <div style={css("height:0.3rem;background:var(--surface-alt);border-radius:999px;overflow:hidden;margin-bottom:0.7rem")}><div style={css("height:100%;width:" + chkPct + "%;background:var(--accent);border-radius:999px;transition:width .2s")} /></div>
          <div style={css("display:flex;flex-direction:column;gap:0.15rem")}>
            {checklist.map(c => (
              <button key={c.i} onClick={() => actions.toggleCheck(tmd.id, c.i)} className="pt-dditem" style={css("display:flex;align-items:center;gap:0.6rem;text-align:left;padding:0.4rem 0.3rem;border:none;background:transparent;cursor:pointer;border-radius:var(--radius-sm)")}>
                <span style={css("width:1.15rem;height:1.15rem;border-radius:0.3rem;flex-shrink:0;display:grid;place-items:center;transition:all .12s;border:1.5px solid " + (c.done ? "var(--accent)" : "var(--border)") + ";background:" + (c.done ? "var(--accent)" : "transparent") + ";color:#fff")}>{c.done && <Icon name="checkmark" size={13} />}</span>
                <span style={css("flex:1;font-size:0.85rem;line-height:1.35;" + (c.done ? "color:var(--fg-faint);text-decoration:line-through" : "color:var(--fg)"))}>{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={css("padding:1.1rem 1.4rem;border-bottom:1px solid var(--border-soft)")}>
          <div style={css("font-size:0.7rem;font-weight:500;letter-spacing:0.02em;color:var(--fg-faint);margin-bottom:0.7rem")}>Activity</div>
          <div style={css("display:flex;flex-direction:column;gap:0.6rem;margin-bottom:0.8rem")}>
            {comments.map((m, i) => (
              <div key={i} style={css("display:flex;align-items:flex-start;gap:var(--space-2);" + (m.me ? "flex-direction:row-reverse" : ""))}>
                <span style={css("width:1.5rem;height:1.5rem;border-radius:50%;flex-shrink:0;display:grid;place-items:center;font-size:0.55rem;font-weight:500;" + (m.me ? "background:var(--accent);color:#fff" : "background:var(--surface-alt);color:var(--fg-muted);border:1px solid var(--border-soft)"))}>{initials(m.who)}</span>
                <div style={css("max-width:80%;padding:0.5rem 0.7rem;border-radius:var(--radius);font-size:var(--text-base);line-height:1.4;" + (m.me ? "background:var(--accent-soft);color:var(--fg)" : "background:var(--surface-alt);color:var(--fg)"))}>
                  <span style={{ fontWeight: 500 }}>{m.who}</span> · <span style={css("color:var(--fg-faint);font-size:var(--text-xs)")}>{m.time}</span>
                  <div style={{ marginTop: "0.15rem" }}>{m.text}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={css("display:flex;align-items:center;gap:var(--space-2);border:1px solid var(--border-soft);border-radius:var(--radius-pill);padding:0.25rem 0.25rem 0.25rem 0.85rem;background:var(--surface)")}>
            <input value={state.taskCommentDraft} onChange={e => actions.patch({ taskCommentDraft: e.target.value })} onKeyDown={e => { if (e.key === "Enter") actions.addTaskComment(tmd.id, roleMeta(state.role).name); }} placeholder="Add a comment…" style={css("flex:1;border:none;background:transparent;outline:none;font-size:0.85rem;color:var(--fg)")} />
            <button onClick={() => actions.addTaskComment(tmd.id, roleMeta(state.role).name)} className="pt-op" style={css("display:inline-flex;align-items:center;gap:0.3rem;height:2rem;padding:0 0.9rem;border-radius:var(--radius-pill);border:none;background:var(--accent);color:#fff;font-size:0.78rem;font-weight:500;cursor:pointer")}>Send</button>
          </div>
        </div>

        <div style={css("padding:1.1rem 1.4rem 1.4rem")}>
          <div style={css("font-size:0.7rem;font-weight:500;letter-spacing:0.02em;color:var(--fg-faint);margin-bottom:0.5rem")}>Status</div>
          <div style={css("display:flex;gap:0.4rem")}>
            {STATUS_BTNS.map(([k, l]) => {
              const on = tmd.status === k;
              return <button key={k} onClick={() => actions.moveTask(tmd.id, k)} style={css("flex:1;text-align:center;font-size:var(--text-xs);font-weight:500;padding:0.5rem 0.3rem;border-radius:var(--radius);cursor:pointer;transition:all .12s;border:1px solid " + (on ? "var(--accent)" : "var(--border-soft)") + ";background:" + (on ? "var(--accent-soft)" : "var(--surface)") + ";color:" + (on ? "var(--accent)" : "var(--fg-muted)"))}>{l}</button>;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
