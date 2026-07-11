import { NextResponse } from "next/server";
import { PORTAL_WORKSPACE_FALLBACK_RUN_ID } from "@/lib/portalWorkspacePersistence";
import { coercePersistedAuditDrafts, normalizePersistedAuditDraft } from "@/lib/portalAuditPersistence";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("portal_audit_runs")
    .select("run_id, run, state, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
      drafts: coercePersistedAuditDrafts(
      (data ?? [])
        .filter(row => row.run_id !== PORTAL_WORKSPACE_FALLBACK_RUN_ID)
        .map(row => ({
          run: row.run,
          state: row.state,
          updatedAt: row.updated_at,
        })),
    ),
  });
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  const draft = normalizePersistedAuditDraft(body?.draft ?? body);

  if (!draft) {
    return NextResponse.json({ error: "Expected a valid audit draft payload." }, { status: 400 });
  }

  const updatedAt = new Date().toISOString();
  const supabase = await createSupabaseServerClient();
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
