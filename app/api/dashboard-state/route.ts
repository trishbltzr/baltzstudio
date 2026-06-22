import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

const DASHBOARD_STATE_ID = "default";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("dashboard_state")
    .select("projects, selected_project_id, updated_at")
    .eq("id", DASHBOARD_STATE_ID)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    projects: data?.projects ?? null,
    selectedProjectId: data?.selected_project_id ?? null,
    updatedAt: data?.updated_at ?? null,
  });
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.projects)) {
    return NextResponse.json({ error: "Expected projects array." }, { status: 400 });
  }

  const selectedProjectId = typeof body.selectedProjectId === "string" ? body.selectedProjectId : null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("dashboard_state")
    .upsert({
      id: DASHBOARD_STATE_ID,
      projects: body.projects as Json,
      selected_project_id: selectedProjectId,
      updated_at: new Date().toISOString(),
    })
    .select("updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updatedAt: data.updated_at });
}
