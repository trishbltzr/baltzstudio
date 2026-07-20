"use client";

import { Icon } from "../icons";
import { activeJourneyGate, css, journeyProgressForGate, milestoneStatusFromGate, statusPill } from "../helpers";
import { MILESTONES, SVC_META } from "../data";
import { clientHasEngineAccess } from "../access";
import type { PortalActions, PortalState } from "../store";
import type { JourneyGate, View } from "../types";

function ov2col(mob: boolean) { return mob ? "minmax(0,1fr)" : "minmax(0,1.55fr) minmax(0,1fr)"; }

function ActionCue({ color = "var(--accent)" }: { color?: string }) {
  return (
    <span
      aria-hidden="true"
      style={css("width:1.5rem;height:1.5rem;border-radius:999px;background:color-mix(in srgb," + color + " 14%,white 86%);color:" + color + ";display:grid;place-items:center;flex-shrink:0")}
    >
      <Icon name="chevright" size={11} />
    </span>
  );
}

function msNode(st: string) {
  if (st === "done") return { textColor: "var(--fg)", pillLabel: "Completed", pillStyle: statusPill("done"), dateStyle: "background:var(--success-soft);color:var(--success)" };
  if (st === "awaiting") return { textColor: "var(--warn)", pillLabel: "Awaiting you", pillStyle: statusPill("review"), dateStyle: "background:var(--warn-soft);color:var(--warn);border:1.5px solid var(--warn)" };
  if (st === "ready") return { textColor: "var(--warn)", pillLabel: "Back with you", pillStyle: statusPill("review"), dateStyle: "background:var(--warn-soft);color:var(--warn);border:1.5px solid var(--warn)" };
  if (st === "in_revision" || st === "active") return { textColor: "var(--accent)", pillLabel: "In Progress", pillStyle: statusPill("progress"), dateStyle: "background:var(--accent-soft);color:var(--accent);border:1.5px solid var(--accent-dim)" };
  return { textColor: "var(--fg-muted)", pillLabel: "Upcoming", pillStyle: statusPill("waiting"), dateStyle: "background:oklch(0.95 0.004 50);color:var(--fg-faint)" };
}

function projectStateForGate(gate: JourneyGate | undefined) {
  if (!gate) {
    return {
      actionLabel: "Not started",
      actionTint: "var(--surface-alt)",
      actionColor: "var(--fg-muted)",
      actionValue: "Cocoon Consult",
      actionSub: "Ready to begin",
      heroBody: "",
      heroStrong: "Cocoon Consult",
      heroTail: ".",
      ctaLabel: "View workspace",
      progress: 0,
      stageSub: "Plan selected · not started",
      waitHeading: "Workspace ready",
      waitTitle: "Cocoon Consult",
      waitSub: "Final work will appear in Approvals when it is ready",
    };
  }
  if (gate.status === "in_revision") {
    return {
      actionLabel: "With the Studio",
      actionTint: "var(--accent-soft)",
      actionColor: "var(--accent)",
      actionValue: "Milestone " + gate.g + " · Round " + (gate.request?.round || 1),
      actionSub: "Revision in Progress",
      heroBody: "You sent feedback on ",
      heroStrong: "Milestone " + gate.g + " — " + gate.title,
      heroTail: ". The studio is revising this round now.",
      ctaLabel: "View review status",
      progress: journeyProgressForGate(gate),
      stageSub: "Milestone " + gate.g + " of 3 · in revision",
      waitHeading: "With the Studio",
      waitTitle: "Milestone " + gate.g + " — " + gate.title,
      waitSub: (gate.request?.assignee || "Kier Mangibin") + " is revising this round",
    };
  }
  if (gate.status === "ready") {
    return {
      actionLabel: "Back with You",
      actionTint: "var(--warn-soft)",
      actionColor: "var(--warn)",
      actionValue: "Milestone " + gate.g + " · Updated review",
      actionSub: "Ready for sign-off",
      heroBody: "A revised version of ",
      heroStrong: "Milestone " + gate.g + " — " + gate.title,
      heroTail: " is back with you for approval.",
      ctaLabel: "Review update",
      progress: journeyProgressForGate(gate),
      stageSub: "Milestone " + gate.g + " of 3 · revised review",
      waitHeading: "Back with You",
      waitTitle: "Milestone " + gate.g + " — " + gate.title,
      waitSub: "Updated review ready now",
    };
  }
  if (gate.status === "approved" && gate.g === 3) {
    return {
      actionLabel: "Approved",
      actionTint: "var(--success-soft)",
      actionColor: "var(--success)",
      actionValue: "Winged in a Week complete",
      actionSub: "Moving into In Full Flight",
      heroBody: "You approved ",
      heroStrong: "Milestone " + gate.g + " — " + gate.title,
      heroTail: ". Launch prep is complete and handoff is moving forward.",
      ctaLabel: "View project journey",
      progress: 100,
      stageSub: "Milestone " + gate.g + " of 3 · approved",
      waitHeading: "Recent update",
      waitTitle: "Launch & handoff",
      waitSub: "Approved and moving into care",
    };
  }
  return {
    actionLabel: "Waiting on You",
    actionTint: "var(--lane-gate-soft)",
    actionColor: "var(--lane-gate)",
    actionValue: "Milestone " + gate.g + " · " + gate.title,
    actionSub: "Review to continue",
      heroBody: "You're at ",
    heroStrong: "Milestone " + gate.g + " — " + gate.title,
    heroTail: ". Your site is built and ready for your approval.",
    ctaLabel: "Review Milestone " + gate.g,
    progress: journeyProgressForGate(gate),
    stageSub: "Milestone " + gate.g + " of 3 · awaiting approval",
    waitHeading: "Waiting on you",
    waitTitle: "Milestone " + gate.g + " — " + gate.title,
    waitSub: "Review to continue",
  };
}

