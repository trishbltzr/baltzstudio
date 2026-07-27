import { NextResponse } from "next/server";
import { PORTAL_WORKSPACE_FALLBACK_RUN_ID } from "@/lib/portalWorkspacePersistence";
import { coercePersistedAuditDrafts, normalizePersistedAuditDraft, projectPersistedAuditDraftForClient, projectPersistedAuditDraftForIndex } from "@/lib/portalAuditPersistence";
import { resolvePortalRequestAccess } from "@/lib/portalRequestAccess";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabasePrivilegedServerClient } from "@/lib/supabase/privileged";
import type { Json } from "@/lib/supabase/types";
import {
  CREATOR_IQ_CLIENT_ID,
  createCreatorIqWebsiteAuditDraft,
} from "@/lib/creatorIqClientWorkspace";

function requestedAuditRunIds(body: unknown) {
  const requestedRunIds: unknown[] = Array.isArray((body as { runIds?: unknown[] } | null)?.runIds)
    ? (body as { runIds: unknown[] }).runIds
    : [];
  return requestedRunIds.length
    ? Array.from(new Set(requestedRunIds.filter((value): value is string => typeof value === "string" && !!value.trim()).map(value => value.trim()))).slice(0, 50)
    : [];
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const requestedClientId = searchParams.get("clientId")?.trim() || "";
  const clientId = /^[a-z0-9-]{1,80}$/.test(requestedClientId) ? requestedClientId : null;
  const requestedRunId = searchParams.get("runId")?.trim() || "";
  const runId = /^[a-z0-9_-]{1,120}$/i.test(requestedRunId) ? requestedRunId : null;
  const archivedMode = searchParams.get("archived");
  const summaryOnly = searchParams.get("mode") === "summary";
  const authClient = await createSupabaseServerClient();
  const access = await resolvePortalRequestAccess(request, authClient);
  if (!access) return NextResponse.json({ error: "Sign in to load portal audits." }, { status: 401 });
  const supabase = await createSupabasePrivilegedServerClient();
  let query = supabase
    .from("portal_audit_runs")
    .select("run_id, run, state, updated_at, archived_at")
    .neq("client_id", "__deleted__")
    .neq("client_id", "creator-iq")
    .neq("source_kind", "demo");

  if (archivedMode === "only") query = query.not("archived_at", "is", null);
  else if (archivedMode !== "include") query = query.is("archived_at", null);

  if (access.role === "client") {
    query = query.eq("client_id", access.clientId);
    if (runId) query = query.eq("run_id", runId);
  } else if (runId) query = query.eq("run_id", runId);
  else if (clientId) query = query.eq("client_id", clientId);

  const { data, error } = await query.order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const drafts = coercePersistedAuditDrafts(
      (data ?? [])
        .filter(row => row.run_id !== PORTAL_WORKSPACE_FALLBACK_RUN_ID)
        .map(row => ({
          run: row.run,
          state: row.state,
          updatedAt: row.updated_at,
        })),
    );
  const shouldIncludeCreatorIq = access.role === "client"
    ? access.clientId === CREATOR_IQ_CLIENT_ID
    : (!clientId && !runId)
      || clientId === CREATOR_IQ_CLIENT_ID
      || runId === "creator-iq-website-checkup";

  if (shouldIncludeCreatorIq) {
    const capturedResult = createCreatorIqWebsiteAuditDraft();
    const savedResult = drafts.find(draft => draft.run.id === capturedResult.run.id);
    const savedIsNewer = savedResult
      ? Date.parse(savedResult.updatedAt || "") > Date.parse(capturedResult.updatedAt || "")
      : false;

    if (!savedIsNewer) {
      const savedIndex = drafts.findIndex(draft => draft.run.id === capturedResult.run.id);
      if (savedIndex >= 0) drafts.splice(savedIndex, 1);
      drafts.unshift(capturedResult);
    }
  }

  const visibleDrafts = access.role === "client"
    ? drafts.map(draft => (
      access.clientId === CREATOR_IQ_CLIENT_ID
        ? draft
        : projectPersistedAuditDraftForClient(draft)
    ))
    : drafts;
  return NextResponse.json({
    drafts: summaryOnly ? visibleDrafts.map(projectPersistedAuditDraftForIndex) : visibleDrafts,
    scope: access.role === "client" ? { role: "client", clientId: access.clientId } : { role: "staff" },
  });
}

