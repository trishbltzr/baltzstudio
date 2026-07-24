import { NextResponse } from "next/server";
import type { LoginUser } from "@/lib/authTypes";
import { readDevelopmentLoginEmail } from "@/lib/developmentLoginSession";
import { resolvePortalRequestAccess } from "@/lib/portalRequestAccess";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const access = await resolvePortalRequestAccess(request, supabase);
  if (!access) {
    return NextResponse.json(
      { error: "This account has not been assigned portal access." },
      { status: 403, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const { data } = await supabase.auth.getUser();
  const email = data.user?.email?.trim().toLowerCase()
    || readDevelopmentLoginEmail(request);
  if (!email) {
    return NextResponse.json(
      { error: "Sign in to continue." },
      { status: 401, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const user: LoginUser = {
    email,
    role: access.role,
    name: access.role === "client"
      ? access.clientName
      : displayName(data.user?.user_metadata, email),
    ...(access.role === "client" ? { clientName: access.clientName } : {}),
  };

  return NextResponse.json(
    { user },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

function displayName(metadata: unknown, email: string) {
  if (metadata && typeof metadata === "object") {
    const value = metadata as Record<string, unknown>;
    const supplied = typeof value.full_name === "string"
      ? value.full_name
      : typeof value.name === "string"
        ? value.name
        : "";
    if (supplied.trim()) return supplied.trim();
  }

  return email
    .split("@")[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Portal user";
}
