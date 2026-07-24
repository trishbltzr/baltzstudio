import "server-only";

import type { LighthouseRun } from "./auditChecklist";
import { getPortalActorContext } from "./portalIntelligenceRepository";
import type { RenderedPageEvidence, SiteTechnicalEvidence, WebsiteEvidenceBundle } from "./renderedWebsiteEvidence";
import { createSupabaseServerClient } from "./supabase/server";

const EMPTY_TECHNICAL: SiteTechnicalEvidence = {
  https: false,
  httpRedirectsToHttps: null,
  hostRedirectConsistent: null,
  sitemapAvailable: false,
  robotsAvailable: false,
  notFoundHelpful: null,
  brokenLinksChecked: 0,
  brokenLinks: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isRenderedPageEvidence(value: unknown): value is RenderedPageEvidence {
  return isRecord(value)
    && (value.strategy === "desktop" || value.strategy === "mobile")
    && typeof value.url === "string"
    && typeof value.title === "string"
    && isRecord(value.viewport)
    && isRecord(value.content);
}

function isTechnicalEvidence(value: unknown): value is SiteTechnicalEvidence {
  return isRecord(value)
    && typeof value.https === "boolean"
    && typeof value.sitemapAvailable === "boolean"
    && typeof value.robotsAvailable === "boolean"
    && typeof value.brokenLinksChecked === "number"
    && Array.isArray(value.brokenLinks);
}

function isLighthouseRun(value: unknown): value is LighthouseRun {
  return isRecord(value)
    && (value.strategy === "desktop" || value.strategy === "mobile")
    && typeof value.testedUrl === "string"
    && isRecord(value.scores);
}

function requestedPages(provenance: unknown): Array<{ url: string; reason: string; rank: number | null }> {
  if (!isRecord(provenance) || !Array.isArray(provenance.requested_pages)) return [];
  return provenance.requested_pages.flatMap(item => {
    if (!isRecord(item) || typeof item.url !== "string") return [];
    return [{
      url: item.url,
      reason: typeof item.reason === "string" ? item.reason : "Captured for the published checklist.",
      rank: typeof item.rank === "number" ? item.rank : null,
    }];
  });
}

export async function loadDurableGenerationEvidence(serviceRunId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(serviceRunId)) {
    throw new Error("A valid durable service run is required.");
  }
  const supabase = await createSupabaseServerClient();
  const actor = await getPortalActorContext(supabase);
  if (!actor) throw new Error("Sign in to use durable Checkup evidence.");

  let runQuery = supabase
    .from("service_runs")
    .select("id, tenant_id, client_id, service_kind, state, source_version, checklist_version")
    .eq("id", serviceRunId)
    .eq("tenant_id", actor.tenantId);
  if (actor.clientId) runQuery = runQuery.eq("client_id", actor.clientId);
  const { data: run, error: runError } = await runQuery.maybeSingle();
  if (runError) throw new Error(runError.message);
  if (!run) throw new Error("The durable service run was not found.");
  if (!["ready", "current", "partial"].includes(run.state)) {
    throw new Error(`The Checkup evidence is still ${run.state}. Wait until capture and review finish.`);
  }

  const { data: snapshot, error: snapshotError } = await supabase
    .from("evidence_snapshots")
    .select("id, status, coverage_ratio, provenance, captured_at, fresh_until, fingerprint")
    .eq("service_run_id", run.id)
    .in("status", ["ready", "partial"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (snapshotError) throw new Error(snapshotError.message);
  if (!snapshot) throw new Error("This Checkup has no durable evidence snapshot ready for generation.");

  const [{ data: items, error: itemsError }, { data: revisions, error: revisionsError }] = await Promise.all([
    supabase
      .from("evidence_items")
      .select("id, source_kind, source_locator, device_kind, status, payload, fingerprint, captured_at, fresh_until")
      .eq("evidence_snapshot_id", snapshot.id)
      .order("captured_at"),
    supabase
      .from("check_result_revisions")
      .select("id, check_definition_id, status, score, verifier_kind, confidence, limitations, rationale, evidence_item_ids, evidence_fingerprint, created_at")
      .eq("service_run_id", run.id)
      .order("created_at"),
  ]);
  if (itemsError) throw new Error(itemsError.message);
  if (revisionsError) throw new Error(revisionsError.message);

  const rendered: RenderedPageEvidence[] = [];
  const lighthouse: LighthouseRun[] = [];
  for (const item of items ?? []) {
    if (item.source_kind === "rendered_page" && item.status === "verified" && isRenderedPageEvidence(item.payload)) {
      rendered.push(item.payload);
    }
    if (item.source_kind === "lighthouse" && item.status === "verified" && isLighthouseRun(item.payload)) {
      lighthouse.push(item.payload);
    }
  }
  const technical = [...(items ?? [])]
    .reverse()
    .find(item => item.source_kind === "technical" && item.status === "verified" && isTechnicalEvidence(item.payload));
  const pages = requestedPages(snapshot.provenance);
  const pagesReviewed = [...new Set([
    ...pages.map(page => page.url),
    ...rendered.map(page => page.url),
  ])];

  return {
    run: {
      id: run.id,
      clientId: run.client_id,
      serviceKind: run.service_kind,
      state: run.state,
      sourceVersion: run.source_version,
      checklistVersion: run.checklist_version,
    },
    snapshot: {
      id: snapshot.id,
      status: snapshot.status,
      coverage: Number(snapshot.coverage_ratio),
      capturedAt: snapshot.captured_at,
      freshUntil: snapshot.fresh_until,
      fingerprint: snapshot.fingerprint,
    },
    pages,
    pagesReviewed,
    websiteEvidence: {
      rendered,
      technical: technical && isTechnicalEvidence(technical.payload) ? technical.payload : EMPTY_TECHNICAL,
    } satisfies WebsiteEvidenceBundle,
    lighthouse,
    reviewedChecks: revisions ?? [],
  };
}
