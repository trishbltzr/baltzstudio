"use client";

import { useEffect, useState } from "react";
import { Icon } from "../icons";
import { css, milestoneStatusFromGate, statusPill } from "../helpers";
import { MILESTONES } from "../data";
import type { PortalActions, PortalState } from "../store";
import type { JourneyGate, JourneyRequest } from "../types";

const REQUEST_TAGS = ["Copy", "Layout", "Images", "Mobile", "Functionality"];

function node(st: string) {
  if (st === "done") return { nodeStyle: "background:var(--success);border:1.5px solid var(--success);color:#fff", textColor: "var(--fg)", pill: statusPill("done"), pillLabel: "Completed" };
  if (st === "awaiting") return { nodeStyle: "background:var(--warn-soft);border:1.5px dashed var(--warn)", textColor: "var(--warn)", pill: statusPill("review"), pillLabel: "Awaiting you" };
  if (st === "in_revision") return { nodeStyle: "background:var(--warn-soft);border:1.5px solid var(--warn);color:var(--warn)", textColor: "var(--warn)", pill: statusPill("review"), pillLabel: "In revision" };
  if (st === "ready") return { nodeStyle: "background:var(--warn-soft);border:1.5px solid var(--warn);color:var(--warn)", textColor: "var(--warn)", pill: statusPill("review"), pillLabel: "Re-review" };
  return { nodeStyle: "background:var(--surface-alt);border:1.5px solid var(--border)", textColor: "var(--fg-muted)", pill: statusPill("waiting"), pillLabel: "Upcoming" };
}

function approvalTitle(gate: JourneyGate) {
  if (gate.g === 1) return "Copy Approval — Ready for your review";
  if (gate.g === 2) return "Initial Design Approval — Ready for your review";
  return "Functionality Test Approval — Ready for your review";
}

function approvalDescription(gate: JourneyGate) {
  if (gate.g === 1) return "Approved — thank you! We’re moving forward to the next phase.";
  if (gate.g === 2) return "Review the full-site direction and confirm whether the look, hierarchy, and flow are ready to move into launch prep.";
  return "This opens once the current phase wraps and the final functionality check is ready.";
}

function approvalSentLabel(gate: JourneyGate) {
  if (gate.g === 1) return "Sent Jun 4";
  if (gate.g === 2) return "Sent Jun 5";
  return "Unlocks after Milestone 2";
}

function approvalTone(gate: JourneyGate) {
  if (gate.status === "approved") return { accent: "var(--success)", soft: "var(--success-soft)", border: "color-mix(in srgb,var(--success) 20%,var(--border-soft) 80%)" };
  if (gate.status === "in_revision") return { accent: "var(--warn)", soft: "var(--warn-soft)", border: "color-mix(in srgb,var(--warn) 22%,var(--border-soft) 78%)" };
  if (gate.status === "locked") return { accent: "var(--fg-faint)", soft: "var(--surface-alt)", border: "var(--border-soft)" };
  return { accent: "var(--warn)", soft: "var(--warn-soft)", border: "color-mix(in srgb,var(--warn) 34%,var(--border-soft) 66%)" };
}

