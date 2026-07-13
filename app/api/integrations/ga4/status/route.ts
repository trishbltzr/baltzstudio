import { NextRequest, NextResponse } from "next/server";
import { decryptConnection, encryptConnection, GA4_CONNECTION_COOKIE, ga4Config, ga4CookieOptions, refreshGa4Connection } from "@/lib/ga4OAuth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const requestedClient = request.nextUrl.searchParams.get("clientId") || "";
    const config = ga4Config(request.nextUrl.origin);
    const stored = decryptConnection(request.cookies.get(GA4_CONNECTION_COOKIE)?.value, config.stateSecret);
    if (!stored || stored.clientId !== requestedClient) return NextResponse.json({ connected: false, properties: [] });
    const connection = await refreshGa4Connection(stored, config);
    const googleResponse = await fetch("https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200", { headers: { authorization: `Bearer ${connection.accessToken}` }, cache: "no-store" });
    const payload = await googleResponse.json().catch(() => null);
    if (!googleResponse.ok) throw new Error(payload?.error?.message || "Unable to list GA4 properties.");
    const properties = (Array.isArray(payload?.accountSummaries) ? payload.accountSummaries : []).flatMap((account: any) =>
      (Array.isArray(account.propertySummaries) ? account.propertySummaries : []).map((property: any) => ({ property: property.property, displayName: property.displayName || property.property, account: account.displayName || account.account })),
    );
    const response = NextResponse.json({ connected: true, properties });
    if (connection.accessToken !== stored.accessToken) response.cookies.set(GA4_CONNECTION_COOKIE, encryptConnection(connection, config.stateSecret), ga4CookieOptions);
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to check GA4." }, { status: 503 });
  }
}
