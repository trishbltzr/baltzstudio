import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

function privateAddress(address: string) {
  const lower = address.toLowerCase();
  if (lower === "::1" || lower === "::" || lower.startsWith("fc") || lower.startsWith("fd") || /^fe[89ab]/.test(lower)) return true;
  const value = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1] || address;
  if (isIP(value) !== 4) return false;
  const [a, b] = value.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
    || (a === 198 && (b === 18 || b === 19));
}

async function assertPublicUrl(url: URL) {
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Use a public http or https website URL.");
  if (url.username || url.password || url.port) throw new Error("Use a standard public website URL without credentials or a custom port.");
  if (url.hostname === "localhost" || url.hostname.endsWith(".local")) throw new Error("Local or private URLs cannot be scanned.");
  const records = await lookup(url.hostname, { all: true });
  if (!records.length || records.some(record => privateAddress(record.address))) throw new Error("Local or private URLs cannot be scanned.");
}

function normalizeUrl(input: string) {
  const value = input.trim();
  if (!value) throw new Error("Add a website URL to scan.");
  const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  url.hash = "";
  return url;
}

function websiteEntryCandidates(input: string) {
  const start = normalizeUrl(input);
  const candidates = new Map<string, URL>();
  const add = (url: URL) => candidates.set(url.href, url);
  add(start);
  const alternateHost = new URL(start);
  alternateHost.hostname = start.hostname.startsWith("www.") ? start.hostname.slice(4) : `www.${start.hostname}`;
  add(alternateHost);
  if (start.protocol === "https:") {
    const http = new URL(start);
    http.protocol = "http:";
    add(http);
    const alternateHttp = new URL(alternateHost);
    alternateHttp.protocol = "http:";
    add(alternateHttp);
  }
  return [...candidates.values()];
}

export async function validatePublicWebsiteUrl(input: string) {
  const url = normalizeUrl(input);
  await assertPublicUrl(url);
  return {
    normalizedUrl: url.href,
    normalizedDomain: url.hostname.toLowerCase(),
  };
}

async function fetchHtml(start: URL) {
  let url = start;
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    await assertPublicUrl(url);
    const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(9_000), headers: { "User-Agent": "BaltazarStudioAuditBot/1.0 (+website audit requested by the site owner)" } });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("The website redirected without a destination.");
      url = new URL(location, url);
      continue;
    }
    if (!response.ok) throw new Error(`The website returned ${response.status} for ${url.pathname || "/"}.`);
    if (!(response.headers.get("content-type") || "").includes("text/html")) throw new Error("The supplied URL did not return a web page.");
    return { url, html: (await response.text()).slice(0, 1_500_000) };
  }
  throw new Error("The website redirected too many times.");
}

const decode = (text: string) => text.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

function pageText(html: string) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "";
  const description = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1]
    || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)?.[1] || "";
  const cleaned = html.replace(/<(script|style|svg|noscript|template)[^>]*>[\s\S]*?<\/\1>/gi, " ").replace(/<!--([\s\S]*?)-->/g, " ")
    .replace(/<br\s*\/?\s*>|<\/p>|<\/div>|<\/li>|<\/h[1-6]>/gi, "\n").replace(/<[^>]+>/g, " ");
  return decode(`${title}\n${description}\n${cleaned}`).replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim().slice(0, 9_000);
}

function candidateLinks(html: string, base: URL) {
  const scored = new Map<string, { score: number; reason: string }>();
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>/gi)) {
    try {
      const url = new URL(decode(match[1]), base);
      if (url.origin !== base.origin || !["http:", "https:"].includes(url.protocol)) continue;
      url.hash = ""; url.search = "";
      if (/\.(pdf|jpe?g|png|gif|webp|svg|zip|mp4|mp3)$/i.test(url.pathname)) continue;
      const path = url.pathname.toLowerCase();
      const selection = /about|story|team/.test(path)
        ? { score: 90, reason: "Representative company and trust page" }
        : /service|offer|product|program|shop/.test(path)
          ? { score: 85, reason: "Representative service or offer page" }
          : /contact|book|consult|apply/.test(path)
            ? { score: 80, reason: "Representative conversion page" }
            : /case|result|testimonial|work/.test(path)
              ? { score: 75, reason: "Representative proof page" }
              : /blog|insight|resource/.test(path)
                ? { score: 55, reason: "Representative content page" }
                : path.split("/").filter(Boolean).length <= 1
                  ? { score: 30, reason: "Top-level navigation page" }
                  : { score: 10, reason: "Additional same-origin page" };
      const current = scored.get(url.href);
      if (!current || selection.score > current.score) scored.set(url.href, selection);
    } catch { /* ignore malformed links */ }
  }
  return [...scored.entries()]
    .sort((a, b) => b[1].score - a[1].score)
    .map(([url, selection]) => ({ url: new URL(url), ...selection }))
    .slice(0, 7);
}

export async function scanWebsite(input: string, options: { maxPages?: number } = {}) {
  const maxPages = Math.max(1, Math.min(20, Math.round(options.maxPages ?? 7)));
  let home: Awaited<ReturnType<typeof fetchHtml>> | null = null;
  let lastError: unknown = null;
  for (const candidate of websiteEntryCandidates(input)) {
    try {
      home = await fetchHtml(candidate);
      break;
    } catch (error) {
      lastError = error;
    }
  }
  if (!home) throw lastError instanceof Error ? lastError : new Error("The website could not be opened.");
  const pages = [{
    url: home.url.href,
    text: pageText(home.html),
    selectionReason: "Primary source URL",
    selectionRank: 0,
  }];
  for (const candidate of candidateLinks(home.html, home.url)) {
    if (pages.length >= maxPages) break;
    try {
      const page = await fetchHtml(candidate.url);
      if (!pages.some(existing => existing.url === page.url.href)) {
        pages.push({
          url: page.url.href,
          text: pageText(page.html),
          selectionReason: candidate.reason,
          selectionRank: candidate.score,
        });
      }
    } catch { /* one unavailable subpage should not fail the whole scan */ }
  }
  return pages.filter(page => page.text.length > 80);
}

export async function discoverSitemapUrls(input: string) {
  const start = normalizeUrl(input);
  await assertPublicUrl(start);
  const sitemap = new URL("/sitemap.xml", start);
  const response = await fetch(sitemap, { signal: AbortSignal.timeout(9_000), headers: { "User-Agent": "BaltazarStudioBuilderBot/1.0" } });
  if (!response.ok) return [];
  const xml = (await response.text()).slice(0, 2_000_000);
  const urls = [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map(match => decode(match[1]).trim());
  const pageUrls: string[] = [];
  for (const value of urls.slice(0, 200)) {
    try {
      const url = new URL(value);
      if (url.origin !== start.origin) continue;
      if (/\.xml($|\?)/i.test(url.href)) {
        const nested = await fetch(url, { signal: AbortSignal.timeout(7_000), headers: { "User-Agent": "BaltazarStudioBuilderBot/1.0" } });
        if (!nested.ok) continue;
        const nestedXml = (await nested.text()).slice(0, 2_000_000);
        for (const nestedMatch of nestedXml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)) pageUrls.push(decode(nestedMatch[1]).trim());
      } else pageUrls.push(url.href);
    } catch { /* ignore malformed sitemap entries */ }
    if (pageUrls.length >= 300) break;
  }
  return [...new Set(pageUrls)].slice(0, 300);
}
