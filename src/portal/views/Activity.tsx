"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "../icons";
import { css } from "../helpers";
import type { PortalState } from "../store";
import { WorkflowGovernancePanel } from "../components/WorkflowGovernancePanel";
import { FULL_REFRESH_TRIGGERS } from "@/lib/serviceRunGovernance";

const ACT_ICON: Record<string, string> = { gate: "flag", file: "file", wise: "wallet", task: "check", msg: "msg", audit: "search", access: "users" };
const ACT_LANE: Record<string, string> = { gate: "var(--lane-gate)", file: "var(--fg-muted)", wise: "var(--lane-ai)", task: "var(--lane-studio)", msg: "var(--lane-client)", audit: "var(--cocoon)", access: "var(--accent)" };
type ActivityRow = { who: string; act: string; obj: string; t: string; k: string };
const ACTIVITY: ActivityRow[] = [];
const FILTERS: [string, string][] = [["all", "All"], ["gate", "Milestones"], ["wise", "Payments"], ["task", "Tasks"], ["file", "Files"]];

type OperationalRun = {
  id: string;
  clientId: string;
  clientName: string;
  serviceKind: string;
  runKind: string;
  state: string;
  completedTargets: number;
  totalTargets: number;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
  coverage: number | null;
  evidenceStatus: string | null;
  evidenceCapturedAt: string | null;
  evidenceFreshUntil: string | null;
  baselineState: string | null;
  baselineCompletedAt: string | null;
  lastTargetedRecheckAt: string | null;
  lastTargetedRecheckState: string | null;
  nextSentinelAt: string | null;
  blocker: string | null;
  triggerKind?: string;
  sourceVersion?: number;
  checklistVersion?: number;
  playbook?: string;
  selectedCheckKeys?: string[];
  recoveryAction?: string | null;
  blockerOwner?: string | null;
  exceptionKind?: string | null;
  agent?: {
    state: string;
    version: number;
    latencyMs: number | null;
    tokenCost: number | null;
    toolTrace: unknown;
    completedAt: string | null;
  } | null;
};

const RUN_STATE_LABEL: Record<string, string> = {
  queued: "Queued",
  validating: "Validating",
  discovering: "Discovering",
  capturing: "Capturing",
  checking: "Checking",
  reviewing: "Reviewing",
  ready: "Review needed",
  current: "Current",
  partial: "Partial",
  blocked: "Blocked",
  failed: "Failed",
  cancelled: "Cancelled",
};

