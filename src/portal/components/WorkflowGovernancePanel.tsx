"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { css } from "../helpers";
import { Icon } from "../icons";

type ReleaseControl = {
  new_workflows_enabled: boolean;
  rollout_stage: "internal" | "pilot" | "cohort" | "general";
  client_projection_source: "legacy" | "shadow" | "normalized";
  pilot_client_id: string | null;
  rollout_note: string;
  updated_at: string | null;
};

type GovernancePayload = {
  role: "admin" | "manager";
  release: ReleaseControl;
  clients: Array<{ id: string; name: string; slug: string; source_kind: string; status: string }>;
  rolloutClients: Array<{
    client_id: string;
    cohort_name: string;
    enabled: boolean;
    created_at: string;
    updated_at: string;
  }>;
  parity: Array<{
    id: string;
    client_name: string;
    legacy_kind: string;
    legacy_reference: string;
    legacy_score: number | null;
    normalized_score: number | null;
    parity_state: string;
    review_state: string;
    discrepancies: unknown;
    created_at: string;
  }>;
  migration: Array<{
    id: string;
    legacy_kind: string;
    legacy_reference: string;
    proposed_client_id: string | null;
    proposed_service_run_id: string | null;
    reason: string;
    state: string;
    created_at: string;
  }>;
  alerts: Array<{
    id: string;
    service_run_id: string | null;
    alert_kind: string;
    severity: string;
    summary: string;
    state: string;
    created_at: string;
  }>;
  metrics: Array<{
    service_run_id: string | null;
    duration_seconds: number | null;
    target_completion_ratio: number | null;
    coverage_ratio: number | null;
    retry_count: number | null;
    failure_count: number | null;
    no_op: boolean | null;
    agent_latency_ms: number | null;
    agent_tool_call_count: number | null;
    agent_token_cost: number | null;
    approval_turnaround_seconds: number | null;
    check_throughput_per_minute: number | null;
    evidence_item_count: number | null;
    page_evidence_throughput_per_minute: number | null;
    regression_count: number | null;
    stage_duration_seconds: unknown;
  }>;
  memories: Array<{
    id: string;
    client_name: string;
    service_kind: string;
    stage_key: string;
    memory_kind: string;
    source_kind: string;
    source_reference: string;
    confidence: number;
    role_scope: string[];
    access_policy: string;
    approved_by: string;
    approved_at: string;
    expires_at: string | null;
    revoked_at: string | null;
    usage_count: number;
    last_used_at: string | null;
    revisions: Array<{
      revision: number;
      change_kind: string;
      change_summary: string;
      changed_by: string | null;
      created_at: string;
    }>;
  }>;
  agentDefinitions: Array<{
    id: string;
    stable_key: string;
    version: number;
    lifecycle_state: string;
    service_kind: string;
    name: string;
    instructions: string;
    allowed_tools: string[];
    output_schema: unknown;
    memory_policy: unknown;
    approval_requirements: unknown;
    playbook_key: string;
    playbook_version: number;
    change_summary: string;
    owner_user_id: string | null;
    last_reviewed_at: string | null;
    published_at: string | null;
    updated_at: string;
    eval_status: string;
    run_count: number;
    last_run_at: string | null;
  }>;
};

type GovernanceAction =
  | Record<string, unknown> & {
      action:
        | "update_release"
        | "set_cohort_client"
        | "review_parity"
        | "run_shadow_comparisons"
        | "review_migration"
        | "scan_legacy"
        | "resolve_alert"
        | "revoke_memory"
        | "create_agent_draft"
        | "update_agent_draft"
        | "publish_agent_definition"
        | "archive_agent_definition";
    };

