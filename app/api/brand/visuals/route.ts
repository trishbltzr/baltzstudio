import { NextRequest, NextResponse } from "next/server";
import type { BrandVisualEvidence } from "@/lib/aiStageGeneration";
import { brandVisualsFromEvidence } from "@/lib/brandVisualEvidence";
import { collectWebsiteEvidence } from "@/lib/renderedWebsiteEvidence";
import { scanWebsite } from "@/lib/websiteScanner";
import { resolvePortalRequestAccess } from "@/lib/portalRequestAccess";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const CACHE_TTL = 10 * 60_000;
const CACHE_VERSION = "v2";
const cache = new Map<string, { expiresAt: number; value: BrandVisualEvidence }>();

export async function GET(request: NextRequest) {
  const access = await resolvePortalRequestAccess(request, await createSupabaseServerClient());
  if (!access) return NextResponse.json({ error: "Sign in to inspect brand visuals." }, { status: 401 });
  const input = request.nextUrl.searchParams.get("url")?.trim() || "";
  if (!input) return NextResponse.json({ error: "Add a public website URL." }, { status: 400 });
  const cacheKey = `${CACHE_VERSION}:${input}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() && cached.value.status === "verified") {
    return NextResponse.json({ result: cached.value, cached: true });
  }

  try {
    const pages = await scanWebsite(input);
    if (!pages.length) return NextResponse.json({ error: "The website did not expose enough public content to inspect." }, { status: 422 });
    const evidence = await collectWebsiteEvidence(pages.slice(0, 3).map(page => page.url), ["desktop"], false);
    const value = brandVisualsFromEvidence(evidence);
    if (value.status === "verified") cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL, value });
    else cache.delete(cacheKey);
    return NextResponse.json({ result: value, cached: false });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The live brand system could not be inspected." }, { status: 422 });
  }
}
