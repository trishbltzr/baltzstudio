import { NextResponse } from "next/server";
import { getPortalActorContext } from "@/lib/portalIntelligenceRepository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  compareShadowProjections,
  projectLegacyWebsiteAudit,
  projectNormalizedWebsiteRun,
} from "@/lib/workflowShadowComparison";

export const runtime = "nodejs";

type GovernanceAction =
  | {
      action: "update_release";
      enabled: boolean;
      rolloutStage: "internal" | "pilot" | "cohort" | "general";
      projectionSource: "legacy" | "shadow" | "normalized";
      pilotClientId?: string | null;
      note: string;
    }
  | {
      action: "set_cohort_client";
      clientId: string;
      enabled: boolean;
      cohortName?: string;
    }
  | { action: "review_parity"; comparisonId: string; decision: "approved" | "rejected" }
  | { action: "run_shadow_comparisons" }
  | { action: "review_migration"; queueId: string; decision: "linked" | "rejected" }
  | { action: "scan_legacy" }
  | { action: "resolve_alert"; alertId: string }
  | { action: "revoke_memory"; memoryId: string; reason: string }
  | { action: "create_agent_draft"; definitionId: string }
  | {
      action: "update_agent_draft";
      definitionId: string;
      instructions: string;
      allowedTools: string[];
      changeSummary: string;
    }
  | { action: "publish_agent_definition"; definitionId: string }
  | { action: "archive_agent_definition"; definitionId: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const actor = await getPortalActorContext(supabase);
    if (!actor) return NextResponse.json({ error: "Sign in to view workflow governance." }, { status: 401 });
    if (actor.role === "client") return NextResponse.json({ error: "Workflow governance is staff-only." }, { status: 403 });

    const [
      releaseResult,
      clientsResult,
      rolloutClientsResult,
      parityResult,
      migrationResult,
      alertsResult,
      metricsResult,
      memoriesResult,
      definitionsResult,
      definitionRunsResult,
    ] = await Promise.all([
      supabase
        .from("workflow_release_controls")
        .select("tenant_id, new_workflows_enabled, rollout_stage, client_projection_source, pilot_client_id, rollout_note, updated_at")
        .eq("tenant_id", actor.tenantId)
        .maybeSingle(),
      supabase
        .from("clients")
        .select("id, name, slug, source_kind, status")
        .eq("tenant_id", actor.tenantId)
        .order("name"),
      supabase
        .from("workflow_rollout_clients")
        .select("client_id, cohort_name, enabled, created_at, updated_at")
        .eq("tenant_id", actor.tenantId)
        .order("created_at"),
      supabase
        .from("projection_shadow_comparisons")
        .select("id, client_id, service_run_id, legacy_kind, legacy_reference, legacy_score, normalized_score, parity_state, discrepancies, review_state, reviewed_at, created_at")
        .eq("tenant_id", actor.tenantId)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("migration_review_queue")
        .select("id, legacy_kind, legacy_reference, proposed_client_id, proposed_service_run_id, reason, evidence, state, reviewed_at, created_at")
        .eq("tenant_id", actor.tenantId)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("workflow_alerts")
        .select("id, service_run_id, alert_kind, severity, summary, metadata, state, created_at, updated_at")
        .eq("tenant_id", actor.tenantId)
        .order("created_at", { ascending: false })
        .limit(40),
      supabase
        .from("service_run_operational_metrics")
        .select("*")
        .eq("tenant_id", actor.tenantId)
        .order("duration_seconds", { ascending: false })
        .limit(60),
      supabase
        .from("agent_memory")
        .select("id, client_id, service_kind, stage_key, memory_kind, content, source_kind, source_reference, confidence, role_scope, access_policy, approved_by, approved_at, expires_at, revoked_at, created_at")
        .eq("tenant_id", actor.tenantId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("agent_definitions")
        .select("id, stable_key, version, lifecycle_state, service_kind, name, instructions, allowed_tools, output_schema, memory_policy, approval_requirements, playbook_key, playbook_version, change_summary, owner_user_id, last_reviewed_at, published_at, updated_at")
        .eq("tenant_id", actor.tenantId)
        .order("stable_key")
        .order("version", { ascending: false }),
      supabase
        .from("agent_runs")
        .select("agent_definition_id, state, completed_at, created_at")
        .eq("tenant_id", actor.tenantId)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    const firstError = [
      releaseResult.error,
      clientsResult.error,
      rolloutClientsResult.error,
      parityResult.error,
      migrationResult.error,
      alertsResult.error,
      metricsResult.error,
      memoriesResult.error,
      definitionsResult.error,
      definitionRunsResult.error,
    ].find(Boolean);
    if (firstError) throw new Error(firstError.message);

    const memoryIds = (memoriesResult.data ?? []).map(memory => memory.id);
    const [{ data: revisions, error: revisionsError }, { data: usage, error: usageError }] = await Promise.all([
      memoryIds.length
        ? supabase
          .from("agent_memory_revisions")
          .select("memory_id, revision, change_kind, change_summary, changed_by, created_at")
          .in("memory_id", memoryIds)
          .order("revision", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      memoryIds.length
        ? supabase
          .from("agent_memory_usage_events")
          .select("memory_id, agent_run_id, service_run_id, stage_key, used_at")
          .in("memory_id", memoryIds)
          .order("used_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (revisionsError) throw new Error(revisionsError.message);
    if (usageError) throw new Error(usageError.message);

    const clientById = new Map((clientsResult.data ?? []).map(client => [client.id, client]));
    const revisionsByMemory = new Map<string, typeof revisions>();
    for (const revision of revisions ?? []) {
      const rows = revisionsByMemory.get(revision.memory_id) ?? [];
      rows.push(revision);
      revisionsByMemory.set(revision.memory_id, rows);
    }
    const usageByMemory = new Map<string, typeof usage>();
    for (const event of usage ?? []) {
      const rows = usageByMemory.get(event.memory_id) ?? [];
      rows.push(event);
      usageByMemory.set(event.memory_id, rows);
    }

    return NextResponse.json({
      role: actor.role,
      release: releaseResult.data ?? {
        tenant_id: actor.tenantId,
        new_workflows_enabled: false,
        rollout_stage: "internal",
        client_projection_source: "legacy",
        pilot_client_id: null,
        rollout_note: "",
        updated_at: null,
      },
      clients: clientsResult.data ?? [],
      rolloutClients: rolloutClientsResult.data ?? [],
      parity: (parityResult.data ?? []).map(item => ({
        ...item,
        client_name: clientById.get(item.client_id)?.name ?? "Client",
      })),
      migration: migrationResult.data ?? [],
      alerts: alertsResult.data ?? [],
      metrics: metricsResult.data ?? [],
      memories: (memoriesResult.data ?? []).map(memory => ({
        ...memory,
        client_name: clientById.get(memory.client_id)?.name ?? "Client",
        usage_count: usageByMemory.get(memory.id)?.length ?? 0,
        last_used_at: usageByMemory.get(memory.id)?.[0]?.used_at ?? null,
        revisions: revisionsByMemory.get(memory.id) ?? [],
      })),
      agentDefinitions: (definitionsResult.data ?? []).map(definition => {
        const recentRuns = (definitionRunsResult.data ?? [])
          .filter(run => run.agent_definition_id === definition.id);
        const completedRuns = recentRuns.filter(run => run.state === "completed");
        return {
          ...definition,
          eval_status: recentRuns.length === 0
            ? "not_run"
            : completedRuns.length === recentRuns.length
              ? "passing"
              : "needs_review",
          run_count: recentRuns.length,
          last_run_at: recentRuns[0]?.completed_at ?? recentRuns[0]?.created_at ?? null,
        };
      }),
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Workflow governance could not be loaded.",
    }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const actor = await getPortalActorContext(supabase);
    if (!actor) return NextResponse.json({ error: "Sign in to manage workflow governance." }, { status: 401 });
    if (actor.role === "client") return NextResponse.json({ error: "Workflow governance is staff-only." }, { status: 403 });

    const raw = await request.json().catch(() => null);
    if (!isRecord(raw) || typeof raw.action !== "string") {
      return NextResponse.json({ error: "A valid governance action is required." }, { status: 400 });
    }
    const input = raw as GovernanceAction;

    if (input.action === "update_release") {
      if (actor.role !== "admin") {
        return NextResponse.json({ error: "Only an admin can change rollout controls." }, { status: 403 });
      }
      if (!["legacy", "shadow", "normalized"].includes(input.projectionSource)) {
        return NextResponse.json({ error: "Choose a valid projection source." }, { status: 400 });
      }
      if (!["internal", "pilot", "cohort", "general"].includes(input.rolloutStage)) {
        return NextResponse.json({ error: "Choose a valid rollout stage." }, { status: 400 });
      }
      if (input.note.trim().length < 8) {
        return NextResponse.json({ error: "Record a concise rollout or rollback note." }, { status: 400 });
      }
      if (input.rolloutStage === "internal" && input.enabled) {
        return NextResponse.json({ error: "Internal verification must keep production workflows paused." }, { status: 409 });
      }
      if (input.rolloutStage === "pilot" && !input.pilotClientId) {
        return NextResponse.json({ error: "Choose one real production client for the pilot stage." }, { status: 409 });
      }
      if (input.pilotClientId) {
        const { data: pilotClient, error: pilotError } = await supabase
          .from("clients")
          .select("id, source_kind, status")
          .eq("tenant_id", actor.tenantId)
          .eq("id", input.pilotClientId)
          .maybeSingle();
        if (pilotError) throw new Error(pilotError.message);
        if (!pilotClient || pilotClient.source_kind !== "production" || pilotClient.status === "archived") {
          return NextResponse.json({ error: "The pilot must be an active production client, never a demo fixture." }, { status: 409 });
        }
      }
      if (input.rolloutStage === "cohort" && input.enabled) {
        const { count, error: cohortError } = await supabase
          .from("workflow_rollout_clients")
          .select("client_id", { count: "exact", head: true })
          .eq("tenant_id", actor.tenantId)
          .eq("enabled", true);
        if (cohortError) throw new Error(cohortError.message);
        if (!count) {
          return NextResponse.json({ error: "Add at least one active production client to the cohort before enabling it." }, { status: 409 });
        }
      }
      if (input.projectionSource === "normalized") {
        let requiredClientIds: string[] = [];
        if (input.rolloutStage === "pilot" && input.pilotClientId) {
          requiredClientIds = [input.pilotClientId];
        } else if (input.rolloutStage === "cohort") {
          const { data: cohortClients, error: cohortClientsError } = await supabase
            .from("workflow_rollout_clients")
            .select("client_id")
            .eq("tenant_id", actor.tenantId)
            .eq("enabled", true);
          if (cohortClientsError) throw new Error(cohortClientsError.message);
          requiredClientIds = (cohortClients ?? []).map(client => client.client_id);
        } else if (input.rolloutStage === "general") {
          const { data: productionClients, error: productionClientsError } = await supabase
            .from("clients")
            .select("id")
            .eq("tenant_id", actor.tenantId)
            .eq("source_kind", "production")
            .neq("status", "archived");
          if (productionClientsError) throw new Error(productionClientsError.message);
          requiredClientIds = (productionClients ?? []).map(client => client.id);
        }
        if (!requiredClientIds.length) {
          return NextResponse.json({
            error: "Normalized client projections require a reviewed real production client; demo parity cannot unlock release.",
          }, { status: 409 });
        }
        const { data: comparisons, error: comparisonError } = await supabase
          .from("projection_shadow_comparisons")
          .select("client_id, parity_state, review_state")
          .eq("tenant_id", actor.tenantId)
          .in("client_id", requiredClientIds);
        if (comparisonError) throw new Error(comparisonError.message);
        const parityReady = requiredClientIds.every(clientId =>
          comparisons?.some(item =>
            item.client_id === clientId
            && item.parity_state === "match"
            && item.review_state === "approved"
          )
          && comparisons
            .filter(item => item.client_id === clientId)
            .every(item => item.parity_state === "match" && item.review_state === "approved")
        );
        if (!parityReady) {
          return NextResponse.json({
            error: "Every rollout client needs reviewed matching shadow parity and no unresolved mismatch before normalized output can be enabled.",
          }, { status: 409 });
        }
      }

      const { data, error } = await supabase
        .from("workflow_release_controls")
        .upsert({
          tenant_id: actor.tenantId,
          new_workflows_enabled: input.enabled,
          rollout_stage: input.rolloutStage,
          client_projection_source: input.projectionSource,
          pilot_client_id: input.rolloutStage === "pilot" ? input.pilotClientId || null : null,
          rollout_note: input.note.trim(),
          updated_by: actor.userId,
          updated_at: new Date().toISOString(),
        }, { onConflict: "tenant_id" })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ release: data });
    }

    if (input.action === "set_cohort_client") {
      if (actor.role !== "admin") {
        return NextResponse.json({ error: "Only an admin can change rollout cohorts." }, { status: 403 });
      }
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("id, source_kind, status")
        .eq("tenant_id", actor.tenantId)
        .eq("id", input.clientId)
        .maybeSingle();
      if (clientError) throw new Error(clientError.message);
      if (!client || client.source_kind !== "production" || client.status === "archived") {
        return NextResponse.json({ error: "Only active production clients can join a rollout cohort." }, { status: 409 });
      }
      const cohortName = input.cohortName?.trim().slice(0, 80) || "production-cohort";
      const { data, error } = await supabase
        .from("workflow_rollout_clients")
        .upsert({
          tenant_id: actor.tenantId,
          client_id: client.id,
          cohort_name: cohortName,
          enabled: input.enabled,
          added_by: actor.userId,
          updated_at: new Date().toISOString(),
        }, { onConflict: "tenant_id,client_id" })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ rolloutClient: data });
    }

    if (input.action === "review_parity") {
      if (!["approved", "rejected"].includes(input.decision)) {
        return NextResponse.json({ error: "Choose an approval decision." }, { status: 400 });
      }
      if (input.decision === "approved") {
        const { data: candidate, error: candidateError } = await supabase
          .from("projection_shadow_comparisons")
          .select("parity_state")
          .eq("tenant_id", actor.tenantId)
          .eq("id", input.comparisonId)
          .maybeSingle();
        if (candidateError) throw new Error(candidateError.message);
        if (!candidate) return NextResponse.json({ error: "Shadow comparison not found." }, { status: 404 });
        if (candidate.parity_state !== "match") {
          return NextResponse.json({ error: "Only an exact matching shadow comparison can be approved." }, { status: 409 });
        }
      }
      const { data, error } = await supabase
        .from("projection_shadow_comparisons")
        .update({
          review_state: input.decision,
          reviewed_by: actor.userId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("tenant_id", actor.tenantId)
        .eq("id", input.comparisonId)
        .select()
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return NextResponse.json({ error: "Shadow comparison not found." }, { status: 404 });
      return NextResponse.json({ comparison: data });
    }

    if (input.action === "run_shadow_comparisons") {
      const { data: links, error: linksError } = await supabase
        .from("legacy_service_run_links")
        .select("client_id, service_run_id, legacy_kind, legacy_reference")
        .eq("tenant_id", actor.tenantId)
        .eq("migration_state", "linked")
        .eq("legacy_kind", "portal_audit_run")
        .limit(250);
      if (linksError) throw new Error(linksError.message);
      if (!links?.length) {
        return NextResponse.json({
          comparisons: { compared: 0, matched: 0, mismatched: 0, notComparable: 0, skipped: 0 },
          message: "No reviewed historical Checkup links are ready for shadow comparison.",
        });
      }

      const legacyReferences = [...new Set(links.map(link => link.legacy_reference))];
      const serviceRunIds = [...new Set(links.map(link => link.service_run_id))];
      const [
        { data: legacyRows, error: legacyError },
        { data: serviceRuns, error: runsError },
        { data: revisions, error: revisionsError },
        { data: existing, error: existingError },
      ] = await Promise.all([
        supabase
          .from("portal_audit_runs")
          .select("run_id, state")
          .in("run_id", legacyReferences),
        supabase
          .from("service_runs")
          .select("id, client_id, service_kind")
          .eq("tenant_id", actor.tenantId)
          .in("id", serviceRunIds),
        supabase
          .from("check_result_revisions")
          .select("service_run_id, check_definition_id, revision, status")
          .eq("tenant_id", actor.tenantId)
          .in("service_run_id", serviceRunIds),
        supabase
          .from("projection_shadow_comparisons")
          .select("service_run_id, legacy_kind, legacy_reference, legacy_fingerprint, normalized_fingerprint, parity_state, review_state, reviewed_by, reviewed_at")
          .eq("tenant_id", actor.tenantId)
          .in("service_run_id", serviceRunIds),
      ]);
      const firstError = [legacyError, runsError, revisionsError, existingError].find(Boolean);
      if (firstError) throw new Error(firstError.message);

      const definitionIds = [...new Set((revisions ?? []).map(revision => revision.check_definition_id))];
      const { data: definitions, error: definitionsError } = definitionIds.length
        ? await supabase
          .from("check_definitions")
          .select("id, stable_key")
          .eq("tenant_id", actor.tenantId)
          .in("id", definitionIds)
        : { data: [], error: null };
      if (definitionsError) throw new Error(definitionsError.message);

      const legacyByReference = new Map((legacyRows ?? []).map(row => [row.run_id, row]));
      const runById = new Map((serviceRuns ?? []).map(run => [run.id, run]));
      const revisionsByRun = new Map<string, Array<{
        check_definition_id: string;
        revision: number;
        status: string;
      }>>();
      for (const revision of revisions ?? []) {
        const rows = revisionsByRun.get(revision.service_run_id) ?? [];
        rows.push(revision);
        revisionsByRun.set(revision.service_run_id, rows);
      }
      const existingByKey = new Map((existing ?? []).map(item => [
        `${item.service_run_id}:${item.legacy_kind}:${item.legacy_reference}`,
        item,
      ]));

      const upserts = [];
      let skipped = 0;
      let matched = 0;
      let mismatched = 0;
      let notComparable = 0;
      for (const link of links) {
        const run = runById.get(link.service_run_id);
        if (!run || run.client_id !== link.client_id || run.service_kind !== "website") {
          skipped += 1;
          continue;
        }
        const legacy = projectLegacyWebsiteAudit(legacyByReference.get(link.legacy_reference)?.state);
        const normalized = projectNormalizedWebsiteRun(
          revisionsByRun.get(run.id) ?? [],
          definitions ?? [],
        );
        const comparison = compareShadowProjections(legacy, normalized);
        if (comparison.parityState === "match") matched += 1;
        else if (comparison.parityState === "mismatch") mismatched += 1;
        else notComparable += 1;

        const comparisonKey = `${run.id}:${link.legacy_kind}:${link.legacy_reference}`;
        const prior = existingByKey.get(comparisonKey);
        const projectionChanged = !prior
          || prior.legacy_fingerprint !== comparison.legacyFingerprint
          || prior.normalized_fingerprint !== comparison.normalizedFingerprint
          || prior.parity_state !== comparison.parityState;
        upserts.push({
          tenant_id: actor.tenantId,
          client_id: link.client_id,
          service_run_id: run.id,
          legacy_kind: link.legacy_kind,
          legacy_reference: link.legacy_reference,
          legacy_fingerprint: comparison.legacyFingerprint,
          normalized_fingerprint: comparison.normalizedFingerprint,
          legacy_score: comparison.legacyScore,
          normalized_score: comparison.normalizedScore,
          parity_state: comparison.parityState,
          discrepancies: comparison.discrepancies,
          review_state: projectionChanged ? "pending" : prior.review_state,
          reviewed_by: projectionChanged ? null : prior.reviewed_by,
          reviewed_at: projectionChanged ? null : prior.reviewed_at,
          created_at: new Date().toISOString(),
        });
      }

      if (upserts.length) {
        const { error: upsertError } = await supabase
          .from("projection_shadow_comparisons")
          .upsert(upserts, { onConflict: "tenant_id,service_run_id,legacy_kind,legacy_reference" });
        if (upsertError) throw new Error(upsertError.message);
      }
      return NextResponse.json({
        comparisons: {
          compared: upserts.length,
          matched,
          mismatched,
          notComparable,
          skipped,
        },
      });
    }

    if (input.action === "review_migration") {
      if (!["linked", "rejected"].includes(input.decision)) {
        return NextResponse.json({ error: "Choose a migration decision." }, { status: 400 });
      }
      const { data: item, error: itemError } = await supabase
        .from("migration_review_queue")
        .select("*")
        .eq("tenant_id", actor.tenantId)
        .eq("id", input.queueId)
        .maybeSingle();
      if (itemError) throw new Error(itemError.message);
      if (!item) return NextResponse.json({ error: "Migration review item not found." }, { status: 404 });
      if (input.decision === "linked") {
        if (!item.proposed_client_id || !item.proposed_service_run_id) {
          return NextResponse.json({ error: "This historical record still needs a client and service-run match." }, { status: 409 });
        }
        const evidence = isRecord(item.evidence) ? item.evidence : {};
        const { error: linkError } = await supabase.from("legacy_service_run_links").upsert({
          tenant_id: actor.tenantId,
          client_id: item.proposed_client_id,
          service_run_id: item.proposed_service_run_id,
          legacy_kind: item.legacy_kind,
          legacy_reference: item.legacy_reference,
          legacy_url: typeof evidence.legacy_url === "string" ? evidence.legacy_url : null,
          migration_state: "linked",
          linked_by: actor.userId,
          updated_at: new Date().toISOString(),
        }, { onConflict: "tenant_id,legacy_kind,legacy_reference" });
        if (linkError) throw new Error(linkError.message);
      }
      const { data, error } = await supabase
        .from("migration_review_queue")
        .update({
          state: input.decision,
          reviewed_by: actor.userId,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", actor.tenantId)
        .eq("id", input.queueId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ migration: data });
    }

    if (input.action === "scan_legacy") {
      const [
        { data: legacyRuns, error: legacyError },
        { data: clients, error: clientsError },
        { data: serviceRuns, error: serviceRunsError },
        { data: existingLinks, error: linksError },
      ] = await Promise.all([
        supabase
          .from("portal_audit_runs")
          .select("run_id, client_id, run, source_kind, updated_at")
          .neq("client_id", "__deleted__"),
        supabase
          .from("clients")
          .select("id, name, slug, source_kind")
          .eq("tenant_id", actor.tenantId),
        supabase
          .from("service_runs")
          .select("id, client_id, service_kind, state, created_at")
          .eq("tenant_id", actor.tenantId)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("legacy_service_run_links")
          .select("legacy_reference")
          .eq("tenant_id", actor.tenantId)
          .eq("legacy_kind", "portal_audit_run"),
      ]);
      const firstError = [legacyError, clientsError, serviceRunsError, linksError].find(Boolean);
      if (firstError) throw new Error(firstError.message);

      const linked = new Set((existingLinks ?? []).map(item => item.legacy_reference));
      let queued = 0;
      let skippedDemo = 0;
      for (const legacy of legacyRuns ?? []) {
        if (linked.has(legacy.run_id)) continue;
        const runPayload = isRecord(legacy.run) ? legacy.run : {};
        const legacyName = typeof runPayload.clientName === "string" ? runPayload.clientName.trim() : "";
        const normalizedClient = (clients ?? []).find(client =>
          client.slug === legacy.client_id
          || client.name.toLocaleLowerCase() === legacyName.toLocaleLowerCase()
        );
        const normalizedRun = normalizedClient
          ? (serviceRuns ?? []).find(run => run.client_id === normalizedClient.id && run.service_kind === "website")
          : undefined;
        const demoOnly = legacy.source_kind === "demo";
        if (demoOnly && !normalizedClient) skippedDemo += 1;
        const reason = demoOnly
          ? "Demo fixture: keep isolated unless an admin explicitly links it to a demo client."
          : normalizedClient && normalizedRun
            ? "Exact client match found. Review the preserved URL and normalized run before linking."
            : normalizedClient
              ? "Client matched, but no normalized Website Checkup run exists yet."
              : "No exact normalized client match. Create or select the real client before linking.";
        const { error: queueError } = await supabase
          .from("migration_review_queue")
          .upsert({
            tenant_id: actor.tenantId,
            legacy_kind: "portal_audit_run",
            legacy_reference: legacy.run_id,
            proposed_client_id: normalizedClient?.id ?? null,
            proposed_service_run_id: normalizedRun?.id ?? null,
            reason,
            evidence: {
              legacy_client_id: legacy.client_id,
              legacy_client_name: legacyName || null,
              source_kind: legacy.source_kind,
              legacy_url: `/dashboard?view=audits&auditType=website&auditReportRun=${encodeURIComponent(legacy.run_id)}`,
              legacy_updated_at: legacy.updated_at,
              normalized_client_source_kind: normalizedClient?.source_kind ?? null,
              normalized_run_state: normalizedRun?.state ?? null,
            },
            updated_at: new Date().toISOString(),
          }, { onConflict: "tenant_id,legacy_kind,legacy_reference" });
        if (queueError) throw new Error(queueError.message);
        queued += 1;
      }
      return NextResponse.json({ scan: { queued, skippedDemo } });
    }

    if (input.action === "resolve_alert") {
      const { data, error } = await supabase
        .from("workflow_alerts")
        .update({ state: "resolved", resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("tenant_id", actor.tenantId)
        .eq("id", input.alertId)
        .select()
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return NextResponse.json({ error: "Workflow alert not found." }, { status: 404 });
      return NextResponse.json({ alert: data });
    }

    if (input.action === "revoke_memory") {
      const { data, error } = await supabase.rpc("revoke_agent_memory", {
        p_memory_id: input.memoryId,
        p_reason: input.reason,
      });
      if (error) throw new Error(error.message);
      return NextResponse.json({ memory: data });
    }

    if (
      input.action === "create_agent_draft"
      || input.action === "update_agent_draft"
      || input.action === "publish_agent_definition"
      || input.action === "archive_agent_definition"
    ) {
      if (actor.role !== "admin") {
        return NextResponse.json({ error: "Only an admin can change Agent Definition lifecycle." }, { status: 403 });
      }
    }

    if (input.action === "create_agent_draft") {
      const { data: source, error: sourceError } = await supabase
        .from("agent_definitions")
        .select("*")
        .eq("tenant_id", actor.tenantId)
        .eq("id", input.definitionId)
        .maybeSingle();
      if (sourceError) throw new Error(sourceError.message);
      if (!source) return NextResponse.json({ error: "Agent Definition not found." }, { status: 404 });

      const { data: existingDraft, error: draftError } = await supabase
        .from("agent_definitions")
        .select("id, version")
        .eq("tenant_id", actor.tenantId)
        .eq("stable_key", source.stable_key)
        .eq("lifecycle_state", "draft")
        .maybeSingle();
      if (draftError) throw new Error(draftError.message);
      if (existingDraft) return NextResponse.json({ definition: existingDraft, replayed: true });

      const { data: latest, error: latestError } = await supabase
        .from("agent_definitions")
        .select("version")
        .eq("tenant_id", actor.tenantId)
        .eq("stable_key", source.stable_key)
        .order("version", { ascending: false })
        .limit(1)
        .single();
      if (latestError) throw new Error(latestError.message);
      const { data, error } = await supabase
        .from("agent_definitions")
        .insert({
          tenant_id: actor.tenantId,
          stable_key: source.stable_key,
          version: latest.version + 1,
          lifecycle_state: "draft",
          service_kind: source.service_kind,
          name: source.name,
          instructions: source.instructions,
          allowed_tools: source.allowed_tools,
          output_schema: source.output_schema,
          memory_policy: source.memory_policy,
          approval_requirements: source.approval_requirements,
          playbook_key: source.playbook_key,
          playbook_version: source.playbook_version,
          change_summary: "",
          owner_user_id: actor.userId,
          last_reviewed_at: null,
          published_at: null,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ definition: data, replayed: false });
    }

    if (input.action === "update_agent_draft") {
      const instructions = input.instructions.trim();
      const changeSummary = input.changeSummary.trim();
      const allowedTools = [...new Set(input.allowedTools.map(tool => tool.trim()).filter(Boolean))];
      if (instructions.length < 40) {
        return NextResponse.json({ error: "Agent instructions must be at least 40 characters." }, { status: 400 });
      }
      if (changeSummary.length < 8) {
        return NextResponse.json({ error: "Record a concise change summary before review." }, { status: 400 });
      }
      if (!allowedTools.length) {
        return NextResponse.json({ error: "At least one explicitly scoped tool is required." }, { status: 400 });
      }
      const { data, error } = await supabase
        .from("agent_definitions")
        .update({
          instructions,
          allowed_tools: allowedTools,
          change_summary: changeSummary,
          owner_user_id: actor.userId,
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", actor.tenantId)
        .eq("id", input.definitionId)
        .eq("lifecycle_state", "draft")
        .select()
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return NextResponse.json({ error: "Only a draft Agent Definition can be edited." }, { status: 409 });
      return NextResponse.json({ definition: data });
    }

    if (input.action === "publish_agent_definition") {
      const { data: draft, error: draftError } = await supabase
        .from("agent_definitions")
        .select("*")
        .eq("tenant_id", actor.tenantId)
        .eq("id", input.definitionId)
        .eq("lifecycle_state", "draft")
        .maybeSingle();
      if (draftError) throw new Error(draftError.message);
      if (!draft) return NextResponse.json({ error: "Only a draft Agent Definition can be published." }, { status: 409 });
      if (draft.change_summary.trim().length < 8) {
        return NextResponse.json({ error: "Review and save a change summary before publishing." }, { status: 409 });
      }

      const reviewedAt = new Date().toISOString();
      const { error: archiveError } = await supabase
        .from("agent_definitions")
        .update({ lifecycle_state: "archived", updated_at: reviewedAt })
        .eq("tenant_id", actor.tenantId)
        .eq("stable_key", draft.stable_key)
        .eq("lifecycle_state", "published");
      if (archiveError) throw new Error(archiveError.message);
      const { data, error } = await supabase
        .from("agent_definitions")
        .update({
          lifecycle_state: "published",
          owner_user_id: actor.userId,
          last_reviewed_at: reviewedAt,
          published_at: reviewedAt,
          updated_at: reviewedAt,
        })
        .eq("tenant_id", actor.tenantId)
        .eq("id", draft.id)
        .eq("lifecycle_state", "draft")
        .select()
        .single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ definition: data });
    }

    if (input.action === "archive_agent_definition") {
      const { data, error } = await supabase
        .from("agent_definitions")
        .update({ lifecycle_state: "archived", updated_at: new Date().toISOString() })
        .eq("tenant_id", actor.tenantId)
        .eq("id", input.definitionId)
        .neq("lifecycle_state", "archived")
        .select()
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return NextResponse.json({ error: "Agent Definition is already archived or unavailable." }, { status: 409 });
      return NextResponse.json({ definition: data });
    }

    return NextResponse.json({ error: "Unsupported governance action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Workflow governance could not be updated.",
    }, { status: 500 });
  }
}
