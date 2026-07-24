import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { NextResponse } from "next/server";
import { resolvePortalRequestAccess } from "@/lib/portalRequestAccess";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

class SitemapError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

function privateIp(address: string) {
  if (address === "::1" || address === "::" || address.startsWith("fc") || address.startsWith("fd") || address.startsWith("fe80:")) return true;
  if (!address.includes(".")) return false;
  const [a, b] = address.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

async function ensurePublic(url: URL, checkedHosts: Set<string>) {
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new SitemapError("Enter a public http or https website URL.");
  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal")) throw new SitemapError("Enter a public website URL.");
  if (checkedHosts.has(hostname)) return;
  if (isIP(hostname) && privateIp(hostname)) throw new SitemapError("Private network URLs cannot be crawled.");
  try {
    const addresses = await lookup(hostname, { all: true });
    if (!addresses.length || addresses.some(result => privateIp(result.address))) throw new SitemapError("Private network URLs cannot be crawled.");
  } catch (error) {
    if (error instanceof SitemapError) throw error;
    throw new SitemapError("That website could not be resolved. Check the URL and try again.", 404);
  }
  checkedHosts.add(hostname);
}

async function safeFetch(input: URL, checkedHosts: Set<string>, init: RequestInit = {}) {
  let current = input;
  for (let redirect = 0; redirect < 5; redirect += 1) {
    await ensurePublic(current, checkedHosts);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch(current, { ...init, redirect: "manual", signal: controller.signal, headers: { "user-agent": "BaltazarStudio-SEOCrawler/1.0", accept: "text/html,application/xml,text/xml,*/*", ...(init.headers || {}) } });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) return { response, finalUrl: current };
        current = new URL(location, current);
        continue;
      }
      return { response, finalUrl: current };
    } finally { clearTimeout(timer); }
  }
  throw new SitemapError("The sitemap redirected too many times.", 400);
}

function decode(value: string) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

function locs(xml: string) {
  return Array.from(xml.matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc>/gi), match => decode(match[1])).filter(Boolean);
}

function sameSite(candidate: URL, origin: URL) {
  const base = origin.hostname.toLowerCase().replace(/^www\./, "");
  const host = candidate.hostname.toLowerCase().replace(/^www\./, "");
  return host === base || host.endsWith(`.${base}`);
}

async function readSitemap(url: URL, origin: URL, checkedHosts: Set<string>, depth = 0): Promise<string[]> {
  const { response, finalUrl } = await safeFetch(url, checkedHosts);
  if (!response.ok) throw new SitemapError(`No accessible sitemap.xml was found at ${url.href}`, 404);
  const contentType = response.headers.get("content-type") || "";
  const length = Number(response.headers.get("content-length") || 0);
  if (length > 5_000_000) throw new SitemapError("The sitemap is too large to import directly.");
  const xml = (await response.text()).slice(0, 5_000_000);
  if (!/<(?:urlset|sitemapindex)\b/i.test(xml) && !contentType.includes("xml")) throw new SitemapError(`The site responded at ${finalUrl.href}, but it is not a valid sitemap.xml file.`, 422);
  const entries = locs(xml);
  if (!entries.length) throw new SitemapError("The sitemap exists but does not contain any page URLs.", 422);
  if (/<sitemapindex\b/i.test(xml)) {
    if (depth >= 2) return [];
    const children = entries.slice(0, 20).map(entry => new URL(entry, finalUrl)).filter(child => sameSite(child, origin));
    const groups = await Promise.all(children.map(child => readSitemap(child, origin, checkedHosts, depth + 1).catch(() => [])));
    return groups.flat();
  }
  return entries.map(entry => new URL(entry, finalUrl)).filter(page => sameSite(page, origin)).map(page => page.href);
}

