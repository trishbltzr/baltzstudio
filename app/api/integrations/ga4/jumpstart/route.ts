import { NextRequest, NextResponse } from "next/server";
import { decryptConnection, encryptConnection, GA4_CONNECTION_COOKIE, ga4Config, ga4CookieOptions, refreshGa4Connection } from "@/lib/ga4OAuth";
import { resolvePortalRequestAccess } from "@/lib/portalRequestAccess";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function runReport(accessToken: string, propertyId: string, body: Record<string, unknown>) {
  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId)}:runReport`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error?.message || "GA4 could not create the jumpstart report.");
  return payload;
}

export async function POST(request: NextRequest) {
  try {
    const access = await resolvePortalRequestAccess(request, await createSupabaseServerClient());
    if (!access) return NextResponse.json({ error: "Sign in to import GA4." }, { status: 401 });
    const body = await request.json().catch(() => null);
    const clientId = typeof body?.clientId === "string" ? body.clientId : "";
    if (access.role === "client" && access.clientId !== clientId) {
      return NextResponse.json({ error: "Client accounts can import only their own GA4 data." }, { status: 403 });
    }
    const propertyId = typeof body?.propertyId === "string" ? body.propertyId.replace(/^properties\//, "") : "";
    if (!clientId || !/^\d+$/.test(propertyId)) return NextResponse.json({ error: "Choose a valid GA4 property." }, { status: 400 });
    const config = ga4Config(request.nextUrl.origin);
    const stored = decryptConnection(request.cookies.get(GA4_CONNECTION_COOKIE)?.value, config.stateSecret);
    if (!stored || stored.clientId !== clientId) return NextResponse.json({ error: "Connect Google Analytics for this client first." }, { status: 401 });
    const connection = await refreshGa4Connection(stored, config);
    const dateRanges = [{ startDate: "28daysAgo", endDate: "yesterday" }];
    const [overview, landingPages, channels] = await Promise.all([
      runReport(connection.accessToken, propertyId, { dateRanges, metrics: ["activeUsers", "sessions", "screenPageViews", "engagementRate", "bounceRate", "keyEvents"].map(name => ({ name })) }),
      runReport(connection.accessToken, propertyId, { dateRanges, dimensions: [{ name: "landingPagePlusQueryString" }], metrics: ["sessions", "activeUsers", "engagementRate", "keyEvents"].map(name => ({ name })), orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: 10 }),
      runReport(connection.accessToken, propertyId, { dateRanges, dimensions: [{ name: "sessionDefaultChannelGroup" }], metrics: ["sessions", "activeUsers", "engagementRate", "keyEvents"].map(name => ({ name })), orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: 10 }),
    ]);
    const response = NextResponse.json({ propertyId, period: "Last 28 complete days", overview, landingPages, channels });
    if (connection.accessToken !== stored.accessToken) response.cookies.set(GA4_CONNECTION_COOKIE, encryptConnection(connection, config.stateSecret), ga4CookieOptions);
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to import GA4." }, { status: 502 });
  }
}
