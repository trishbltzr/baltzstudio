"use client";

import { Icon } from "../icons";
import { css, initials, laneMeta, prioColor, prioTag, statusPill, STATUS_LABEL, STATUS_MAP } from "../helpers";
import { roleTasks } from "../selectors";
import { FilterDropdown } from "../components/FilterDropdown";
import type { PortalActions, PortalState } from "../store";
import type { Owner, Task, TaskStatus } from "../types";

const COLS: [TaskStatus, string, string][] = [["todo", "To Do", "var(--fg-faint)"], ["in_progress", "In Progress", "var(--accent)"], ["review", "In Review", "var(--warn)"], ["done", "Done", "var(--success)"]];
const LANE_LEGEND: [Owner, string][] = [["studio", "Studio"], ["ai", "Assistant"], ["client", "Client"], ["gate", "Milestone"]];
const OWNER_L: [string, string][] = [["all", "All Owners"], ["studio", "Studio"], ["ai", "Assistant"], ["client", "Client"]];
const PRIO_L: [string, string][] = [["all", "Any Priority"], ["high", "High"], ["med", "Medium"], ["low", "Low"]];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TASK_VIEW_SHELL_BG = "color-mix(in srgb,var(--surface-alt) 62%,white 38%)";
const TASK_VIEW_SHELL_BG_ACTIVE = "color-mix(in srgb,var(--accent-soft) 70%,white 30%)";

function dueToDate(due: string): { m: number; d: number } | null {
  const M: Record<string, number> = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11,
  };
  const p = (due || "").trim().split(/\s+/);
  const m = M[p[0]?.toLowerCase() || ""]; const d = parseInt(p[1], 10);
  if (m == null || isNaN(d)) return null;
  return { m, d };
}

function LaneTag({ owner }: { owner: Owner }) {
  const lm = laneMeta(owner);
  return <span style={css("display:inline-flex;align-items:center;gap:0.3rem;font-size:0.58rem;font-weight:500;letter-spacing:0.02em;padding:0.12rem 0.48rem;border-radius:999px;background:" + lm.s + ";color:color-mix(in srgb," + lm.c + " 60%,black 40%)")}><span style={css("width:0.45rem;height:0.45rem;border-radius:50%;flex-shrink:0;background:" + lm.c)} />{lm.label}</span>;
}

