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
  cancelled: "Stopped",
};

function serviceLabel(run: OperationalRun) {
  const name = run.serviceKind[0]?.toUpperCase() + run.serviceKind.slice(1);
  return `${name} checkup`;
}

function runSummary(run: OperationalRun) {
  if (run.state === "cancelled") {
    return run.baselineState
      ? "This follow-up check was stopped. Your previous audit is still available."
      : "This check was stopped before any results were saved.";
  }
  if (run.state === "current") return "The checkup is complete and the approved results are current.";
  if (run.state === "ready") return "The checkup finished and is ready for your review.";
  if (run.state === "partial") return "The checkup finished with some evidence still needing review.";
  if (["blocked", "failed"].includes(run.state)) return run.blocker || "The checkup stopped because it needs attention.";
  if (run.state === "reviewing") return "The evidence is ready and the final results are being reviewed.";
  return "The site is being checked now. You can safely leave this page and return later.";
}

function checkedLabel(run: OperationalRun) {
  if (run.totalTargets <= 0) return "Preparing the checklist";
  if (run.completedTargets <= 0) return "No items checked";
  return `${run.completedTargets} of ${run.totalTargets} items checked`;
}

function evidenceLabel(run: OperationalRun) {
  if (run.coverage == null) return "Not collected yet";
  if (run.coverage >= 0.95) return "Evidence available";
  if (run.coverage <= 0) return "No evidence saved";
  return `${Math.round(run.coverage * 100)}% available`;
}

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
  return `/dashboard?view=audits&serviceRunId=${run.id}&auditType=${run.serviceKind}`;
}