function textContent(html: string) {
  return decode(html.replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<style\b[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
}

function capture(html: string, pattern: RegExp) {
  return decode(html.match(pattern)?.[1] || "");
}

function detectCms(html: string, generator: string) {
  const evidence = `${generator} ${html}`;
  if (/wordpress|wp-content|wp-includes/i.test(evidence)) return generator || "WordPress";
  if (/shopify|cdn\.shopify/i.test(evidence)) return generator || "Shopify";
  if (/wixstatic|wix-code|wix\.com/i.test(evidence)) return generator || "Wix";
  if (/squarespace/i.test(evidence)) return generator || "Squarespace";
  if (/webflow/i.test(evidence)) return generator || "Webflow";
  return generator;
}

async function crawlPage(href: string, checkedHosts: Set<string>) {
  const requested = new URL(href);
  try {
    const { response, finalUrl } = await safeFetch(requested, checkedHosts);
    const contentType = response.headers.get("content-type") || "";
    const html = contentType.includes("html") ? (await response.text()).slice(0, 1_500_000) : "";
    const robots = capture(html, /<meta\b[^>]*name=["']robots["'][^>]*content=["']([^"']*)["'][^>]*>/i);
    const title = capture(html, /<title\b[^>]*>([\s\S]*?)<\/title>/i);
    const description = capture(html, /<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i) || capture(html, /<meta\b[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
    const h1 = capture(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const canonical = capture(html, /<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["'][^>]*>/i) || capture(html, /<link\b[^>]*href=["']([^"']*)["'][^>]*rel=["']canonical["'][^>]*>/i);
    const generator = capture(html, /<meta\b[^>]*name=["']generator["'][^>]*content=["']([^"']*)["'][^>]*>/i) || capture(html, /<meta\b[^>]*content=["']([^"']*)["'][^>]*name=["']generator["'][^>]*>/i);
    const viewport = capture(html, /<meta\b[^>]*name=["']viewport["'][^>]*content=["']([^"']*)["'][^>]*>/i) || capture(html, /<meta\b[^>]*content=["']([^"']*)["'][^>]*name=["']viewport["'][^>]*>/i);
    const cms = detectCms(html, generator);
    const analyticsDetected = /googletagmanager|gtag\s*\(|GTM-[A-Z0-9]+|G-[A-Z0-9]+/i.test(html);
    const path = finalUrl.pathname.split("/").filter(Boolean);
    return {
      url: href,
      statusCode: response.status,
      contentType: contentType || "unknown",
      indexability: response.ok && !/noindex/i.test(robots) ? "Indexable" : "Non-Indexable",
      title,
      description,
      h1,
      canonical,
      depth: path.length,
      inlinks: 0,
      words: html ? textContent(html).split(/\s+/).filter(Boolean).length : 0,
      raw: {
        "TLS Verified": finalUrl.protocol === "https:" && response.ok ? "Yes" : "No",
        "CMS Detected": cms,
        "CMS Generator": generator,
        "Mobile Viewport": /width\s*=\s*device-width/i.test(viewport) ? "Yes" : "No",
        "Analytics Detected": analyticsDetected ? "Yes" : "No",
        "Cache-Control": response.headers.get("cache-control") || "",
        "Server": response.headers.get("server") || "",
        "X-Powered-By": response.headers.get("x-powered-by") || "",
        "Meta Robots 1": robots,
      },
    };
  } catch {
    return { url: href, statusCode: 0, contentType: "unknown", indexability: "Non-Indexable", title: "", description: "", h1: "", canonical: "", depth: requested.pathname.split("/").filter(Boolean).length, inlinks: 0, words: 0, raw: {} };
  }
}

export async function POST(request: Request) {
  try {
    const access = await resolvePortalRequestAccess(request, await createSupabaseServerClient());
    if (!access) return NextResponse.json({ error: "Sign in to crawl a sitemap." }, { status: 401 });
    const body = await request.json() as { url?: string };
    const raw = String(body.url || "").trim();
    if (!raw) throw new SitemapError("Enter the website URL to locate its sitemap.xml.");
    const website = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const checkedHosts = new Set<string>();
    await ensurePublic(website, checkedHosts);
    const sitemapUrl = website.pathname.toLowerCase().endsWith(".xml") ? website : new URL("/sitemap.xml", website.origin);
    const discovered = Array.from(new Set(await readSitemap(sitemapUrl, website, checkedHosts))).slice(0, 100);
    if (!discovered.length) throw new SitemapError("The sitemap exists but no crawlable page URLs were found.", 422);
    const rows = [];
    for (let index = 0; index < discovered.length; index += 8) rows.push(...await Promise.all(discovered.slice(index, index + 8).map(href => crawlPage(href, checkedHosts))));
    let robotsStatus = "Unavailable";
    let robotsSitemapReference = "Unverified";
    try {
      const robots = await safeFetch(new URL("/robots.txt", website.origin), checkedHosts, { headers: { accept: "text/plain,*/*" } });
      robotsStatus = String(robots.response.status);
      const robotsText = (await robots.response.text()).slice(0, 250_000);
      robotsSitemapReference = /^\s*sitemap\s*:/im.test(robotsText) ? "Yes" : "No";
    } catch { /* Leave the robots check unverified when it cannot be reached. */ }
    let httpRedirectsToHttps = "Unverified";
    try {
      const insecureHome = new URL(website.origin);
      insecureHome.protocol = "http:";
      const httpResult = await safeFetch(insecureHome, checkedHosts, { headers: { accept: "text/html,*/*" } });
      httpRedirectsToHttps = httpResult.finalUrl.protocol === "https:" ? "Yes" : "No";
    } catch { /* Leave the redirect check unverified when the HTTP host cannot be reached. */ }
    const rowsWithSiteEvidence = rows.map(row => ({ ...row, raw: { ...(row.raw || {}), "Robots.txt Status": robotsStatus, "Robots Sitemap Reference": robotsSitemapReference, "HTTP Redirects to HTTPS": httpRedirectsToHttps } }));
    return NextResponse.json({ sitemapUrl: sitemapUrl.href, discovered: discovered.length, rows: rowsWithSiteEvidence });
  } catch (error) {
    const status = error instanceof SitemapError ? error.status : 500;
    const message = error instanceof Error ? error.message : "The sitemap crawl could not be completed.";
    return NextResponse.json({ error: message }, { status });
  }
}