function formatTime(value: string | null) {
  if (!value) return "Not yet";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not yet"
    : new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatElapsed(startedAt: string | null, completedAt: string | null) {
  if (!startedAt) return "Waiting to start";
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return "Timing unavailable";
  const seconds = Math.max(0, Math.round((end - start) / 1000));
  if (seconds < 60) return `${seconds}s elapsed`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m elapsed`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m elapsed`;
}

function estimatedRemaining(run: OperationalRun) {
  if (["current", "ready", "partial", "blocked", "failed", "cancelled"].includes(run.state)) return null;
  const targeted = run.runKind !== "baseline" && run.runKind !== "full_refresh";
  const ranges: Record<string, [number, number]> = {
    queued: targeted ? [1, 2] : [2, 4],
    validating: targeted ? [1, 2] : [2, 4],
    discovering: targeted ? [1, 3] : [3, 7],
    capturing: targeted ? [2, 5] : [5, 12],
    checking: targeted ? [1, 4] : [3, 8],
    reviewing: [1, 5],
  };
  const range = ranges[run.state];
  return range ? `${range[0]}–${range[1]} min remaining` : null;
}

function freshnessLabel(value: string | null) {
  if (!value) return "Pending";
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "Pending";
  return time > Date.now() ? `Fresh until ${formatTime(value)}` : "Evidence refresh due";
}

function serviceRoute(run: OperationalRun) {
  return `/dashboard?view=activity&serviceRunId=${run.id}`;
}

export function Activity({ state }: { state?: PortalState }) {
  const [filter, setFilter] = useState("all");
  const [operationalRuns, setOperationalRuns] = useState<OperationalRun[]>([]);
  const [runLoadState, setRunLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [runRefresh, setRunRefresh] = useState(0);
  const [recheckBusy, setRecheckBusy] = useState<string | null>(null);
  const [recoverBusy, setRecoverBusy] = useState<string | null>(null);
  const [fullRefreshTrigger, setFullRefreshTrigger] = useState<Record<string, string>>({});
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/service-runs?active=false", { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("Service runs are unavailable.");
        return response.json() as Promise<{ runs?: OperationalRun[] }>;
      })
      .then(payload => {
        setOperationalRuns(Array.isArray(payload.runs) ? payload.runs : []);
        setRunLoadState("ready");
      })
      .catch(error => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setRunLoadState("error");
      });
    return () => controller.abort();
  }, [runRefresh]);
  async function requestRecheck(run: OperationalRun, scope: "failed" | "unverified" | "changed" | "full") {
    if (recheckBusy) return;
    const trigger = fullRefreshTrigger[run.id];
    if (scope === "full" && !trigger) return;
    setRecheckBusy(`${run.id}:${scope}`);
    try {
      const response = await fetch("/api/service-runs/recheck", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `${run.id}:${scope}:${Date.now()}`,
        },
        body: JSON.stringify({
          clientId: run.clientId,
          serviceKind: run.serviceKind,
          scope,
          reason: scope === "full" ? "full_refresh" : "manual",
          ...(scope === "full" ? { fullRefreshTrigger: trigger } : {}),
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error || "The recheck could not be started.");
      }
      setRunRefresh(value => value + 1);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "The recheck could not be started.");
    } finally {
      setRecheckBusy(null);
    }
  }
  async function resumeRun(run: OperationalRun) {
    if (recoverBusy) return;
    setRecoverBusy(run.id);
    try {
      const response = await fetch(`/api/service-runs/${run.id}/recover`, {
        method: "POST",
        headers: { "Idempotency-Key": `recover:${run.id}` },
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error || "The run could not be resumed.");
      }
      setRunRefresh(value => value + 1);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "The run could not be resumed.");
    } finally {
      setRecoverBusy(null);
    }
  }
  const clientRows: ActivityRow[] = state?.role === "client"
    ? state.threads
      .filter(thread => thread.clientName === state.clientName && !!thread.isTicket && thread.messages.some(message => message.from === "client"))
      .map(thread => {
        const lastMessage = thread.messages.at(-1);
        return {
          who: "You",
          act: thread.status === "resolved" ? "resolved ticket" : "sent ticket",
          obj: "#" + (thread.ticketId || "—") + " · " + (thread.category || lastMessage?.text || "Studio request"),
          t: lastMessage?.time || "Now",
          k: "msg",
        };
      })
    : [];
  const sourceRows = state?.role === "client" ? clientRows : ACTIVITY;
  const filters = state?.role === "client" ? [["all", "All"]] as [string, string][] : FILTERS;
  const rows = sourceRows.filter(a => filter === "all" || a.k === filter);
  const visibleRuns = useMemo(
    () => {
      const requestedRunId = typeof window === "undefined"
        ? null
        : new URLSearchParams(window.location.search).get("serviceRunId");
      return [...operationalRuns]
        .sort((left, right) => left.id === requestedRunId ? -1 : right.id === requestedRunId ? 1 : 0)
        .slice(0, state?.role === "client" ? 12 : 20);
    },
    [operationalRuns, state?.role],
  );

  useEffect(() => {
    if (runLoadState !== "ready") return;
    const requestedRunId = new URLSearchParams(window.location.search).get("serviceRunId");
    if (!requestedRunId) return;
    document.querySelector(`[data-service-run-id="${CSS.escape(requestedRunId)}"]`)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [runLoadState, visibleRuns]);

  return (
    <div style={css("display:flex;flex-direction:column;gap:0.85rem")}>
      <section className="pt-panel" style={css("overflow:hidden")}>
        <header style={css("padding:0.9rem 1rem;border-bottom:1px solid var(--border-soft);display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3)")}>
          <div>
            <h3 style={css("margin:0;font-size:var(--text-lg);font-weight:500")}>{state?.role === "client" ? "Checkup progress" : "Live service runs"}</h3>
            <p style={css("margin:.18rem 0 0;color:var(--fg-muted);font-size:var(--text-xs)")}>{state?.role === "client" ? "Safe progress and approved outcomes from your active services." : "What is running, why it ran, what it checks, and what needs review."}</p>
          </div>
          {runLoadState === "ready" && <span style={css("font-size:var(--text-xs);color:var(--fg-faint);white-space:nowrap")}>{visibleRuns.length} run{visibleRuns.length === 1 ? "" : "s"}</span>}
        </header>
        {runLoadState === "loading" && <div style={css("padding:1.2rem 1rem;color:var(--fg-muted);font-size:var(--text-sm)")}>Loading run activity…</div>}
        {runLoadState === "error" && <div style={css("padding:1.2rem 1rem;color:var(--danger);font-size:var(--text-sm)")}>Run activity could not be loaded. Existing workspace activity is still available below.</div>}
        {runLoadState === "ready" && visibleRuns.length === 0 && <div style={css("padding:1.2rem 1rem;color:var(--fg-muted);font-size:var(--text-sm)")}>No durable service runs yet.</div>}
        {runLoadState === "ready" && visibleRuns.length > 0 && (
          <div className="pt-operational-run-grid">
            {visibleRuns.map(run => {
              const total = Math.max(0, run.totalTargets);
              const complete = Math.max(0, Math.min(run.completedTargets, total));
              const progress = total > 0 ? Math.round((complete / total) * 100) : ["current", "ready"].includes(run.state) ? 100 : 0;
              const blocked = ["blocked", "failed", "partial"].includes(run.state);
              const toolCount = Array.isArray(run.agent?.toolTrace) ? run.agent.toolTrace.length : 0;
              const estimate = estimatedRemaining(run);
              const resumable = ["blocked", "failed"].includes(run.state);
              const selectedFullRefresh = FULL_REFRESH_TRIGGERS[fullRefreshTrigger[run.id] as keyof typeof FULL_REFRESH_TRIGGERS];
              return (
                <article key={run.id} data-service-run-id={run.id} className="pt-operational-run-card">
                  <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3)")}>
                    <div style={css("min-width:0")}>
                      <div style={css("font-size:var(--text-sm);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{run.clientName} · {run.serviceKind[0]?.toUpperCase() + run.serviceKind.slice(1)} Checkup</div>
                      <div style={css("margin-top:.12rem;color:var(--fg-muted);font-size:var(--text-2xs);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{run.runKind.replace(/_/g, " ")}{run.triggerKind ? ` · ${run.triggerKind.replace(/_/g, " ")}` : ""}</div>
                    </div>
                    <span className={`pt-run-state is-${run.state}`}>{RUN_STATE_LABEL[run.state] ?? run.state}</span>
                  </div>
                  <div style={css("display:flex;flex-direction:column;gap:.35rem")}>
                    <div style={css("display:flex;align-items:center;justify-content:space-between;gap:.6rem;font-size:var(--text-2xs);color:var(--fg-muted)")}>
                      <span>{total > 0 ? `${complete}/${total} targets` : "Selecting targets"}</span>
                      <span>{progress}%</span>
                    </div>
                    <div style={css("height:.32rem;border-radius:999px;background:var(--surface-alt);overflow:hidden")}><span style={{ display: "block", width: `${progress}%`, height: "100%", borderRadius: 999, background: blocked ? "var(--warn)" : "var(--success)" }} /></div>
                    <div style={css("display:flex;align-items:center;justify-content:space-between;gap:.6rem;font-size:var(--text-2xs);color:var(--fg-faint)")}>
                      <span>{formatElapsed(run.startedAt, run.completedAt)}</span>
                      {estimate && <span>Est. {estimate}</span>}
                    </div>
                  </div>
                  <dl className="pt-operational-run-meta">
                    <div><dt>Baseline</dt><dd>{run.baselineState ? (RUN_STATE_LABEL[run.baselineState] ?? run.baselineState) : "Not published"}</dd></div>
                    <div><dt>Evidence</dt><dd>{run.coverage == null ? "Pending" : `${Math.round(run.coverage * 100)}% coverage`}</dd></div>
                    <div><dt>Freshness</dt><dd>{freshnessLabel(run.evidenceFreshUntil)}</dd></div>
                    <div><dt>Last targeted check</dt><dd>{run.lastTargetedRecheckAt ? `${formatTime(run.lastTargetedRecheckAt)} · ${RUN_STATE_LABEL[run.lastTargetedRecheckState || ""] ?? run.lastTargetedRecheckState}` : "Not run yet"}</dd></div>
                    <div><dt>Next sentinel</dt><dd>{formatTime(run.nextSentinelAt)}</dd></div>
                    {state?.role !== "client" && <div><dt>Versions</dt><dd>Source v{run.sourceVersion ?? "—"} · Checklist v{run.checklistVersion ?? "—"}</dd></div>}
                    {state?.role !== "client" && <div><dt>Agent</dt><dd>{run.agent ? `${run.agent.state} · ${toolCount} tool call${toolCount === 1 ? "" : "s"}` : "Not required yet"}</dd></div>}
                  </dl>
                  {blocked && run.blocker && <div className="pt-operational-run-blocker"><Icon name="alert" size={13} /><span><strong>{run.blockerOwner ? `${run.blockerOwner}: ` : ""}</strong>{run.blocker}{run.recoveryAction ? ` — ${run.recoveryAction}` : ""}</span>{resumable && state?.role !== "client" && <button type="button" disabled={recoverBusy === run.id} onClick={() => void resumeRun(run)}>{recoverBusy === run.id ? "Resuming…" : "Resume from checkpoint"}</button>}</div>}
                  {state?.role !== "client" && ["brand", "website", "seo"].includes(run.serviceKind) && (
                    <details className="pt-operational-run-actions">
                      <summary>Maintenance actions</summary>
                      <div>
                        <button type="button" disabled={!!recheckBusy} onClick={() => void requestRecheck(run, "failed")}>Check failed items</button>
                        <button type="button" disabled={!!recheckBusy} onClick={() => void requestRecheck(run, "unverified")}>Check unverified items</button>
                        <button type="button" disabled={!!recheckBusy} onClick={() => void requestRecheck(run, "changed")}>Refresh changed evidence</button>
                      </div>
                      <label>
                        Full-refresh trigger
                        <select value={fullRefreshTrigger[run.id] || ""} onChange={event => setFullRefreshTrigger(current => ({ ...current, [run.id]: event.target.value }))}>
                          <option value="">Choose why…</option>
                          {Object.entries(FULL_REFRESH_TRIGGERS).map(([value, detail]) => (
                            <option key={value} value={value}>{detail.label}</option>
                          ))}
                        </select>
                      </label>
                      {selectedFullRefresh ? (
                        <div className="pt-full-refresh-explanation" role="note">
                          <strong>{selectedFullRefresh.label}</strong>
                          <span>{selectedFullRefresh.explanation}</span>
                          <span>This will recollect the complete evidence scope; routine maintenance remains targeted.</span>
                        </div>
                      ) : (
                        <p>Choose a documented trigger to see why a complete recollection is necessary.</p>
                      )}
                      <button type="button" disabled={!!recheckBusy || !selectedFullRefresh} onClick={() => void requestRecheck(run, "full")}>
                        {selectedFullRefresh ? `Run full refresh · ${selectedFullRefresh.label}` : "Run full refresh"}
                      </button>
                    </details>
                  )}
                  <div style={css("display:flex;align-items:center;justify-content:space-between;gap:var(--space-2);padding-top:.15rem")}>
                    <span style={css("font-size:var(--text-2xs);color:var(--fg-faint)")}>Updated {formatTime(run.updatedAt)}</span>
                    <a href={serviceRoute(run)} style={css("display:inline-flex;align-items:center;gap:.3rem;color:var(--accent);font-size:var(--text-xs);font-weight:500;text-decoration:none")}>Open <Icon name="arrow" size={12} /></a>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      {state?.role !== "client" && <WorkflowGovernancePanel />}
      <div style={css("display:flex;gap:0.4rem;flex-wrap:wrap")}>
        {filters.map(([k, l]) => {
          const on = filter === k;
          return <button key={k} onClick={() => setFilter(k)} style={css("padding:0.3rem 0.75rem;border-radius:999px;border:1px solid " + (on ? "transparent" : "var(--border)") + ";cursor:pointer;font-size:var(--text-2xs);font-weight:500;" + (on ? "background:var(--fg);color:#fff" : "background:var(--surface);color:var(--fg-muted)"))}>{l}</button>;
        })}
      </div>
      <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden")}>
        {rows.map((a, i) => (
          <div key={i} style={css("display:flex;align-items:center;gap:0.8rem;padding:0.8rem 1.1rem;border-bottom:1px solid var(--border-soft)")}>
            <span style={css("width:1.9rem;height:1.9rem;border-radius:50%;background:color-mix(in srgb," + ACT_LANE[a.k] + " 14%,white 86%);color:" + ACT_LANE[a.k] + ";display:grid;place-items:center;flex-shrink:0")}><Icon name={ACT_ICON[a.k]} size={13} /></span>
            <div style={css("flex:1;min-width:0;font-size:var(--text-base)")}><strong style={{ fontWeight: 500 }}>{a.who}</strong> <span style={{ color: "var(--fg-muted)" }}>{a.act}</span> <strong style={{ fontWeight: 500 }}>{a.obj}</strong></div>
            <span style={css("font-size:var(--text-xs);color:var(--fg-faint);flex-shrink:0")}>{a.t}</span>
          </div>
        ))}
        {rows.length === 0 && (
          <div style={css("padding:2.5rem 1rem;text-align:center;color:var(--fg-muted);font-size:var(--text-base)")}>
            No activity yet.
          </div>
        )}
      </div>
    </div>
  );
}