function nextStepLabel(run: OperationalRun) {
  if (run.state === "cancelled" && run.baselineState) return "Nothing required";
  if (run.state === "cancelled") return "Start a new checkup when ready";
  if (run.state === "ready" || run.state === "partial") return "Review the results";
  if (run.state === "blocked" || run.state === "failed") return "Resolve the issue";
  if (run.state === "current") return "Nothing required";
  return "Checkup is still running";
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
      const sorted = [...operationalRuns].sort((left, right) => {
        if (left.id === requestedRunId) return -1;
        if (right.id === requestedRunId) return 1;
        return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
      });
      const latest = new Map<string, OperationalRun>();
      for (const run of sorted) {
        const key = `${run.clientId}:${run.serviceKind}`;
        if (!latest.has(key)) latest.set(key, run);
      }
      return [...latest.values()].slice(0, state?.role === "client" ? 12 : 20);
    },
    [operationalRuns, state?.role],
  );
  const featuredRun = visibleRuns[0];
  const recentRuns = visibleRuns.slice(1);

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
      <section className="pt-panel pt-activity-status">
        <header className="pt-activity-status-heading">
          <div className="pt-activity-status-title">
            <h3>Last checkup</h3>
            {featuredRun && <span className={`pt-run-state is-${featuredRun.state}`}>{RUN_STATE_LABEL[featuredRun.state] ?? featuredRun.state}</span>}
          </div>
          <a className="pt-activity-outline-button" href="/dashboard?view=audits">All checkups</a>
        </header>
        {runLoadState === "loading" && <div style={css("padding:1.2rem 1rem;color:var(--fg-muted);font-size:var(--text-sm)")}>Loading run activity…</div>}
        {runLoadState === "error" && <div style={css("padding:1.2rem 1rem;color:var(--danger);font-size:var(--text-sm)")}>Run activity could not be loaded. Existing workspace activity is still available below.</div>}
        {runLoadState === "ready" && !featuredRun && <div style={css("padding:1.2rem 1rem;color:var(--fg-muted);font-size:var(--text-sm)")}>No checkups yet.</div>}
        {runLoadState === "ready" && featuredRun && (() => {
          const run = featuredRun;
          const total = Math.max(0, run.totalTargets);
          const complete = Math.max(0, Math.min(run.completedTargets, total));
          const progress = total > 0 ? Math.round((complete / total) * 100) : ["current", "ready"].includes(run.state) ? 100 : 0;
          const blocked = ["blocked", "failed", "partial"].includes(run.state);
          const estimate = estimatedRemaining(run);
          const resumable = ["blocked", "failed"].includes(run.state);
          const selectedFullRefresh = FULL_REFRESH_TRIGGERS[fullRefreshTrigger[run.id] as keyof typeof FULL_REFRESH_TRIGGERS];
          return (
            <article data-service-run-id={run.id} className="pt-activity-status-body">
              <div className="pt-activity-status-column">
                <p><span>Status:</span><strong>{RUN_STATE_LABEL[run.state] ?? run.state}</strong></p>
                <p><span>Updated:</span><strong>{formatTime(run.updatedAt)}</strong></p>
                <p><span>Client:</span><strong>{run.clientName}</strong></p>
              </div>
              <div className="pt-activity-status-column">
                <p><span>Checkup:</span><strong>{serviceLabel(run)}</strong></p>
                <p><span>Evidence:</span><strong>{evidenceLabel(run)}</strong></p>
                <p><span>Items:</span><strong>{checkedLabel(run)}</strong></p>
              </div>
              <div className="pt-activity-status-column">
                <p><span>Result:</span><strong>{runSummary(run)}</strong></p>
                <p><span>Next step:</span><strong>{nextStepLabel(run)}</strong></p>
                <a className="pt-activity-inline-link" href={serviceRoute(run)}>View checkup <Icon name="arrow" size={12} /></a>
              </div>
              {run.state !== "cancelled" && (
                <div className="pt-activity-progress">
                  <div><span>{checkedLabel(run)}</span><strong>{progress}%</strong></div>
                  <span><i style={{ width: `${progress}%`, background: blocked ? "var(--warn)" : "var(--success)" }} /></span>
                  {estimate && <small>About {estimate}</small>}
                </div>
              )}
              {blocked && run.blocker && <div className="pt-operational-run-blocker"><Icon name="alert" size={13} /><span><strong>{run.blockerOwner ? `${run.blockerOwner}: ` : ""}</strong>{run.blocker}{run.recoveryAction ? ` — ${run.recoveryAction}` : ""}</span>{resumable && state?.role !== "client" && <button type="button" disabled={recoverBusy === run.id} onClick={() => void resumeRun(run)}>{recoverBusy === run.id ? "Resuming…" : "Resume checkup"}</button>}</div>}
              <details className="pt-activity-more">
                <summary>More details</summary>
                <dl className="pt-operational-run-meta">
                  <div><dt>Reason</dt><dd>{run.runKind.replace(/_/g, " ")}{run.triggerKind ? ` · ${run.triggerKind.replace(/_/g, " ")}` : ""}</dd></div>
                  <div><dt>Time spent</dt><dd>{formatElapsed(run.startedAt, run.completedAt)}</dd></div>
                  <div><dt>Previous result</dt><dd>{run.baselineState ? (RUN_STATE_LABEL[run.baselineState] ?? run.baselineState) : "None yet"}</dd></div>
                  <div><dt>Evidence status</dt><dd>{freshnessLabel(run.evidenceFreshUntil)}</dd></div>
                  <div><dt>Last follow-up</dt><dd>{run.lastTargetedRecheckAt ? `${formatTime(run.lastTargetedRecheckAt)} · ${RUN_STATE_LABEL[run.lastTargetedRecheckState || ""] ?? run.lastTargetedRecheckState}` : "Not run yet"}</dd></div>
                  <div><dt>Next automatic check</dt><dd>{formatTime(run.nextSentinelAt)}</dd></div>
                </dl>
              </details>
              {state?.role !== "client" && run.state !== "cancelled" && ["brand", "website", "seo"].includes(run.serviceKind) && (
                <details className="pt-operational-run-actions pt-activity-controls">
                  <summary>Checkup controls</summary>
                  <div>
                    <button type="button" disabled={!!recheckBusy} onClick={() => void requestRecheck(run, "failed")}>Recheck problems</button>
                    <button type="button" disabled={!!recheckBusy} onClick={() => void requestRecheck(run, "unverified")}>Recheck items awaiting review</button>
                    <button type="button" disabled={!!recheckBusy} onClick={() => void requestRecheck(run, "changed")}>Refresh changed pages</button>
                  </div>
                  <label>
                    Full-refresh trigger
                    <select value={fullRefreshTrigger[run.id] || ""} onChange={event => setFullRefreshTrigger(current => ({ ...current, [run.id]: event.target.value }))}>
                      <option value="">Choose why…</option>
                      {Object.entries(FULL_REFRESH_TRIGGERS).map(([value, detail]) => <option key={value} value={value}>{detail.label}</option>)}
                    </select>
                  </label>
                  {selectedFullRefresh ? (
                    <div className="pt-full-refresh-explanation" role="note">
                      <strong>{selectedFullRefresh.label}</strong>
                      <span>{selectedFullRefresh.explanation}</span>
                    </div>
                  ) : <p>Choose why a complete recheck is needed.</p>}
                  <button type="button" disabled={!!recheckBusy || !selectedFullRefresh} onClick={() => void requestRecheck(run, "full")}>Run complete recheck</button>
                </details>
              )}
            </article>
          );
        })()}
      </section>
      {runLoadState === "ready" && recentRuns.length > 0 && (
        <section className="pt-panel pt-activity-recent">
          <header><h3>Recent checkups</h3><span>{recentRuns.length}</span></header>
          {recentRuns.map(run => (
            <a key={run.id} href={serviceRoute(run)}>
              <div><strong>{run.clientName}</strong><span>{serviceLabel(run)} · {formatTime(run.updatedAt)}</span></div>
              <span className={`pt-run-state is-${run.state}`}>{RUN_STATE_LABEL[run.state] ?? run.state}</span>
            </a>
          ))}
        </section>
      )}
      {state?.role !== "client" && (
        <details className="pt-activity-admin">
          <summary><strong>Admin operations</strong><span>Release settings, system alerts, and technical performance</span></summary>
          <WorkflowGovernancePanel />
        </details>
      )}
      {rows.length > 0 && <>
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
        </div>
      </>}
    </div>
  );
}
