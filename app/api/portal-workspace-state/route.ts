import { NextResponse } from "next/server";
import {
  PORTAL_WORKSPACE_FALLBACK_CLIENT_ID,
  PORTAL_WORKSPACE_FALLBACK_RUN_ID,
  PORTAL_WORKSPACE_ROW_ID,
  normalizePersistedPortalWorkspaceState,
} from "@/lib/portalWorkspacePersistence";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

function isMissingWorkspaceTable(error: { code?: string; message?: string } | null) {
  return error?.code === "42P01" || /portal_workspace_state/i.test(error?.message || "");
}

async function readWorkspaceFallback() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("portal_audit_runs")
    .select("state, updated_at")
    .eq("run_id", PORTAL_WORKSPACE_FALLBACK_RUN_ID)
    .eq("client_id", PORTAL_WORKSPACE_FALLBACK_CLIENT_ID)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    state: normalizePersistedPortalWorkspaceState(data?.state) ?? null,
    updatedAt: data?.updated_at ?? null,
    storage: "portal_audit_runs",
  });
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("portal_workspace_state")
    .select("state, updated_at")
    .eq("workspace_id", PORTAL_WORKSPACE_ROW_ID)
    .maybeSingle();

  if (error) {
    if (isMissingWorkspaceTable(error)) {
      return readWorkspaceFallback();
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    state: normalizePersistedPortalWorkspaceState(data?.state) ?? null,
    updatedAt: data?.updated_at ?? null,
    storage: "portal_workspace_state",
  });
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  const state = normalizePersistedPortalWorkspaceState(body?.state ?? body);

  if (!state) {
    return NextResponse.json({ error: "Expected a valid portal workspace state payload." }, { status: 400 });
  }

  const updatedAt = new Date().toISOString();
  const supabase = await createSupabaseServerClient();
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
