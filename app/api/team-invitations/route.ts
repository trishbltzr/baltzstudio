import { NextResponse } from "next/server";
import { getPortalActorContext } from "@/lib/portalIntelligenceRepository";
import { createSupabasePrivilegedServerClient } from "@/lib/supabase/privileged";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).host === new URL(request.url).host; } catch { return false; }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  try {
    const authClient = await createSupabaseServerClient();
    const actor = await getPortalActorContext(authClient);
    if (!actor) return NextResponse.json({ error: "Sign in to invite a team member." }, { status: 401 });
    if (actor.role !== "admin") return NextResponse.json({ error: "Only an admin can invite team members." }, { status: 403 });

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const name = typeof body?.name === "string" ? body.name.trim().slice(0, 120) : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase().slice(0, 320) : "";
    const role = body?.role === "admin" ? "admin" : "manager";
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "A valid name and email are required." }, { status: 400 });
    }

    const privileged = await createSupabasePrivilegedServerClient();
    const redirectTo = `${new URL(request.url).origin}/auth/callback?next=/dashboard`;
    const { data, error: inviteError } = await privileged.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { display_name: name },
    });
    if (inviteError || !data.user) {
      return NextResponse.json({ error: inviteError?.message || "The invitation could not be created." }, { status: 409 });
    }

    const { error: membershipError } = await privileged
      .from("portal_tenant_memberships")
      .upsert({
        tenant_id: actor.tenantId,
        user_id: data.user.id,
        role,
        client_id: null,
      }, { onConflict: "tenant_id,user_id" });
    if (membershipError) {
      await privileged.auth.admin.deleteUser(data.user.id).catch(() => undefined);
      throw new Error(membershipError.message);
    }

    return NextResponse.json({
      invitation: {
        id: data.user.id,
        name,
        email,
        access: role === "admin" ? "Admin" : "Member",
      },
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to invite the team member." },
      { status: 500 },
    );
  }
}
