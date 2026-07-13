import { NextRequest, NextResponse } from "next/server";
import { createOAuthState, GA4_SCOPE, GA4_STATE_COOKIE, ga4Config, ga4CookieOptions } from "@/lib/ga4OAuth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const clientId = request.nextUrl.searchParams.get("clientId")?.trim();
    if (!clientId) return NextResponse.json({ error: "Choose a client before connecting GA4." }, { status: 400 });
    const config = ga4Config(request.nextUrl.origin);
    const state = createOAuthState(clientId, config.stateSecret);
    const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authorizationUrl.search = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      scope: GA4_SCOPE,
      access_type: "offline",
      include_granted_scopes: "true",
      prompt: "consent",
      state,
    }).toString();
    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set(GA4_STATE_COOKIE, state, { ...ga4CookieOptions, maxAge: 10 * 60 });
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to connect GA4." }, { status: 503 });
  }
}
