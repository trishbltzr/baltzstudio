import { NextResponse } from "next/server";
import { DASHBOARD_USER_EMAIL_HEADER, coercePersistedProjects, normalizeDashboardUserEmail } from "@/lib/dashboardPersistence";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import type { Project } from "@/types";

function latestUpdatedAt(values: Array<string | null | undefined>) {
  return values
    .filter((value): value is string => typeof value === "string")
    .sort((left, right) => right.localeCompare(left))[0] ?? null;
}

function projectRowChanged(
  existingRow: { client_email: string | null; project: Json } | undefined,
  nextRow: { client_email: string | null; project: Json },
) {
  if (!existingRow) return true;

  return existingRow.client_email !== nextRow.client_email
    || JSON.stringify(existingRow.project) !== JSON.stringify(nextRow.project);
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const userEmail = normalizeDashboardUserEmail(request.headers.get(DASHBOARD_USER_EMAIL_HEADER));
  const projectStatePromise = supabase
    .from("dashboard_project_state")
    .select("project_id, project, client_email, updated_at")
    .order("project_id", { ascending: true });

  const userStatePromise = userEmail
    ? supabase
      .from("dashboard_user_state")
      .select("selected_project_id, updated_at")
      .eq("user_email", userEmail)
      .maybeSingle()
    : Promise.resolve({ data: null, error: null });

  const [{ data: projectStateRows, error: projectStateError }, { data: userStateRow, error: userStateError }] = await Promise.all([
    projectStatePromise,
    userStatePromise,
  ]);

  if (projectStateError) {
    return NextResponse.json({ error: projectStateError.message }, { status: 500 });
  }

  if (userStateError) {
    return NextResponse.json({ error: userStateError.message }, { status: 500 });
  }

  const projects = coercePersistedProjects((projectStateRows ?? []).map(row => row.project));

  return NextResponse.json({
    projects,
    selectedProjectId: userStateRow?.selected_project_id ?? null,
    updatedAt: latestUpdatedAt([
      userStateRow?.updated_at,
      ...(projectStateRows ?? []).map(row => row.updated_at),
    ]),
  });
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  const projects = coercePersistedProjects(body?.projects);
  if (!body || projects.length === 0) {
    return NextResponse.json({ error: "Expected projects array." }, { status: 400 });
  }

  const userEmail = normalizeDashboardUserEmail(request.headers.get(DASHBOARD_USER_EMAIL_HEADER));
  if (!userEmail) {
    return NextResponse.json({ error: `Missing ${DASHBOARD_USER_EMAIL_HEADER} header.` }, { status: 400 });
  }

  const selectedProjectId = typeof body.selectedProjectId === "string" ? body.selectedProjectId : null;
  const projectIds = new Set(projects.map(project => project.id));
  const normalizedSelectedProjectId = selectedProjectId && projectIds.has(selectedProjectId)
    ? selectedProjectId
    : null;
  const updatedAt = new Date().toISOString();
  const projectRows = projects.map((project: Project) => ({
    project_id: project.id,
    project: project as unknown as Json,
    client_email: normalizeDashboardUserEmail(project.clientEmail),
    updated_at: updatedAt,
  }));
  const supabase = await createSupabaseServerClient();
  const { data: existingProjectRows, error: existingProjectRowsError } = await supabase
    .from("dashboard_project_state")
    .select("project_id, project, client_email")
    .in("project_id", projectRows.map(projectRow => projectRow.project_id));

  if (existingProjectRowsError) {
    return NextResponse.json({ error: existingProjectRowsError.message }, { status: 500 });
  }

  const existingProjectRowsById = new Map((existingProjectRows ?? []).map(row => [row.project_id, row]));
  const changedProjectRows = projectRows.filter(projectRow => projectRowChanged(existingProjectRowsById.get(projectRow.project_id), projectRow));

  if (changedProjectRows.length > 0) {
    const { error: projectStateError } = await supabase
      .from("dashboard_project_state")
      .upsert(changedProjectRows, { onConflict: "project_id" });

    if (projectStateError) {
      return NextResponse.json({ error: projectStateError.message }, { status: 500 });
    }
  }

  const { data: userStateRow, error: userStateError } = await supabase
    .from("dashboard_user_state")
    .upsert({
      user_email: userEmail,
      selected_project_id: normalizedSelectedProjectId,
      updated_at: updatedAt,
    }, { onConflict: "user_email" })
    .select("updated_at")
    .single();

  if (userStateError) {
    return NextResponse.json({ error: userStateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updatedAt: userStateRow.updated_at });
}