export function ClientStats({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const go = (v: View) => () => actions.setView(v);
  const gates = state.journeyGates;
  const activeGate = activeJourneyGate(gates) || gates[gates.length - 1];
  const projectState = projectStateForGate(activeGate);
  const sharedItems = [
    { label: "Journey", value: String(projectState.progress) + "%", icon: "feather", tint: "var(--accent-soft)", color: "var(--accent)", onClick: go("milestones") },
    { label: "To-do's", value: projectState.actionLabel === "Waiting on You" ? "1" : "0", icon: "checklist", tint: projectState.actionTint, color: projectState.actionColor, onClick: go("tasks") },
    { label: "Files", value: "0", icon: "file", tint: "var(--lane-gate-soft)", color: "var(--lane-gate)", onClick: go("files") },
  ];
  const clientNext = clientHasEngineAccess(state)
    ? [
        ...sharedItems.slice(0, 2),
        { label: "Audits", value: "0", icon: "audit", tint: "var(--success-soft)", color: "var(--success)", onClick: go("audit") },
        { label: "Builders", value: "0", icon: "funnel", tint: "var(--warn-soft)", color: "var(--warn)", onClick: go("funnels") },
        sharedItems[2],
      ]
    : [
        ...sharedItems.slice(0, 2),
        { label: "Approvals", value: String(actions.workspaceForClient(state.clientName).approvals.filter(item => item.sent).length), icon: "flag", tint: "var(--success-soft)", color: "var(--success)", onClick: go("review") },
        sharedItems[2],
      ];
  return (
    <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(9.5rem,1fr));gap:0.55rem")}>
      {clientNext.map(c => (
        <button key={c.label} type="button" onClick={c.onClick} className="pt-card-soft" style={css("width:100%;text-align:left;font-family:inherit;padding:0.85rem;border:1px solid var(--border-soft);border-radius:var(--radius);background:var(--surface);display:flex;align-items:center;gap:0.7rem;cursor:pointer")}>
          <span style={css("width:2.2rem;height:2.2rem;display:grid;place-items:center;border-radius:50%;flex-shrink:0;background:" + c.tint + ";color:" + c.color)}><Icon name={c.icon} size={15} /></span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={css("font-size:0.68rem;font-weight:500;color:var(--fg-muted)")}>{c.label}</div>
            <div style={css("font-size:1.05rem;font-weight:500;line-height:1.1")}>{c.value}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

// Client pipeline — the studio's three phases with this project's progress
// (mirrors AdminPipeline, which shows the studio-wide service split).
export function ClientPipeline({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const gates = state.journeyGates;
  const activeGate = activeJourneyGate(gates) || gates[gates.length - 1];
  const projectState = projectStateForGate(activeGate);
  const phases = [
    { key: "cocoon", pct: activeGate ? 100 : 0 },
    { key: "wiaw", pct: activeGate ? projectState.progress : 0 },
    { key: "iff", pct: 0 },
  ] as const;
  return (
    <div style={css("display:grid;grid-template-columns:" + (state.isMobile ? "minmax(0,1fr)" : "repeat(3,minmax(0,1fr))") + ";gap:0.55rem")}>
      {phases.map(ph => {
        const m = SVC_META[ph.key];
        return (
          <button key={ph.key} type="button" onClick={() => actions.setView("milestones")} className="pt-card-soft" style={css("width:100%;text-align:left;font-family:inherit;padding:0.85rem 1rem;border-radius:var(--radius-panel);background:var(--surface);border:1px solid var(--border-soft);cursor:pointer")}>
            <div style={css("display:flex;align-items:center;justify-content:space-between;margin-bottom:0.5rem")}>
              <span style={css("display:inline-flex;align-items:center;gap:0.4rem;font-size:var(--text-base);font-weight:500;min-width:0")}><span style={css("width:0.6rem;height:0.6rem;border-radius:50%;background:" + m.color + ";flex-shrink:0")} /><span style={css("overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{m.label}</span></span>
              <span style={css("display:inline-flex;align-items:center;gap:0.4rem;font-size:1.05rem;font-weight:500;flex-shrink:0")}>{ph.pct}%<ActionCue color={m.color} /></span>
            </div>
            <div style={css("height:0.4rem;border-radius:999px;background:oklch(0.94 0.006 50);overflow:hidden")}><div style={css("width:" + ph.pct + "%;height:100%;border-radius:999px;background:" + m.color)} /></div>
          </button>
        );
      })}
    </div>
  );
}

export function ClientProgressBody({ state, actions, hideHero = false, hideStats = false }: { state: PortalState; actions: PortalActions; hideHero?: boolean; hideStats?: boolean }) {
  const go = (v: View) => () => actions.setView(v);
  const gates = state.journeyGates;
  const activeGate = activeJourneyGate(gates) || gates[gates.length - 1];
  const projectState = projectStateForGate(activeGate);
  const timelineMilestones = MILESTONES.map((milestone, index) => {
    if (index === 2) return { ...milestone, status: milestoneStatusFromGate(gates[0]?.status || "approved") };
    if (index === 3) return { ...milestone, status: milestoneStatusFromGate(gates[1]?.status || "awaiting") };
    if (index === 4) return { ...milestone, status: milestoneStatusFromGate(gates[2]?.status || "locked") };
    return milestone;
  });

  return (
    <div style={css("display:flex;flex-direction:column;gap:0.85rem")}>
      {!hideHero && (
        <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);padding:var(--space-5);display:flex;align-items:center;justify-content:space-between;gap:var(--space-5);flex-wrap:wrap")}>
          <div style={css("min-width:12rem;flex:1")}>
            <div style={css("color:var(--fg-muted);font-size:var(--text-base)")}>Client Workspace · {state.clientName}</div>
            <h2 style={css("font-size:var(--text-3xl);font-weight:500;line-height:1.1;margin-top:0.15rem")}>{activeGate ? "Project journey" : "Cocoon Consult"}</h2>
            <p style={css("margin-top:0.35rem;color:var(--fg-muted);font-size:var(--text-md)")}>{projectState.heroBody}<strong style={css("font-weight:500;color:var(--fg)")}>{projectState.heroStrong}</strong>{projectState.heroTail}</p>
            <button onClick={go("milestones")} className="pt-op" style={css("margin-top:0.9rem;display:inline-flex;align-items:center;gap:0.4rem;height:2.05rem;padding:0 0.9rem;border-radius:var(--radius-pill);border:none;background:var(--accent);color:#fff;font-size:var(--text-base);font-weight:500;cursor:pointer")}><Icon name="thumbs" size={15} /> {projectState.ctaLabel}</button>
          </div>
          <div style={css("display:grid;place-items:center;gap:0.3rem")}>
            <div style={css("width:5.5rem;height:5.5rem;border-radius:50%;background:color-mix(in srgb,var(--wiaw) 14%,white 86%);border:0.42rem solid color-mix(in srgb,var(--wiaw) 72%,white 28%);display:grid;place-items:center")}>
              <div style={css("width:4.2rem;height:4.2rem;border-radius:50%;background:var(--surface);display:grid;place-items:center")}>
                <span style={css("font-size:var(--text-2xl);font-weight:500;line-height:1")}>{projectState.progress}%</span>
              </div>
            </div>
            <span style={css("font-size:0.68rem;color:var(--fg-muted);letter-spacing:0.02em")}>Complete</span>
          </div>
        </div>
      )}

      {!hideStats && <ClientStats state={state} actions={actions} />}

      {/* 2-col */}
      <div style={{ display: "grid", gridTemplateColumns: ov2col(state.isMobile), gap: "0.85rem" }}>
        <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden")}>
          <div style={css("padding:0.9rem 1.1rem;border-bottom:1px solid var(--border-soft);display:flex;align-items:center;justify-content:space-between")}>
            <h3 style={css("margin:0;font-size:var(--text-lg);font-weight:500")}>Project Timeline</h3>
            <button onClick={go("milestones")} style={css("font-size:0.76rem;color:var(--accent);background:none;border:none;cursor:pointer;font-weight:500")}>All Milestones</button>
          </div>
          <div style={css("padding:0.4rem 0")}>
            {timelineMilestones.map(m => {
              const n = msNode(m.status);
              return (
                <div key={m.title} style={css("display:flex;align-items:center;gap:0.85rem;padding:0.65rem 1.1rem")}>
                  <span style={css("display:flex;flex-direction:column;align-items:center;justify-content:center;width:2.4rem;height:2.4rem;border-radius:var(--radius);flex-shrink:0;" + n.dateStyle)}>
                    <span style={css("font-size:0.6rem;font-weight:500;letter-spacing:0.02em")}>{m.mon}</span>
                    <span style={css("font-size:0.9rem;font-weight:500;line-height:1")}>{m.day}</span>
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={css("font-weight:500;font-size:0.85rem;color:" + n.textColor)}>{m.title}</div>
                    <div style={css("font-size:var(--text-xs);color:var(--fg-muted)")}>{n.pillLabel}</div>
                  </div>
                  <span style={css(n.pillStyle)}>{n.pillLabel}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div style={css("display:flex;flex-direction:column;gap:0.85rem;min-width:0")}>
          <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden")}>
            <div style={css("padding:0.9rem 1.1rem;border-bottom:1px solid var(--border-soft);display:flex;align-items:center;justify-content:space-between")}>
              <h3 style={css("margin:0;font-size:var(--text-lg);font-weight:500")}>{projectState.waitHeading}</h3>
              <span style={css("min-width:1.15rem;height:1.15rem;padding:0 0.35rem;border-radius:999px;background:var(--accent);color:#fff;font-size:var(--text-2xs);font-weight:500;display:inline-flex;align-items:center;justify-content:center")}>1</span>
            </div>
            <div onClick={go("milestones")} className="pt-row" style={css("display:flex;align-items:center;gap:0.7rem;padding:0.7rem 1.1rem;border-bottom:1px solid var(--border-soft);cursor:pointer")}>
              <span style={css("width:2.2rem;height:2.2rem;border-radius:var(--radius-sm);background:oklch(0.8 0.1 70);flex-shrink:0")} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={css("font-weight:500;font-size:var(--text-base)")}>{projectState.waitTitle}</div>
                <div style={css("font-size:var(--text-xs);color:" + projectState.actionColor)}>{projectState.waitSub}</div>
              </div>
              <Icon name="arrow" size={13} />
            </div>
          </div>
          <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:linear-gradient(135deg,var(--surface),color-mix(in srgb,var(--accent) 5%,var(--surface) 95%));padding:1rem 1.1rem")}>
            <h3 style={css("margin:0 0 0.25rem;font-size:var(--text-lg);font-weight:500")}>Message your team</h3>
            <p style={css("margin:0 0 0.75rem;font-size:0.8rem;color:var(--fg-muted)")}>Trisha and Kier will receive messages sent here.</p>
            <button onClick={go("inbox")} className="pt-op" style={css("width:100%;height:2.35rem;border-radius:0.8rem;border:1px solid color-mix(in srgb,var(--accent) 18%,transparent 82%);background:var(--accent);color:#fff;font-weight:500;font-size:var(--text-base);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:0.48rem")}>
              <span style={css("width:1.45rem;height:1.45rem;border-radius:0.48rem;background:rgba(255,255,255,.16);display:grid;place-items:center;flex-shrink:0")}><Icon name="msg" size={14} /></span>
              Open team chat
              <Icon name="arrow" size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
