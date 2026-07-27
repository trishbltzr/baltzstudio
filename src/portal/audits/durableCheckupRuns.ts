"use client";

import { useEffect, useState } from "react";
import type { ClientCardData } from "../components/ClientPickerGrid";
import { portalHref } from "../routes";

export type DurableCheckupKind = "brand" | "website" | "seo";

export type DurableServiceRun = {
  id: string;
  clientId: string;
  clientName: string;
  serviceKind: string;
  runKind: string;
  state: string;
  sourceKind?: string;
  completedTargets: number;
  totalTargets: number;
  updatedAt: string;
  blocker: string | null;
};

const RUN_STATUS: Record<string, { label: string; tone: ClientCardData["statusTone"] }> = {
  queued: { label: "Queued", tone: "muted" },
  validating: { label: "Validating", tone: "accent" },
  discovering: { label: "Discovering", tone: "accent" },
  capturing: { label: "Capturing", tone: "accent" },
  checking: { label: "Checking", tone: "accent" },
  reviewing: { label: "Reviewing", tone: "warn" },
  ready: { label: "Review needed", tone: "warn" },
  current: { label: "Current", tone: "success" },
  partial: { label: "Partial", tone: "warn" },
  blocked: { label: "Blocked", tone: "danger" },
  failed: { label: "Needs attention", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "muted" },
};

export function durableRunProgress(run: DurableServiceRun) {
  if (run.totalTargets > 0) {
    return Math.round((Math.min(run.completedTargets, run.totalTargets) / run.totalTargets) * 100);
  }
  return ["current", "ready"].includes(run.state) ? 100 : 0;
}

function durableRunDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently updated";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(date);
}

function openDurableRun(runId: string) {
  window.location.assign(portalHref({ view: "activity", serviceRunId: runId }));
}

export function durableCheckupCard(run: DurableServiceRun): ClientCardData {
  const status = RUN_STATUS[run.state] ?? { label: run.state, tone: "muted" as const };
  const stage = run.blocker
    ? "Action required"
    : run.state === "current"
      ? "Baseline published"
      : run.state === "ready"
        ? "Human review"
        : run.state.replace(/_/g, " ");
  return {
    id: `durable-${run.id}`,
    name: run.clientName,
    subtitle: "",
    statusLabel: status.label,
    statusTone: status.tone,
    stage,
    progress: durableRunProgress(run),
    owner: run.blocker ? "Studio" : "Workflow agent",
    due: durableRunDate(run.updatedAt),
    showStatus: true,
    showProgress: true,
    showStage: true,
    showMeta: true,
    primaryLabel: "View progress",
    onPrimary: () => openDurableRun(run.id),
    secondaryLabel: "Open activity",
    secondaryIcon: "activity",
    onSecondary: () => openDurableRun(run.id),
  };
}

export function useDurableCheckupRuns(kind: DurableCheckupKind, role: string, clientName: string) {
  const [runs, setRuns] = useState<DurableServiceRun[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/service-runs?active=false", { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        if (response.status === 401) return { runs: [] };
        if (!response.ok) throw new Error("Durable service runs are unavailable.");
        return response.json() as Promise<{ runs?: DurableServiceRun[] }>;
      })
      .then(payload => {
        const latestByClient = new Map<string, DurableServiceRun>();
        for (const run of Array.isArray(payload.runs) ? payload.runs : []) {
          if (run.serviceKind !== kind || run.sourceKind === "demo" || run.state === "cancelled") continue;
          if (!latestByClient.has(run.clientId)) latestByClient.set(run.clientId, run);
        }
        setRuns([...latestByClient.values()]);
      })
      .catch(error => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setRuns([]);
      });
    return () => controller.abort();
  }, [clientName, kind, role]);
  return runs;
}