export function Tasks({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const tasks = roleTasks(state);

  return (
    <div>
      <div style={css("display:flex;align-items:" + (state.isMobile ? "flex-start" : "center") + ";gap:" + (state.isMobile ? "0.75rem" : "1rem") + ";flex-wrap:wrap;margin:0 0 0.9rem")}>
        <div style={css("min-width:0;flex:" + (state.isMobile ? "1 1 100%" : "1 1 auto"))}>
          <h2 style={css("margin:0;font-size:var(--text-lg);font-weight:500;line-height:1.2;color:var(--fg)")}>Task board</h2>
          <div style={css("margin-top:0.15rem;font-size:var(--text-xs);color:var(--fg-muted)")}>Plan, assign, and track every to-do.</div>
        </div>
        {state.role !== "client" && <div style={css("display:flex;align-items:center;gap:.45rem;margin-left:" + (state.isMobile ? "0" : "auto") + ";width:" + (state.isMobile ? "100%" : "auto"))}>
          <button type="button" onClick={actions.createQuickTask} className="pt-op" style={css("display:inline-flex;align-items:center;justify-content:center;gap:.35rem;height:2rem;padding:0 .78rem;border-radius:999px;border:none;background:var(--accent);color:#fff;font-size:.74rem;font-weight:500;cursor:pointer;flex:" + (state.isMobile ? "1" : "0 0 auto"))}><Icon name="plus" size={13} />New to-do</button>
          <button type="button" onClick={() => { actions.setView("audits_new"); actions.showToast("Open a completed audit to import its recommendations"); }} style={css("display:inline-flex;align-items:center;justify-content:center;gap:.35rem;height:2rem;padding:0 .78rem;border-radius:999px;border:1px solid var(--border);background:var(--surface);color:var(--fg-muted);font-size:.74rem;font-weight:500;cursor:pointer;flex:" + (state.isMobile ? "1" : "0 0 auto"))}><Icon name="checkmark" size={13} />Import from audit</button>
        </div>}
        <div style={css("display:flex;align-items:center;gap:" + (state.isMobile ? "0.65rem" : "0.9rem") + ";margin-left:" + (state.isMobile ? "0" : (state.role === "client" ? "auto" : "0")) + ";width:" + (state.isMobile ? "100%" : "auto") + ";flex-wrap:wrap")}>
          {LANE_LEGEND.map(([k, l]) => { const lm = laneMeta(k); return <span key={k} style={css("display:inline-flex;align-items:center;gap:0.32rem;font-size:" + (state.isMobile ? "0.68rem" : "0.72rem") + ";color:var(--fg-muted);white-space:nowrap")}><span style={css("width:0.5rem;height:0.5rem;border-radius:50%;background:" + lm.c)} />{l}</span>; })}
        </div>
      </div>

      <Board state={state} actions={actions} tasks={tasks} />
    </div>
  );
}

function ActiveMsBanner() {
  return (
    <div style={css("display:flex;align-items:center;gap:0.65rem;margin:-0.1rem 0 0.85rem;padding:0.7rem 0.95rem;border:1px solid var(--accent-dim);border-radius:var(--radius-panel);background:var(--accent-soft)")}>
      <span style={css("display:grid;place-items:center;width:1.9rem;height:1.9rem;border-radius:50%;background:var(--accent);color:#fff;flex-shrink:0")}><Icon name="flag" size={16} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={css("font-weight:500;font-size:0.86rem;color:color-mix(in srgb,var(--accent) 65%,black 35%)")}>Milestone 2 — Full Site Review</div>
        <div style={css("font-size:0.74rem;color:var(--fg-muted)")}>Opened July 1 · your sign-off by July 5</div>
      </div>
      <span style={css("font-size:var(--text-2xs);font-weight:500;padding:0.22rem 0.6rem;border-radius:999px;background:var(--surface);color:var(--accent);flex-shrink:0")}>In Progress</span>
    </div>
  );
}

function Board({ state, actions, tasks }: { state: PortalState; actions: PortalActions; tasks: Task[] }) {
  const tf = state.taskFilter;
  const active = tf.owner !== "all" || tf.priority !== "all";
  const canBulk = state.role !== "client";
  const ownerVal = OWNER_L.find(([k]) => k === tf.owner)?.[1] || "All Owners";
  const prioVal = PRIO_L.find(([k]) => k === tf.priority)?.[1] || "Any Priority";
  const tfMatch = (f: { owner: string; priority: string }) => f.owner === tf.owner && f.priority === tf.priority;
  const canSave = active && !state.savedViews.tasks.some(v => tfMatch(v.filter));
  const name = () => {
    const o: Record<string, string> = { studio: "Studio", ai: "Assistant", client: "Client" }, pr: Record<string, string> = { high: "High", med: "Medium", low: "Low" };
    const parts: string[] = [];
    if (tf.owner !== "all") parts.push(o[tf.owner]);
    if (tf.priority !== "all") parts.push(pr[tf.priority]);
    return parts.join(" · ") || "All Tasks";
  };

  return (
    <>
      {tasks.length > 0 && <ActiveMsBanner />}
      <div style={css("display:flex;align-items:center;gap:var(--space-3);flex-wrap:wrap;margin:-0.1rem 0 0.75rem")}>
        <div style={css("display:flex;align-items:center;gap:0.6rem;flex-wrap:wrap")}>
          <FilterDropdown id="towner" label="Owner" valueLabel={ownerVal} state={state} actions={actions} options={OWNER_L.map(([k, l]) => ({ label: l, active: tf.owner === k, onClick: () => actions.setTaskFilter("owner", k) }))} />
          <FilterDropdown id="tprio" label="Priority" valueLabel={prioVal} state={state} actions={actions} options={PRIO_L.map(([k, l]) => ({ label: l, active: tf.priority === k, onClick: () => actions.setTaskFilter("priority", k) }))} />
        </div>
        <div style={css("display:flex;align-items:center;gap:var(--space-2);margin-left:auto")}>
          {canBulk && !state.boardSelect && <button onClick={actions.toggleBoardSelect} className="pt-iconbtn" style={css("display:inline-flex;align-items:center;gap:0.4rem;padding:0.4rem 0.85rem;border-radius:var(--radius-pill);border:1px solid var(--border);background:var(--surface);color:var(--fg-muted);font-size:0.76rem;font-weight:500;cursor:pointer")}><Icon name="checkmark" size={13} />Select</button>}
          {canSave && <button onClick={() => actions.saveView("tasks", name(), { owner: tf.owner, priority: tf.priority })} style={css("display:inline-flex;align-items:center;gap:0.3rem;font-size:0.74rem;font-weight:500;padding:0.32rem 0.75rem;border-radius:var(--radius-pill);border:1px solid var(--accent);background:var(--accent-soft);color:var(--accent);cursor:pointer")}>Save View</button>}
          {active && <button onClick={() => actions.patch({ taskFilter: { owner: "all", priority: "all" } })} style={css("font-size:0.74rem;font-weight:500;padding:0.32rem 0.7rem;border-radius:var(--radius-pill);border:1px solid var(--border);background:var(--surface);color:var(--fg-muted);cursor:pointer")}>Clear</button>}
        </div>
      </div>

      {state.savedViews.tasks.length > 0 && (
        <div style={css("display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap;margin:-0.2rem 0 0.75rem")}>
          <span style={css("font-size:var(--text-2xs);font-weight:500;letter-spacing:0.02em;color:var(--fg-faint)")}>Saved</span>
          {state.savedViews.tasks.map((v, i) => {
            const on = tfMatch(v.filter);
            return <span key={i} style={css("display:inline-flex;align-items:center;gap:0.4rem;padding:0.32rem 0.7rem;border-radius:var(--radius-pill);border:1px solid " + (on ? "var(--accent)" : "var(--border-soft)") + ";background:" + (on ? "var(--accent-soft)" : "var(--surface-alt)") + ";color:" + (on ? "var(--accent)" : "var(--fg-muted)") + ";font-size:0.74rem;font-weight:500")}><span onClick={() => actions.patch({ taskFilter: { ...v.filter } })} style={{ cursor: "pointer" }}>{v.name}</span><span onClick={() => actions.removeView("tasks", i)} style={css("cursor:pointer;opacity:0.55;font-size:0.9rem;line-height:1")}>×</span></span>;
          })}
        </div>
      )}

      {state.boardSelect && (
        <div style={css("display:inline-flex;align-items:center;gap:var(--space-2);margin:-0.2rem 0 0.75rem")}>
          <span style={css("font-size:0.74rem;color:var(--fg-muted);font-weight:500")}>{state.selTasks.length} selected</span>
          <button onClick={actions.bulkAdvance} className="pt-op" style={css("display:inline-flex;align-items:center;gap:0.35rem;padding:0.4rem 0.8rem;border-radius:var(--radius-pill);border:none;background:var(--accent);color:#fff;font-size:0.76rem;font-weight:500;cursor:pointer")}><Icon name="arrow" size={13} />Advance</button>
          <button onClick={actions.bulkDone} style={css("display:inline-flex;align-items:center;gap:0.35rem;padding:0.4rem 0.8rem;border-radius:var(--radius-pill);border:1px solid var(--border);background:var(--surface);color:var(--fg);font-size:0.76rem;font-weight:500;cursor:pointer")}><Icon name="checkmark" size={13} />Mark done</button>
          <button onClick={actions.clearSel} style={css("padding:0.4rem 0.7rem;border-radius:var(--radius-pill);border:none;background:transparent;color:var(--fg-muted);font-size:0.76rem;font-weight:500;cursor:pointer")}>Cancel</button>
        </div>
      )}

      <div style={css(state.isMobile
        ? "display:grid;grid-auto-flow:column;grid-auto-columns:14.5rem;gap:0.7rem;overflow-x:auto;padding-bottom:0.5rem;align-items:start"
        : "display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0.7rem;align-items:start")}>
        {COLS.map(([key, label, color]) => {
          const ts = tasks.filter(t => t.status === key);
          const over = state.dragOverCol === key;
          return (
            <div key={key} onDragOver={e => { e.preventDefault(); if (state.dragOverCol !== key) actions.patch({ dragOverCol: key }); }} onDrop={e => { e.preventDefault(); actions.dropOn(key); }} style={css("background:" + (over ? TASK_VIEW_SHELL_BG_ACTIVE : TASK_VIEW_SHELL_BG) + ";border-radius:var(--radius-panel);padding:0.6rem;transition:background .12s;outline:" + (over ? "1.5px dashed var(--accent-dim)" : "1.5px solid transparent") + ";outline-offset:-1.5px")}>
              <div style={css("display:flex;align-items:center;gap:0.4rem;padding:0.35rem 0.45rem 0.6rem")}>
                <span style={css("width:0.5rem;height:0.5rem;border-radius:50%;flex-shrink:0;background:" + color)} />
                <span style={css("font-weight:500;font-size:0.8rem")}>{label}</span>
                <span style={css("font-size:0.68rem;color:var(--fg-faint);margin-left:auto")}>{ts.length}</span>
              </div>
              <div style={css("display:flex;flex-direction:column;gap:var(--space-2);min-height:2rem")}>
                {ts.map(t => {
                  const bk = t.blockedBy ? state.tasks.find(x => x.id === t.blockedBy) : null;
                  const isBlk = !!(bk && bk.status !== "done");
                  const dim = state.draggingId === t.id;
                  const seld = state.boardSelect && state.selTasks.includes(t.id);
                  return (
                    <div key={t.id} draggable onDragStart={e => { try { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", t.id); } catch { /* noop */ } actions.dragStart(t.id); }} onDragEnd={actions.dragEnd} onClick={() => state.boardSelect ? actions.toggleSelTask(t.id) : actions.patch({ taskModal: t.id })} className="pt-card" style={css("background:var(--surface);border:1px solid " + (seld ? "var(--accent)" : (isBlk ? "var(--warn)" : "var(--border-soft)")) + ";border-radius:var(--radius);padding:0.7rem;cursor:pointer;opacity:" + (dim ? "0.4" : "1") + (seld ? ";box-shadow:0 0 0 3px var(--accent-soft)" : ""))}>
                      <div style={css("display:flex;align-items:center;gap:0.4rem;margin-bottom:0.4rem")}>
                        <LaneTag owner={t.owner} />
                        <span title={t.priority + " priority"} style={css("width:0.5rem;height:0.5rem;border-radius:50%;flex-shrink:0;background:" + prioColor(t.priority))} />
                        {state.boardSelect && <span style={css("margin-left:auto;width:1.05rem;height:1.05rem;border-radius:5px;flex-shrink:0;display:grid;place-items:center;border:1.5px solid " + (seld ? "var(--accent)" : "var(--border)") + ";background:" + (seld ? "var(--accent)" : "transparent") + ";color:#fff")}>{seld && <Icon name="checkmark" size={13} />}</span>}
                      </div>
                      <div style={css("font-weight:500;font-size:0.8rem;line-height:1.3;margin-bottom:0.45rem")}>{t.title}</div>
                      {isBlk && bk && (
                        <div style={css("display:flex;align-items:center;gap:0.3rem;margin-bottom:0.45rem;font-size:0.62rem;font-weight:500;color:color-mix(in srgb,var(--warn) 55%,black 45%);background:var(--warn-soft);border-radius:5px;padding:0.18rem 0.4rem")}><span style={css("width:0.4rem;height:0.4rem;border-radius:50%;background:var(--warn);flex-shrink:0")} /><span style={css("overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>Blocked · {bk.title}</span></div>
                      )}
                      <div style={css("display:flex;align-items:center;gap:0.4rem")}>
                        <span style={css("width:1.2rem;height:1.2rem;border-radius:50%;background:var(--accent-soft);color:var(--accent);font-size:0.54rem;font-weight:500;display:grid;place-items:center;flex-shrink:0")}>{initials(t.assignee)}</span>
                        <span style={css("font-size:0.68rem;color:var(--fg-muted);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{t.project}</span>
                        <span style={css("display:inline-flex;align-items:center;height:1.15rem;padding:0 0.4rem;border-radius:999px;background:var(--surface);border:1px solid var(--border-soft);font-size:0.62rem;color:var(--fg-faint);flex-shrink:0")}>{t.due}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function dateFromCalendarKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m, d);
}

export function TaskCalendar({ state, actions, tasks, showBanner = false }: { state: PortalState; actions: PortalActions; tasks: Task[]; showBanner?: boolean }) {
  const tByDay: Record<string, Task[]> = {};
  tasks.forEach(t => { const dd = dueToDate(t.due); if (!dd) return; const k = "2026-" + dd.m + "-" + dd.d; (tByDay[k] = tByDay[k] || []).push(t); });
  const first = new Date(state.calY, state.calM, 1);
  const daysInMonth = new Date(state.calY, state.calM + 1, 0).getDate();
  const totalCalendarCells = Math.ceil((first.getDay() + daysInMonth) / 7) * 7;
  const gridStart = new Date(state.calY, state.calM, 1 - first.getDay());
  const cells = Array.from({ length: totalCalendarCells }, (_, i) => {
    const d = new Date(gridStart); d.setDate(gridStart.getDate() + i);
    const key = d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate();
    const items = tByDay[key] || [];
    const outside = d.getMonth() !== state.calM;
    const isToday = d.getFullYear() === 2026 && d.getMonth() === 6 && d.getDate() === 2;
    const isSel = key === state.calSel;
    return { key, day: d.getDate(), outside, items, isToday, isSel };
  });
  const laneC = (o: Owner) => laneMeta(o).c;
  const selTasks = tByDay[state.calSel] || [];
  const selDate = dateFromCalendarKey(state.calSel);
  const selLabel = state.calSel === "2026-6-2"
    ? "Today · July 2"
    : selDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const selectedOpen = selTasks.filter(task => task.status !== "done").length;
  const selectedDone = selTasks.length - selectedOpen;
  const calendarPad = state.isMobile ? "0.7rem" : "1rem";
  const mobileCellSize = "3.45rem";

  return (
    <>
      {showBanner && tasks.length > 0 && <ActiveMsBanner />}
      <div style={css("display:grid;grid-template-columns:" + (state.isMobile ? "minmax(0,1fr)" : "minmax(0,1fr) minmax(0,2.4fr)") + ";gap:0.85rem;align-items:start")}>
        <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden;order:" + (state.isMobile ? "1" : "2"))}>
          <div style={css("padding:" + (state.isMobile ? "0.82rem" : "0.9rem 1rem 0.82rem") + ";border-bottom:1px solid var(--border-soft);background:color-mix(in srgb,var(--surface) 78%,var(--surface-alt) 22%)")}>
            <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:0.8rem;flex-wrap:" + (state.isMobile ? "wrap" : "nowrap"))}>
              <div>
                <div style={css("font-size:0.62rem;font-weight:500;letter-spacing:0.02em;color:var(--fg-faint);margin-bottom:0.18rem")}>Calendar</div>
                <h3 style={css("margin:0;font-size:" + (state.isMobile ? "1.02rem" : "1.12rem") + ";font-weight:500;line-height:1.15;color:var(--fg)")}>{MONTHS[state.calM]} {state.calY}</h3>
              </div>
              <div style={css("display:flex;gap:0.35rem;flex-shrink:0;" + (state.isMobile ? "margin-left:auto" : ""))}>
                <button onClick={() => actions.calNav(-1)} className="pt-iconbtn" style={css("width:2rem;height:2rem;border-radius:50%;border:1px solid var(--border);background:var(--surface);display:grid;place-items:center;cursor:pointer;color:var(--fg-muted);transform:rotate(90deg)")}><Icon name="chev" size={15} /></button>
                <button onClick={() => actions.calNav(1)} className="pt-iconbtn" style={css("width:2rem;height:2rem;border-radius:50%;border:1px solid var(--border);background:var(--surface);display:grid;place-items:center;cursor:pointer;color:var(--fg-muted);transform:rotate(-90deg)")}><Icon name="chev" size={15} /></button>
              </div>
            </div>
          </div>

          <div style={css("display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:" + (state.isMobile ? "0.18rem" : "0.32rem") + ";padding:" + (state.isMobile ? "0.68rem " + calendarPad + " 0" : "0.82rem 1rem 0"))}>
            {WEEKDAYS.map(w => <div key={w} style={css("padding:0.12rem 0 0.18rem;text-align:center;font-size:" + (state.isMobile ? "0.55rem" : "0.62rem") + ";font-weight:500;letter-spacing:0.02em;color:var(--fg-faint)")}>{w}</div>)}
          </div>
          <div style={css("display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:" + (state.isMobile ? "0.18rem" : "0.32rem") + ";padding:" + (state.isMobile ? "0.12rem " + calendarPad + " 0.7rem" : "0.15rem 1rem 1rem"))}>
            {cells.map(c => (
              <button
                key={c.key}
                type="button"
                onClick={() => actions.patch({ calSel: c.key })}
                className="pt-card-soft"
                style={css(
                  "display:flex;flex-direction:column;gap:" + (state.isMobile ? "0.22rem" : "0.32rem") + ";min-width:0;" +
                  ";min-height:" + (state.isMobile ? mobileCellSize : "5.35rem") +
                  ";padding:" + (state.isMobile ? "0.26rem" : "0.48rem") +
                  ";border:1px solid " + (c.isSel ? "color-mix(in srgb,var(--accent) 42%,white 58%)" : "var(--border-soft)") +
                  ";border-radius:10px;background:" + (
                    c.isSel
                      ? "color-mix(in srgb,var(--accent-soft) 78%,white 22%)"
                      : c.outside
                        ? "color-mix(in srgb,var(--surface-alt) 65%,white 35%)"
                        : "var(--surface)"
                  ) +
                  ";cursor:pointer;text-align:left;overflow:hidden"
                )}
              >
                <span style={css("display:flex;align-items:center;justify-content:space-between;gap:var(--space-1)")}>
                  <span style={css(
                    "width:" + (state.isMobile ? "1.45rem" : "1.6rem") +
                    ";height:" + (state.isMobile ? "1.45rem" : "1.6rem") +
                    ";display:grid;place-items:center;border-radius:999px;font-size:" + (state.isMobile ? "0.68rem" : "0.72rem") +
                    ";font-weight:500;background:" + (c.isToday ? "var(--accent)" : "transparent") +
                    ";color:" + (c.isToday ? "#fff" : (c.outside ? "var(--fg-faint)" : "var(--fg-muted)"))
                  )}>{c.day}</span>
                  {!state.isMobile && c.items.length > 0 && (
                    <span style={css("min-width:1.1rem;height:1.1rem;padding:0 0.25rem;border-radius:999px;background:var(--surface-alt);color:var(--fg-faint);display:grid;place-items:center;font-size:0.56rem;font-weight:500;flex-shrink:0")}>
                      {c.items.length}
                    </span>
                  )}
                </span>
                {state.isMobile ? (
                  <span style={css("display:flex;align-items:flex-end;justify-content:space-between;gap:0.2rem;margin-top:auto;min-width:0")}>
                    <span style={css("display:flex;gap:0.16rem;align-items:center;min-width:0;overflow:hidden")}>
                      {c.items.slice(0, 2).map(t => <span key={t.id} style={css("width:0.38rem;height:0.38rem;border-radius:50%;background:" + laneC(t.owner) + ";flex-shrink:0")} />)}
                    </span>
                    {c.items.length > 0 && (
                      <span style={css("min-width:0.92rem;height:0.92rem;padding:0 0.18rem;border-radius:999px;background:var(--surface-alt);color:var(--fg-faint);display:grid;place-items:center;font-size:0.5rem;font-weight:500;flex-shrink:0")}>
                        {c.items.length}
                      </span>
                    )}
                  </span>
                ) : (
                  <>
                    {c.items.slice(0, 2).map(t => (
                      <span key={t.id} style={css("display:flex;align-items:center;gap:0.3rem;font-size:0.6rem;line-height:1.15;padding:0.14rem 0.34rem;border-radius:0.45rem;background:color-mix(in srgb," + laneC(t.owner) + " 14%,white 86%);color:var(--fg);overflow:hidden;white-space:nowrap;text-overflow:ellipsis")}>
                        <span style={css("width:0.38rem;height:0.38rem;border-radius:50%;flex-shrink:0;background:" + laneC(t.owner))} />{t.title}
                      </span>
                    ))}
                    {c.items.length > 2 && <span style={css("font-size:0.58rem;color:var(--fg-faint);padding-left:0.12rem;margin-top:auto")}>+{c.items.length - 2} more</span>}
                  </>
                )}
              </button>
            ))}
          </div>
        </div>
        <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:" + TASK_VIEW_SHELL_BG + ";overflow:hidden;order:" + (state.isMobile ? "2" : "1") + ";" + (state.isMobile ? "" : "position:sticky;top:0.5rem"))}>
          <div style={css("padding:" + (state.isMobile ? "0.95rem" : "1rem 1.05rem 0.95rem") + ";border-bottom:1px solid var(--border-soft);display:flex;flex-direction:column;gap:0.7rem")}>
            <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:0.7rem")}>
              <div>
                <div style={css("font-size:0.62rem;font-weight:500;letter-spacing:0.02em;color:var(--fg-faint);margin-bottom:0.18rem")}>Selected Date</div>
                <div style={css("font-weight:500;font-size:0.94rem;line-height:1.2;color:var(--fg)")}>{selLabel}</div>
              </div>
              <span style={css("height:1.65rem;padding:0 0.62rem;border-radius:999px;background:var(--surface-alt);color:var(--fg-muted);font-size:0.66rem;font-weight:500;display:inline-flex;align-items:center;white-space:nowrap;flex-shrink:0")}>{selTasks.length} due</span>
            </div>
            <div style={css("display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0.45rem")}>
              <div style={css("border:1px solid var(--border-soft);border-radius:0.85rem;background:color-mix(in srgb,var(--surface-alt) 52%,white 48%);padding:0.6rem 0.68rem")}>
                <div style={css("font-size:0.58rem;font-weight:500;letter-spacing:0.02em;color:var(--fg-faint)")}>Open</div>
                <div style={css("margin-top:0.15rem;font-size:0.95rem;font-weight:500;color:var(--fg)")}>{selectedOpen}</div>
              </div>
              <div style={css("border:1px solid var(--border-soft);border-radius:0.85rem;background:color-mix(in srgb,var(--surface-alt) 52%,white 48%);padding:0.6rem 0.68rem")}>
                <div style={css("font-size:0.58rem;font-weight:500;letter-spacing:0.02em;color:var(--fg-faint)")}>Done</div>
                <div style={css("margin-top:0.15rem;font-size:0.95rem;font-weight:500;color:var(--fg)")}>{selectedDone}</div>
              </div>
            </div>
          </div>
          <div style={css("padding:" + (state.isMobile ? "0.85rem" : "0.9rem 1rem 1rem"))}>
            {selTasks.length ? (
              <div style={css("display:flex;flex-direction:column;gap:0.5rem")}>
                {selTasks.map(t => (
                  <div key={t.id} onClick={() => actions.patch({ taskModal: t.id })} className="pt-card-soft" style={css("display:flex;align-items:flex-start;gap:0.65rem;padding:0.7rem 0.75rem;border:1px solid var(--border-soft);border-radius:var(--radius);cursor:pointer;transition:border-color .12s")}>
                    <span style={css("width:0.55rem;height:0.55rem;border-radius:50%;flex-shrink:0;margin-top:0.28rem;background:" + laneMeta(t.owner).c)} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={css("font-weight:500;font-size:var(--text-base);line-height:1.3")}>{t.title}</div>
                      <div style={css("font-size:var(--text-xs);color:var(--fg-muted);margin-top:0.15rem")}>{t.project} · {laneMeta(t.owner).label}</div>
                      <div style={css("display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap;margin-top:0.4rem")}>
                        <span style={{ display: "inline-block", ...css(statusPill(STATUS_MAP[t.status])) }}>{STATUS_LABEL[t.status]}</span>
                        <span style={css(prioTag(t.priority))}>{t.priority}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p style={css("margin:0;font-size:0.8rem;color:var(--fg-faint);text-align:center;padding:1.35rem 0")}>No tasks due on this day.</p>}
          </div>
        </div>
      </div>
    </>
  );
}
