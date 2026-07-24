import { NextResponse } from "next/server";
import { PORTAL_WORKSPACE_FALLBACK_RUN_ID } from "@/lib/portalWorkspacePersistence";
import { coercePersistedAuditDrafts, normalizePersistedAuditDraft, projectPersistedAuditDraftForClient } from "@/lib/portalAuditPersistence";
import { resolvePortalRequestAccess } from "@/lib/portalRequestAccess";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabasePrivilegedServerClient } from "@/lib/supabase/privileged";
import type { Json } from "@/lib/supabase/types";
import { CREATOR_IQ_CLIENT_ID, createCreatorIqWebsiteAuditDraft } from "@/lib/creatorIqDemoWorkspace";

async function softDeleteAuditRuns(supabase: Awaited<ReturnType<typeof createSupabasePrivilegedServerClient>>, runIds: string[]) {
  const { data, error } = await supabase
    .from("portal_audit_runs")
    .update({ client_id: "__deleted__", updated_at: new Date().toISOString() })
    .in("run_id", runIds)
    .select("run_id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    deletedIds: (data ?? []).map(row => row.run_id),
    recoverable: true,
  });
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const requestedClientId = searchParams.get("clientId")?.trim() || "";
  const clientId = /^[a-z0-9-]{1,80}$/.test(requestedClientId) ? requestedClientId : null;
  const requestedRunId = searchParams.get("runId")?.trim() || "";
  const runId = /^[a-z0-9_-]{1,120}$/i.test(requestedRunId) ? requestedRunId : null;
  const explicitDemo = searchParams.get("includeDemo") === CREATOR_IQ_CLIENT_ID;
  const authClient = await createSupabaseServerClient();
  const access = await resolvePortalRequestAccess(request, authClient);
  if (!access) return NextResponse.json({ error: "Sign in to load portal audits." }, { status: 401 });
  const supabase = await createSupabasePrivilegedServerClient();
  let query = supabase
    .from("portal_audit_runs")
    .select("run_id, run, state, updated_at")
    .neq("client_id", "__deleted__");

  if (access.role === "client") {
    query = query.eq("client_id", access.clientId);
    if (runId) query = query.eq("run_id", runId);
  } else if (runId) query = query.eq("run_id", runId);
  else if (clientId) query = query.eq("client_id", clientId);
  else if (!explicitDemo) query = query.neq("client_id", CREATOR_IQ_CLIENT_ID);

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
  // Demo output is opt-in. An unfiltered production request must never acquire
  // CreatorIQ facts simply because the database has no persisted audit yet.
  const shouldIncludeCreatorIq = access.role === "client"
    ? access.clientId === CREATOR_IQ_CLIENT_ID
    : clientId === CREATOR_IQ_CLIENT_ID || explicitDemo || runId === "audit-creator-iq-demo";
  if (shouldIncludeCreatorIq && !drafts.some(draft => draft.run.clientId === CREATOR_IQ_CLIENT_ID)) {
    drafts.unshift(createCreatorIqWebsiteAuditDraft());
  }

  return NextResponse.json({
    drafts: access.role === "client" ? drafts.map(projectPersistedAuditDraftForClient) : drafts,
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
  const requestedRunIds: unknown[] = Array.isArray(body?.runIds) ? body.runIds : [];
  const runIds: string[] = requestedRunIds.length
    ? Array.from(new Set(requestedRunIds.filter((value): value is string => typeof value === "string" && !!value.trim()).map(value => value.trim()))).slice(0, 50)
    : [];

  if (!runIds.length || runIds.includes(PORTAL_WORKSPACE_FALLBACK_RUN_ID)) {
    return NextResponse.json({ error: "Expected one or more valid audit run IDs." }, { status: 400 });
  }

  const { data: auth, error: authError } = await authClient.auth.getUser();
  if (authError || !auth.user) {
    // Local quick-login identities intentionally do not create a Supabase
    // session. Their already-authorized staff delete remains recoverable.
    return softDeleteAuditRuns(supabase, runIds);
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
  return NextResponse.json({ ok: true, deletedIds });
}
