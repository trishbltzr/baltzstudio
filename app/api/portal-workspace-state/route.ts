import { NextResponse } from "next/server";
import {
  PORTAL_WORKSPACE_FALLBACK_CLIENT_ID,
  PORTAL_WORKSPACE_FALLBACK_RUN_ID,
  PORTAL_WORKSPACE_ROW_ID,
  normalizePersistedPortalWorkspaceState,
  projectPersistedPortalWorkspaceStateForClient,
  type PersistedPortalWorkspaceState,
} from "@/lib/portalWorkspacePersistence";
import { resolvePortalRequestAccess, type PortalRequestAccess } from "@/lib/portalRequestAccess";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabasePrivilegedServerClient } from "@/lib/supabase/privileged";
import type { Json } from "@/lib/supabase/types";

function isMissingWorkspaceTable(error: { code?: string; message?: string } | null) {
  return error?.code === "42P01" || /portal_workspace_state/i.test(error?.message || "");
}

function workspaceResponse(
  state: PersistedPortalWorkspaceState | null,
  updatedAt: string | null,
  storage: "portal_workspace_state" | "portal_audit_runs",
  access: PortalRequestAccess,
) {
  const projectedState = state && access.role === "client"
    ? projectPersistedPortalWorkspaceStateForClient(state, access.clientId, access.clientName ?? undefined)
    : state;
  return NextResponse.json({
    state: projectedState,
    updatedAt,
    storage,
    scope: access.role === "client" ? { role: "client", clientId: access.clientId, clientName: access.clientName } : { role: "staff" },
  });
}

async function readWorkspaceFallback(
  supabase: Awaited<ReturnType<typeof createSupabasePrivilegedServerClient>>,
  access: PortalRequestAccess,
) {
  const { data, error } = await supabase
    .from("portal_audit_runs")
    .select("state, updated_at")
    .eq("run_id", PORTAL_WORKSPACE_FALLBACK_RUN_ID)
    .eq("client_id", PORTAL_WORKSPACE_FALLBACK_CLIENT_ID)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return workspaceResponse(
    normalizePersistedPortalWorkspaceState(data?.state) ?? null,
    data?.updated_at ?? null,
    "portal_audit_runs",
    access,
  );
}

export async function GET(request: Request) {
  const authClient = await createSupabaseServerClient();
  const access = await resolvePortalRequestAccess(request, authClient);
  if (!access) return NextResponse.json({ error: "Sign in to load the portal workspace." }, { status: 401 });
  const supabase = await createSupabasePrivilegedServerClient();
  const { data, error } = await supabase
    .from("portal_workspace_state")
    .select("state, updated_at")
    .eq("workspace_id", PORTAL_WORKSPACE_ROW_ID)
    .maybeSingle();

  if (error) {
    if (isMissingWorkspaceTable(error)) {
      return readWorkspaceFallback(supabase, access);
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return workspaceResponse(
    normalizePersistedPortalWorkspaceState(data?.state) ?? null,
    data?.updated_at ?? null,
    "portal_workspace_state",
    access,
  );
}

export async function PUT(request: Request) {
  const authClient = await createSupabaseServerClient();
  const access = await resolvePortalRequestAccess(request, authClient);
  if (!access) return NextResponse.json({ error: "Sign in to save the portal workspace." }, { status: 401 });
  if (access.role === "client") {
    return NextResponse.json({ error: "Client accounts cannot replace the shared workspace snapshot." }, { status: 403 });
  }
  const supabase = await createSupabasePrivilegedServerClient();
  const body = await request.json().catch(() => null);
  const state = normalizePersistedPortalWorkspaceState(body?.state ?? body);

  if (!state) {
    return NextResponse.json({ error: "Expected a valid portal workspace state payload." }, { status: 400 });
  }

  const updatedAt = new Date().toISOString();
  const nextState = state as unknown as Json;
  const { error } = await supabase
    .from("portal_workspace_state")
    .upsert({
      workspace_id: PORTAL_WORKSPACE_ROW_ID,
      state: nextState,
      updated_at: updatedAt,
    }, { onConflict: "workspace_id" });

  if (!error) {
    return NextResponse.json({ ok: true, updatedAt, storage: "portal_workspace_state" });
  }

  if (!isMissingWorkspaceTable(error)) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { error: fallbackError } = await supabase
    .from("portal_audit_runs")
    .upsert({
      run_id: PORTAL_WORKSPACE_FALLBACK_RUN_ID,
      client_id: PORTAL_WORKSPACE_FALLBACK_CLIENT_ID,
      run: {
        id: PORTAL_WORKSPACE_FALLBACK_RUN_ID,
        clientId: PORTAL_WORKSPACE_FALLBACK_CLIENT_ID,
        clientName: "Portal Workspace",
        owner: "system",
        subtitle: "Portal workspace state",
        statusLabel: "Workspace",
        statusTone: "muted",
        stage: "Portal Workspace",
        progress: 100,
        due: "—",
      } as unknown as Json,
      state: nextState,
      updated_at: updatedAt,
    }, { onConflict: "run_id" });

  if (fallbackError) {
    return NextResponse.json({ error: fallbackError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updatedAt, storage: "portal_audit_runs" });
}
