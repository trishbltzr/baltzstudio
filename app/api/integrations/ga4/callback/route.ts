import { NextRequest, NextResponse } from "next/server";
import { decryptConnection, encryptConnection, GA4_CONNECTION_COOKIE, GA4_STATE_COOKIE, ga4Config, ga4CookieOptions, readOAuthState } from "@/lib/ga4OAuth";
import { resolvePortalRequestAccess } from "@/lib/portalRequestAccess";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const returnUrl = new URL("/dashboard?view=audits&auditType=seo", request.nextUrl.origin);
  try {
    const access = await resolvePortalRequestAccess(request, await createSupabaseServerClient());
    if (!access) throw new Error("Sign in before completing the GA4 connection.");
    const config = ga4Config(request.nextUrl.origin);
    const stateValue = request.nextUrl.searchParams.get("state") || "";
    const cookieState = request.cookies.get(GA4_STATE_COOKIE)?.value || "";
    if (!stateValue || stateValue !== cookieState) throw new Error("The Google Analytics connection could not be verified. Please try again.");
    const state = readOAuthState(stateValue, config.stateSecret);
    if (!state) throw new Error("The Google Analytics connection expired. Please try again.");
    if (access.role === "client" && access.clientId !== state.clientId) {
      throw new Error("This GA4 connection does not belong to the signed-in client.");
    }
    const code = request.nextUrl.searchParams.get("code");
    if (!code) throw new Error(request.nextUrl.searchParams.get("error") || "Google did not return an authorization code.");

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: config.redirectUri, grant_type: "authorization_code" }),
      cache: "no-store",
    });
    const token = await tokenResponse.json().catch(() => null);
    if (!tokenResponse.ok || !token?.access_token) throw new Error("Google Analytics could not finish connecting.");
    const existing = decryptConnection(request.cookies.get(GA4_CONNECTION_COOKIE)?.value, config.stateSecret);
    const refreshToken = token.refresh_token || (existing?.clientId === state.clientId ? existing.refreshToken : "");
    if (!refreshToken) throw new Error("Google did not return offline access. Reconnect and approve access again.");

    const encrypted = encryptConnection({ clientId: state.clientId, accessToken: token.access_token, refreshToken, expiresAt: Date.now() + Number(token.expires_in || 3600) * 1000 }, config.stateSecret);
    returnUrl.searchParams.set("ga4", "connected");
    returnUrl.searchParams.set("ga4Client", state.clientId);
    const response = NextResponse.redirect(returnUrl);
    response.cookies.set(GA4_CONNECTION_COOKIE, encrypted, ga4CookieOptions);
    response.cookies.delete(GA4_STATE_COOKIE);
    return response;
  } catch (error) {
    returnUrl.searchParams.set("ga4", "error");
    returnUrl.searchParams.set("message", error instanceof Error ? error.message : "Unable to connect GA4.");
    return NextResponse.redirect(returnUrl);
  }
}