export function Journey({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const [requestGateId, setRequestGateId] = useState<string | null>(null);
  const [requestNote, setRequestNote] = useState("");
  const [requestTags, setRequestTags] = useState<string[]>([]);
  const [requestSeverity, setRequestSeverity] = useState<JourneyRequest["severity"]>("blocking");
  const gates = state.journeyGates;

  useEffect(() => {
    let changed = false;
    const synced = gates.map(gate => {
      if (!gate.request?.threadId) return gate;
      const thread = state.threads.find(item => item.id === gate.request?.threadId);
      if (!thread) return gate;

      const assignee = thread.assignee || gate.request.assignee;
      const ticketId = thread.ticketId || gate.request.ticketId;
      const requestChanged = assignee !== gate.request.assignee || ticketId !== gate.request.ticketId;
      const lastMessage = thread.messages.at(-1);
      const lastStudioMessage = [...thread.messages].reverse().find(message => message.from === "studio");

      if (gate.status === "in_revision" && lastMessage?.from === "studio" && lastStudioMessage) {
        changed = true;
        return {
          ...gate,
          status: "ready" as const,
          when: "Updated review posted " + lastStudioMessage.time,
          eta: "Ready again for your sign-off · launch stays on track",
          request: {
            ...gate.request,
            assignee,
            ticketId,
            studioReply: lastStudioMessage.text,
            readyAt: lastStudioMessage.time,
          },
        };
      }

      if (requestChanged) {
        changed = true;
        return {
          ...gate,
          request: {
            ...gate.request,
            assignee,
            ticketId,
          },
        };
      }

      return gate;
    });

    if (changed) actions.patch({ journeyGates: synced });
  }, [actions, gates, state.threads]);

  const approve = (id: string) => {
    actions.update(s => {
      const idx = s.journeyGates.findIndex(g => g.id === id);
      return {
        journeyGates: s.journeyGates.map((gate, index) =>
          index === idx
            ? { ...gate, status: "approved" as const, when: "Approved just now", eta: "Signed off and moving forward" }
            : index === idx + 1 && gate.status === "locked"
              ? { ...gate, status: "awaiting" as const, when: "Opened just now" }
              : gate,
        ),
      };
    });
    actions.showToast("Gate approved — the studio has been notified");
  };

  const openRequest = (id: string) => {
    const gate = gates.find(item => item.id === id);
    setRequestGateId(id);
    setRequestNote("");
    setRequestTags(gate?.request?.tags || []);
    setRequestSeverity(gate?.request?.severity || "blocking");
  };

  const closeRequest = () => {
    setRequestGateId(null);
    setRequestNote("");
    setRequestTags([]);
    setRequestSeverity("blocking");
  };

  const submitRequest = () => {
    if (!requestGateId) return;
    const trimmed = requestNote.trim();
    const note = trimmed || "A few refinements before approval.";
    const gate = gates.find(item => item.id === requestGateId);
    const route = actions.createJourneyRequest({
      existingThreadId: gate?.request?.threadId,
      title: gate ? "Milestone " + gate.g + " — " + gate.title : "Milestone review",
      clientName: "Flora & Co.",
      note,
      tags: requestTags,
      severity: requestSeverity,
    });
    actions.update(s => ({
      journeyGates: s.journeyGates.map(item => item.id === requestGateId ? {
        ...item,
        status: "in_revision" as const,
        when: "Changes requested just now",
        eta: requestSeverity === "blocking" ? "Studio revising now · updated review expected July 5" : "Studio polishing this round · updated review expected July 5",
        request: {
          note,
          tags: requestTags,
          severity: requestSeverity,
          requestedAt: "July 4",
          dueBack: "July 5",
          round: (item.request?.round || 0) + 1,
          ticketId: route.ticketId,
          threadId: route.threadId,
          assignee: route.assignee,
        },
      } : item),
    }));
    closeRequest();
    actions.showToast("Change request sent — " + route.ticketId + " is with " + route.assignee);
  };

  const openPreview = () => {
    actions.setView("files");
    actions.showToast("Opening the shared preview files");
  };

  const activeGate = gates.find(gate => gate.status === "awaiting" || gate.status === "in_revision" || gate.status === "ready") || gates[gates.length - 1];
  const dynamicMilestones = MILESTONES.map((milestone, index) => {
    if (index === 2) return { ...milestone, status: milestoneStatusFromGate(gates[0]?.status || "approved"), detail: gates[0]?.status === "approved" ? "You approved the homepage & key page directions." : milestone.detail };
    if (index === 3) {
      const current = gates[1];
      return {
        ...milestone,
        status: milestoneStatusFromGate(current?.status || "awaiting"),
        detail: current?.status === "in_revision"
          ? "The studio is revising this round based on your feedback."
          : current?.status === "ready"
            ? "A revised build is ready for your sign-off."
            : milestone.detail,
      };
    }
    if (index === 4) return { ...milestone, status: milestoneStatusFromGate(gates[2]?.status || "locked"), detail: gates[2]?.status === "awaiting" ? "Launch prep has opened and is ready for your final review." : milestone.detail };
    return milestone;
  });
  const approvalStats = [
    { label: "Waiting On You", value: gates.filter(gate => gate.status === "awaiting" || gate.status === "ready").length, active: true },
    { label: "Approved", value: gates.filter(gate => gate.status === "approved").length },
    { label: "In Progress", value: gates.filter(gate => gate.status === "in_revision").length },
    { label: "Coming Up", value: gates.filter(gate => gate.status === "locked").length },
  ];
  const approvalGroups = [
    { code: "M1", title: "Funnel Foundation", gates: gates.slice(0, 1) },
    { code: "M2", title: "Funnel Design & Build", gates: gates.slice(1) },
  ].filter(group => group.gates.length > 0);

  return (
    <div style={css("display:flex;flex-direction:column;gap:0.85rem")}>
      <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface-alt);padding:1.45rem 1.3rem")}>
        <div style={css("padding:0.1rem 0 1.15rem;text-align:center;max-width:44rem;margin:0 auto")}>
          <div>
            <div style={css("font-size:var(--text-2xs);letter-spacing:0.015em;color:var(--fg-faint);font-weight:500;margin-bottom:0.3rem")}>Current Checkpoint</div>
            <div style={css("font-size:1.28rem;font-weight:500;line-height:1.15;color:var(--fg)")}>Milestone {activeGate.g} — {activeGate.title}</div>
            <div style={css("font-size:var(--text-base);color:var(--fg-muted);margin-top:0.26rem;line-height:1.45")}>{activeGate.when} · {activeGate.eta}</div>
          </div>
        </div>

        <div style={css("display:flex;align-items:flex-start;overflow-x:auto;padding-bottom:0.2rem")}>
          {dynamicMilestones.map((milestone, index) => {
            const n = node(milestone.status);
            const prevDone = index > 0 && dynamicMilestones[index - 1].status === "done";
            const last = index === MILESTONES.length - 1;
            const hLeft = index === 0 ? "transparent" : (prevDone ? "var(--success)" : "var(--border)");
            const hRight = last ? "transparent" : (milestone.status === "done" ? "var(--success)" : "var(--border)");
            const title = milestone.title.replace(/ — .*/, "");
            const sub = milestone.title.includes("—") ? milestone.title.split("—")[1].trim() : "";
            return (
              <div key={milestone.title} style={css("flex:1;min-width:8.2rem;display:flex;flex-direction:column;align-items:center;text-align:center")}>
                <div style={css("display:flex;align-items:center;width:100%")}>
                  <span style={css("height:1.5px;flex:1;background:" + hLeft)} />
                  <span style={css("width:1.8rem;height:1.8rem;border-radius:50%;flex-shrink:0;display:grid;place-items:center;" + n.nodeStyle)}>{milestone.status === "done" && <Icon name="checkmark" size={13} />}</span>
                  <span style={css("height:1.5px;flex:1;background:" + hRight)} />
                </div>
                <div style={css("margin-top:0.6rem;padding:0 0.4rem")}>
                  <div style={css("font-weight:500;font-size:var(--text-base);line-height:1.25;color:" + n.textColor)}>{title}</div>
                  <div style={css("font-size:var(--text-xs);color:var(--fg-muted);line-height:1.2;margin-top:0.1rem")}>{sub}</div>
                  <span style={{ marginTop: "0.4rem", display: "inline-block", ...css(n.pill) }}>{n.pillLabel}</span>
                  <div style={css("font-size:var(--text-2xs);color:var(--fg-faint);margin-top:0.35rem")}>{milestone.mon} {milestone.day}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={css("border-top:1px solid var(--border-soft);margin:1.3rem -1.3rem 0;padding:1.3rem 1.3rem 0")}>
          <div style={css("display:grid;grid-template-columns:" + (state.isMobile ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))") + ";gap:0.6rem;margin-bottom:1.25rem")}>
            {approvalStats.map(stat => (
              <div key={stat.label} className="pt-approval-stat" style={css("border:1px solid " + (stat.active ? "color-mix(in srgb,var(--warn) 34%,var(--border-soft) 66%)" : "var(--border-soft)") + ";background:" + (stat.active ? "linear-gradient(135deg,color-mix(in srgb,var(--warn-soft) 58%,white 42%),var(--surface))" : "var(--surface)"))}>
                <div style={css("display:flex;align-items:center;justify-content:space-between;gap:0.6rem")}>
                  <div style={css("font-size:1.55rem;font-weight:500;line-height:1;color:" + (stat.active ? "color-mix(in srgb,var(--warn) 65%,black 35%)" : "var(--fg)") )}>{stat.value}</div>
                  <span style={css("width:0.48rem;height:0.48rem;border-radius:50%;background:" + (stat.active ? "var(--warn)" : "var(--border)") + ";flex-shrink:0")} />
                </div>
                <div style={css("margin-top:0.34rem;font-size:0.84rem;font-weight:500;color:var(--fg-muted);line-height:1.25")}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div style={css("display:flex;flex-direction:column;gap:1.1rem")}>
            {approvalGroups.map(group => {
              const approved = group.gates.filter(gate => gate.status === "approved").length;
              const total = group.gates.length;
              const complete = total > 0 && approved === total;
              const pct = total ? Math.round((approved / total) * 100) : 0;
              const badgeStyle = complete
                ? "background:var(--success-soft);border:1px solid color-mix(in srgb,var(--success) 24%,transparent);color:var(--success)"
                : "background:var(--surface-alt);border:1px solid var(--border-soft);color:var(--fg-muted)";
              return (
                <section key={group.code} style={css("display:flex;flex-direction:column;gap:0.65rem")}>
                  <div style={css("display:flex;align-items:center;justify-content:space-between;gap:0.8rem;padding-bottom:0.55rem;border-bottom:1px solid var(--border-soft)")}>
                    <div style={css("display:flex;align-items:center;gap:0.6rem;min-width:0")}>
                      <span style={css("display:inline-flex;align-items:center;justify-content:center;min-width:1.95rem;height:1.65rem;padding:0 0.45rem;border-radius:0.55rem;font-size:var(--text-xs);font-weight:600;letter-spacing:0.01em;flex-shrink:0;" + badgeStyle)}>{group.code}</span>
                      <h3 style={css("margin:0;font-size:var(--text-lg);font-weight:500;color:var(--fg);line-height:1.25;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{group.title}</h3>
                    </div>
                    <div style={css("display:flex;align-items:center;gap:0.55rem;flex-shrink:0")}>
                      <span style={css("width:2.75rem;height:0.32rem;border-radius:999px;background:var(--border-soft);overflow:hidden")} aria-hidden="true"><span style={css("display:block;height:100%;width:" + pct + "%;border-radius:999px;background:" + (complete ? "var(--success)" : "var(--fg-faint)") + ";transition:width .3s ease")} /></span>
                      <span style={css("font-size:0.76rem;font-weight:500;white-space:nowrap;color:" + (complete ? "var(--success)" : "var(--fg-faint)"))}>{approved} of {total} approved</span>
                    </div>
                  </div>

                  <div style={css("display:flex;flex-direction:column;gap:0.65rem")}>
                    {group.gates.map(gate => {
                      const tone = approvalTone(gate);
                      const active = gate.status === "awaiting" || gate.status === "ready";
                      const approvedGate = gate.status === "approved";
                      const locked = gate.status === "locked";
                      return (
                        <article key={gate.id} className="pt-approval-card" style={css("border:1px solid " + tone.border + ";--approval-accent:" + tone.accent + ";--approval-soft:" + tone.soft + ";opacity:" + (locked ? "0.78" : "1"))}>
                          <div className="pt-approval-card-head" style={css("background:" + (active ? "linear-gradient(135deg,color-mix(in srgb," + tone.soft + " 70%,white 30%),var(--surface))" : "var(--surface)"))}>
                            <div style={{ minWidth: 0 }}>
                              <h4 style={css("margin:0;font-size:var(--text-lg);font-weight:500;line-height:1.25;color:" + (locked ? "var(--fg-muted)" : "var(--fg)"))}>{approvalTitle(gate)}</h4>
                              <div style={css("margin-top:0.22rem;font-size:0.78rem;color:var(--fg-muted)")}>{approvalSentLabel(gate)}</div>
                            </div>
                            {active && (
                              <span style={css("display:inline-flex;align-items:center;gap:0.35rem;font-size:0.72rem;font-weight:500;color:var(--warn);white-space:nowrap;flex-shrink:0")}>
                                <span style={css("width:0.42rem;height:0.42rem;border-radius:50%;background:var(--warn)")} />Needs you
                              </span>
                            )}
                          </div>

                          <div style={css("padding:1.05rem")}>
                            {approvedGate ? (
                              <div style={css("display:flex;align-items:center;gap:var(--space-3)")}>
                                <span style={css("width:2.4rem;height:2.4rem;border-radius:50%;display:grid;place-items:center;background:var(--success-soft);color:var(--success);flex-shrink:0")}><Icon name="checkmark" size={17} /></span>
                                <div>
                                  <div style={css("font-size:var(--text-lg);font-weight:500;color:var(--fg);line-height:1.25")}>Approved — thank you!</div>
                                  <p style={css("margin:0.18rem 0 0;font-size:var(--text-base);color:var(--fg-muted);line-height:1.4")}>We’re moving forward to the next phase.</p>
                                </div>
                              </div>
                            ) : locked ? (
                              <div style={css("display:flex;align-items:center;gap:var(--space-3);color:var(--fg-muted)")}>
                                <span style={css("width:2.2rem;height:2.2rem;border-radius:50%;display:grid;place-items:center;background:var(--surface-alt);color:var(--fg-faint);flex-shrink:0")}><Icon name="lock" size={16} /></span>
                                <div>
                                  <div style={css("font-size:var(--text-base);font-weight:500;color:var(--fg-muted);line-height:1.25")}>{approvalDescription(gate)}</div>
                                  <p style={css("margin:0.18rem 0 0;font-size:var(--text-base);color:var(--fg-faint)")}>{gate.when}</p>
                                </div>
                              </div>
                            ) : (
                              <div style={css("display:flex;flex-direction:column;gap:0.9rem")}>
                                <p style={css("margin:0;font-size:var(--text-base);line-height:1.55;color:var(--fg)")}>{approvalDescription(gate)}</p>
                                <div className="pt-approval-note">
                                  <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint)")}>Notes from studio</div>
                                  <p style={css("margin:0.42rem 0 0;font-size:var(--text-base);line-height:1.45;color:var(--fg)")}>{gate.request?.studioReply || gate.request?.note || "Studio-first checkpoint: Admin approved the design direction before client review."}</p>
                                </div>
                                {gate.request && (
                                  <div style={css("display:grid;grid-template-columns:" + (state.isMobile ? "1fr" : "repeat(3,minmax(0,1fr))") + ";gap:0.55rem")}>
                                    <div className="pt-approval-action-card">
                                      <span className="pt-approval-step">1</span>
                                      <div>
                                        <div style={css("font-size:var(--text-base);font-weight:500;color:var(--fg)")}>Review the design</div>
                                        <button type="button" onClick={openPreview} className="pt-approval-mini-btn" style={css("border-color:var(--success-soft);background:color-mix(in srgb,var(--success-soft) 42%,white 58%);color:var(--success)")}>
                                          <Icon name="eye" size={14} />Open preview
                                        </button>
                                      </div>
                                    </div>
                                    <div className="pt-approval-action-card">
                                      <span className="pt-approval-step">2</span>
                                      <div>
                                        <div style={css("font-size:var(--text-base);font-weight:500;color:var(--fg)")}>Your decision</div>
                                        <div style={css("display:flex;gap:0.45rem;flex-wrap:wrap;margin-top:0.45rem")}>
                                          <button onClick={() => approve(gate.id)} className="pt-approval-mini-btn" style={css("border-color:var(--border);background:var(--surface);color:var(--fg)")}><Icon name="thumbs" size={14} />Approve</button>
                                          <button onClick={() => openRequest(gate.id)} className="pt-approval-mini-btn" style={css("border-color:var(--border);background:var(--surface);color:var(--fg)")}>Notes needed</button>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="pt-approval-action-card is-muted">
                                      <span className="pt-approval-step">3</span>
                                      <div>
                                        <div style={css("font-size:var(--text-base);font-weight:500;color:var(--fg-muted)")}>Mark up changes</div>
                                        <div style={css("margin-top:0.45rem;height:2rem;display:inline-flex;align-items:center;padding:0 0.85rem;border-radius:0.65rem;border:1px solid var(--border-soft);background:var(--surface);color:var(--fg-faint);font-size:0.78rem;font-weight:500")}>Markup board</div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>

      {requestGateId && (
        <div onClick={closeRequest} style={{ ...css("position:fixed;inset:0;background:rgba(30,22,15,.32);z-index:80;display:flex;align-items:flex-end;justify-content:center;padding:var(--space-4)"), animation: "pt-fadein .15s ease" }}>
          <div onClick={event => event.stopPropagation()} style={{ ...css("width:36rem;max-width:100%;background:var(--surface);border:1px solid var(--border-soft);border-radius:1.1rem 1.1rem 0 0;padding:1rem 1rem 1.05rem;display:flex;flex-direction:column;gap:0.8rem"), animation: "pt-ddin .18s ease" }}>
            <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3)")}>
              <div>
                <div style={css("font-size:0.64rem;letter-spacing:0.02em;color:var(--fg-faint);font-weight:500;margin-bottom:0.2rem")}>Request Changes</div>
                <div style={css("font-size:var(--text-lg);font-weight:500;line-height:1.2;color:var(--fg)")}>Tell the studio what should change before you approve.</div>
              </div>
              <button onClick={closeRequest} className="pt-iconbtn" style={css("width:2rem;height:2rem;border-radius:50%;border:1px solid var(--border);background:var(--surface);display:grid;place-items:center;cursor:pointer;color:var(--fg-muted);flex-shrink:0")}><Icon name="x" size={15} /></button>
            </div>

            <div style={css("display:flex;gap:0.4rem;flex-wrap:wrap")}>
              {REQUEST_TAGS.map(tag => {
                const on = requestTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setRequestTags(current => current.includes(tag) ? current.filter(item => item !== tag) : [...current, tag])}
                    style={css("height:1.8rem;padding:0 0.75rem;border-radius:999px;border:1px solid " + (on ? "var(--accent)" : "var(--border)") + ";background:" + (on ? "var(--accent-soft)" : "var(--surface)") + ";color:" + (on ? "var(--accent)" : "var(--fg-muted)") + ";font-size:var(--text-xs);font-weight:500;cursor:pointer")}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>

            <div style={css("display:flex;gap:0.45rem;flex-wrap:wrap")}>
              {[
                ["blocking", "Blocking before approval"],
                ["refine", "Nice to refine"],
              ].map(([id, label]) => {
                const on = requestSeverity === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setRequestSeverity(id as JourneyRequest["severity"])}
                    style={css("display:inline-flex;align-items:center;gap:0.35rem;height:1.9rem;padding:0 0.78rem;border-radius:999px;border:1px solid " + (on ? "var(--accent)" : "var(--border)") + ";background:" + (on ? "var(--accent-soft)" : "var(--surface)") + ";color:" + (on ? "var(--accent)" : "var(--fg-muted)") + ";font-size:var(--text-xs);font-weight:500;cursor:pointer")}
                  >
                    <span style={css("width:0.46rem;height:0.46rem;border-radius:50%;background:" + (on ? "var(--accent)" : "var(--fg-faint)"))} />
                    {label}
                  </button>
                );
              })}
            </div>

            <textarea
              value={requestNote}
              onChange={event => setRequestNote(event.target.value)}
              placeholder="What should change before this is ready for approval?"
              style={css("width:100%;min-height:7.5rem;border:1px solid var(--border);border-radius:0.95rem;padding:0.85rem 0.95rem;background:var(--surface-alt);font-size:0.84rem;line-height:1.45;color:var(--fg);resize:vertical")}
            />

            <div style={css("display:flex;align-items:center;justify-content:space-between;gap:0.7rem;flex-wrap:wrap")}>
              <span style={css("font-size:var(--text-xs);color:var(--fg-faint)")}>This sends one clean round into the studio Inbox, then returns this card to review once the studio replies.</span>
              <div style={css("display:flex;gap:0.45rem")}>
                <button onClick={closeRequest} className="pt-iconbtn" style={css("height:2.2rem;padding:0 0.95rem;border-radius:var(--radius-pill);border:1px solid var(--border);background:var(--surface);color:var(--fg-muted);font-size:0.76rem;font-weight:500;cursor:pointer")}>Cancel</button>
                <button onClick={submitRequest} className="pt-op" style={css("height:2.2rem;padding:0 1rem;border-radius:var(--radius-pill);border:none;background:var(--accent);color:#fff;font-size:0.76rem;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;gap:0.35rem")}><Icon name="send" size={14} />Send to studio</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