export async function PUT(request: Request) {
  const authClient = await createSupabaseServerClient();
  const access = await resolvePortalRequestAccess(request, authClient);
  if (!access) return NextResponse.json({ error: "Sign in to save portal audits." }, { status: 401 });
  if (access.role === "client") {
    return NextResponse.json({ error: "Client accounts cannot replace a complete audit record." }, { status: 403 });
  }
  const supabase = await createSupabasePrivilegedServerClient();
  const body = await request.json().catch(() => null);
  const draft = normalizePersistedAuditDraft(body?.draft ?? body);

  if (!draft) {
    return NextResponse.json({ error: "Expected a valid audit draft payload." }, { status: 400 });
  }

  const updatedAt = new Date().toISOString();
  const { error } = await supabase
    .from("portal_audit_runs")
    .upsert({
      run_id: draft.run.id,
      client_id: draft.run.clientId,
      run: draft.run as unknown as Json,
      state: draft.state as unknown as Json,
      source_kind: "production",
      updated_at: updatedAt,
    }, { onConflict: "run_id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updatedAt });
}

export async function DELETE(request: Request) {
  const authClient = await createSupabaseServerClient();
  const access = await resolvePortalRequestAccess(request, authClient);
  if (!access) return NextResponse.json({ error: "Sign in before deleting an audit." }, { status: 401 });
  if (access.role === "client") {
    return NextResponse.json({ error: "Client accounts cannot delete audit records." }, { status: 403 });
  }
  const supabase = await createSupabasePrivilegedServerClient();
  const body = await request.json().catch(() => null);
  const runIds = requestedAuditRunIds(body);

  if (!runIds.length || runIds.includes(PORTAL_WORKSPACE_FALLBACK_RUN_ID)) {
    return NextResponse.json({ error: "Expected one or more valid audit run IDs." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("portal_audit_runs")
    .delete()
    .in("run_id", runIds)
    .select("run_id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const deletedIds = (data ?? []).map(row => row.run_id);
  if (deletedIds.length !== runIds.length) {
    const missingIds = runIds.filter(runId => !deletedIds.includes(runId));
    return NextResponse.json({
      error: "One or more audit records were not deleted.",
      deletedIds,
      missingIds,
    }, { status: 409 });
  }

  return NextResponse.json({ ok: true, deletedIds });
}

export async function PATCH(request: Request) {
  const authClient = await createSupabaseServerClient();
  const access = await resolvePortalRequestAccess(request, authClient);
  if (!access) return NextResponse.json({ error: "Sign in before archiving an audit." }, { status: 401 });
  if (access.role === "client") {
    return NextResponse.json({ error: "Client accounts cannot archive audit records." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const runIds = requestedAuditRunIds(body);
  const action = body?.action === "restore" ? "restore" : body?.action === "archive" ? "archive" : null;
  if (!runIds.length || runIds.includes(PORTAL_WORKSPACE_FALLBACK_RUN_ID) || !action) {
    return NextResponse.json({ error: "Expected valid audit run IDs and an archive or restore action." }, { status: 400 });
  }

  const supabase = await createSupabasePrivilegedServerClient();
  const archivedAt = action === "archive" ? new Date().toISOString() : null;
  const { data, error } = await supabase
    .from("portal_audit_runs")
    .update({ archived_at: archivedAt, updated_at: new Date().toISOString() })
    .in("run_id", runIds)
    .select("run_id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const updatedIds = (data ?? []).map(row => row.run_id);
  if (updatedIds.length !== runIds.length) {
    const missingIds = runIds.filter(runId => !updatedIds.includes(runId));
    return NextResponse.json({
      error: `One or more audit records were not ${action === "archive" ? "archived" : "restored"}.`,
      updatedIds,
      missingIds,
    }, { status: 409 });
  }

  return NextResponse.json({
    ok: true,
    action,
    updatedIds,
    archivedAt,
  });
}
