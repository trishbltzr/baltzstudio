import { createHash } from "node:crypto";

export type SourceSentinelResult = {
  checkedAt: string;
  sourceUrl: string;
  sourceStatus: number | null;
  sourceFingerprint: string | null;
  sitemapUrl: string;
  sitemapStatus: number | null;
  sitemapFingerprint: string | null;
  robotsUrl: string;
  robotsStatus: number | null;
  robotsFingerprint: string | null;
  failures: string[];
};

const SENTINEL_TIMEOUT_MS = 12_000;
const MAX_SENTINEL_BYTES = 1_000_000;

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function structuralHtml(value: string) {
  return value
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/>[^<]+</g, "><")
    .replace(/\s+/g, " ")
    .slice(0, MAX_SENTINEL_BYTES);
}

async function fetchSentinel(url: string, structural = false) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SENTINEL_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": "BaltazarStudio-Sentinel/1.0" },
      signal: controller.signal,
    });
    const body = (await response.text()).slice(0, MAX_SENTINEL_BYTES);
    return {
      status: response.status,
      fingerprint: hash(structural ? structuralHtml(body) : body),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function inspectSourceSentinel(
  sourceUrl: string,
  configuredSitemapUrl?: string | null,
): Promise<SourceSentinelResult> {
  const source = new URL(sourceUrl);
  const sitemapUrl = configuredSitemapUrl || new URL("/sitemap.xml", source).toString();
  const robotsUrl = new URL("/robots.txt", source).toString();
  const failures: string[] = [];
  const [sourceResult, sitemapResult, robotsResult] = await Promise.all([
    fetchSentinel(sourceUrl, true).catch(error => {
      failures.push(`source:${error instanceof Error ? error.message : String(error)}`);
      return null;
    }),
    fetchSentinel(sitemapUrl).catch(error => {
      failures.push(`sitemap:${error instanceof Error ? error.message : String(error)}`);
      return null;
    }),
    fetchSentinel(robotsUrl).catch(error => {
      failures.push(`robots:${error instanceof Error ? error.message : String(error)}`);
      return null;
    }),
  ]);

  return {
    checkedAt: new Date().toISOString(),
    sourceUrl,
    sourceStatus: sourceResult?.status ?? null,
    sourceFingerprint: sourceResult?.fingerprint ?? null,
    sitemapUrl,
    sitemapStatus: sitemapResult?.status ?? null,
    sitemapFingerprint: sitemapResult?.fingerprint ?? null,
    robotsUrl,
    robotsStatus: robotsResult?.status ?? null,
    robotsFingerprint: robotsResult?.fingerprint ?? null,
    failures,
  };
}
