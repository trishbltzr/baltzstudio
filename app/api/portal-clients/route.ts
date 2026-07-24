import { NextResponse } from "next/server";
import {
  createClientSlug,
  isCheckupServiceKind,
  normalizeClientCreatedEventKey,
  normalizeClientSource,
  normalizePrimaryContactEmail,
} from "@/lib/portalIntelligence";
import {
  createPortalClientWithBaseline,
  enrollPortalPilotWithBaseline,
  getPortalActorContext,
  listPortalClients,
} from "@/lib/portalIntelligenceRepository";
import { dispatchServiceRun } from "@/lib/serviceRunWorkflow";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function errorResponse(error: unknown, fallbackStatus = 500) {
  const message = error instanceof Error ? error.message : "Unexpected portal client error.";
  const status = /only an admin|cannot create clients for this tenant|client accounts cannot/i.test(message)
    ? 403
    : /already exists|different domain|different primary contact|already bound|paused|limited to|not enabled/i.test(message)
      ? 409
      : /required|valid|cannot include|must use|must belong|public domain/i.test(message)
        ? 400
        : fallbackStatus;
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const context = await getPortalActorContext(supabase);
    if (!context) return NextResponse.json({ error: "Sign in to load portal clients." }, { status: 401 });

    const clients = await listPortalClients(supabase, context);
    return NextResponse.json({ clients });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const website = typeof body?.website === "string" ? body.website : "";
    const sitemap = typeof body?.sitemap === "string" ? body.sitemap : null;
    const serviceKind = isCheckupServiceKind(body?.serviceKind) ? body.serviceKind : "website";
    const primaryContactEmail = normalizePrimaryContactEmail(body?.primaryContactEmail);
    const enrollAsPilot = body?.enrollAsPilot === true;
    const rolloutNote = typeof body?.rolloutNote === "string" ? body.rolloutNote.trim() : "";
    const eventKey = normalizeClientCreatedEventKey(
      request.headers.get("Idempotency-Key")
        || (typeof body?.eventKey === "string" ? body.eventKey : null),
    );

    if (!name) return NextResponse.json({ error: "Client name is required." }, { status: 400 });

    const source = normalizeClientSource(website, sitemap);
    const slug = createClientSlug(name);
    const supabase = await createSupabaseServerClient();
    const context = await getPortalActorContext(supabase);
    if (!context) return NextResponse.json({ error: "Sign in to create a portal client." }, { status: 401 });

    const result = enrollAsPilot
      ? await enrollPortalPilotWithBaseline(supabase, context, {
        eventKey,
        slug,
        name,
        source,
        serviceKind,
        primaryContactEmail,
        rolloutNote,
      })
      : await createPortalClientWithBaseline(supabase, context, {
        eventKey,
        slug,
        name,
        source,
        serviceKind,
        primaryContactEmail,
      });

    let dispatch: Awaited<ReturnType<typeof dispatchServiceRun>> | null = null;
    let dispatchError: string | null = null;
    if (result.created) {
      try {
        dispatch = await dispatchServiceRun(supabase, result.service_run_id);
      } catch (error) {
        dispatchError = error instanceof Error ? error.message : "Workflow dispatch failed.";
      }
    }

    return NextResponse.json({
      result,
      dispatch,
      dispatchError,
      rollout: enrollAsPilot ? { stage: "pilot", projectionSource: "legacy" } : null,
    }, { status: result.created ? 201 : 200 });
  } catch (error) {
    return errorResponse(error);
  }
}