function formatDate(value: string | null) {
  if (!value) return "Not yet";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not yet"
    : new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatDuration(seconds: number | null) {
  if (seconds == null) return "—";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function WorkflowGovernancePanel() {
  const [payload, setPayload] = useState<GovernancePayload | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [releaseDraft, setReleaseDraft] = useState<ReleaseControl | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const response = await fetch("/api/workflow-governance", { cache: "no-store" });
      const result = await response.json().catch(() => null) as GovernancePayload & { error?: string } | null;
      if (!response.ok || !result) throw new Error(result?.error || "Workflow governance is unavailable.");
      setPayload(result);
      setReleaseDraft(result.release);
      setStatus("ready");
      setError(null);
    } catch (loadError) {
      setStatus("error");
      setError(loadError instanceof Error ? loadError.message : "Workflow governance is unavailable.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function mutate(key: string, action: GovernanceAction) {
    if (busy) return;
    setBusy(key);
    setError(null);
    try {
      const response = await fetch("/api/workflow-governance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error || "The governance change could not be saved.");
      await load();
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "The governance change could not be saved.");
    } finally {
      setBusy(null);
    }
  }

  const metricSummary = useMemo(() => {
    const metrics = payload?.metrics ?? [];
    const numeric = (values: Array<number | null>) =>
      values.filter((value): value is number => typeof value === "number");
    const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    return {
      runs: metrics.length,
      duration: average(numeric(metrics.map(item => item.duration_seconds))),
      coverage: average(numeric(metrics.map(item => item.coverage_ratio))),
      retries: numeric(metrics.map(item => item.retry_count)).reduce((sum, value) => sum + value, 0),
      failures: numeric(metrics.map(item => item.failure_count)).reduce((sum, value) => sum + value, 0),
      noOpRate: metrics.length ? metrics.filter(item => item.no_op).length / metrics.length : null,
      agentLatency: average(numeric(metrics.map(item => item.agent_latency_ms))),
      agentCost: numeric(metrics.map(item => item.agent_token_cost)).reduce((sum, value) => sum + value, 0),
      toolCalls: numeric(metrics.map(item => item.agent_tool_call_count)).reduce((sum, value) => sum + value, 0),
      pageThroughput: average(numeric(metrics.map(item => item.page_evidence_throughput_per_minute))),
      checkThroughput: average(numeric(metrics.map(item => item.check_throughput_per_minute))),
      approvalTurnaround: average(numeric(metrics.map(item => item.approval_turnaround_seconds))),
      regressions: numeric(metrics.map(item => item.regression_count)).reduce((sum, value) => sum + value, 0),
    };
  }, [payload?.metrics]);

  if (status === "loading") {
    return <section className="pt-panel" style={css("padding:1rem;color:var(--fg-muted);font-size:var(--text-sm)")}>Loading workflow governance…</section>;
  }
  if (status === "error" || !payload || !releaseDraft) {
    return <section className="pt-panel" style={css("padding:1rem;color:var(--danger);font-size:var(--text-sm)")}>{error || "Workflow governance is unavailable."}</section>;
  }

  const openAlerts = payload.alerts.filter(alert => alert.state === "open");
  const pendingParity = payload.parity.filter(item => item.review_state === "pending");
  const pendingMigration = payload.migration.filter(item => item.state === "open");
  const activeMemories = payload.memories.filter(memory => !memory.revoked_at);

  return (
    <section className="pt-panel pt-governance-panel">
      <header className="pt-governance-heading">
        <div>
          <h3>Workflow governance</h3>
          <p>Rollout, parity, migration, alerts, memory, and operational quality in one staff-only surface.</p>
        </div>
        <span className="pt-run-state is-current">Internal</span>
      </header>
      {error && <div className="pt-governance-error">{error}</div>}

      <div className="pt-governance-metrics">
        {[
          ["Runs", String(metricSummary.runs)],
          ["Avg duration", formatDuration(metricSummary.duration == null ? null : Math.round(metricSummary.duration))],
          ["Avg coverage", metricSummary.coverage == null ? "—" : `${Math.round(metricSummary.coverage * 100)}%`],
          ["No-op rate", metricSummary.noOpRate == null ? "—" : `${Math.round(metricSummary.noOpRate * 100)}%`],
          ["Retries / failures", `${metricSummary.retries} / ${metricSummary.failures}`],
          ["Avg agent latency", metricSummary.agentLatency == null ? "—" : formatDuration(Math.round(metricSummary.agentLatency / 1000))],
          ["Pages / min", metricSummary.pageThroughput == null ? "—" : metricSummary.pageThroughput.toFixed(1)],
          ["Checks / min", metricSummary.checkThroughput == null ? "—" : metricSummary.checkThroughput.toFixed(1)],
          ["Approval time", metricSummary.approvalTurnaround == null ? "—" : formatDuration(Math.round(metricSummary.approvalTurnaround))],
          ["Tools / cost", `${metricSummary.toolCalls} / £${metricSummary.agentCost.toFixed(2)}`],
          ["Regressions", String(metricSummary.regressions)],
          ["Open alerts", String(openAlerts.length)],
        ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>

      <div className="pt-governance-grid">
        <article className="pt-governance-card">
          <div className="pt-governance-card-heading">
            <div><strong>Release control</strong><span>Data-preserving rollout and rollback</span></div>
            <span className={`pt-run-state ${releaseDraft.new_workflows_enabled ? "is-current" : "is-blocked"}`}>
              {releaseDraft.rollout_stage.replace("_", " ")} · {releaseDraft.new_workflows_enabled ? "active" : "paused"}
            </span>
          </div>
          <label className="pt-governance-field">
            <span>Rollout stage</span>
            <select
              value={releaseDraft.rollout_stage}
              onChange={event => {
                const rolloutStage = event.target.value as ReleaseControl["rollout_stage"];
                setReleaseDraft(current => current
                  ? {
                    ...current,
                    rollout_stage: rolloutStage,
                    new_workflows_enabled: rolloutStage === "internal" ? false : current.new_workflows_enabled,
                    pilot_client_id: rolloutStage === "pilot" ? current.pilot_client_id : null,
                  }
                  : current);
              }}
            >
              <option value="internal">Internal verification</option>
              <option value="pilot">Single-client pilot</option>
              <option value="cohort">Controlled cohort</option>
              <option value="general">General availability</option>
            </select>
          </label>
          <label className="pt-governance-field">
            <span>New workflows</span>
            <select
              value={releaseDraft.new_workflows_enabled ? "enabled" : "paused"}
              disabled={releaseDraft.rollout_stage === "internal"}
              onChange={event => setReleaseDraft(current => current ? { ...current, new_workflows_enabled: event.target.value === "enabled" } : current)}
            >
              <option value="enabled">Enabled</option>
              <option value="paused">Paused — preserve history</option>
            </select>
          </label>
          <label className="pt-governance-field">
            <span>Client projection source</span>
            <select value={releaseDraft.client_projection_source} onChange={event => setReleaseDraft(current => current ? { ...current, client_projection_source: event.target.value as ReleaseControl["client_projection_source"] } : current)}>
              <option value="legacy">Legacy</option>
              <option value="shadow">Shadow only</option>
              <option value="normalized">Normalized — parity-gated</option>
            </select>
          </label>
          {releaseDraft.rollout_stage === "pilot" && <label className="pt-governance-field">
            <span>Pilot client</span>
            <select value={releaseDraft.pilot_client_id || ""} onChange={event => setReleaseDraft(current => current ? { ...current, pilot_client_id: event.target.value || null } : current)}>
              <option value="">Choose a production client</option>
              {payload.clients.filter(client => client.source_kind === "production" && client.status !== "archived").map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
            </select>
          </label>}
          {releaseDraft.rollout_stage === "cohort" && <div className="pt-governance-field">
            <span>Controlled cohort</span>
            <div className="pt-governance-list">
              {payload.clients.filter(client => client.source_kind === "production" && client.status !== "archived").length === 0 && <p>No production clients are available yet.</p>}
              {payload.clients.filter(client => client.source_kind === "production" && client.status !== "archived").map(client => {
                const member = payload.rolloutClients.find(item => item.client_id === client.id);
                const enabled = member?.enabled === true;
                return (
                  <div key={client.id} className="pt-governance-list-row">
                    <div><strong>{client.name}</strong><span>{enabled ? member?.cohort_name || "Production cohort" : "Not included"}</span></div>
                    <button
                      type="button"
                      disabled={payload.role !== "admin" || !!busy}
                      onClick={() => void mutate(`cohort:${client.id}`, {
                        action: "set_cohort_client",
                        clientId: client.id,
                        enabled: !enabled,
                        cohortName: member?.cohort_name || "production-cohort",
                      })}
                    >
                      {enabled ? "Remove" : "Add"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>}
          <label className="pt-governance-field">
            <span>Rollout / rollback note</span>
            <textarea rows={2} value={releaseDraft.rollout_note} onChange={event => setReleaseDraft(current => current ? { ...current, rollout_note: event.target.value } : current)} placeholder="Why this control changed…" />
          </label>
          <button
            type="button"
            className="pt-governance-primary"
            disabled={payload.role !== "admin" || !!busy}
            onClick={() => void mutate("release", {
              action: "update_release",
              enabled: releaseDraft.new_workflows_enabled,
              rolloutStage: releaseDraft.rollout_stage,
              projectionSource: releaseDraft.client_projection_source,
              pilotClientId: releaseDraft.pilot_client_id,
              note: releaseDraft.rollout_note,
            })}
          >
            Save release control
          </button>
          <p className="pt-governance-note">Internal blocks production, Pilot permits one client, Cohort uses the explicit allowlist, and General permits every production client. Pausing always preserves evidence and history.</p>
        </article>

        <article className="pt-governance-card">
          <div className="pt-governance-card-heading">
            <div><strong>Operational alerts</strong><span>Owned recovery signals</span></div>
            <span>{openAlerts.length} open</span>
          </div>
          <div className="pt-governance-list">
            {openAlerts.length === 0 && <p>No open workflow alerts.</p>}
            {openAlerts.slice(0, 8).map(alert => (
              <div key={alert.id} className="pt-governance-list-row">
                <span className={`pt-governance-dot is-${alert.severity}`} />
                <div><strong>{alert.alert_kind.replace(/_/g, " ")}</strong><span>{alert.summary}</span><small>{formatDate(alert.created_at)}</small></div>
                <button type="button" disabled={!!busy} onClick={() => void mutate(`alert:${alert.id}`, { action: "resolve_alert", alertId: alert.id })}>Resolve</button>
              </div>
            ))}
          </div>
        </article>

        <article className="pt-governance-card">
          <div className="pt-governance-card-heading">
            <div><strong>Shadow parity</strong><span>Reviewed old/new comparisons</span></div>
            <span>{pendingParity.length} pending</span>
          </div>
          <button type="button" className="pt-governance-primary" disabled={!!busy} onClick={() => void mutate("shadow-comparisons", { action: "run_shadow_comparisons" })}>Compare reviewed links</button>
          <p className="pt-governance-note">Runs only on explicitly linked Website Checkups. Any changed score or checklist result resets approval.</p>
          <div className="pt-governance-list">
            {payload.parity.length === 0 && <p>No shadow comparisons yet. Keep the client source on legacy until a real pilot comparison is reviewed.</p>}
            {payload.parity.slice(0, 8).map(item => (
              <div key={item.id} className="pt-governance-list-row is-stacked">
                <div>
                  <strong>{item.client_name} · {item.parity_state.replace(/_/g, " ")}</strong>
                  <span>{item.legacy_kind.replace(/_/g, " ")} · {item.legacy_score ?? "—"} → {item.normalized_score ?? "—"}</span>
                  <small>{item.review_state} · {formatDate(item.created_at)}</small>
                </div>
                {item.review_state === "pending" && <div className="pt-governance-actions">
                  <button type="button" disabled={!!busy || item.parity_state !== "match"} onClick={() => void mutate(`parity:${item.id}`, { action: "review_parity", comparisonId: item.id, decision: "approved" })}>Approve parity</button>
                  <button type="button" disabled={!!busy} onClick={() => void mutate(`parity:${item.id}`, { action: "review_parity", comparisonId: item.id, decision: "rejected" })}>Reject</button>
                </div>}
              </div>
            ))}
          </div>
        </article>

        <article className="pt-governance-card">
          <div className="pt-governance-card-heading">
            <div><strong>Migration review</strong><span>Ambiguous historical records</span></div>
            <span>{pendingMigration.length} open</span>
          </div>
          <button type="button" className="pt-governance-primary" disabled={!!busy} onClick={() => void mutate("scan-legacy", { action: "scan_legacy" })}>Scan historical Checkups</button>
          <p className="pt-governance-note">Scanning never promotes a test record or guesses a client. It creates review rows and preserves the original URL.</p>
          <div className="pt-governance-list">
            {payload.migration.length === 0 && <p>No ambiguous legacy records are waiting.</p>}
            {payload.migration.slice(0, 8).map(item => (
              <div key={item.id} className="pt-governance-list-row is-stacked">
                <div><strong>{item.legacy_reference}</strong><span>{item.reason}</span><small>{item.legacy_kind.replace(/_/g, " ")} · {item.state}</small></div>
                {item.state === "open" && <div className="pt-governance-actions">
                  <button type="button" disabled={!!busy || !item.proposed_client_id || !item.proposed_service_run_id} onClick={() => void mutate(`migration:${item.id}`, { action: "review_migration", queueId: item.id, decision: "linked" })}>Link</button>
                  <button type="button" disabled={!!busy} onClick={() => void mutate(`migration:${item.id}`, { action: "review_migration", queueId: item.id, decision: "rejected" })}>Reject</button>
                </div>}
              </div>
            ))}
          </div>
        </article>
      </div>

      <details className="pt-governance-memory">
        <summary><span><Icon name="history" size={14} />Approved memory inspector</span><small>{activeMemories.length} active · source, scope, review, expiry, use, history, revoke</small></summary>
        <div className="pt-governance-memory-grid">
          {payload.memories.length === 0 && <p>No approved durable memory exists. Conversation history is not treated as business memory.</p>}
          {payload.memories.map(memory => (
            <article key={memory.id} className={memory.revoked_at ? "is-revoked" : ""}>
              <div className="pt-governance-card-heading">
                <div><strong>{memory.client_name} · {memory.memory_kind}</strong><span>{memory.service_kind} / {memory.stage_key}</span></div>
                <span className={`pt-run-state ${memory.revoked_at ? "is-cancelled" : "is-current"}`}>{memory.revoked_at ? "Revoked" : memory.access_policy}</span>
              </div>
              <dl>
                <div><dt>Source</dt><dd>{memory.source_kind} · {memory.source_reference}</dd></div>
                <div><dt>Reviewer</dt><dd>{memory.approved_by}</dd></div>
                <div><dt>Confidence</dt><dd>{Math.round(memory.confidence * 100)}%</dd></div>
                <div><dt>Role scope</dt><dd>{memory.role_scope.join(", ")}</dd></div>
                <div><dt>Expires</dt><dd>{formatDate(memory.expires_at)}</dd></div>
                <div><dt>Usage</dt><dd>{memory.usage_count} runs · last {formatDate(memory.last_used_at)}</dd></div>
              </dl>
              <details>
                <summary>Edit history · {memory.revisions.length} revision{memory.revisions.length === 1 ? "" : "s"}</summary>
                {memory.revisions.map(revision => <p key={revision.revision}>v{revision.revision} · {revision.change_kind} · {revision.change_summary} · {formatDate(revision.created_at)}</p>)}
              </details>
              {!memory.revoked_at && <button
                type="button"
                disabled={!!busy}
                onClick={() => {
                  const reason = window.prompt("Why should this approved memory be revoked?");
                  if (reason) void mutate(`memory:${memory.id}`, { action: "revoke_memory", memoryId: memory.id, reason });
                }}
              >
                Revoke memory
              </button>}
            </article>
          ))}
        </div>
      </details>

      <details className="pt-governance-memory">
        <summary><span><Icon name="sparkles" size={14} />Playbook Agent controls</span><small>{payload.agentDefinitions.length} version{payload.agentDefinitions.length === 1 ? "" : "s"} · lifecycle, tools, memory, gates, samples, evals, owner</small></summary>
        <div className="pt-governance-memory-grid">
          {payload.agentDefinitions.length === 0 && <p>No versioned Agent Definition is available for this workspace.</p>}
          {payload.agentDefinitions.map(definition => (
            <article key={definition.id}>
              <div className="pt-governance-card-heading">
                <div><strong>{definition.name} · v{definition.version}</strong><span>{definition.playbook_key}@{definition.playbook_version} · {definition.service_kind}</span></div>
                <span className={`pt-run-state is-${definition.lifecycle_state === "published" ? "current" : definition.lifecycle_state === "draft" ? "ready" : "cancelled"}`}>{definition.lifecycle_state}</span>
              </div>
              <dl>
                <div><dt>Owner</dt><dd>{definition.owner_user_id ? `User ${definition.owner_user_id.slice(0, 8)}` : "Workspace admin"}</dd></div>
                <div><dt>Last reviewed</dt><dd>{formatDate(definition.last_reviewed_at)}</dd></div>
                <div><dt>Eval status</dt><dd>{definition.eval_status.replace(/_/g, " ")} · {definition.run_count} run{definition.run_count === 1 ? "" : "s"}</dd></div>
                <div><dt>Last run</dt><dd>{formatDate(definition.last_run_at)}</dd></div>
              </dl>
              <details>
                <summary>Instructions</summary>
                <p>{definition.instructions}</p>
              </details>
              <details>
                <summary>Allowed tools · {definition.allowed_tools.length}</summary>
                <p>{definition.allowed_tools.length ? definition.allowed_tools.join(", ") : "No tools enabled."}</p>
              </details>
              <details>
                <summary>Memory policy</summary>
                <pre>{JSON.stringify(definition.memory_policy, null, 2)}</pre>
              </details>
              <details>
                <summary>Approval gates</summary>
                <pre>{JSON.stringify(definition.approval_requirements, null, 2)}</pre>
              </details>
              <details>
                <summary>Structured output sample</summary>
                <pre>{JSON.stringify(definition.output_schema, null, 2)}</pre>
              </details>
              <div className="pt-governance-change-summary"><strong>Change summary</strong><span>{definition.change_summary || "No change summary recorded."}</span></div>
              {payload.role === "admin" && <div className="pt-governance-actions">
                {definition.lifecycle_state === "published" && <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => void mutate(`agent-draft:${definition.id}`, {
                    action: "create_agent_draft",
                    definitionId: definition.id,
                  })}
                >
                  Create editable draft
                </button>}
                {definition.lifecycle_state === "draft" && <>
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => {
                      const instructions = window.prompt("Agent instructions", definition.instructions);
                      if (instructions == null) return;
                      const tools = window.prompt("Allowed tools, comma separated", definition.allowed_tools.join(", "));
                      if (tools == null) return;
                      const changeSummary = window.prompt("Change summary", definition.change_summary);
                      if (changeSummary == null) return;
                      void mutate(`agent-edit:${definition.id}`, {
                        action: "update_agent_draft",
                        definitionId: definition.id,
                        instructions,
                        allowedTools: tools.split(","),
                        changeSummary,
                      });
                    }}
                  >
                    Edit draft
                  </button>
                  <button
                    type="button"
                    className="pt-governance-primary"
                    disabled={!!busy || definition.change_summary.trim().length < 8}
                    onClick={() => void mutate(`agent-publish:${definition.id}`, {
                      action: "publish_agent_definition",
                      definitionId: definition.id,
                    })}
                  >
                    Publish reviewed version
                  </button>
                </>}
                {definition.lifecycle_state !== "archived" && <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => {
                    if (window.confirm(`Archive ${definition.name} v${definition.version}? Historical runs will keep this version.`)) {
                      void mutate(`agent-archive:${definition.id}`, {
                        action: "archive_agent_definition",
                        definitionId: definition.id,
                      });
                    }
                  }}
                >
                  Archive
                </button>}
              </div>}
            </article>
          ))}
        </div>
      </details>
    </section>
  );
}
