"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import { UNASSIGNED_WORK_CLIENT, type StudioClient } from "../clients";
import { GuidedIntakeSelector } from "../components/GuidedIntakeSelector";
import { EngineIndexControls } from "../components/EngineIndexControls";
import { EngineIndexOverview } from "../components/EngineIndexOverview";
import { clientsForEngineWork, saveEngineWork, startClientForEngine } from "../engineLifecycle";
import { css } from "../helpers";
import { Icon } from "../icons";
import { printReportNode } from "../printReport";
import { AuditReportFooter } from "../components/AuditReportFooter";
import { processClientStages } from "../processDefinitions";
import type { PortalActions, PortalState } from "../store";
import type { TaskImportDraft } from "../types";
import { CategoryBars, type CatBar } from "../components/AuditCharts";
import { AuditCardScoreSkeleton } from "../components/AuditCardScoreSkeleton";
import { GuidedLoadingState } from "../components/GuidedLoadingState";
import { StartOverDialog } from "../components/StartOverDialog";
import { syncPortalProcessRun } from "@/lib/portalProcessRuns";
import { processStageAccess } from "../access";
import { normalizePortalAuditExportProfile, portalWorkspaceClientRefs } from "@/lib/portalWorkspacePersistence";
import { durableCheckupCard, useDurableCheckupRuns } from "../audits/durableCheckupRuns";
import { usePortalStudioClients } from "../usePortalStudioClients";

type SeoSection = "sources" | "overview" | "inventory" | "issues" | "readiness" | "audit-report" | "keywords" | "metadata" | "architecture" | "roadmap";
type SourceType = "CSV upload" | "Sitemap crawl";
type SeoReadinessStatus = "confirmed" | "warning" | "blocked";

function normalizeSourceType(value?: string): SourceType {
  return value === "Sitemap URL" || value === "Sitemap crawl" ? "Sitemap crawl" : "CSV upload";
}

interface CrawlRow {
  url: string;
  statusCode: number;
  contentType: string;
  indexability: string;
  title: string;
  description: string;
  h1: string;
  canonical: string;
  depth: number;
  inlinks: number;
  words: number;
  raw?: Record<string, string>;
}

interface SavedSeoProject {
  rows: CrawlRow[];
  sourceType: SourceType;
  sourceName: string;
  importedAt: string;
  readiness?: Record<string, SeoReadinessStatus>;
}

interface SeoStats {
  html: CrawlRow[];
  active: CrawlRow[];
  redirects: CrawlRow[];
  broken: CrawlRow[];
  indexable: CrawlRow[];
  missingTitle: CrawlRow[];
  missingDescription: CrawlRow[];
  missingH1: CrawlRow[];
  thin: CrawlRow[];
  health: number;
}

interface AiVisibilityStats {
  eligible: number;
  answerReady: number;
  answerGaps: number;
  schemaReady: number;
  schemaMeasured: number;
  crawlerAccess: "allowed" | "blocked" | "unverified";
  score: number;
}

function seoStatsFor(rows: CrawlRow[]): SeoStats {
  const html = rows.filter(row => row.contentType.toLowerCase().includes("html"));
  const active = rows.filter(row => row.statusCode >= 200 && row.statusCode < 300);
  const redirects = rows.filter(row => row.statusCode >= 300 && row.statusCode < 400);
  const broken = rows.filter(row => row.statusCode === 0 || row.statusCode >= 400);
  const indexable = rows.filter(row => row.indexability.toLowerCase() === "indexable");
  const missingTitle = html.filter(row => row.statusCode === 200 && !row.title);
  const missingDescription = html.filter(row => row.statusCode === 200 && !row.description);
  const missingH1 = html.filter(row => row.statusCode === 200 && !row.h1);
  const thin = html.filter(row => row.statusCode === 200 && row.words > 0 && row.words < 300);
  const health = rows.length ? Math.max(0, Math.round(100 - ((broken.length * 8 + redirects.length * 3 + missingTitle.length * 5 + missingDescription.length * 2 + missingH1.length * 3) / rows.length) * 10)) : 0;
  return { html, active, redirects, broken, indexable, missingTitle, missingDescription, missingH1, thin, health };
}

function aiVisibilityFor(rows: CrawlRow[]): AiVisibilityStats {
  const pages = rows.filter(row => row.statusCode === 200 && row.contentType.toLowerCase().includes("html"));
  const eligiblePages = pages.filter(row => {
    const controls = `${rawCell(row, ["Meta Robots 1", "Meta Robots"])} ${rawCell(row, ["X-Robots-Tag 1", "X-Robots-Tag"])}`.toLowerCase();
    return row.indexability.toLowerCase() === "indexable" && !controls.includes("noindex") && !controls.includes("nosnippet");
  });
  const answerReadyPages = eligiblePages.filter(row => row.title && row.description && row.h1 && row.words >= 300);
  const schemaValues = pages.map(row => rawCell(row, ["Structured Data Types", "Schema Types", "JSON-LD Types", "Structured Data"])).filter(Boolean);
  const schemaReady = schemaValues.filter(value => !/none|missing|invalid/i.test(value)).length;
  const crawlerEvidence = rows.map(row => rawCell(row, ["AI Crawler Access", "OAI-SearchBot", "OAI SearchBot", "GPTBot Access"])).filter(Boolean).join(" ").toLowerCase();
  const crawlerAccess = /block|deny|disallow/.test(crawlerEvidence) ? "blocked" : /allow|yes|enabled/.test(crawlerEvidence) ? "allowed" : "unverified";
  const eligibilityScore = pages.length ? eligiblePages.length / pages.length * 100 : 0;
  const answerScore = eligiblePages.length ? answerReadyPages.length / eligiblePages.length * 100 : 0;
  const schemaScore = schemaValues.length ? schemaReady / schemaValues.length * 100 : 50;
  return {
    eligible: eligiblePages.length,
    answerReady: answerReadyPages.length,
    answerGaps: Math.max(0, eligiblePages.length - answerReadyPages.length),
    schemaReady,
    schemaMeasured: schemaValues.length,
    crawlerAccess,
    score: Math.round(eligibilityScore * .45 + answerScore * .45 + schemaScore * .1),
  };
}

const SECTIONS: Array<{ id: SeoSection; label: string; icon: string; group: string }> = [
  { id: "sources", label: "Data sources", icon: "folder", group: "SETUP" },
  { id: "overview", label: "Overview", icon: "chart", group: "AUDIT" },
  { id: "inventory", label: "Site inventory", icon: "file", group: "AUDIT" },
  { id: "issues", label: "Issues", icon: "alert", group: "AUDIT" },
  { id: "readiness", label: "Readiness check", icon: "check", group: "AUDIT" },
  { id: "audit-report", label: "Report & priorities", icon: "file", group: "AUDIT" },
  { id: "keywords", label: "Keyword & page plan", icon: "map", group: "PLAN" },
  { id: "metadata", label: "Metadata", icon: "edit", group: "PLAN" },
  { id: "architecture", label: "Proposed IA", icon: "layers", group: "PLAN" },
  { id: "roadmap", label: "Roadmap", icon: "timeline", group: "DELIVER" },
];

const CLIENT_SEO_STAGE_SECTIONS: Record<string, SeoSection[]> = {
  crawl: ["sources"],
  report: ["overview", "inventory", "issues", "readiness", "audit-report"],
  plan: ["keywords", "metadata", "architecture", "roadmap"],
};

const CLIENT_AUDIT_STAGES: Array<{ id: string; label: string; sections: SeoSection[] }> = processClientStages("seo-audit").map(stage => ({
  id: stage.id,
  label: stage.label,
  sections: CLIENT_SEO_STAGE_SECTIONS[stage.id] || [],
}));

const SEO_ANALYSIS_STEPS = [
  "Reading the crawl inventory",
  "Normalizing URLs and technical fields",
  "Checking indexability, metadata, and page signals",
  "Connecting findings to page decisions",
  "Evaluating AIO and GEO discovery evidence",
  "Preparing the client-facing audit report",
];

const SEO_ANALYSIS_FINAL_MESSAGES = [
  "Checking checklist evidence links",
  "Confirming totals across findings and reports",
  "Removing unsupported conclusions",
  "Preparing the audit for review",
];


const SEO_READINESS_GROUPS: Array<{ title: string; description: string; items: Array<{ id: string; label: string; detail: string }> }> = [
  {
    title: "Crawlability & indexation",
    description: "Check whether search engines can reach, interpret, and index the right URLs.",
    items: [
      { id: "crawl-response", label: "Crawlable URLs return healthy responses", detail: "Priority pages resolve successfully without broken 4xx or server 5xx responses." },
      { id: "crawl-redirects", label: "Redirects are clean and intentional", detail: "Redirects use a final relevant destination without chains, loops, or unnecessary hops." },
      { id: "crawl-indexing", label: "Indexability matches page purpose", detail: "Important pages are indexable while utility, duplicate, and private pages are excluded intentionally." },
      { id: "crawl-robots", label: "robots.txt allows priority content", detail: "Crawler directives do not accidentally block important pages or required assets." },
      { id: "crawl-sitemap", label: "XML sitemap is valid and current", detail: "The sitemap is reachable and lists canonical, indexable URLs that should appear in search." },
      { id: "crawl-canonicals", label: "Canonical tags resolve consistently", detail: "Indexable pages declare the correct preferred URL and duplicates consolidate to one version." },
    ],
  },
  {
    title: "On-page content signals",
    description: "Review the page-level signals that explain relevance and earn the search result click.",
    items: [
      { id: "onpage-titles", label: "Page titles are unique and descriptive", detail: "Each indexable page has one useful title aligned with its topic and search intent." },
      { id: "onpage-descriptions", label: "Meta descriptions support the click", detail: "Priority pages have distinct descriptions that accurately preview the page and encourage visits." },
      { id: "onpage-h1", label: "Each page has one clear primary heading", detail: "The H1 communicates the page topic and supports a logical heading hierarchy." },
      { id: "onpage-depth", label: "Content satisfies the page intent", detail: "Important pages contain enough specific, useful information to answer the intended search need." },
      { id: "onpage-duplicates", label: "Duplicate and near-duplicate pages are resolved", detail: "Overlapping pages are consolidated, redirected, canonicalized, or differentiated intentionally." },
      { id: "onpage-images", label: "Meaningful images have useful alt text", detail: "Informative images are described for accessibility and image-search understanding without keyword stuffing." },
    ],
  },
  {
    title: "Architecture & internal linking",
    description: "Confirm the site structure helps people and crawlers find the most important pages.",
    items: [
      { id: "architecture-depth", label: "Priority pages are within a healthy crawl depth", detail: "Important content is reachable in a few clicks instead of being buried deep in the site." },
      { id: "architecture-inlinks", label: "Important pages receive internal links", detail: "Priority pages are connected from relevant navigation, hubs, and contextual links." },
      { id: "architecture-urls", label: "URLs are readable and stable", detail: "URLs are concise, descriptive, consistently formatted, and free of avoidable parameters." },
      { id: "architecture-actions", label: "Broken and moved URLs have a resolution plan", detail: "Every broken, redirected, removed, or consolidated page has a clear destination or cleanup action." },
      { id: "architecture-keywords", label: "Keyword-to-page conflicts are reviewed", detail: "Multiple pages do not compete for the same intent without a deliberate hierarchy or consolidation plan." },
    ],
  },
  {
    title: "Technical experience",
    description: "Check the technical signals that affect secure access, rendering, usability, and search eligibility.",
    items: [
      { id: "technical-https", label: "HTTPS is enforced consistently", detail: "All public URLs load securely and alternate HTTP versions redirect to the preferred HTTPS URL." },
      { id: "technical-mobile", label: "Priority templates are mobile usable", detail: "Pages have responsive viewport support and remain readable, tappable, and stable on smaller screens." },
      { id: "technical-performance", label: "Core Web Vitals are reviewed", detail: "Loading, responsiveness, and layout stability are checked on representative priority templates." },
      { id: "technical-structured", label: "Structured data is valid and relevant", detail: "Applicable schema is present, error-free, and matches the visible page content." },
      { id: "technical-server", label: "Server and rendering errors are absent", detail: "The crawl contains no recurring 5xx responses, broken rendered content, or critical resource failures." },
    ],
  },
  {
    title: "AIO, GEO & measurement",
    description: "Review whether content can be understood, cited, and measured across modern search and answer experiences.",
    items: [
      { id: "ai-crawlers", label: "Search and answer-engine crawlers can reach priority content", detail: "Googlebot, Bingbot, and relevant discovery crawlers are not unintentionally blocked from public pages." },
      { id: "ai-answers", label: "Priority pages are answer-ready", detail: "Pages use clear headings, direct answers, sufficient context, and extractable supporting details." },
      { id: "ai-entities", label: "Entities and relationships are explicit", detail: "Organization, service, author, product, and location information is consistently named and structured." },
      { id: "ai-citations", label: "Important claims have citation signals", detail: "Expertise, authorship, dates, evidence, and trustworthy references support material claims." },
      { id: "measurement-baseline", label: "Organic and answer-engine discovery measurement is available", detail: "Analytics and search-performance sources can establish clicks, landing pages, conversions, and referral traffic." },
    ],
  },
];

const SEO_READINESS_ITEMS = SEO_READINESS_GROUPS.flatMap(group => group.items);

type ReadinessAiResult = { status: SeoReadinessStatus; evidence: string };

// Auto-verify only the SEO audit checks supported by crawl or public evidence.
// Qualitative content judgment and connected performance data remain unverified.
function readinessAi(stats: SeoStats, rows: CrawlRow[], sourceType: SourceType): Record<string, ReadinessAiResult> {
  const out: Record<string, ReadinessAiResult> = {};
  if (!rows.length) return out;
  const absoluteUrls = rows.filter(row => /^https?:/i.test(row.url));
  const tlsEvidence = rows.filter(row => /^yes$/i.test(rawCell(row, ["TLS Verified"]))).length;
  const httpsShare = absoluteUrls.length ? absoluteUrls.filter(row => /^https:/i.test(row.url)).length / absoluteUrls.length : 0;
  const html200 = stats.html.filter(row => row.statusCode === 200);
  const canonicalCount = html200.filter(row => !!row.canonical).length;
  const mobileViewportCount = rows.filter(row => /^yes$/i.test(rawCell(row, ["Mobile Viewport"]))).length;
  const analyticsCount = rows.filter(row => /^yes$/i.test(rawCell(row, ["Analytics Detected"]))).length;
  const robotsEvidence = rows.filter(row => !!rawCell(row, ["Robots.txt Status", "Robots.txt", "Robots Status"]));
  const sitemapReferenced = rows.some(row => /^yes$/i.test(rawCell(row, ["Robots Sitemap Reference"])));
  const httpRedirectEvidence = rows.map(row => rawCell(row, ["HTTP Redirects to HTTPS"])).find(Boolean);
  const rawColumnMeasured = (names: string[]) => rows.some(row => Object.keys(row.raw || {}).some(key => names.some(name => key.trim().toLowerCase() === name.toLowerCase())));
  const numericRaw = (row: CrawlRow, names: string[]) => Number(rawCell(row, names).replace(/[^\d.-]/g, "")) || 0;
  const duplicateRows = rows.filter(row => numericRaw(row, ["No. Near Duplicates", "Near Duplicates"]) > 0 || !!rawCell(row, ["Closest Similarity Match"]));
  const missingAltRows = rows.filter(row => numericRaw(row, ["Images Missing Alt Text", "No. Images Missing Alt Text", "Missing Alt Text"]) > 0);
  const structuredValues = rows.map(row => rawCell(row, ["Structured Data Types", "Schema Types", "JSON-LD Types", "Structured Data"])).filter(Boolean);
  const performanceValues = rows.map(row => rawCell(row, ["Performance Score", "Lighthouse Performance", "Core Web Vitals", "LCP"])).filter(Boolean);
  const crawlerEvidence = rows.map(row => rawCell(row, ["AI Crawler Access", "Googlebot Access", "Bingbot Access", "OAI-SearchBot", "GPTBot Access"])).filter(Boolean).join(" ").toLowerCase();
  const citationMeasured = rawColumnMeasured(["Author", "Published Date", "Last Modified", "External Outlinks", "References"]);
  const citationReady = rows.filter(row => rawCell(row, ["Author"]) && rawCell(row, ["Published Date", "Last Modified"])).length;
  const searchDataMeasured = rawColumnMeasured(["GSC Clicks", "GSC Impressions", "Search Console Clicks", "Organic Sessions", "AI Referrals"]);
  const ai = aiVisibilityFor(rows);
  const duplicateTitles = html200.filter((row, index, all) => !!row.title && all.findIndex(other => other.title.trim().toLowerCase() === row.title.trim().toLowerCase()) !== index);
  const duplicateDescriptions = html200.filter((row, index, all) => !!row.description && all.findIndex(other => other.description.trim().toLowerCase() === row.description.trim().toLowerCase()) !== index);
  const deepRows = rows.filter(row => row.depth > 3);
  const orphanRows = rows.filter(row => row.depth > 0 && row.inlinks === 0);
  const messyUrls = rows.filter(row => /[A-Z_]|\?.+=/.test(row.url) || row.url.length > 115);
  const serverErrors = rows.filter(row => row.statusCode >= 500);

  out["crawl-response"] = stats.broken.length === 0
    ? { status: "confirmed", evidence: `All ${rows.length} crawled URLs returned a usable response.` }
    : { status: stats.broken.length / rows.length > .2 ? "blocked" : "warning", evidence: `${stats.broken.length} URL${stats.broken.length === 1 ? " returned" : "s returned"} a broken response and ${stats.broken.length === 1 ? "needs" : "need"} a resolution.` };
  out["crawl-redirects"] = stats.redirects.length === 0
    ? { status: "confirmed", evidence: "No redirecting URLs were found in the crawl inventory." }
    : { status: "warning", evidence: `${stats.redirects.length} redirecting URL${stats.redirects.length === 1 ? " needs" : "s need"} final-destination review.` };
  out["crawl-indexing"] = stats.indexable.length === 0
    ? { status: "blocked", evidence: "No indexable pages were found in the crawl." }
    : { status: stats.indexable.length / rows.length >= .7 ? "confirmed" : "warning", evidence: `${stats.indexable.length} of ${rows.length} URLs are indexable; excluded pages should be confirmed as intentional.` };
  if (robotsEvidence.length) out["crawl-robots"] = robotsEvidence.some(row => /^2\d\d/.test(rawCell(row, ["Robots.txt Status", "Robots Status"])))
    ? { status: "confirmed", evidence: "robots.txt returned a successful response and was checked independently from the sitemap." }
    : { status: "warning", evidence: "robots.txt evidence was present, but its response still needs review." };
  if (sitemapReferenced) out["crawl-sitemap"] = { status: "confirmed", evidence: "robots.txt references the published XML sitemap." };
  else if (sourceType === "Sitemap crawl") out["crawl-sitemap"] = { status: "confirmed", evidence: "The XML sitemap was reachable and supplied the current crawl inventory." };
  out["crawl-canonicals"] = !html200.length || canonicalCount === 0
    ? { status: "blocked", evidence: "No canonical tags were detected on active HTML pages." }
    : { status: canonicalCount === html200.length ? "confirmed" : "warning", evidence: `${canonicalCount} of ${html200.length} active HTML pages declare a canonical URL.` };

  out["onpage-titles"] = stats.missingTitle.length || duplicateTitles.length
    ? { status: "warning", evidence: `${stats.missingTitle.length} missing and ${duplicateTitles.length} duplicate page title${stats.missingTitle.length + duplicateTitles.length === 1 ? "" : "s"} need attention.` }
    : { status: "confirmed", evidence: "Every active HTML page has a distinct page title in this crawl." };
  out["onpage-descriptions"] = stats.missingDescription.length || duplicateDescriptions.length
    ? { status: "warning", evidence: `${stats.missingDescription.length} missing and ${duplicateDescriptions.length} duplicate meta description${stats.missingDescription.length + duplicateDescriptions.length === 1 ? "" : "s"} need attention.` }
    : { status: "confirmed", evidence: "Every active HTML page has a distinct meta description in this crawl." };
  out["onpage-h1"] = stats.missingH1.length
    ? { status: "warning", evidence: `${stats.missingH1.length} active page${stats.missingH1.length === 1 ? "" : "s"} lack a primary H1.` }
    : { status: "confirmed", evidence: "Every active HTML page exposes a primary H1." };
  out["onpage-depth"] = stats.thin.length
    ? { status: "warning", evidence: `${stats.thin.length} page${stats.thin.length === 1 ? "" : "s"} have fewer than 300 words and need intent-level review.` }
    : { status: "confirmed", evidence: "No thin active pages were detected by the crawl threshold." };
  if (rawColumnMeasured(["No. Near Duplicates", "Near Duplicates", "Closest Similarity Match"])) out["onpage-duplicates"] = duplicateRows.length
    ? { status: "warning", evidence: `${duplicateRows.length} duplicate or near-duplicate page${duplicateRows.length === 1 ? " needs" : "s need"} consolidation review.` }
    : { status: "confirmed", evidence: "No duplicate-page evidence was reported by the crawler." };
  if (rawColumnMeasured(["Images Missing Alt Text", "No. Images Missing Alt Text", "Missing Alt Text"])) out["onpage-images"] = missingAltRows.length
    ? { status: "warning", evidence: `${missingAltRows.length} page${missingAltRows.length === 1 ? "" : "s"} contain images missing alt text.` }
    : { status: "confirmed", evidence: "The crawler reported no images missing alt text." };

  out["architecture-depth"] = deepRows.length
    ? { status: "warning", evidence: `${deepRows.length} page${deepRows.length === 1 ? " is" : "s are"} deeper than three clicks.` }
    : { status: "confirmed", evidence: "All crawled pages are within three levels of the homepage." };
  out["architecture-inlinks"] = orphanRows.length
    ? { status: "warning", evidence: `${orphanRows.length} page${orphanRows.length === 1 ? " has" : "s have"} no recorded internal inlinks.` }
    : { status: "confirmed", evidence: "Every non-homepage URL has at least one recorded internal inlink." };
  out["architecture-urls"] = messyUrls.length
    ? { status: "warning", evidence: `${messyUrls.length} URL${messyUrls.length === 1 ? "" : "s"} use avoidable parameters, capitalization, underscores, or excessive length.` }
    : { status: "confirmed", evidence: "Crawled URLs use a readable and consistent format." };
  out["architecture-actions"] = stats.redirects.length || stats.broken.length
    ? { status: "warning", evidence: `${stats.redirects.length + stats.broken.length} moved or broken URL${stats.redirects.length + stats.broken.length === 1 ? "" : "s"} need an approved redirect or cleanup action.` }
    : { status: "confirmed", evidence: "No broken or redirected URLs require a resolution plan." };
  if (duplicateRows.length) out["architecture-keywords"] = { status: "warning", evidence: `${duplicateRows.length} overlapping page${duplicateRows.length === 1 ? " needs" : "s need"} keyword-intent review before consolidation.` };

  if (tlsEvidence === rows.length || (absoluteUrls.length && httpsShare >= .9)) out["technical-https"] = /^no$/i.test(httpRedirectEvidence || "")
    ? { status: "warning", evidence: "Crawled pages use HTTPS, but the HTTP version did not confirm a redirect to HTTPS." }
    : { status: "confirmed", evidence: `${tlsEvidence || absoluteUrls.length} crawled page${(tlsEvidence || absoluteUrls.length) === 1 ? "" : "s"} loaded securely over HTTPS.` };
  if (mobileViewportCount) out["technical-mobile"] = { status: "warning", evidence: `A responsive viewport was detected on ${mobileViewportCount} page${mobileViewportCount === 1 ? "" : "s"}; complete the visual mobile usability review.` };
  if (performanceValues.length) out["technical-performance"] = { status: "warning", evidence: `Performance evidence was imported for ${performanceValues.length} page${performanceValues.length === 1 ? "" : "s"}; review the representative Core Web Vitals results.` };
  if (structuredValues.length) out["technical-structured"] = { status: structuredValues.some(value => /error|invalid|missing/i.test(value)) ? "warning" : "confirmed", evidence: `Structured-data evidence was found on ${structuredValues.length} page${structuredValues.length === 1 ? "" : "s"}.` };
  out["technical-server"] = serverErrors.length
    ? { status: "blocked", evidence: `${serverErrors.length} URL${serverErrors.length === 1 ? "" : "s"} returned a 5xx server error.` }
    : { status: "confirmed", evidence: "No 5xx server responses were found in the crawl." };

  if (crawlerEvidence) out["ai-crawlers"] = /block|deny|disallow/.test(crawlerEvidence)
    ? { status: "warning", evidence: "Crawler evidence indicates at least one search or answer-engine crawler may be blocked." }
    : { status: "confirmed", evidence: "Imported crawler evidence allows search and discovery bots." };
  out["ai-answers"] = ai.answerGaps
    ? { status: "warning", evidence: `${ai.answerGaps} eligible page${ai.answerGaps === 1 ? " lacks" : "s lack"} complete headings, metadata, or sufficient answer context.` }
    : { status: "confirmed", evidence: `${ai.answerReady} eligible page${ai.answerReady === 1 ? " is" : "s are"} answer-ready from the crawl evidence.` };
  if (structuredValues.length) out["ai-entities"] = { status: ai.schemaReady ? "confirmed" : "warning", evidence: `${ai.schemaReady} of ${structuredValues.length} measured page${structuredValues.length === 1 ? "" : "s"} contain usable structured entity signals.` };
  if (citationMeasured) out["ai-citations"] = citationReady
    ? { status: "confirmed", evidence: `${citationReady} page${citationReady === 1 ? " includes" : "s include"} authorship and date evidence.` }
    : { status: "warning", evidence: "Citation fields were measured, but authorship and date signals are incomplete." };
  if (analyticsCount || searchDataMeasured) out["measurement-baseline"] = searchDataMeasured
    ? { status: "confirmed", evidence: "Search-performance or discovery-referral data was included with the audit evidence." }
    : { status: "warning", evidence: `Analytics code was detected on ${analyticsCount} page${analyticsCount === 1 ? "" : "s"}; connect search-performance data for the complete baseline.` };
  return out;
}

function cell(row: Record<string, string>, names: string[]) {
  for (const name of names) {
    const key = Object.keys(row).find(candidate => candidate.trim().toLowerCase() === name.toLowerCase());
    if (key && row[key] != null) return row[key].trim();
  }
  return "";
}

function parseCsv(text: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"' && quoted && text[i + 1] === '"') { current += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(current); current = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(current); current = "";
      if (row.some(value => value.trim())) rows.push(row);
      row = [];
    } else current += char;
  }
  row.push(current);
  if (row.some(value => value.trim())) rows.push(row);
  const headers = rows.shift()?.map(value => value.replace(/^\uFEFF/, "").trim()) || [];
  return rows.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
}

function toCrawlRows(text: string): CrawlRow[] {
  return parseCsv(text).map(row => ({
    url: cell(row, ["Address", "URL", "Page URL", "Current URL"]),
    statusCode: Number(cell(row, ["Status Code", "HTTP Status Code", "Status"])) || 0,
    contentType: cell(row, ["Content Type", "Type"]) || "text/html",
    indexability: cell(row, ["Indexability", "Indexability Status"]) || "Unknown",
    title: cell(row, ["Title 1", "Title", "Meta Title"]),
    description: cell(row, ["Meta Description 1", "Meta Description", "Description"]),
    h1: cell(row, ["H1-1", "H1", "H1 1"]),
    canonical: cell(row, ["Canonical Link Element 1", "Canonical", "Canonical URL"]),
    depth: Number(cell(row, ["Crawl Depth", "Depth"])) || 0,
    inlinks: Number(cell(row, ["Inlinks", "Internal Links"])) || 0,
    words: Number(cell(row, ["Word Count", "Words"])) || 0,
    raw: row,
  })).filter(row => row.url);
}

type PageAction = "Keep" | "Improve" | "No-index" | "Delete" | "Redirect" | "Consolidate";

interface PageDecision {
  action: PageAction;
  target: string;
  reason: string;
  tone: "muted" | "accent" | "success" | "warn" | "danger";
}

function rawCell(row: CrawlRow, names: string[]) {
  return cell(row.raw || {}, names);
}

function keywordPlanFor(rows: CrawlRow[]) {
  return rows.map(row => ({
    keyword: rawCell(row, ["Target Keyword", "Primary Keyword", "Keyword", "Query"]),
    page: row.url,
    rank: Number(rawCell(row, ["Position", "Rank", "Current Position"])) || 0,
    volume: Number(rawCell(row, ["Search Volume", "Volume"])) || 0,
    difficulty: Number(rawCell(row, ["Keyword Difficulty", "Difficulty", "KD"])) || 0,
    intent: rawCell(row, ["Search Intent", "Intent"]) || "Unclassified",
  })).filter(row => row.keyword);
}

function pageMapFor(rows: CrawlRow[]) {
  return rows.map(row => {
    const keyword = rawCell(row, ["Target Keyword", "Primary Keyword", "Keyword", "Query"]);
    const proposed = rawCell(row, ["Proposed URL", "Target URL", "Redirect URL", "Final URL"]) || row.url;
    const status = rawCell(row, ["Page Map Status", "URL Action", "Recommended Action"]) || (proposed !== row.url ? "Move" : "Keep");
    return { current: row.url, keyword, proposed, status };
  }).filter(row => row.keyword || row.proposed !== row.current || row.status !== "Keep");
}

function normalizedLocation(value: string) {
  if (!value) return "";
  try {
    const parsed = new URL(value, "https://audit.local");
    return `${parsed.pathname.replace(/\/$/, "") || "/"}${parsed.search}`.toLowerCase();
  } catch {
    return value.replace(/\/$/, "").toLowerCase();
  }
}

function pageDecisionFor(row: CrawlRow): PageDecision {
  const redirectTarget = rawCell(row, ["Redirect URL", "Redirect Target", "Location"]);
  const closestMatch = rawCell(row, ["Closest Similarity Match", "Closest Similar Page"]);
  const nearDuplicates = Number(rawCell(row, ["No. Near Duplicates", "Near Duplicates"])) || 0;
  const robots = `${rawCell(row, ["Meta Robots 1", "Meta Robots"])} ${rawCell(row, ["X-Robots-Tag 1", "X-Robots-Tag"])}`.toLowerCase();
  const indexabilityStatus = rawCell(row, ["Indexability Status"]).toLowerCase();
  const canonicalDiffers = Boolean(row.canonical) && normalizedLocation(row.canonical) !== normalizedLocation(row.url);

  if (row.statusCode >= 300 && row.statusCode < 400) {
    return { action: "Redirect", target: redirectTarget || row.canonical || "Assign a final 200 destination", reason: `${row.statusCode} response must resolve directly to its final canonical page.`, tone: "warn" };
  }
  if (row.statusCode === 404 || row.statusCode === 410 || row.statusCode === 0) {
    if (redirectTarget || row.canonical || closestMatch) return { action: "Redirect", target: redirectTarget || row.canonical || closestMatch, reason: "Dead URL has a relevant replacement; add a single-hop 301 redirect.", tone: "danger" };
    return { action: "Delete", target: "Remove from sitemap and internal links", reason: "Dead page has no evidenced replacement and should leave the crawl path.", tone: "danger" };
  }
  if (nearDuplicates > 0 || closestMatch || canonicalDiffers) {
    return { action: "Consolidate", target: row.canonical || closestMatch || "Choose the primary version", reason: nearDuplicates > 0 ? `${nearDuplicates} near-duplicate match${nearDuplicates === 1 ? "" : "es"}; merge value and 301 the weaker URL.` : "Canonical or similarity evidence identifies a stronger primary URL.", tone: "warn" };
  }
  if (robots.includes("noindex") || indexabilityStatus.includes("noindex") || row.indexability.toLowerCase().includes("non-indexable")) {
    return { action: "No-index", target: "Keep live; exclude from search index", reason: "This utility or controlled page is intentionally excluded from organic search.", tone: "accent" };
  }
  if (!row.title || !row.description || !row.h1 || (row.words > 0 && row.words < 300)) {
    const gaps = [!row.title && "title", !row.description && "description", !row.h1 && "H1", row.words > 0 && row.words < 300 && "thin copy"].filter(Boolean).join(", ");
    return { action: "Improve", target: "Retain URL and optimize", reason: `Page needs ${gaps || "on-page signal improvements"}.`, tone: "warn" };
  }
  return { action: "Keep", target: "Retain current URL", reason: "Indexable 200 page has the core crawl and on-page signals in place.", tone: "success" };
}

function evidenceFor(row: CrawlRow): Record<string, string> {
  return {
    Address: row.url,
    "Content Type": row.contentType,
    "Status Code": String(row.statusCode || ""),
    Indexability: row.indexability,
    "Title 1": row.title,
    "Meta Description 1": row.description,
    "H1-1": row.h1,
    "Canonical Link Element 1": row.canonical,
    "Crawl Depth": String(row.depth),
    Inlinks: String(row.inlinks),
    "Word Count": String(row.words),
    ...(row.raw || {}),
  };
}

function Panel({ children, style = "" }: { children: ReactNode; style?: string }) {
  return <section style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);" + style)}>{children}</section>;
}

function DataVizDatum({ label, value, lines = [], children, style = "", align = "center" }: { label: string; value: string; lines?: string[]; children?: ReactNode; style?: string; align?: "left" | "center" | "right" }) {
  const [open, setOpen] = useState(false);
  const anchor = align === "left" ? "left:0" : align === "right" ? "right:0" : "left:50%;transform:translateX(-50%)";
  return <span tabIndex={0} title={`${label}: ${value}`} aria-label={`${label}: ${value}`} aria-expanded={open} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onClick={() => setOpen(true)} onKeyDown={event => { if (event.key === "Escape") setOpen(false); }} style={css("position:relative;cursor:help;outline:none;" + style)}>
    {children}
    {open && <span role="tooltip" style={css("position:absolute;top:calc(100% + .42rem);" + anchor + ";z-index:60;width:min(16rem,calc(100vw - 2rem));max-height:16rem;overflow:auto;padding:.62rem .68rem;border:1px solid var(--border);border-radius:.7rem;background:var(--surface);box-shadow:0 12px 28px rgb(55 35 35 / .18);color:var(--fg);text-align:left;white-space:normal") }><span style={css("display:flex;align-items:baseline;justify-content:space-between;gap:.55rem") }><strong style={css("font-size:var(--text-2xs);font-weight:500")}>{label}</strong><span style={css("font-size:var(--text-2xs);color:var(--accent);white-space:nowrap")}>{value}</span></span>{lines.length > 0 && <span style={css("display:flex;flex-direction:column;gap:.28rem;margin-top:.48rem;padding-top:.45rem;border-top:1px solid var(--border-soft)") }>{lines.map((line, index) => <span key={`${line}-${index}`} title={line} style={css("display:block;font-size:var(--text-2xs);line-height:1.35;color:var(--fg-muted);overflow-wrap:anywhere")}>{line}</span>)}</span>}</span>}
  </span>;
}

function Pill({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "accent" | "success" | "warn" | "danger" }) {
  const color = tone === "success" ? "var(--success)" : tone === "warn" ? "var(--warn)" : tone === "danger" ? "var(--danger)" : tone === "accent" ? "var(--accent)" : "var(--fg-muted)";
  return <span style={css("display:inline-flex;align-items:center;gap:.3rem;padding:.2rem .5rem;border-radius:999px;background:color-mix(in srgb," + color + " 10%,var(--surface-alt) 90%);color:" + color + ";font-size:var(--text-2xs);font-weight:500;white-space:nowrap")}>{children}</span>;
}

function seoCardPercent(value: number, total: number) {
  return total ? Math.round(value / total * 100) : 0;
}

function seoCardColor(score: number) {
  return score < 55 ? "var(--danger)" : score < 75 ? "var(--warn)" : "var(--success)";
}

function seoAuditCardScore(stats: SeoStats, rows: CrawlRow[]) {
  const htmlTotal = stats.html.length;
  const categories: CatBar[] = [
    { label: "Index Coverage", score: seoCardPercent(stats.indexable.length, htmlTotal), target: 90 },
    { label: "Response Health", score: seoCardPercent(stats.active.length, rows.length), target: 100 },
    { label: "Title Coverage", score: seoCardPercent(htmlTotal - stats.missingTitle.length, htmlTotal), target: 100 },
    { label: "Description Coverage", score: seoCardPercent(htmlTotal - stats.missingDescription.length, htmlTotal), target: 100 },
    { label: "Heading Coverage", score: seoCardPercent(htmlTotal - stats.missingH1.length, htmlTotal), target: 100 },
    { label: "Content Depth", score: seoCardPercent(htmlTotal - stats.thin.length, htmlTotal), target: 90 },
  ].map(category => ({ ...category, color: seoCardColor(category.score) }));
  const projected = Math.max(90, stats.health);
  return {
    summary: { overall: stats.health, projected, uplift: projected - stats.health, cats: categories },
    categories,
  };
}

export function SeoAuditWorkspace({ state, actions }: { state: PortalState; actions: PortalActions }) {
  return <SeoWorkspace state={state} actions={actions}/>;
}

function SeoWorkspace({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const [selectedClient, setSelectedClient] = useState<StudioClient | null>(null);
  const [activeSection, setActiveSection] = useState<SeoSection>("sources");
  const [sourceType, setSourceType] = useState<SourceType>("CSV upload");
  const [sourceName, setSourceName] = useState("");
  const [rows, setRows] = useState<CrawlRow[]>([]);
  const [importedAt, setImportedAt] = useState("");
  const [query, setQuery] = useState("");
  const [dragging, setDragging] = useState(false);
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [sitemapError, setSitemapError] = useState("");
  const [sitemapLoading, setSitemapLoading] = useState(false);
  const [processingType, setProcessingType] = useState<SourceType | null>(null);
  const [processingTick, setProcessingTick] = useState(0);
  const [readiness, setReadiness] = useState<Record<string, SeoReadinessStatus>>({});
  const [savedProjects, setSavedProjects] = useState<Record<string, SavedSeoProject>>({});
  const [resetClient, setResetClient] = useState<StudioClient | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const { clients: availableClients } = usePortalStudioClients();
  const persistedClients = useMemo(() => {
    const availableIds = new Set(availableClients.map(client => client.id));
    return portalWorkspaceClientRefs(state.clientWorkspaces)
      .filter(client => !availableIds.has(client.id) && !!state.clientWorkspaces[client.id]?.engineWork.seoAudit)
      .map(client => ({
        ...UNASSIGNED_WORK_CLIENT,
        id: client.id,
        name: client.name,
        lead: {
          ...UNASSIGNED_WORK_CLIENT.lead,
          businessName: client.name,
        },
        audit: {
          ...UNASSIGNED_WORK_CLIENT.audit,
          id: `audit-${client.id}`,
        },
      }));
  }, [availableClients, state.clientWorkspaces]);
  const auditClients = useMemo(() => [...availableClients, ...persistedClients], [availableClients, persistedClients]);
  const durableSeoRuns = useDurableCheckupRuns("seo", state.role, state.clientName);
  const workingClients = useMemo(() => clientsForEngineWork(state.role, auditClients), [auditClients, state.role]);
  const persistSeoProject = (clientId: string, project: SavedSeoProject) => {
    window.localStorage.setItem(`baltazar:seo-project:${clientId}`, JSON.stringify(project));
    actions.update(current => {
      const existing = current.clientWorkspaces[clientId]?.engineWork.seoAudit;
      const clientName = workingClients.find(client => client.id === clientId)?.name || clientId;
      return {
        clientWorkspaces: saveEngineWork(current.clientWorkspaces, clientId, "seoAudit", {
          status: project.rows.length ? "ready" : "intake",
          progress: project.rows.length ? 67 : 0,
          updatedAt: project.importedAt || new Date().toISOString(),
          processRun: syncPortalProcessRun(existing?.processRun, {
            processId: "seo-audit",
            runId: `seo-audit-${clientId}`,
            clientId,
            clientName,
            currentStageId: project.rows.length ? "audit" : "crawl",
            approvedStageIds: project.rows.length ? ["crawl"] : [],
            updatedAt: project.importedAt || new Date().toISOString(),
          }),
          payload: { project },
        }),
      };
    });
  };
  const goToSection = (nextSection: SeoSection) => {
    setActiveSection(nextSection);
    if (!selectedClient) return;
    const project = savedProjects[selectedClient.id]
      || (state.clientWorkspaces[selectedClient.id]?.engineWork.seoAudit?.payload as { project?: SavedSeoProject } | undefined)?.project;
    if (!project?.rows.length) return;
    const stage = CLIENT_AUDIT_STAGES.find(item => item.sections.includes(nextSection)) || CLIENT_AUDIT_STAGES[0];
    const stageIndex = Math.max(0, CLIENT_AUDIT_STAGES.findIndex(item => item.id === stage.id));
    actions.update(current => {
      const existing = current.clientWorkspaces[selectedClient.id]?.engineWork.seoAudit;
      return {
        clientWorkspaces: saveEngineWork(current.clientWorkspaces, selectedClient.id, "seoAudit", {
          ...existing,
          status: stage.id === "plan" ? "in_progress" : "ready",
          progress: stage.id === "crawl" ? 33 : stage.id === "report" ? 67 : 92,
          updatedAt: new Date().toISOString(),
          processRun: syncPortalProcessRun(existing?.processRun, {
            processId: "seo-audit",
            runId: existing?.processRun?.id || `seo-audit-${selectedClient.id}`,
            clientId: selectedClient.id,
            clientName: selectedClient.name,
            currentStageId: stage.id,
            approvedStageIds: CLIENT_AUDIT_STAGES.slice(0, stageIndex).map(item => item.id),
            updatedAt: new Date().toISOString(),
          }),
          payload: { project },
        }),
      };
    });
  };
  const completeSeoAudit = () => {
    if (!selectedClient) return;
    const project = savedProjects[selectedClient.id]
      || (state.clientWorkspaces[selectedClient.id]?.engineWork.seoAudit?.payload as { project?: SavedSeoProject } | undefined)?.project;
    if (!project?.rows.length) return;
    const updatedAt = new Date().toISOString();
    actions.update(current => {
      const existing = current.clientWorkspaces[selectedClient.id]?.engineWork.seoAudit;
      return {
        clientWorkspaces: saveEngineWork(current.clientWorkspaces, selectedClient.id, "seoAudit", {
          ...existing,
          status: "complete",
          progress: 100,
          updatedAt,
          processRun: syncPortalProcessRun(existing?.processRun, {
            processId: "seo-audit",
            runId: existing?.processRun?.id || `seo-audit-${selectedClient.id}`,
            clientId: selectedClient.id,
            clientName: selectedClient.name,
            currentStageId: "plan",
            approvedStageIds: CLIENT_AUDIT_STAGES.map(item => item.id),
            complete: true,
            updatedAt,
          }),
          payload: { project },
        }),
      };
    });
    actions.showToast(`${selectedClient.name} SEO checkup marked complete`);
  };

  useEffect(() => {
    if (!processingType) return;
    setProcessingTick(0);
    const interval = window.setInterval(() => setProcessingTick(tick => tick + 1), 300);
    return () => window.clearInterval(interval);
  }, [processingType]);

  useEffect(() => {
    if (selectedClient && !workingClients.some(client => client.id === selectedClient.id)) setSelectedClient(null);
  }, [selectedClient, workingClients]);

  useEffect(() => {
    const projects: Record<string, SavedSeoProject> = {};
    workingClients.forEach(client => {
      try {
        const persistedPayload = state.clientWorkspaces[client.id]?.engineWork.seoAudit?.payload as { project?: SavedSeoProject } | undefined;
        const localPayload = window.localStorage.getItem(`baltazar:seo-project:${client.id}`);
        const project = persistedPayload?.project || (localPayload ? JSON.parse(localPayload) as SavedSeoProject : undefined);
        if (project) {
          if (project.sourceName === "blue-ribbon_crawl.csv") {
            window.localStorage.removeItem(`baltazar:seo-project:${client.id}`);
            return;
          }
          projects[client.id] = { ...project, sourceType: normalizeSourceType(project.sourceType as string) };
        }
      } catch { /* skip invalid legacy summaries */ }
    });
    setSavedProjects(projects);
  }, [selectedClient, state.clientWorkspaces, workingClients]);

  useEffect(() => {
    if (selectedClient) return;
    const storageKey = "baltazar:audit-active:seo";
    const clientId = window.localStorage.getItem(storageKey);
    const client = workingClients.find(item => item.id === clientId) || (state.role === "client" ? availableClients[0] : undefined);
    if (client) setSelectedClient(client);
    if (clientId) window.localStorage.removeItem(storageKey);
  }, [availableClients, selectedClient, state.role, workingClients]);

  useEffect(() => {
    if (!selectedClient) return;
    try {
      const persistedPayload = state.clientWorkspaces[selectedClient.id]?.engineWork.seoAudit?.payload as { project?: SavedSeoProject } | undefined;
      const localPayload = window.localStorage.getItem(`baltazar:seo-project:${selectedClient.id}`);
      const project = persistedPayload?.project || (localPayload ? JSON.parse(localPayload) as SavedSeoProject : undefined);
      if (!project) { setRows([]); setSourceName(""); setImportedAt(""); setReadiness({}); setActiveSection("sources"); return; }
      if (project.sourceName === "blue-ribbon_crawl.csv") {
        window.localStorage.removeItem(`baltazar:seo-project:${selectedClient.id}`);
        setRows([]); setSourceName(""); setImportedAt(""); setReadiness({}); setActiveSection("sources");
        return;
      }
      setRows(project.rows || []);
      setSourceType(normalizeSourceType(project.sourceType as string));
      setSourceName(project.sourceName || "");
      setImportedAt(project.importedAt || "");
      setReadiness(project.readiness || {});
      setActiveSection(project.rows?.length ? "overview" : "sources");
    } catch { setRows([]); setReadiness({}); setActiveSection("sources"); }
  }, [selectedClient, state.clientWorkspaces]);

  const persist = (nextRows: CrawlRow[], nextSourceName: string, nextSourceType = sourceType) => {
    if (!selectedClient) return;
    const nextImportedAt = new Date().toISOString();
    setRows(nextRows); setSourceName(nextSourceName); setImportedAt(nextImportedAt); setSourceType(nextSourceType); setReadiness({});
    const project = { rows: nextRows, sourceType: nextSourceType, sourceName: nextSourceName, importedAt: nextImportedAt, readiness: {} } satisfies SavedSeoProject;
    persistSeoProject(selectedClient.id, project);
    setSavedProjects(current => ({ ...current, [selectedClient.id]: project }));
  };

  const updateReadiness = (itemId: string, status: SeoReadinessStatus) => {
    if (!selectedClient) return;
    const next = { ...readiness };
    if (next[itemId] === status) delete next[itemId];
    else next[itemId] = status;
    const persistedPayload = state.clientWorkspaces[selectedClient.id]?.engineWork.seoAudit?.payload as { project?: SavedSeoProject } | undefined;
    let existing = persistedPayload?.project;
    if (!existing) {
      try {
        const saved = window.localStorage.getItem(`baltazar:seo-project:${selectedClient.id}`);
        if (saved) existing = JSON.parse(saved) as SavedSeoProject;
      } catch { /* rebuild from the current project state */ }
    }
    const project: SavedSeoProject = {
      rows: existing?.rows || rows,
      sourceType: normalizeSourceType(existing?.sourceType as string) || sourceType,
      sourceName: existing?.sourceName || sourceName,
      importedAt: existing?.importedAt || importedAt || new Date().toISOString(),
      readiness: next,
    };
    setReadiness(next);
    persistSeoProject(selectedClient.id, project);
    setSavedProjects(projects => ({ ...projects, [selectedClient.id]: project }));
  };

  const importFile = async (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) { actions.showToast("Export the crawl as CSV, then upload it here"); return; }
    const startedAt = Date.now();
    setProcessingType("CSV upload");
    try {
      const parsed = toCrawlRows(await file.text());
      if (!parsed.length) { actions.showToast("No URL rows were found in that CSV"); return; }
      await new Promise(resolve => window.setTimeout(resolve, Math.max(0, 3200 - (Date.now() - startedAt))));
      persist(parsed, file.name, "CSV upload");
      setActiveSection("overview");
      actions.showToast(`${parsed.length} crawl rows imported from ${file.name}`);
    } catch { actions.showToast("That crawl export could not be read"); }
    finally { setProcessingType(null); }
  };

  const crawlSitemap = async () => {
    if (!sitemapUrl.trim()) { setSitemapError("Enter the website URL first."); return; }
    const startedAt = Date.now();
    setSitemapLoading(true);
    setProcessingType("Sitemap crawl");
    setSitemapError("");
    try {
      const response = await fetch("/api/seo/sitemap", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: sitemapUrl }) });
      const result = await response.json() as { error?: string; sitemapUrl?: string; rows?: CrawlRow[]; discovered?: number };
      if (!response.ok || !result.rows?.length) throw new Error(result.error || "The sitemap did not contain any crawlable pages.");
      await new Promise(resolve => window.setTimeout(resolve, Math.max(0, 3200 - (Date.now() - startedAt))));
      persist(result.rows, result.sitemapUrl || sitemapUrl, "Sitemap crawl");
      setActiveSection("overview");
      actions.showToast(`${result.discovered || result.rows.length} sitemap URLs crawled`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "The sitemap crawl could not be completed.";
      setSitemapError(message);
      actions.showToast(message);
    } finally { setSitemapLoading(false); setProcessingType(null); }
  };

  const stats = useMemo(() => seoStatsFor(rows), [rows]);
  const readinessAiMap = useMemo(() => readinessAi(stats, rows, sourceType), [stats, rows, sourceType]);
  const readinessStatusFor = (id: string): SeoReadinessStatus | undefined => readiness[id] ?? readinessAiMap[id]?.status;
  const readinessReviewed = SEO_READINESS_ITEMS.filter(item => readinessStatusFor(item.id)).length;
  const readinessBlocked = SEO_READINESS_ITEMS.filter(item => readinessStatusFor(item.id) === "blocked").length;
  const readinessReady = readinessReviewed === SEO_READINESS_ITEMS.length && readinessBlocked === 0;

  const filteredRows = useMemo(() => rows.filter(row => !query || `${row.url} ${row.title}`.toLowerCase().includes(query.toLowerCase())), [query, rows]);
  const openClient = (client: StudioClient) => { setSelectedClient(client); };
  const confirmStartOver = (client: StudioClient) => {
    window.localStorage.removeItem(`baltazar:seo-project:${client.id}`);
    actions.update(current => ({
      clientWorkspaces: saveEngineWork(current.clientWorkspaces, client.id, "seoAudit", null),
    }));
    setSavedProjects(current => {
      const next = { ...current };
      delete next[client.id];
      return next;
    });
    if (selectedClient?.id === client.id) {
      setRows([]);
      setSourceType("CSV upload");
      setSourceName("");
      setImportedAt("");
      setQuery("");
      setDragging(false);
      setSitemapUrl("");
      setSitemapError("");
      setSitemapLoading(false);
      setProcessingType(null);
      setReadiness({});
      setActiveSection("sources");
      setSelectedClient(null);
    }
    setResetClient(null);
    actions.showToast(`${client.name} SEO audit deleted`);
  };
  const startSeoAudit = () => {
    const target = startClientForEngine(state.role, availableClients);
    if (target) openClient(target);
  };
  // Keep the same client-facing three-stage journey used by Brand and Website.
  // The SEO-specific evidence views remain available as tabs inside each stage.
  const stages = CLIENT_AUDIT_STAGES;
  const createdCount = workingClients.filter(client => savedProjects[client.id]?.rows?.length).length;
  const cards = useMemo(() => workingClients.filter(client => savedProjects[client.id]?.rows?.length).map(client => {
    const project = savedProjects[client.id];
    const projectRows = project?.rows || [];
    const cardStats = seoStatsFor(projectRows);
    const scored = projectRows.length > 0;
    const complete = state.clientWorkspaces[client.id]?.engineWork.seoAudit?.status === "complete";
    const cardScore = seoAuditCardScore(cardStats, projectRows);
    return {
      id: `seo-${client.id}`,
      name: client.name,
      subtitle: "",
      statusLabel: complete ? "Completed" : scored ? "In review" : "Not started",
      statusTone: scored ? "success" as const : "muted" as const,
      stage: complete ? "Action plan ready" : scored ? "Audit report" : "Audit intake",
      progress: complete ? 100 : scored ? 67 : 0,
      owner: client.owner,
      due: scored ? "Updated " + new Date(project.importedAt).toLocaleDateString() : "—",
      headerAction: scored ? { label: `Refresh SEO crawl for ${client.name}`, icon: "replay", onClick: () => openClient(client) } : undefined,
      showStatus: true,
      showProgress: false,
      showStage: false,
      showMeta: false,
      hero: <>
        <AuditCardScoreSkeleton summary={cardScore.summary} scored={scored} cats={cardScore.categories} />
      </>,
      primaryLabel: "Open audit",
      onPrimary: () => openClient(client),
      secondaryLabel: "Start over",
      secondaryIcon: "replay",
      onSecondary: () => setResetClient(client),
    };
  }), [savedProjects, state.clientWorkspaces, workingClients]);
  const durableSeoNames = new Set(durableSeoRuns.map(run => run.clientName.trim().toLowerCase()));
  const visibleCards = [
    ...cards.filter(card => !durableSeoNames.has(card.name.trim().toLowerCase())),
    ...durableSeoRuns.map(durableCheckupCard),
  ];

  if (!selectedClient) {
    return <div style={css("width:100%;padding:" + (state.isMobile ? "1rem .9rem 1.5rem" : "1.6rem 2rem 2.4rem"))}>
      <GuidedIntakeSelector
        eyebrow="SEO Audit"
        eyebrowColor="var(--accent)"
        title="Start or continue an SEO audit"
        description="Add a crawl or sitemap. See the issues and what to fix first."
        controlsBelow
        controls={<EngineIndexControls
          metrics={[]}
          action={{ label: "Start checkup", onClick: startSeoAudit, disabled: state.role === "client" && !availableClients.length }}
        />}
        overview={<EngineIndexOverview
          metrics={[{ label: `${createdCount + durableSeoRuns.length} created`, tone: "accent" }]}
        />}
        countLabel="audit"
        cards={visibleCards}
      />
      <StartOverDialog
        open={!!resetClient}
        auditLabel="SEO audit"
        subject={resetClient?.name || "this website"}
        detail="crawl, source inventory, readiness decisions, and report"
        onCancel={() => setResetClient(null)}
        onConfirm={() => { if (resetClient) confirmStartOver(resetClient); }}
      />
    </div>;
  }


  const activeStage = stages.find(stage => stage.sections.includes(activeSection)) || stages[0];
  const activeStageIndex = stages.findIndex(stage => stage.id === activeStage.id);
  const seoWork = state.clientWorkspaces[selectedClient.id]?.engineWork.seoAudit;
  const completedStages = seoWork?.status === "complete"
    ? stages.length
    : !rows.length
      ? 0
      : Math.max(1, activeStageIndex);
  const clientReport = state.role === "client";
  const approvedStageIds = state.clientWorkspaces[selectedClient.id]?.engineWork.seoAudit?.processRun?.stages.filter(stage => stage.status === "complete").map(stage => stage.stageId) || [];
  const activeAccess = processStageAccess(state, "seo-audit", activeStage.id, approvedStageIds.includes(activeStage.id));
  const restrictedStage = activeAccess === "locked" || activeAccess === "hidden";
  const activeStageSections = clientReport && activeStage.id === "report" ? (["audit-report"] as SeoSection[]) : activeStage.sections;
  const displaySection: SeoSection = clientReport && activeStage.id === "report" ? "audit-report" : activeSection;
  return <div style={css("width:100%;padding:" + (state.isMobile ? "1rem .9rem 1.5rem" : "1.4rem 1.5rem"))}>
    <div style={css("width:100%;max-width:60rem;margin:0 auto;display:flex;flex-direction:column;gap:.85rem;box-sizing:border-box") }>
      {state.role !== "client" && <div style={css("display:flex;justify-content:flex-end") }><button type="button" onClick={() => setResetClient(selectedClient)} className="pt-softbtn" style={css("display:inline-flex;align-items:center;gap:.35rem;border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);padding:.4rem .8rem;font-size:var(--text-2xs);font-weight:500;cursor:pointer")}><Icon name="replay" size={13}/>Start over</button></div>}
      <div style={css(state.isMobile ? "display:flex;flex-direction:column;gap:.85rem" : "display:grid;grid-template-columns:17rem minmax(0,1fr);gap:.85rem;align-items:start") }>
      <aside style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden" + (state.isMobile ? "" : ";position:sticky;top:.5rem")) }>
        <div style={css("padding:.9rem 1rem;border-bottom:1px solid var(--border-soft)") }><div style={css("display:flex;align-items:center;gap:.55rem") }><span style={css("width:2rem;height:2rem;border-radius:.65rem;background:var(--accent);color:#fff;display:grid;place-items:center;flex-shrink:0") }><Icon name="layers" size={16}/></span><div style={{ minWidth: 0 }}><div style={css("font-size:var(--text-md);font-weight:500;line-height:1.15")}>SEO visibility</div><div style={css("font-size:var(--text-sm);color:var(--fg-muted);margin-top:.12rem")}>{selectedClient.name} · {stages.length}-stage workflow</div></div></div></div>
        <nav aria-label="SEO project sections" style={css("padding:.35rem 0") }>
          {stages.map((stage, index) => {
            const active = activeStage.id === stage.id;
            const stageAccess = processStageAccess(state, "seo-audit", stage.id, approvedStageIds.includes(stage.id));
            const disabled = (!rows.length && stage.id !== "crawl") || stageAccess === "locked" || stageAccess === "hidden";
            const done = rows.length > 0 && index < completedStages;
            const dot = done || active
              ? "background:var(--success);border:1.5px solid var(--success);color:#fff"
              : disabled
                ? "background:var(--surface);border:1.5px dashed var(--border);color:var(--fg-faint)"
                : "background:var(--surface);border:1.5px solid var(--border);color:var(--fg-muted)";
            const stageLabel = stageAccess === "hidden" ? "Studio review" : stage.label;
            const destination = clientReport && stage.id === "report" ? "audit-report" : stage.sections[0];
            return <button key={stage.id} type="button" disabled={disabled} onClick={() => goToSection(destination)} style={css("width:calc(100% - 1rem);margin:0 .5rem;display:flex;align-items:center;gap:.65rem;min-height:2.35rem;padding:.3rem .6rem;border:none;border-radius:999px;text-align:left;cursor:" + (disabled ? "default" : "pointer") + ";background:" + (active ? "color-mix(in srgb,var(--success) 9%,white 91%)" : "transparent") + ";opacity:" + (disabled ? ".58" : "1"))}><span style={css("width:1.2rem;height:1.2rem;border-radius:50%;display:grid;place-items:center;flex-shrink:0;font-size:var(--text-2xs);font-weight:500;" + dot)}>{done ? <Icon name="checkmark" size={9}/> : index + 1}</span><span style={css("min-width:0;font-size:var(--text-base);font-weight:" + (active || done ? "500" : "400") + ";color:" + (active ? "var(--success)" : disabled ? "var(--fg-muted)" : "var(--fg)") + ";white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2")}>{stageLabel}</span></button>;
          })}
        </nav>
        <div style={css("padding:.75rem 1rem .85rem;border-top:1px solid var(--border-soft)") }><div style={css("display:flex;align-items:center;justify-content:space-between;gap:.65rem;margin-bottom:.5rem") }><span style={css("font-size:var(--text-xs);font-weight:500;color:" + (completedStages ? "var(--success)" : "var(--fg-muted)"))}>{completedStages} of {stages.length} ready</span><span style={css("font-size:var(--text-2xs);color:var(--fg-faint)")}>{Math.round(completedStages / stages.length * 100)}%</span></div><div style={css("height:4px;border-radius:999px;background:var(--bg);overflow:hidden") }><div style={css("height:100%;border-radius:999px;background:var(--success);width:" + Math.max(completedStages / stages.length * 100, 2) + "%")}/></div></div>
      </aside>

      <main style={css("min-width:0;flex:1;display:flex;flex-direction:column;gap:.85rem") }>
        <WorkspaceHeader section={displaySection} client={selectedClient} mobile={state.isMobile} />
        {restrictedStage ? <Panel style="padding:1.2rem"><div role="note" style={css("display:flex;flex-direction:column;align-items:flex-start;gap:.65rem") }><span style={css("width:2.2rem;height:2.2rem;border-radius:.75rem;background:var(--surface-alt);color:var(--fg-muted);display:grid;place-items:center") }><Icon name="lock" size={15}/></span><div><h2 style={css("margin:0;font-size:var(--text-lg);font-weight:500")}>This stage is handled by the studio</h2><p style={css("margin:.3rem 0 0;max-width:32rem;font-size:var(--text-2xs);line-height:1.5;color:var(--fg-muted)")}>You will see the reviewed output here after it is approved. Feedback and approval requests stay in Approvals.</p></div><button type="button" onClick={() => actions.setView("review")} className="pt-softbtn" style={css("min-height:2.2rem;padding:0 .85rem;border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg);font-size:var(--text-2xs);font-weight:500;cursor:pointer")}>Open Approvals</button></div></Panel> : <>
        {activeStageSections.length > 1 && <div role="tablist" aria-label={`${activeStage.label} views`} style={css("display:flex;align-items:center;gap:.35rem;flex-wrap:wrap;padding:.35rem;border:1px solid var(--border-soft);border-radius:var(--radius-pill);background:var(--surface);align-self:flex-start") }>{activeStageSections.map(sectionId => { const section = SECTIONS.find(item => item.id === sectionId)!; const selected = activeSection === sectionId; return <button key={sectionId} type="button" role="tab" aria-selected={selected} onClick={() => goToSection(sectionId)} style={css("height:1.9rem;padding:0 .72rem;border:none;border-radius:999px;background:" + (selected ? "var(--accent-soft)" : "transparent") + ";color:" + (selected ? "var(--accent)" : "var(--fg-muted)") + ";font-size:var(--text-2xs);font-weight:" + (selected ? "500" : "400") + ";cursor:pointer;display:inline-flex;align-items:center;gap:.35rem") }><Icon name={section.icon} size={12}/>{section.label}</button>; })}</div>}
        {(displaySection === "sources" || displaySection === "inventory") && (processingType ? <Panel style="padding:2.4rem 1.5rem"><GuidedLoadingState accent="var(--accent)" heading={processingType === "Sitemap crawl" ? "Crawling the site" : "Reading the SEO crawl"} description="Building the findings and action plan." steps={SEO_ANALYSIS_STEPS} tick={processingTick} finalMessages={SEO_ANALYSIS_FINAL_MESSAGES} estimatedDuration="About 1–2 minutes"/></Panel> : <div style={css("display:flex;flex-direction:column;gap:.85rem") }><SourcesView sourceType={sourceType} sourceName={sourceName} rows={rows} importedAt={importedAt} dragging={dragging} sitemapUrl={sitemapUrl} sitemapError={sitemapError} sitemapLoading={sitemapLoading} onSitemapUrl={value => { setSitemapUrl(value); setSitemapError(""); }} onSitemap={() => void crawlSitemap()} onSource={value => { setSourceType(value); setSitemapError(""); }} onBrowse={() => fileInput.current?.click()} onDrop={event => { event.preventDefault(); setDragging(false); void importFile(event.dataTransfer.files[0]); }} onDrag={setDragging} onContinue={() => goToSection("overview")} /><InventoryView rows={filteredRows} allRows={rows} query={query} onQuery={setQuery} /></div>)}
        {displaySection === "overview" && <OverviewView rows={rows} stats={stats} onGo={goToSection} mobile={state.isMobile} readiness={readiness} ai={readinessAiMap} />}
        {displaySection === "audit-report" && <AuditReportView client={selectedClient} rows={rows} stats={stats} clientView={clientReport} mobile={state.isMobile} state={state} actions={actions} onContinue={() => {
          goToSection("roadmap");
          actions.showToast(`SEO action plan ready for ${selectedClient.name}`);
        }}/>}
        {displaySection === "keywords" && <KeywordPagePlanView rows={rows} mobile={state.isMobile} />}
        {displaySection === "metadata" && <MetadataView rows={rows} />}
        {displaySection === "architecture" && <ArchitectureView rows={rows} />}
        {displaySection === "roadmap" && <RoadmapView actions={actions} client={selectedClient} rows={rows} mobile={state.isMobile} complete={seoWork?.status === "complete"} onComplete={completeSeoAudit} />}
        </>}
      </main>
    </div>
    <input ref={fileInput} type="file" accept=".csv,text/csv" hidden onChange={event => { void importFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />
    </div>
    <StartOverDialog
      open={!!resetClient}
      auditLabel="SEO audit"
      subject={resetClient?.name || selectedClient.name}
      detail="crawl, source inventory, readiness decisions, and report"
      onCancel={() => setResetClient(null)}
      onConfirm={() => { if (resetClient) confirmStartOver(resetClient); }}
    />
  </div>;
}

function WorkspaceHeader({ section, client, mobile }: { section: SeoSection; client: StudioClient; mobile: boolean }) {
  const labels: Record<SeoSection, [string, string]> = {
    sources: ["Data sources & site inventory", "Import or crawl the site, then review every discovered page in the same view."], overview: ["Audit findings", "Technical health, crawl composition, and the prioritized issues in one view."], inventory: ["Data sources & site inventory", "Import or crawl the site, then review every discovered page in the same view."], issues: ["SEO issues", "Prioritize what blocks crawling, indexing, relevance, and performance."], readiness: ["Pre-reoptimization readiness", "Confirm access, platform health, SEO controls, and measurement before the findings move into planning."], "audit-report": ["Your SEO audit report", "See what is working, what needs attention, and what we recommend doing next."], keywords: ["Keyword & page plan", "Connect search demand to the right page, destination, and next decision in one view."], metadata: ["Metadata plan", "Review the current state and prepare landing-page-ready metadata."], architecture: ["Proposed information architecture", "Turn the audit into a clearer, search-led site structure."], roadmap: ["Complete SEO plan", "See every page, keyword, metadata change, architecture decision, and task in one visual delivery plan."],
  };
  return <Panel style="padding:var(--space-4)"><div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-4);flex-wrap:wrap") }><div><span style={css("display:block;text-transform:uppercase;letter-spacing:.04em;font-size:var(--text-label);color:var(--accent);margin-bottom:.3rem")}>{client.name} · SEO · AIO · GEO</span><h1 style={css("margin:0;font-size:" + (mobile ? "1.08rem" : "1.2rem") + ";font-weight:500;line-height:1.2")}>{labels[section][0]}</h1><p style={css("margin:.35rem 0 0;color:var(--fg-muted);font-size:var(--text-xs);line-height:1.5;max-width:34rem")}>{labels[section][1]}</p></div></div></Panel>;
}

interface SourcesViewProps {
  sourceType: SourceType;
  sourceName: string;
  rows: CrawlRow[];
  importedAt: string;
  dragging: boolean;
  sitemapUrl: string;
  sitemapError: string;
  sitemapLoading: boolean;
  onSitemapUrl: (value: string) => void;
  onSitemap: () => void;
  onSource: (source: SourceType) => void;
  onBrowse: () => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onDrag: (value: boolean) => void;
  onContinue: () => void;
}

function SourcesView({ sourceType, sourceName, rows, importedAt, dragging, sitemapUrl, sitemapError, sitemapLoading, onSitemapUrl, onSitemap, onSource, onBrowse, onDrop, onDrag, onContinue }: SourcesViewProps) {
  const sources: Array<{ id: SourceType; sub: string; icon: string }> = [
    { id: "CSV upload", sub: "Complete crawler export (.csv)", icon: "file" },
    { id: "Sitemap crawl", sub: "Live sitemap.xml crawl", icon: "link" },
  ];
  const [chosen, setChosen] = useState(rows.length > 0);
  const imported = rows.length > 0;
  const step1Done = chosen || imported;
  const step2Locked = !step1Done;
  const step1Status: "done" | "active" = step1Done ? "done" : "active";
  const step2Status: "done" | "active" | "locked" = step2Locked ? "locked" : imported ? "done" : "active";
  const step3Status: "done" | "active" | "locked" = imported ? "active" : "locked";
  const blurLocked = "filter:blur(3px);opacity:.5;pointer-events:none;user-select:none";
  return <div style={css("display:flex;flex-direction:column;gap:.85rem") }>
    <Panel style="padding:var(--space-4)">
      <StepHead n={1} status={step1Status} title="Choose a source" sub="Upload a crawl or use the live sitemap." right={step1Done ? undefined : <Pill tone="accent">Start here</Pill>} />
      <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(10.5rem,1fr));gap:.55rem;margin-top:.85rem") }>{sources.map(source => { const active = chosen && sourceType === source.id; return <button key={source.id} type="button" onClick={() => { onSource(source.id); setChosen(true); }} style={css("padding:var(--space-3);border:1px solid " + (active ? "var(--accent)" : "var(--border-soft)") + ";border-radius:.8rem;background:" + (active ? "var(--accent-soft)" : "var(--surface-alt)") + ";text-align:left;cursor:pointer;color:var(--fg)") }><div style={css("display:flex;align-items:center;justify-content:space-between;gap:var(--space-2)") }><span style={css("display:flex;align-items:center;gap:.42rem;font-size:var(--text-2xs);font-weight:500") }><Icon name={source.icon} size={13}/>{source.id}</span>{active && <Icon name="checkmark" size={14}/>}</div><span style={css("display:block;margin-top:.28rem;font-size:var(--text-2xs);color:var(--fg-faint)")}>{source.sub}</span></button>; })}</div>
    </Panel>

    <Panel style="padding:var(--space-4)">
      <StepHead n={2} status={step2Status} title={sourceType === "Sitemap crawl" ? "Crawl the live sitemap" : "Import the CSV"} sub={sourceType === "Sitemap crawl" ? "Point us at the domain — we find and crawl the sitemap." : "Drop in the crawler export; every column is retained."} right={imported ? <Pill tone="success">Imported</Pill> : step2Locked ? <Pill tone="muted"><Icon name="lock" size={11}/>Locked</Pill> : undefined} />
      {step2Locked && <div style={css("display:flex;align-items:center;gap:.4rem;margin-top:.7rem;font-size:var(--text-2xs);color:var(--fg-faint);line-height:1.5")}><Icon name="lock" size={12}/>Choose a source in step 1 to unlock the import.</div>}
      <div style={css(step2Locked ? blurLocked : "")}>
      {sourceType === "Sitemap crawl" ? <div style={css("margin-top:.85rem") }>
        <label htmlFor="seo-sitemap-url" style={css("display:block;font-size:var(--text-2xs);font-weight:500;margin-bottom:.5rem")}>Website or sitemap URL</label>
        <div style={css("display:flex;gap:.45rem;align-items:center") }>
          <span style={css("position:relative;flex:1;min-width:0;display:flex;align-items:center") }>
            <span aria-hidden="true" style={css("position:absolute;left:.75rem;display:inline-flex;color:var(--fg-faint);pointer-events:none") }><Icon name="link" size={14}/></span>
            <input id="seo-sitemap-url" type="url" value={sitemapUrl} onChange={event => onSitemapUrl(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !sitemapLoading) onSitemap(); }} placeholder="https://example.com" aria-invalid={Boolean(sitemapError)} style={css("height:2.35rem;width:100%;min-width:0;border:1px solid " + (sitemapError ? "var(--danger)" : "var(--border)") + ";border-radius:999px;background:var(--surface);padding:0 .78rem 0 2rem;outline:none;color:var(--fg);font-size:var(--text-2xs)")}/>
          </span>
          <button type="button" disabled={sitemapLoading} onClick={onSitemap} style={css("height:2.35rem;padding:0 .95rem;border:none;border-radius:999px;background:var(--accent);color:#fff;font-size:var(--text-2xs);font-weight:500;cursor:" + (sitemapLoading ? "wait" : "pointer") + ";opacity:" + (sitemapLoading ? ".72" : "1") + ";white-space:nowrap")}>{sitemapLoading ? "Crawling…" : "Crawl sitemap"}</button>
        </div>
        {sitemapError && <div role="alert" style={css("display:flex;align-items:flex-start;gap:.45rem;margin-top:.65rem;padding:.62rem .68rem;border:1px solid color-mix(in srgb,var(--danger) 25%,var(--border-soft) 75%);border-radius:.7rem;background:color-mix(in srgb,var(--danger) 7%,var(--surface) 93%);color:var(--danger);font-size:var(--text-2xs);line-height:1.45") }><Icon name="alert" size={13}/><span><strong style={css("display:block;font-weight:500")}>Sitemap unavailable</strong>{sitemapError}</span></div>}
        <div style={css("display:flex;flex-direction:column;gap:.5rem;margin-top:.9rem;padding-top:.85rem;border-top:1px solid var(--border-soft)") }>
          {["Finds sitemap.xml and robots.txt automatically", "Crawls every listed URL for status and indexability", "Read-only — nothing on the live site changes"].map(line => <span key={line} style={css("display:flex;align-items:flex-start;gap:.5rem;font-size:var(--text-2xs);color:var(--fg-muted);line-height:1.4") }><span style={css("flex-shrink:0;color:var(--success);display:inline-flex;margin-top:.05rem") }><Icon name="check" size={13}/></span>{line}</span>)}
        </div>
      </div> : <div onDrop={onDrop} onDragOver={event => { event.preventDefault(); onDrag(true); }} onDragLeave={() => onDrag(false)} style={css("margin-top:.75rem;min-height:12rem;border:1.5px dashed " + (dragging ? "var(--accent)" : "var(--border)") + ";border-radius:.9rem;background:" + (dragging ? "var(--accent-soft)" : "var(--surface-alt)") + ";display:flex;align-items:center;justify-content:center;text-align:center;padding:var(--space-4)") }><div><span style={css("width:2.6rem;height:2.6rem;border-radius:.9rem;background:var(--surface);color:var(--accent);display:grid;place-items:center;margin:0 auto .7rem") }><Icon name="arrowup" size={18}/></span><div style={css("font-size:var(--text-xs);font-weight:500")}>Drop the crawl CSV here</div><div style={css("margin:.25rem 0 .7rem;font-size:var(--text-2xs);color:var(--fg-faint)")}>Every imported audit column is retained in the report.</div><button type="button" onClick={onBrowse} style={css("height:2rem;padding:0 .75rem;border:1px solid var(--border);border-radius:999px;background:var(--surface);font-size:var(--text-2xs);cursor:pointer")}>Choose CSV</button></div></div>}
      </div>
    </Panel>

    <Panel style="padding:var(--space-4)"><StepHead n={3} status={step3Status} title="Check the pages" sub="Status mix and indexability from the import." right={rows.length ? <Pill tone="success">Ready</Pill> : <Pill tone="muted"><Icon name="lock" size={11}/>Locked</Pill>} />{rows.length ? <div style={css("margin-top:.85rem") }><div style={css("padding:var(--space-3);border-radius:.8rem;background:var(--success-soft);color:var(--success);display:flex;gap:.6rem;align-items:center") }><Icon name="check" size={17}/><div style={{ minWidth: 0 }}><div style={css("font-size:var(--text-2xs);font-weight:500")}>{rows.length} URLs ready</div><div title={sourceName} style={css("font-size:var(--text-2xs);margin-top:.1rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{sourceName}</div></div></div><div style={css("display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2);margin-top:.65rem") }><MetricMini value={rows.filter(row => row.statusCode >= 200 && row.statusCode < 300).length} label="Active 2xx"/><MetricMini value={rows.filter(row => row.indexability.toLowerCase() === "indexable").length} label="Indexable"/><MetricMini value={rows.filter(row => row.statusCode >= 300 && row.statusCode < 400).length} label="Redirects"/><MetricMini value={rows.filter(row => row.statusCode === 0 || row.statusCode >= 400).length} label="Broken"/></div><div style={css("font-size:var(--text-2xs);color:var(--fg-faint);margin-top:.6rem")}>Imported {importedAt ? new Date(importedAt).toLocaleString() : "just now"}</div><button type="button" onClick={onContinue} style={css("width:100%;height:2.25rem;margin-top:.7rem;border:none;border-radius:999px;background:var(--accent);color:#fff;font-size:var(--text-2xs);font-weight:500;cursor:pointer")}>Open SEO overview →</button></div> : <div style={css("margin-top:.85rem") }><div style={css(blurLocked + ";display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2)") }>{["Active 2xx", "Indexable", "Redirects", "Broken"].map(label => <div key={label} style={css("padding:.65rem;border:1px solid var(--border-soft);border-radius:.7rem;background:var(--surface-alt)") }><div style={css("font-size:var(--text-xl);font-weight:500;color:var(--fg-faint)")}>—</div><div style={css("font-size:var(--text-2xs);color:var(--fg-faint);margin-top:.15rem")}>{label}</div></div>)}</div><p style={css("display:flex;align-items:center;gap:.4rem;margin:.7rem 0 0;font-size:var(--text-2xs);color:var(--fg-faint);line-height:1.5")}><Icon name="lock" size={12}/>{step2Locked ? "Complete steps 1 and 2 to unlock the page check." : "Complete the import in step 2 to unlock the page check."}</p></div>}</Panel>
  </div>;
}

function MetricMini({ value, label }: { value: number; label: string }) { return <div style={css("padding:.65rem;border:1px solid var(--border-soft);border-radius:.7rem;background:var(--surface-alt)") }><div style={css("font-size:var(--text-xl);font-weight:500")}>{value}</div><div style={css("font-size:var(--text-2xs);color:var(--fg-faint);margin-top:.15rem")}>{label}</div></div>; }

function StepHead({ n, title, sub, right, status = "active" }: { n: number; title: string; sub: string; right?: ReactNode; status?: "done" | "active" | "locked" }) {
  const badge = "flex-shrink:0;width:1.55rem;height:1.55rem;border-radius:50%;display:grid;place-items:center;font-size:var(--text-2xs);font-weight:500;margin-top:.1rem;" + (status === "done"
    ? "background:var(--success-soft);color:var(--success)"
    : status === "locked"
      ? "background:var(--surface-alt);color:var(--fg-faint);border:1px solid var(--border-soft)"
      : "background:var(--accent-soft);color:var(--accent)");
  const muted = status === "locked";
  return <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3);flex-wrap:wrap") }>
    <div style={css("display:flex;align-items:flex-start;gap:.6rem;min-width:0") }>
      <span aria-hidden="true" style={css(badge)}>{status === "done" ? <Icon name="check" size={13}/> : status === "locked" ? <Icon name="lock" size={11}/> : n}</span>
      <div style={css("min-width:0") }>
        <h2 style={css("margin:0;font-size:var(--text-lg);font-weight:500;line-height:1.2;color:" + (muted ? "var(--fg-muted)" : "var(--fg)"))}>{title}</h2>
        <p style={css("margin:.3rem 0 0;font-size:var(--text-2xs);color:" + (muted ? "var(--fg-faint)" : "var(--fg-muted)"))}>{sub}</p>
      </div>
    </div>
    {right}
  </div>;
}

function LegacyOverviewView({ rows, stats, onGo }: { rows: CrawlRow[]; stats: SeoStats; onGo: (section: SeoSection) => void }) {
  const issues = stats.broken.length + stats.redirects.length + stats.missingTitle.length + stats.missingDescription.length + stats.missingH1.length;
  return <><div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(9rem,1fr));gap:.65rem") }><Kpi label="Crawl health" value={`${stats.health}%`} tone={stats.health > 80 ? "success" : "warn"}/><Kpi label="Active pages" value={String(stats.active.length)}/><Kpi label="Indexable" value={String(stats.indexable.length)} tone="success"/><Kpi label="Issues found" value={String(issues)} tone={issues ? "warn" : "success"}/></div><div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(19rem,1fr));gap:.85rem") }><Panel style="padding:var(--space-4)"><SectionTitle title="Crawl health" sub="Status and indexability across the imported inventory"/><div style={css("display:flex;align-items:center;gap:var(--space-4);margin-top:1rem;flex-wrap:wrap") }><div style={css("width:7rem;height:7rem;border-radius:50%;background:conic-gradient(var(--success) 0 " + stats.health + "%,var(--warn) " + stats.health + "% " + Math.min(100, stats.health + 8) + "%,var(--danger) " + Math.min(100, stats.health + 8) + "%);display:grid;place-items:center") }><div style={css("width:5.6rem;height:5.6rem;border-radius:50%;background:var(--surface);display:grid;place-items:center;text-align:center") }><div><strong style={css("display:block;font-size:var(--text-2xl);font-weight:500")}>{stats.health}</strong><span style={css("font-size:var(--text-2xs);color:var(--fg-faint)")}>health score</span></div></div></div><div style={css("flex:1;min-width:10rem;display:flex;flex-direction:column;gap:var(--space-2)") }><Bar label="Healthy 2xx" value={stats.active.length} total={rows.length} color="var(--success)"/><Bar label="Redirects" value={stats.redirects.length} total={rows.length} color="var(--warn)"/><Bar label="Broken" value={stats.broken.length} total={rows.length} color="var(--danger)"/></div></div></Panel><Panel style="padding:var(--space-4)"><SectionTitle title="Priority issues" sub="What needs attention before growth work" action="Review all" onAction={() => onGo("issues")}/><div style={css("display:flex;flex-direction:column;gap:.45rem;margin-top:.85rem") }><IssueLine label="Broken pages" count={stats.broken.length} tone="danger"/><IssueLine label="Redirecting URLs" count={stats.redirects.length} tone="warn"/><IssueLine label="Missing meta descriptions" count={stats.missingDescription.length} tone="warn"/><IssueLine label="Missing page titles" count={stats.missingTitle.length} tone="danger"/></div></Panel></div><Panel style="padding:var(--space-4)"><SectionTitle title="Audit evidence" sub="Review the complete inventory, findings, and readiness gate before finalizing priorities."/><div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(9rem,1fr));gap:.55rem;margin-top:.8rem") }>{[{ icon:"file",label:"Inventory",value:`${rows.length} URLs`,go:"inventory"},{icon:"alert",label:"Findings",value:`${issues} issues`,go:"issues"},{icon:"check",label:"Readiness",value:`${SEO_READINESS_ITEMS.length} checks`,go:"readiness"},{icon:"chart",label:"Audit report",value:"Prioritized summary",go:"audit-report"}].map(item => <button key={item.label} type="button" onClick={() => onGo(item.go as SeoSection)} style={css("padding:var(--space-3);border:1px solid var(--border-soft);border-radius:.8rem;background:var(--surface-alt);text-align:left;cursor:pointer;color:var(--fg)") }><Icon name={item.icon} size={15}/><span style={css("display:block;margin-top:.5rem;font-size:var(--text-2xs);font-weight:500")}>{item.label}</span><span style={css("display:block;margin-top:.15rem;font-size:var(--text-2xs);color:var(--fg-faint)")}>{item.value}</span></button>)}</div></Panel></>;
}

function ReadinessSummaryCard({ readiness, ai }: { readiness: Record<string, SeoReadinessStatus>; ai: Record<string, ReadinessAiResult> }) {
  const [open, setOpen] = useState(false);
  const items = SEO_READINESS_GROUPS.flatMap(group => group.items.map(item => {
    const manual = readiness[item.id];
    const status = manual ?? ai[item.id]?.status;
    const meta = manual === "confirmed"
      ? { label: "Done", symbol: "✓", color: "var(--success)", bg: "var(--success-soft)", dashed: false }
      : status === "confirmed"
        ? { label: "Confirmed", symbol: "✓", color: "var(--success)", bg: "var(--success-soft)", dashed: false }
        : status === "warning"
          ? { label: "Needs checking", symbol: "!", color: "var(--warn)", bg: "var(--warn-soft)", dashed: false }
          : status === "blocked"
            ? { label: "Failed", symbol: "×", color: "var(--danger)", bg: "var(--danger-soft)", dashed: false }
            : { label: "Unverified", symbol: "—", color: "var(--fg-faint)", bg: "var(--surface-alt)", dashed: true };
    return { ...item, group: group.title, meta, evidence: ai[item.id]?.evidence };
  }));
  const counts = ["Confirmed", "Done", "Needs checking", "Failed", "Unverified"].map(label => ({ label, count: items.filter(item => item.meta.label === label).length }));
  return <Panel style="overflow:hidden">
    <div style={css("padding:1rem 1.1rem;border-bottom:1px solid var(--border-soft)") }>
      <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:.8rem;flex-wrap:wrap") }><SectionTitle title="SEO audit checklist" sub="Technical, on-page, architecture, AIO/GEO, and measurement checks are evaluated from the available evidence."/><button type="button" aria-expanded={open} onClick={() => setOpen(value => !value)} className="pt-softbtn" style={css("flex-shrink:0;min-height:2rem;padding:0 .75rem;border:1px solid var(--border);border-radius:999px;background:var(--surface);color:var(--fg-muted);font-size:var(--text-2xs);font-weight:500;cursor:pointer")}>{open ? "Hide checklist" : "Show checklist"}</button></div>
      <div style={css("display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.7rem") }>{counts.map(item => <span key={item.label} style={css("font-size:var(--text-2xs);font-weight:500;border:1px solid var(--border-soft);border-radius:999px;background:var(--surface-alt);color:var(--fg-muted);padding:.18rem .48rem")}>{item.count} {item.label.toLowerCase()}</span>)}</div>
    </div>
    {open && <div style={css("display:flex;flex-direction:column;gap:.65rem;padding:.65rem") }>{SEO_READINESS_GROUPS.map(group => { const categoryItems = items.filter(item => item.group === group.title); return <section key={group.title} style={css("overflow:hidden;border:1px solid var(--border-soft);border-radius:.78rem;background:var(--surface)") }><div style={css("padding:.68rem .75rem;border-bottom:1px solid var(--border-soft);background:var(--surface-alt)") }><h3 style={css("margin:0;font-size:var(--text-2xs);font-weight:500")}>{group.title}</h3><p style={css("margin:.18rem 0 0;font-size:var(--text-2xs);line-height:1.4;color:var(--fg-faint)")}>{group.description}</p></div><div style={css("display:flex;flex-direction:column") }>{categoryItems.map(item => <div key={item.id} style={css("display:grid;grid-template-columns:1.45rem minmax(0,1fr) auto;gap:.55rem;align-items:start;padding:.7rem .75rem;border-bottom:1px " + (item.meta.dashed ? "dashed" : "solid") + " var(--border-soft);background:var(--surface)") }><span aria-hidden="true" style={css("width:1.35rem;height:1.35rem;border-radius:50%;display:grid;place-items:center;background:" + item.meta.bg + ";color:" + item.meta.color + ";font-size:var(--text-2xs);font-weight:500")}>{item.meta.symbol}</span><div style={css("min-width:0") }><strong style={css("display:block;font-size:var(--text-2xs);font-weight:500;line-height:1.35")}>{item.label}</strong><span style={css("display:block;margin-top:.18rem;font-size:var(--text-2xs);line-height:1.4;color:var(--fg-muted)")}>{item.evidence || item.detail}</span></div><span style={css("font-size:var(--text-2xs);font-weight:500;white-space:nowrap;color:" + item.meta.color + ";background:" + item.meta.bg + ";border-radius:999px;padding:.15rem .4rem")}>{item.meta.label}</span></div>)}</div></section>; })}</div>}
  </Panel>;
}

function OverviewView({ rows, stats, onGo, mobile, readiness, ai }: { rows: CrawlRow[]; stats: SeoStats; onGo: (section: SeoSection) => void; mobile: boolean; readiness: Record<string, SeoReadinessStatus>; ai: Record<string, ReadinessAiResult> }) {
  const aiVisibility = aiVisibilityFor(rows);
  const issueTotal = stats.broken.length + stats.missingTitle.length + stats.redirects.length + stats.missingDescription.length + stats.missingH1.length + stats.thin.length + aiVisibility.answerGaps;
  const healthySignals = stats.html.filter(row => row.statusCode === 200 && row.title && row.description && row.h1).length;
  const indexCoverage = stats.html.length ? Math.round(stats.indexable.length / stats.html.length * 100) : 0;
  const metadataCoverage = stats.html.length ? Math.round(healthySignals / stats.html.length * 100) : 0;
  const crawlEfficiency = rows.length ? Math.round(stats.active.length / rows.length * 100) : 0;
  const activePct = rows.length ? stats.active.length / rows.length * 100 : 0;
  const redirectPct = rows.length ? stats.redirects.length / rows.length * 100 : 0;
  const depthGroups = Array.from({ length: Math.max(3, Math.min(6, Math.max(...rows.map(row => row.depth), 0) + 1)) }, (_, depth) => ({ depth, count: rows.filter(row => row.depth === depth).length }));
  const maxDepthCount = Math.max(1, ...depthGroups.map(item => item.count));
  const depthPoints = depthGroups.map((item, index) => ({
    ...item,
    x: depthGroups.length === 1 ? 50 : 8 + index / (depthGroups.length - 1) * 84,
    y: 82 - item.count / maxDepthCount * 66,
  }));
  const depthLine = depthPoints.map(point => `${point.x},${point.y}`).join(" ");
  const depthArea = `8,88 ${depthLine} ${depthPoints.at(-1)?.x ?? 92},88`;
  const scoreLabel = stats.health >= 90 ? "Strong foundation" : stats.health >= 75 ? "Healthy with gaps" : stats.health >= 55 ? "Needs attention" : "High-risk crawl";
  const healthColor = stats.health >= 75 ? "var(--success)" : stats.health >= 55 ? "var(--warn)" : "var(--danger)";
  const brokenPct = rows.length ? stats.broken.length / rows.length * 100 : 0;
  return <div style={css("display:flex;flex-direction:column;gap:.85rem") }>
    <Panel style="padding:1.05rem 1.15rem;background:linear-gradient(135deg,var(--surface),color-mix(in srgb,var(--success-soft) 50%,var(--surface) 50%))">
      <div style={css("display:flex;gap:1.1rem;align-items:center;flex-wrap:wrap") }>
        <div aria-label={`SEO health score ${stats.health} out of 100`} style={css("width:auto;min-width:6.6rem;flex-shrink:0;display:flex;flex-direction:column;gap:.42rem;padding:.85rem .95rem;border-radius:.9rem;background:color-mix(in srgb," + healthColor + " 10%,var(--surface) 90%)") }><div style={css("display:flex;align-items:baseline;gap:var(--space-1)") }><strong style={css("font-size:var(--text-4xl);font-weight:500;line-height:.85;color:" + healthColor + ";font-variant-numeric:tabular-nums")}>{stats.health}</strong><span style={css("font-size:var(--text-2xs);color:var(--fg-faint)")}>/100</span></div><div style={css("height:.4rem;border-radius:999px;background:color-mix(in srgb," + healthColor + " 20%,var(--surface) 80%)") }><div style={css("height:100%;border-radius:999px;width:" + Math.max(2, stats.health) + "%;background:" + healthColor)}/></div><span style={css("font-size:var(--text-2xs);color:var(--fg-faint)")}>SEO health</span></div>
        <div style={css("flex:1;min-width:min(13rem,100%)") }><Pill tone={stats.health >= 75 ? "success" : "warn"}>{scoreLabel}</Pill><h2 style={css("margin:.6rem 0 0;font-size:var(--text-xl);font-weight:500;line-height:1.22")}>{stats.health >= 75 ? "The crawl foundation is usable." : "Fix the crawl foundation first."}</h2><p style={css("margin:.3rem 0 0;font-size:var(--text-2xs);line-height:1.5;color:var(--fg-muted)")}>{issueTotal ? `${issueTotal} signals need review across ${rows.length} crawled URLs.` : `No priority crawl issues found across ${rows.length} URLs.`}</p></div>
      </div>
      <div style={css("display:grid;grid-template-columns:" + (mobile ? "1fr" : "repeat(3,minmax(0,1fr))") + ";gap:.55rem;margin-top:.9rem;padding-top:.9rem;border-top:1px solid var(--border-soft)") }><CoverageMetric label="Index coverage" value={indexCoverage} detail={`${stats.indexable.length} indexable`}/><CoverageMetric label="Page signals" value={metadataCoverage} detail={`${healthySignals} complete`}/><CoverageMetric label="Crawl efficiency" value={crawlEfficiency} detail={`${stats.active.length} healthy`}/></div>
    </Panel>

    <div role="note" style={css("display:flex;align-items:center;gap:.45rem;padding:.55rem .7rem;border:1px solid var(--border-soft);border-radius:.72rem;background:var(--surface);color:var(--fg-muted);font-size:var(--text-2xs);line-height:1.4") }><Icon name="eye" size={13}/><span><strong style={css("font-weight:500;color:var(--fg)")}>Chart guide:</strong> Hover, focus, or tap any bar, segment, column, or point to see its exact value and supporting pages.</span></div>

    <div style={css("display:grid;grid-template-columns:" + (mobile ? "1fr" : "minmax(0,1fr) minmax(0,1fr)") + ";gap:.8rem;align-items:stretch") }>
      <Panel style="padding:1rem 1.1rem;height:100%;box-sizing:border-box">
        <SectionTitle title="Crawl composition" sub="Hover or focus a segment to see every page behind the result."/>
        <div style={css("display:flex;align-items:baseline;gap:.4rem;margin-top:.75rem") }><strong style={css("font-size:var(--text-3xl);font-weight:500;line-height:.9;font-variant-numeric:tabular-nums")}>{rows.length}</strong><span style={css("font-size:var(--text-2xs);color:var(--fg-faint)")}>total URLs</span></div>
        <div style={css("display:flex;height:.6rem;border-radius:999px;background:var(--surface-alt);margin-top:.6rem") }><DataVizDatum label="Healthy 2xx pages" value={`${stats.active.length} · ${Math.round(activePct)}%`} lines={stats.active.map(row => row.url)} align="left" style={"display:block;height:100%;width:" + activePct + "%;background:var(--success);border-radius:999px 0 0 999px"}/><DataVizDatum label="Redirecting pages" value={`${stats.redirects.length} · ${Math.round(redirectPct)}%`} lines={stats.redirects.map(row => row.url)} align="right" style={"display:block;height:100%;width:" + redirectPct + "%;background:var(--warn)"}/><DataVizDatum label="Broken pages" value={`${stats.broken.length} · ${Math.round(brokenPct)}%`} lines={stats.broken.map(row => row.url)} align="right" style={"display:block;height:100%;width:" + brokenPct + "%;background:var(--danger);border-radius:0 999px 999px 0"}/></div>
        <div style={css("display:flex;flex-direction:column;gap:.42rem;margin-top:.75rem") }>{([["Healthy 2xx", stats.active.length, "var(--success)"], ["Redirects", stats.redirects.length, "var(--warn)"], ["Broken 4xx", stats.broken.length, "var(--danger)"]] as const).map(([label, value, color]) => <div key={label} style={css("display:flex;align-items:center;justify-content:space-between;gap:.6rem") }><span style={css("display:flex;align-items:center;gap:.4rem;font-size:var(--text-2xs);color:var(--fg-muted)") }><span style={css("width:.5rem;height:.5rem;border-radius:50%;background:" + color)}/>{label}</span><span style={css("font-size:var(--text-2xs);font-variant-numeric:tabular-nums") }><strong style={css("font-weight:500")}>{value}</strong><span style={css("color:var(--fg-faint)")}> · {rows.length ? Math.round(value / rows.length * 100) : 0}%</span></span></div>)}</div>
      </Panel>
      <Panel style="padding:1rem 1.1rem;height:100%;box-sizing:border-box">
        <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:.6rem;flex-wrap:wrap") }><SectionTitle title="Crawl depth" sub="Hover or focus a point to see its pages."/><Pill tone={depthGroups.some(item => item.depth >= 4 && item.count) ? "warn" : "success"}>{depthGroups.some(item => item.depth >= 4 && item.count) ? "Deep pages" : "Healthy depth"}</Pill></div>
        <div role="img" aria-label={`Crawl depth graph. ${depthGroups.map(item => `Depth ${item.depth}: ${item.count} page${item.count === 1 ? "" : "s"}`).join(", ")}`} style={css("position:relative;height:9.2rem;margin-top:.75rem;padding:.35rem .45rem 1.45rem 1.75rem;border-left:1px solid var(--border-soft);border-bottom:1px solid var(--border-soft);border-radius:0 0 .55rem 0;background:linear-gradient(0deg,var(--surface-alt),transparent);box-sizing:border-box") }>
          <span aria-hidden="true" style={css("position:absolute;left:.35rem;top:.25rem;font-size:var(--text-2xs);color:var(--fg-faint)")}>{maxDepthCount}</span>
          <span aria-hidden="true" style={css("position:absolute;left:.58rem;bottom:1.3rem;font-size:var(--text-2xs);color:var(--fg-faint)")}>0</span>
          <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: ".35rem .45rem 1.45rem 1.75rem", width: "calc(100% - 2.2rem)", height: "calc(100% - 1.8rem)", overflow: "visible" }}>
            {[22, 55, 88].map(y => <line key={y} x1="8" x2="92" y1={y} y2={y} stroke="var(--border-soft)" strokeWidth="1" vectorEffect="non-scaling-stroke"/>)}
            <polygon points={depthArea} fill="color-mix(in srgb,var(--success) 14%,transparent)" />
            <polyline points={depthLine} fill="none" stroke="var(--success)" strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
          </svg>
          {depthPoints.map((point, index) => {
            const pages = rows.filter(row => row.depth === point.depth);
            const pointColor = point.depth <= 2 ? "var(--success)" : point.depth === 3 ? "var(--warn)" : "var(--danger)";
            return <DataVizDatum key={point.depth} label={`Depth ${point.depth}`} value={`${point.count} page${point.count === 1 ? "" : "s"}`} lines={pages.map(row => row.url)} align={index > depthPoints.length / 2 ? "right" : "left"} style={`position:absolute;left:calc(1.75rem + (100% - 2.2rem) * ${point.x / 100});top:calc(.35rem + (100% - 1.8rem) * ${point.y / 100});transform:translate(-50%,-50%);z-index:2`}><span aria-hidden="true" style={css("display:block;width:.78rem;height:.78rem;border:3px solid var(--surface);border-radius:50%;background:" + pointColor + ";box-shadow:0 0 0 1px " + pointColor)}/></DataVizDatum>;
          })}
          <div aria-hidden="true" style={css("position:absolute;left:1.75rem;right:.45rem;bottom:.22rem;display:grid;grid-template-columns:repeat(" + depthGroups.length + ",minmax(0,1fr));text-align:center") }>{depthGroups.map(item => <span key={item.depth} style={css("font-size:var(--text-2xs);color:var(--fg-faint);white-space:nowrap")}>Depth {item.depth}</span>)}</div>
        </div>
      </Panel>
    </div>

    <AiVisibilityPanel rows={rows}/>

    <IssuesView rows={rows} stats={stats} ai={aiVisibility} onRoadmap={() => onGo("keywords")} />

    <ReadinessSummaryCard readiness={readiness} ai={ai} />

    <Panel style="padding:var(--space-4)"><SectionTitle title="Audit evidence" sub="Open the combined crawl inventory or continue to the prioritized report."/><div style={css("display:grid;grid-template-columns:" + (mobile ? "1fr" : "repeat(2,minmax(0,1fr))") + ";gap:.55rem;margin-top:.8rem") }>{[{ icon:"file",label:"Crawl & inventory",value:`${rows.length} URLs`,go:"sources"},{icon:"chart",label:"Audit report",value:"Prioritized summary",go:"audit-report"}].map(item => <button key={item.label} type="button" onClick={() => onGo(item.go as SeoSection)} style={css("padding:var(--space-3);border:1px solid var(--border-soft);border-radius:.8rem;background:var(--surface-alt);text-align:left;cursor:pointer;color:var(--fg)") }><span style={css("width:1.8rem;height:1.8rem;border-radius:.58rem;background:var(--surface);display:grid;place-items:center;color:var(--accent)") }><Icon name={item.icon} size={14}/></span><span style={css("display:block;margin-top:.55rem;font-size:var(--text-2xs);font-weight:500")}>{item.label}</span><span style={css("display:block;margin-top:.15rem;font-size:var(--text-2xs);color:var(--fg-faint)")}>{item.value}</span></button>)}</div></Panel>
  </div>;
}

function CoverageMetric({ label, value, detail }: { label: string; value: number; detail: string }) { return <div style={css("padding:.68rem;border:1px solid color-mix(in srgb,var(--success) 14%,var(--border-soft) 86%);border-radius:.72rem;background:color-mix(in srgb,var(--surface) 82%,transparent 18%)") }><div style={css("display:flex;align-items:baseline;justify-content:space-between;gap:.35rem") }><span style={css("font-size:var(--text-2xs);color:var(--fg-faint)")}>{label}</span><strong style={css("font-size:var(--text-sm);font-weight:500")}>{value}%</strong></div><div style={css("height:.3rem;border-radius:999px;background:var(--surface-alt);margin:.45rem 0 .32rem") }><DataVizDatum label={label} value={`${value}%`} lines={[detail]} style={"display:block;height:100%;width:" + value + "%;border-radius:999px;background:" + (value >= 80 ? "var(--success)" : value >= 55 ? "var(--warn)" : "var(--danger)")}/></div><span style={css("font-size:var(--text-2xs);color:var(--fg-muted)")}>{detail}</span></div>; }

function AiVisibilityPanel({ rows, compact = false }: { rows: CrawlRow[]; compact?: boolean }) {
  const ai = aiVisibilityFor(rows);
  const scoreColor = ai.score >= 75 ? "var(--success)" : ai.score >= 55 ? "var(--warn)" : "var(--danger)";
  const crawlerLabel = ai.crawlerAccess === "allowed" ? "Allowed" : ai.crawlerAccess === "blocked" ? "Blocked" : "Verify robots.txt";
  const signals = [
    { label: "Discovery eligibility", value: `${ai.eligible} indexable pages can support search links and answer snippets.`, status: ai.eligible ? "Ready" : "Blocked", color: ai.eligible ? "var(--success)" : "var(--danger)" },
    { label: "Answer extraction", value: `${ai.answerReady} pages have complete headings, metadata, and enough textual context.`, status: ai.answerGaps ? `${ai.answerGaps} gaps` : "Ready", color: ai.answerGaps ? "var(--warn)" : "var(--success)" },
    { label: "Crawler access", value: "Confirm Googlebot, Bingbot, and answer-engine crawlers can reach priority content.", status: crawlerLabel, color: ai.crawlerAccess === "allowed" ? "var(--success)" : ai.crawlerAccess === "blocked" ? "var(--danger)" : "var(--warn)" },
    { label: "Structured context", value: "Validate that supported structured data agrees with the visible page content.", status: ai.schemaMeasured ? `${ai.schemaReady} detected` : "Not in crawl", color: ai.schemaMeasured ? "var(--success)" : "var(--warn)" },
  ];
  return <Panel style="padding:1rem 1.1rem;background:linear-gradient(135deg,var(--surface),color-mix(in srgb,#6b5bd2 6%,var(--surface-alt) 94%))">
    <div style={css("display:flex;align-items:center;justify-content:space-between;gap:.8rem;flex-wrap:wrap") }><div style={css("display:flex;align-items:center;gap:.65rem;min-width:0") }><span style={css("width:2.15rem;height:2.15rem;border-radius:.72rem;background:color-mix(in srgb,#6b5bd2 12%,var(--surface) 88%);color:#6b5bd2;display:grid;place-items:center;flex-shrink:0") }><Icon name="sparkle" size={16}/></span><div style={css("display:flex;align-items:center;gap:.45rem;flex-wrap:wrap;min-width:0") }><h2 style={css("margin:0;font-size:var(--text-md);font-weight:500;line-height:1.2")}>Discovery readiness</h2><Pill tone="accent">Search + answers</Pill></div></div><div aria-label={`Discovery readiness score ${ai.score} out of 100`} style={css("display:flex;align-items:baseline;gap:.22rem;padding:.5rem .65rem;border-radius:.72rem;background:var(--surface);flex-shrink:0") }><strong style={css("font-size:var(--text-2xl);font-weight:500;color:" + scoreColor)}>{ai.score}</strong><span style={css("font-size:var(--text-2xs);color:var(--fg-faint)")}>/100</span></div></div>
    <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(9rem,1fr));gap:var(--space-2);margin-top:.8rem") }>{[["Search eligible", ai.eligible], ["Citation-ready", ai.answerReady], ["Answer gaps", ai.answerGaps]].map(([label, value]) => <div key={String(label)} style={css("padding:.62rem .68rem;border:1px solid var(--border-soft);border-radius:.7rem;background:var(--surface)") }><strong style={css("display:block;font-size:var(--text-md);font-weight:500")}>{value}</strong><span style={css("display:block;margin-top:.12rem;font-size:var(--text-2xs);color:var(--fg-faint)")}>{label}</span></div>)}</div>
    {!compact && <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(13rem,1fr));gap:var(--space-2);margin-top:.65rem") }>{signals.map(signal => <div key={signal.label} style={css("display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.65rem;align-items:start;padding:.68rem .72rem;border:1px solid var(--border-soft);border-radius:.72rem;background:var(--surface)") }><div><strong style={css("display:block;font-size:var(--text-2xs);font-weight:500")}>{signal.label}</strong><span style={css("display:block;margin-top:.18rem;font-size:var(--text-2xs);line-height:1.4;color:var(--fg-faint)")}>{signal.value}</span></div><span style={css("font-size:var(--text-2xs);font-weight:500;white-space:nowrap;color:" + signal.color)}>{signal.status}</span></div>)}</div>}
  </Panel>;
}

function Kpi({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "success" | "warn" }) { const color = tone === "success" ? "var(--success)" : tone === "warn" ? "var(--warn)" : "var(--fg)"; return <Panel style="padding:.85rem"><div style={css("font-size:var(--text-2xs);color:var(--fg-faint)")}>{label}</div><div style={css("font-size:var(--text-2xl);font-weight:500;margin-top:.3rem;color:" + color) }>{value}</div></Panel>; }
function SectionTitle({ title, sub, action, onAction }: { title: string; sub: string; action?: string; onAction?: () => void }) { return <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:.8rem") }><div><h2 style={css("margin:0;font-size:var(--text-md);font-weight:500")}>{title}</h2><p style={css("margin:.22rem 0 0;font-size:var(--text-2xs);color:var(--fg-faint);line-height:1.4")}>{sub}</p></div>{action && <button type="button" onClick={onAction} style={css("border:none;background:none;color:var(--accent);font-size:var(--text-2xs);cursor:pointer;white-space:nowrap")}>{action} →</button>}</div>; }
function Bar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) { const pct = total ? Math.max(value ? 4 : 0, Math.round(value / total * 100)) : 0; return <div><div style={css("display:flex;justify-content:space-between;font-size:var(--text-2xs);color:var(--fg-muted);margin-bottom:.25rem") }><span>{label}</span><span>{value}</span></div><div style={css("height:.38rem;border-radius:999px;background:var(--surface-alt)") }>{value > 0 && <DataVizDatum label={label} value={`${value} of ${total} · ${pct}%`} style={"display:block;height:100%;width:" + pct + "%;background:" + color + ";border-radius:999px"}/>}</div></div>; }
function IssueLine({ label, count, tone }: { label: string; count: number; tone: "danger" | "warn" }) { return <div style={css("display:flex;align-items:center;justify-content:space-between;gap:.6rem;padding:.6rem .7rem;border:1px solid var(--border-soft);border-radius:.7rem;background:var(--surface-alt)") }><span style={css("font-size:var(--text-2xs)")}>{label}</span><Pill tone={count ? tone : "success"}>{count || "Clear"}</Pill></div>; }

function InventoryView({ rows, allRows, query, onQuery }: { rows: CrawlRow[]; allRows: CrawlRow[]; query: string; onQuery: (value: string) => void }) {
  const essentialColumns = ["Address", "Status Code", "Indexability", "Title 1", "Crawl Depth", "Inlinks"];
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(essentialColumns);
  const evidenceRows = rows.map(evidenceFor);
  const evidenceColumns = Array.from(new Set(allRows.flatMap(row => Object.keys(evidenceFor(row)))));
  const visibleColumns = evidenceColumns.filter(column => selectedColumns.includes(column));
  const labelFor = (column: string) => ({ Address: "URL", "Status Code": "Status", "Title 1": "Title", "Meta Description 1": "Meta description", "H1-1": "H1", "Canonical Link Element 1": "Canonical", "Crawl Depth": "Depth" } as Record<string, string>)[column] || column;
  const setEssential = () => setSelectedColumns(essentialColumns.filter(column => evidenceColumns.includes(column)));
  const toggleColumn = (column: string) => setSelectedColumns(current => current.includes(column) ? (current.length > 1 ? current.filter(item => item !== column) : current) : [...current, column]);
  return <Panel style="position:relative">
    <div style={css("padding:.85rem 1rem;border-bottom:1px solid var(--border-soft);display:flex;align-items:center;justify-content:space-between;gap:.7rem;flex-wrap:wrap") }>
      <SectionTitle title="Crawled pages" sub={`${visibleColumns.length} of ${evidenceColumns.length} columns shown. Use Columns to tailor this table.`}/>
      <div style={css("display:flex;align-items:center;gap:.35rem;flex-wrap:nowrap") }><label style={css("height:2rem;display:flex;align-items:center;gap:.4rem;padding:0 .65rem;border:1px solid var(--border);border-radius:999px;background:var(--surface-alt);width:13rem;max-width:calc(100vw - 8rem)") }><Icon name="search" size={13}/><input value={query} onChange={event => onQuery(event.target.value)} placeholder="Search pages" style={css("border:none;outline:none;background:transparent;width:100%;font-size:var(--text-2xs);color:var(--fg)")}/></label><div style={css("position:relative;flex-shrink:0") }><button type="button" aria-label={`Choose columns · ${visibleColumns.length} visible`} title="Choose columns" aria-expanded={columnsOpen} aria-haspopup="dialog" onClick={() => setColumnsOpen(value => !value)} className="pt-softbtn" style={css("width:2rem;height:2rem;display:grid;place-items:center;padding:0;border:1px solid var(--border);border-radius:50%;background:var(--surface);color:var(--fg-muted);cursor:pointer")}><Icon name="funnel" size={13}/></button>{columnsOpen && <div role="dialog" aria-label="Choose crawled page columns" style={css("position:absolute;right:0;top:calc(100% + .4rem);z-index:20;width:min(18rem,82vw);border:1px solid var(--border);border-radius:.82rem;background:var(--surface);box-shadow:0 14px 32px rgb(50 30 30 / .16);overflow:hidden") }><div style={css("display:flex;align-items:center;justify-content:space-between;gap:var(--space-2);padding:.65rem .7rem;border-bottom:1px solid var(--border-soft)") }><div><strong style={css("display:block;font-size:var(--text-2xs);font-weight:500")}>Visible columns</strong><span style={css("display:block;margin-top:.12rem;font-size:var(--text-2xs);color:var(--fg-faint)")}>Choose at least one field.</span></div><div style={css("display:flex;gap:var(--space-1)") }><button type="button" onClick={setEssential} style={css("border:none;background:none;color:var(--accent);font-size:var(--text-2xs);cursor:pointer")}>Essential</button><button type="button" onClick={() => setSelectedColumns(evidenceColumns)} style={css("border:none;background:none;color:var(--accent);font-size:var(--text-2xs);cursor:pointer")}>All</button></div></div><div style={css("display:flex;flex-direction:column;max-height:17rem;overflow:auto;padding:.35rem") }>{evidenceColumns.map(column => <label key={column} style={css("display:flex;align-items:center;gap:var(--space-2);min-height:2rem;padding:.35rem .45rem;border-radius:.55rem;cursor:pointer;font-size:var(--text-2xs);color:var(--fg-muted)") }><input type="checkbox" checked={selectedColumns.includes(column)} onChange={() => toggleColumn(column)} style={css("accent-color:var(--accent)")}/><span style={css("min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{labelFor(column)}</span></label>)}</div></div>}</div></div>
    </div>
    <DataTable headers={visibleColumns.map(labelFor)} rows={evidenceRows.map(record => visibleColumns.map(column => column === "Status Code" ? <Pill key={column} tone={Number(record[column]) >= 400 ? "danger" : Number(record[column]) >= 300 ? "warn" : "success"}>{record[column] || "—"}</Pill> : column === "Title 1" && !record[column] ? <span key={column} style={{ color: "var(--danger)" }}>Missing title</span> : record[column] || "—"))}/>
  </Panel>;
}

function IssuesView({ rows, stats, ai, onRoadmap }: { rows: CrawlRow[]; stats: SeoStats; ai: AiVisibilityStats; onRoadmap: () => void }) {
  const aiGapPages = rows.filter(row => row.statusCode === 200 && row.contentType.toLowerCase().includes("html") && row.indexability.toLowerCase() === "indexable" && !(row.title && row.description && row.h1 && row.words >= 300));
  const items = [
    { title: "Broken internal URLs", count: stats.broken.length, severity: "Critical", why: "Internal links lead users and crawlers to 4xx pages.", tone: "danger" as const, pages: stats.broken },
    { title: "Missing page titles", count: stats.missingTitle.length, severity: "High", why: "Search results lose a clear relevance and click signal.", tone: "danger" as const, pages: stats.missingTitle },
    { title: "Redirecting internal URLs", count: stats.redirects.length, severity: "Medium", why: "Internal navigation wastes crawl paths and slows the journey.", tone: "warn" as const, pages: stats.redirects },
    { title: "Missing meta descriptions", count: stats.missingDescription.length, severity: "Medium", why: "Priority pages cannot control their search-result message.", tone: "warn" as const, pages: stats.missingDescription },
    { title: "Missing H1 headings", count: stats.missingH1.length, severity: "Medium", why: "The page hierarchy lacks a clear primary topic.", tone: "warn" as const, pages: stats.missingH1 },
    { title: "Thin pages", count: stats.thin.length, severity: "Opportunity", why: "Low-context pages may not satisfy the target search intent.", tone: "accent" as const, pages: stats.thin },
    { title: "Answer gaps", count: ai.answerGaps, severity: "Discovery", why: "Priority pages lack complete, extractable answers for modern search discovery.", tone: "accent" as const, pages: aiGapPages },
  ];
  const toneColor = { danger: "var(--danger)", warn: "var(--warn)", accent: "var(--accent)" } as const;
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const max = Math.max(1, ...items.map(item => item.count));
  const ranked = [...items].sort((a, b) => b.count - a.count);
  const openCount = items.filter(item => item.count > 0).length;
  const criticalCount = items.filter(item => item.tone === "danger").reduce((sum, item) => sum + item.count, 0);
  const mediumCount = items.filter(item => item.tone === "warn").reduce((sum, item) => sum + item.count, 0);
  const oppCount = items.filter(item => item.tone === "accent").reduce((sum, item) => sum + item.count, 0);
  const pct = (n: number) => total ? (n / total * 100) : 0;
  const seg = (label: string, width: number, color: string, tone: "danger" | "warn" | "accent") => width > 0 ? <DataVizDatum label={label} value={`${Math.round(width)}% of findings`} lines={items.filter(item => item.tone === tone && item.count).map(item => `${item.title} · ${item.count}`)} style={"display:block;height:100%;width:" + width + "%;background:" + color}/> : null;
  return <div style={css("display:flex;flex-direction:column;gap:.8rem") }>
    <Panel style="padding:1.05rem 1.15rem;background:linear-gradient(135deg,var(--surface),color-mix(in srgb,var(--warn-soft) 38%,var(--surface) 62%))">
      <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:1.2rem;flex-wrap:wrap") }>
        <div style={{ maxWidth: "32rem", minWidth: 0 }}>
          <span style={css("font-size:var(--text-label);font-weight:500;text-transform:uppercase;letter-spacing:.05em;color:var(--warn)")}>SEO issues</span>
          <h2 style={css("margin:.5rem 0 0;font-size:var(--text-xl);font-weight:500;line-height:1.2")}>{total ? `${total} signals across ${openCount} finding type${openCount === 1 ? "" : "s"}` : "No priority issues found"}</h2>
          <p style={css("margin:.3rem 0 0;font-size:var(--text-2xs);line-height:1.55;color:var(--fg-muted)")}>{total ? "Ranked by volume — the critical signals block crawling, indexing, and the click, so fix those first." : "The crawl surfaced no broken pages, missing signals, or thin content worth flagging."}</p>
        </div>
        <div style={css("display:flex;gap:var(--space-2);flex-wrap:wrap") }>
          {[["Critical", criticalCount, "var(--danger)"], ["Medium", mediumCount, "var(--warn)"], ["Opportunity", oppCount, "var(--accent)"]].map(([label, value, color]) => <div key={String(label)} style={css("min-width:5.2rem;padding:.6rem .7rem;border:1px solid var(--border-soft);border-radius:.75rem;background:var(--surface)") }><strong style={css("font-size:var(--text-3xl);font-weight:500;line-height:.9;color:" + (Number(value) ? String(color) : "var(--fg-faint)") + ";font-variant-numeric:tabular-nums")}>{value}</strong><span style={css("display:block;margin-top:.25rem;font-size:var(--text-2xs);color:var(--fg-faint)")}>{label}</span></div>)}
        </div>
      </div>
      {total > 0 && <div style={css("display:flex;height:.5rem;border-radius:999px;background:var(--surface-alt);margin-top:.9rem") }>{seg("Critical findings", pct(criticalCount), "var(--danger)", "danger")}{seg("Medium findings", pct(mediumCount), "var(--warn)", "warn")}{seg("Opportunities", pct(oppCount), "var(--accent)", "accent")}</div>}
    </Panel>

    <Panel style="padding:1rem 1.1rem">
      <SectionTitle title="Findings by volume" sub="Longer bars carry more pages. Checks with no findings are already clear." action="Continue" onAction={onRoadmap}/>
      <div style={css("display:flex;flex-direction:column;gap:var(--space-2);margin-top:.85rem") }>{ranked.map(item => <div key={item.title} style={css("display:grid;grid-template-columns:minmax(0,1fr) minmax(5rem,9rem) auto;gap:.7rem;align-items:center;padding:.62rem .72rem;border:1px solid " + (item.count ? "color-mix(in srgb," + toneColor[item.tone] + " 26%,var(--border-soft) 74%)" : "var(--border-soft)") + ";border-radius:.72rem;background:var(--surface)") }>
        <div style={css("min-width:0") }><div style={css("font-size:var(--text-2xs);font-weight:500;line-height:1.2")}>{item.title}</div><div style={css("font-size:var(--text-2xs);color:var(--fg-faint);line-height:1.35;margin-top:.12rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{item.why}</div></div>
        <div style={css("height:.44rem;border-radius:999px;background:var(--surface-alt)") }>{item.count > 0 && <DataVizDatum label={item.title} value={`${item.count} page${item.count === 1 ? "" : "s"}`} lines={item.pages.map(row => row.url)} align="right" style={"display:block;height:100%;width:" + Math.max(8, item.count / max * 100) + "%;border-radius:999px;background:" + toneColor[item.tone]}/>}</div>
        <div style={css("display:flex;align-items:center;justify-content:flex-end;gap:.35rem;min-width:2.8rem") }><strong style={css("font-size:var(--text-sm);font-weight:500;text-align:right;color:" + (item.count ? "var(--fg)" : "var(--fg-faint)") + ";font-variant-numeric:tabular-nums")}>{item.count}</strong><span title={item.count ? item.severity : "Clear"} aria-label={item.count ? `${item.severity} finding` : "Clear finding"} style={css("display:inline-flex;color:" + (item.count ? toneColor[item.tone] : "var(--success)"))}><Icon name="flag" size={12}/></span></div>
      </div>)}</div>
    </Panel>
  </div>;
}

function ReadinessStatusButton({ status, selected, onClick }: { status: SeoReadinessStatus; selected: boolean; onClick: () => void }) {
  const label = status === "confirmed" ? "Confirmed" : status === "warning" ? "Warning" : "Blocks build";
  const color = status === "confirmed" ? "var(--success)" : status === "warning" ? "var(--warn)" : "var(--danger)";
  return <button type="button" aria-pressed={selected} onClick={onClick} style={css("min-height:1.85rem;padding:0 .58rem;border:1px solid " + (selected ? color : "var(--border-soft)") + ";border-radius:999px;background:" + (selected ? `color-mix(in srgb,${color} 11%,var(--surface) 89%)` : "var(--surface)") + ";color:" + (selected ? color : "var(--fg-muted)") + ";font-size:var(--text-2xs);font-weight:500;cursor:pointer;white-space:nowrap")}>{selected && <span aria-hidden="true">✓ </span>}{label}</button>;
}

function SeoReadinessView({ value, ai, onChange, onRequestAccess, onContinue }: { value: Record<string, SeoReadinessStatus>; ai: Record<string, ReadinessAiResult>; onChange: (itemId: string, status: SeoReadinessStatus) => void; onRequestAccess: (label: string) => void; onContinue: () => void }) {
  const entries = SEO_READINESS_GROUPS.flatMap(group => group.items.map(item => {
    const manual = value[item.id];
    const aiRes = ai[item.id];
    const status = manual ?? aiRes?.status;
    return { id: item.id, label: item.label, detail: item.detail, group: group.title, status, byAi: !manual && !!aiRes, evidence: aiRes?.evidence };
  }));
  const total = entries.length;
  const cleared = entries.filter(entry => entry.status === "confirmed");
  const aiCount = entries.filter(entry => entry.byAi && entry.status === "confirmed").length;
  const warnCount = entries.filter(entry => entry.status === "warning").length;
  const blockCount = entries.filter(entry => entry.status === "blocked").length;
  const needs = entries.filter(entry => !entry.status);
  const readinessTone = (status?: SeoReadinessStatus) => status === "confirmed" ? { label: "Passed", color: "var(--success)", bg: "var(--success-soft)", icon: "✓" }
    : status === "warning" ? { label: "Warning", color: "var(--warn)", bg: "var(--warn-soft)", icon: "!" }
      : status === "blocked" ? { label: "Failed", color: "var(--danger)", bg: "var(--danger-soft)", icon: "✕" }
        : { label: "Unverified", color: "var(--warn)", bg: "var(--warn-soft)", icon: "?" };
  const ready = !needs.length && !blockCount;
  const pct = (n: number) => total ? (n / total * 100) : 0;
  const seg = (label: string, width: number, color: string, lines: string[]) => width > 0 ? <DataVizDatum label={label} value={`${Math.round(width)}%`} lines={lines} style={"display:block;height:100%;width:" + width + "%;background:" + color}/> : null;

  return <div style={css("display:flex;flex-direction:column;gap:.8rem") }>
    <Panel style="padding:1.05rem 1.15rem;background:linear-gradient(135deg,var(--surface),color-mix(in srgb,var(--accent-soft) 42%,var(--surface) 58%))">
      <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:1.2rem;flex-wrap:wrap") }>
        <div style={{ maxWidth: "34rem", minWidth: 0 }}>
          <span style={css("display:inline-flex;align-items:center;gap:.35rem;font-size:var(--text-label);font-weight:500;text-transform:uppercase;letter-spacing:.05em;color:var(--accent)") }><Icon name="sparkle" size={12}/>Evidence-based SEO audit</span>
          <h2 style={css("margin:.5rem 0 0;font-size:var(--text-xl);font-weight:500;line-height:1.2")}>{aiCount} of {total} checks cleared automatically</h2>
          <p style={css("margin:.3rem 0 0;font-size:var(--text-2xs);line-height:1.55;color:var(--fg-muted)")}>{needs.length ? `We verified everything the crawl can prove. ${needs.length} check${needs.length === 1 ? "" : "s"} still need human review or connected search data.` : "Everything supported by the available evidence is verified. Resolve any flags below, then continue into the SEO plan."}</p>
        </div>
        <div style={css("display:flex;gap:var(--space-2);flex-wrap:wrap") }>
          <div style={css("min-width:5.4rem;padding:.6rem .7rem;border:1px solid var(--border-soft);border-radius:.75rem;background:var(--surface)") }><div style={css("display:flex;align-items:baseline;gap:.2rem") }><strong style={css("font-size:var(--text-3xl);font-weight:500;line-height:.9;color:var(--success);font-variant-numeric:tabular-nums")}>{aiCount}</strong></div><span style={css("display:block;margin-top:.25rem;font-size:var(--text-2xs);color:var(--fg-faint)")}>evidence-verified</span></div>
          <div style={css("min-width:5.4rem;padding:.6rem .7rem;border:1px solid var(--border-soft);border-radius:.75rem;background:var(--surface)") }><div style={css("display:flex;align-items:baseline;gap:.2rem") }><strong style={css("font-size:var(--text-3xl);font-weight:500;line-height:.9;color:" + (needs.length ? "var(--accent)" : "var(--fg-faint)") + ";font-variant-numeric:tabular-nums")}>{needs.length}</strong></div><span style={css("display:block;margin-top:.25rem;font-size:var(--text-2xs);color:var(--fg-faint)")}>unverified</span></div>
          {blockCount > 0 && <div style={css("min-width:5.4rem;padding:.6rem .7rem;border:1px solid var(--border-soft);border-radius:.75rem;background:var(--surface)") }><div style={css("display:flex;align-items:baseline;gap:.2rem") }><strong style={css("font-size:var(--text-3xl);font-weight:500;line-height:.9;color:var(--danger);font-variant-numeric:tabular-nums")}>{blockCount}</strong></div><span style={css("display:block;margin-top:.25rem;font-size:var(--text-2xs);color:var(--fg-faint)")}>blocking</span></div>}
        </div>
      </div>
      <div style={css("display:flex;height:.5rem;border-radius:999px;background:var(--surface-alt);margin-top:.9rem") }>{seg("Passed checks", pct(cleared.length), "var(--success)", cleared.map(item => item.label))}{seg("Warnings", pct(warnCount), "var(--warn)", entries.filter(item => item.status === "warning").map(item => item.label))}{seg("Failed checks", pct(blockCount), "var(--danger)", entries.filter(item => item.status === "blocked").map(item => item.label))}</div>
      <div style={css("display:flex;gap:.9rem;flex-wrap:wrap;margin-top:.55rem;font-size:var(--text-2xs);color:var(--fg-muted)") }>
        <span style={css("display:inline-flex;align-items:center;gap:.3rem") }><span style={css("width:.42rem;height:.42rem;border-radius:50%;background:var(--success)")}/>{cleared.length} cleared</span>
        {warnCount > 0 && <span style={css("display:inline-flex;align-items:center;gap:.3rem") }><span style={css("width:.42rem;height:.42rem;border-radius:50%;background:var(--warn)")}/>{warnCount} warning</span>}
        {blockCount > 0 && <span style={css("display:inline-flex;align-items:center;gap:.3rem") }><span style={css("width:.42rem;height:.42rem;border-radius:50%;background:var(--danger)")}/>{blockCount} blocking</span>}
        <span style={css("display:inline-flex;align-items:center;gap:.3rem") }><span style={css("width:.42rem;height:.42rem;border-radius:50%;background:var(--border)")}/>{needs.length} unverified</span>
      </div>
    </Panel>

    {needs.length > 0 && <div style={css("display:flex;align-items:center;justify-content:space-between;gap:.8rem;flex-wrap:wrap;padding:0 .15rem") }><p style={css("margin:0;font-size:var(--text-2xs);color:var(--fg-muted)")}>{needs.length} unverified check{needs.length === 1 ? "" : "s"} need human review or connected data before final sign-off.</p><button type="button" onClick={() => onRequestAccess(`${needs.length} unverified SEO checks`)} style={css("display:inline-flex;align-items:center;gap:.35rem;min-height:1.95rem;padding:0 .8rem;border:none;border-radius:999px;background:var(--accent);color:#fff;font-size:var(--text-2xs);font-weight:500;cursor:pointer")}><Icon name="checklist" size={12}/>Review unverified</button></div>}

    {SEO_READINESS_GROUPS.map(group => {
      const items = group.items.map(item => ({ id: item.id, label: item.label, detail: item.detail, status: value[item.id] ?? ai[item.id]?.status, evidence: ai[item.id]?.evidence }));
      const counts: Array<[number, string, string, string]> = [[items.filter(i => i.status === "confirmed").length, "Passed", "var(--success)", "var(--success-soft)"], [items.filter(i => i.status === "warning").length, "Warning", "var(--warn)", "var(--warn-soft)"], [items.filter(i => i.status === "blocked").length, "Failed", "var(--danger)", "var(--danger-soft)"], [items.filter(i => !i.status).length, "Unverified", "var(--warn)", "var(--warn-soft)"]];
      return <section key={group.title} style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden") }>
        <div style={css("padding:.85rem 1.1rem;border-bottom:1px solid var(--border-soft)") }>
          <h3 style={css("margin:0;font-size:var(--text-md);font-weight:500")}>{group.title}</h3>
          <p style={css("margin:.18rem 0 0;font-size:var(--text-2xs);line-height:1.4;color:var(--fg-faint);max-width:40rem")}>{group.description}</p>
          <div style={css("display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.6rem") }>{counts.filter(([count]) => count > 0).map(([count, label, tone, bg]) => <span key={label} style={css("font-size:var(--text-2xs);font-weight:500;color:" + tone + ";background:" + bg + ";border-radius:999px;padding:.16rem .5rem")}>{count} {label}</span>)}</div>
        </div>
        <div style={css("display:flex;flex-direction:column") }>{items.map(item => { const t = readinessTone(item.status); const actionable = item.status !== "confirmed"; return <div key={item.id} style={css("display:grid;grid-template-columns:1.55rem minmax(0,1fr) auto;gap:.6rem;align-items:start;padding:.7rem 1rem;border-bottom:1px solid var(--border-soft)") }>
          <span style={css("width:1.45rem;height:1.45rem;border-radius:50%;display:grid;place-items:center;background:" + t.bg + ";color:" + t.color + ";font-size:var(--text-2xs);font-weight:500")}>{t.icon}</span>
          <div style={css("min-width:0") }>
            <div style={css("font-size:var(--text-xs);font-weight:500;line-height:1.4")}>{item.label}</div>
            <div style={css("font-size:var(--text-2xs);color:var(--fg-muted);line-height:1.45;margin-top:.2rem")}>{item.evidence || item.detail}</div>
            {actionable && <div style={css("display:flex;align-items:center;gap:.45rem;flex-wrap:wrap;margin-top:.5rem") }><div style={css("display:flex;gap:.28rem;flex-wrap:wrap") }>{(["confirmed", "warning", "blocked"] as SeoReadinessStatus[]).map(s => <ReadinessStatusButton key={s} status={s} selected={item.status === s} onClick={() => onChange(item.id, s)}/>)}</div>{!item.status && <button type="button" onClick={() => onRequestAccess(item.label)} style={css("display:inline-flex;align-items:center;gap:.28rem;border:none;background:none;padding:0;color:var(--accent);font-size:var(--text-2xs);font-weight:500;cursor:pointer;white-space:nowrap")}><Icon name="plus" size={11}/>Add evidence</button>}</div>}
          </div>
          <span style={css("font-size:var(--text-2xs);font-weight:500;color:" + t.color + ";background:" + t.bg + ";border-radius:999px;padding:.16rem .42rem;white-space:nowrap;height:fit-content")}>{t.label}</span>
        </div>; })}</div>
      </section>;
    })}

    <Panel style="padding:.9rem 1.1rem"><div style={css("display:flex;align-items:center;justify-content:space-between;gap:.8rem;flex-wrap:wrap") }><div><h3 style={css("margin:0;font-size:var(--text-sm);font-weight:500")}>{ready ? "Audit checks complete" : blockCount ? "Resolve the failed checks" : "Complete the evidence review"}</h3><p style={css("margin:.22rem 0 0;font-size:var(--text-2xs);color:var(--fg-faint)")}>{ready ? "The audit is ready for its report and planning stages." : blockCount ? `${blockCount} failed check${blockCount === 1 ? "" : "s"} must be addressed or accepted explicitly.` : `${needs.length} check${needs.length === 1 ? "" : "s"} still need review or connected data.`}</p></div><button type="button" disabled={!ready} onClick={onContinue} style={css("min-height:2.2rem;padding:0 .82rem;border:none;border-radius:999px;background:" + (ready ? "var(--accent)" : "var(--surface-alt)") + ";color:" + (ready ? "#fff" : "var(--fg-faint)") + ";font-size:var(--text-2xs);font-weight:500;cursor:" + (ready ? "pointer" : "not-allowed"))}>Continue to audit report →</button></div></Panel>
  </div>;
}

interface SeoReadinessCategoryResult {
  title: string;
  description: string;
  score: number;
  passed: number;
  failed: number;
  unverified: number;
  checks: Array<{ id: string; label: string; status?: SeoReadinessStatus; evidence: string; source: string }>;
}

function SeoReadinessScoreCard({ category }: { category: SeoReadinessCategoryResult }) {
  const color = category.score >= 80 ? "var(--success)" : category.score >= 55 ? "var(--warn)" : "var(--danger)";
  const statusMeta = (status?: SeoReadinessStatus) => status === "confirmed"
    ? { label: "Passed", symbol: "✓", color: "var(--success)", bg: "var(--success-soft)" }
    : status === "blocked"
      ? { label: "Failed", symbol: "×", color: "var(--danger)", bg: "var(--danger-soft)" }
      : { label: status === "warning" ? "Warning" : "Unverified", symbol: "?", color: "var(--warn)", bg: "var(--warn-soft)" };
  return <section style={css("border:1px solid var(--border-soft);border-radius:16px;background:var(--surface);overflow:hidden") }>
    <div style={css("padding:1rem 1.1rem;border-bottom:1px solid var(--border-soft)") }>
      <div style={css("display:flex;align-items:center;gap:var(--space-3)") }><span style={css("width:2.6rem;height:2.6rem;border-radius:.62rem;display:grid;place-items:center;font-size:var(--text-lg);font-weight:500;flex-shrink:0;background:color-mix(in srgb," + color + " 13%,var(--surface) 87%);color:" + color)}>{category.score}</span><div style={css("min-width:0;flex:1") }><div style={css("font-size:var(--text-lg);font-weight:500")}>{category.title}</div><div style={css("font-size:var(--text-2xs);color:var(--fg-muted);margin-top:.2rem")}>{category.description}</div></div><div style={css("flex:1;min-width:4rem;max-width:11rem") }><div style={css("height:.4rem;border-radius:999px;background:color-mix(in srgb," + color + " 13%,var(--surface-alt) 87%)") }><div style={css("height:100%;border-radius:999px;width:" + Math.max(2, category.score) + "%;background:" + color)}/></div></div></div>
      <div style={css("display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.75rem") }><span style={css("font-size:var(--text-2xs);font-weight:500;color:var(--success);background:var(--success-soft);border-radius:999px;padding:.2rem .5rem")}>{category.passed} Passed</span><span style={css("font-size:var(--text-2xs);font-weight:500;color:var(--danger);background:var(--danger-soft);border-radius:999px;padding:.2rem .5rem")}>{category.failed} Failed</span><span style={css("font-size:var(--text-2xs);font-weight:500;color:var(--warn);background:var(--warn-soft);border-radius:999px;padding:.2rem .5rem")}>{category.unverified} Unverified</span></div>
    </div>
    <div style={css("display:flex;flex-direction:column") }>{category.checks.map(check => { const meta = statusMeta(check.status); return <div key={check.id} style={css("display:grid;grid-template-columns:1.55rem minmax(0,1fr) auto;gap:.6rem;align-items:start;padding:.7rem 1rem;border-bottom:1px solid var(--border-soft)") }><span style={css("width:1.45rem;height:1.45rem;border-radius:50%;display:grid;place-items:center;background:" + meta.bg + ";color:" + meta.color + ";font-size:var(--text-2xs);font-weight:500")}>{meta.symbol}</span><div style={css("min-width:0") }><div style={css("font-size:var(--text-xs);font-weight:500;line-height:1.4")}>{check.label}</div><div style={css("font-size:var(--text-2xs);color:var(--fg-muted);line-height:1.45;margin-top:.22rem")}>{check.evidence}</div><div style={css("font-size:var(--text-2xs);color:var(--fg-faint);margin-top:.18rem")}>{check.source}</div></div><span style={css("font-size:var(--text-2xs);font-weight:500;color:" + meta.color + ";background:" + meta.bg + ";border-radius:999px;padding:.16rem .42rem;white-space:nowrap")}>{meta.label}</span></div>; })}</div>
  </section>;
}

function AuditReportView({ client, rows, stats, clientView, mobile, state, actions, onContinue }: { client: StudioClient; rows: CrawlRow[]; stats: SeoStats; clientView: boolean; mobile: boolean; state: PortalState; actions: PortalActions; onContinue: () => void }) {
  const [pagesOpen, setPagesOpen] = useState(false);
  const aiVisibility = aiVisibilityFor(rows);
  const issueCount = stats.broken.length + stats.redirects.length + stats.missingTitle.length + stats.missingDescription.length + stats.missingH1.length + stats.thin.length + aiVisibility.answerGaps;
  const decisions = rows.map(row => ({ row, decision: pageDecisionFor(row) }));
  const actionCount = (action: PageAction) => decisions.filter(item => item.decision.action === action).length;
  const redirectPlan = decisions.filter(item => ["Redirect", "Consolidate", "Delete", "No-index"].includes(item.decision.action));
  const changedPages = decisions.filter(item => item.decision.action !== "Keep");
  const decisionMix = [
    { action: "Keep" as const, label: "Working well", color: "var(--success)" },
    { action: "Improve" as const, label: "Improve", color: "var(--warn)" },
    { action: "No-index" as const, label: "Keep private", color: "var(--accent)" },
    { action: "Delete" as const, label: "Remove", color: "var(--danger)" },
    { action: "Redirect" as const, label: "Redirect", color: "#b78362" },
    { action: "Consolidate" as const, label: "Merge", color: "#8d7fb8" },
  ].map(item => ({ ...item, count: actionCount(item.action), pages: decisions.filter(decision => decision.decision.action === item.action).map(decision => decision.row.url) }));
  const attention = [
    { label: "Broken journeys", value: stats.broken.length, color: "var(--danger)", pages: stats.broken.map(row => row.url) },
    { label: "Redirecting pages", value: stats.redirects.length, color: "#b78362", pages: stats.redirects.map(row => row.url) },
    { label: "Missing page signals", value: stats.missingTitle.length + stats.missingDescription.length + stats.missingH1.length, color: "var(--warn)", pages: Array.from(new Set([...stats.missingTitle, ...stats.missingDescription, ...stats.missingH1].map(row => row.url))) },
    { label: "Pages with thin copy", value: stats.thin.length, color: "var(--accent)", pages: stats.thin.map(row => row.url) },
  ];
  const attentionMax = Math.max(1, ...attention.map(item => item.value));
  const technicalDecisions = actionCount("No-index") + actionCount("Delete") + actionCount("Redirect") + actionCount("Consolidate");
  const headline = stats.health >= 80 ? "A strong foundation with focused cleanup ahead." : stats.health >= 60 ? "A workable foundation that needs a clear repair plan." : "The site needs technical cleanup before growth work begins.";
  const reportHealthColor = stats.health >= 75 ? "var(--success)" : stats.health >= 55 ? "var(--warn)" : "var(--danger)";
  return <div data-seo-report-root style={css("display:flex;flex-direction:column;gap:.85rem") }>
    <section>
      <article style={css("border:1px solid var(--border-soft);border-radius:16px;background:var(--surface);padding:1.15rem 1.25rem") }>
        <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:.8rem;flex-wrap:wrap") }><div><div style={css("font-size:var(--text-label);text-transform:uppercase;letter-spacing:.04em;color:#6b5bd2")}>Crawl report</div><div style={css("font-size:var(--text-xl);font-weight:500;margin-top:.2rem")}>Technical evidence</div><div style={css("font-size:var(--text-xs);color:var(--fg-muted);line-height:1.5;margin-top:.3rem")}>{headline}</div></div><button type="button" aria-expanded={pagesOpen} onClick={() => setPagesOpen(value => !value)} className="pt-softbtn" style={css("min-height:2rem;padding:0 .75rem;border:1px solid var(--border);border-radius:999px;background:var(--surface);color:var(--fg-muted);font-size:var(--text-2xs);font-weight:500;cursor:pointer;white-space:nowrap")}>{pagesOpen ? "Hide pages audited" : "Show pages audited"}</button></div>
        <div style={css("display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.55rem;margin-top:.8rem") }>{[["Site health", `${stats.health}/100`, reportHealthColor], ["URLs reviewed", String(rows.length), "var(--fg)"], ["Indexable", String(stats.indexable.length), "var(--success)"], ["Need attention", String(changedPages.length), changedPages.length ? "var(--warn)" : "var(--success)"]].map(([label, value, color]) => <div key={label} style={css("border:1px solid var(--border-soft);border-radius:.8rem;background:var(--surface-alt);padding:.65rem .75rem") }><div style={css("font-size:var(--text-2xs);color:var(--fg-faint)")}>{label}</div><div style={css("font-size:var(--text-2xl);font-weight:500;margin-top:.12rem;color:" + color)}>{value}</div></div>)}</div>
      </article>
    </section>

    <AiVisibilityPanel rows={rows} compact/>

    {pagesOpen && <section style={css("border:1px solid var(--border-soft);border-radius:16px;background:var(--surface);padding:1.05rem 1.15rem") }><div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-4)") }><div><div style={css("font-size:var(--text-lg);font-weight:500")}>Pages audited</div><div style={css("font-size:var(--text-xs);color:var(--fg-muted);margin-top:.2rem")}>Every page used as crawl evidence is listed in one vertical register.</div></div><span style={css("font-size:var(--text-2xs);color:var(--fg-muted);white-space:nowrap")}>{rows.length} pages</span></div><div style={css("display:flex;flex-direction:column;gap:.42rem;margin-top:.8rem") }>{rows.map((row, index) => { const decision = pageDecisionFor(row); return <div key={`${row.url}-${index}`} style={css("display:flex;align-items:center;gap:.6rem;padding:.55rem .65rem;border-radius:.7rem;background:var(--surface-alt)") }><span style={css("width:1.35rem;height:1.35rem;border-radius:50%;display:grid;place-items:center;background:var(--surface);border:1px solid var(--border-soft);font-size:var(--text-2xs);color:var(--fg-muted);flex-shrink:0")}>{index + 1}</span><span title={row.url} style={css("min-width:0;flex:1;font-size:var(--text-xs);color:var(--fg-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{row.url}</span><Pill tone={decision.tone}>{decision.action === "No-index" ? "Keep private" : decision.action}</Pill></div>; })}</div></section>}

    <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));gap:var(--space-3)") }>
      <Panel style="padding:var(--space-4)"><SectionTitle title="What happens to each page" sub="Hover or focus a segment to see every page in that recommendation."/><div style={css("display:flex;height:.85rem;border-radius:999px;background:var(--surface-alt);margin-top:1rem") }>{decisionMix.filter(item => item.count).map((item, index, visible) => <DataVizDatum key={item.action} label={item.label} value={`${item.count} page${item.count === 1 ? "" : "s"}`} lines={item.pages} align={index > visible.length / 2 ? "right" : "left"} style={"display:block;height:100%;width:" + (item.count / Math.max(rows.length, 1) * 100) + "%;background:" + item.color}/>)}</div><div style={css("display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.48rem;margin-top:.85rem") }>{decisionMix.map(item => <div key={item.action} style={css("display:flex;align-items:center;justify-content:space-between;gap:.45rem;padding:.48rem .55rem;border:1px solid var(--border-soft);border-radius:.65rem") }><span style={css("display:flex;align-items:center;gap:.38rem;font-size:var(--text-2xs);color:var(--fg-muted)") }><i style={css("width:.48rem;height:.48rem;border-radius:50%;background:" + item.color + ";flex-shrink:0")}/>{item.label}</span><strong style={css("font-size:var(--text-2xs);font-weight:500")}>{item.count}</strong></div>)}</div></Panel>
      <Panel style="padding:var(--space-4)"><SectionTitle title="Where attention is needed" sub="Hover or focus a bar to see the affected pages."/><div style={css("display:flex;flex-direction:column;gap:.65rem;margin-top:.9rem") }>{attention.map(item => <div key={item.label}><div style={css("display:flex;align-items:center;justify-content:space-between;gap:.6rem;margin-bottom:.24rem;font-size:var(--text-2xs)") }><span style={css("color:var(--fg-muted)")}>{item.label}</span><strong style={css("font-weight:500")}>{item.value}</strong></div><div style={css("height:.48rem;border-radius:999px;background:var(--surface-alt)") }>{item.value > 0 && <DataVizDatum label={item.label} value={`${item.value} signal${item.value === 1 ? "" : "s"}`} lines={item.pages} align="right" style={"display:block;height:100%;width:" + (item.value / attentionMax * 100) + "%;min-width:.48rem;border-radius:999px;background:" + item.color}/>}</div></div>)}</div></Panel>
    </div>


    <Panel style="padding:var(--space-4)"><SectionTitle title="What we recommend next" sub="Three clear workstreams turn the audit into an action plan."/><div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(11.5rem,1fr));gap:.6rem;margin-top:.8rem") }>{[
      { number: stats.broken.length + stats.redirects.length, title: "Fix broken journeys", detail: "Repair pages and redirects that interrupt visitors or search engines.", tone: "danger" as const, icon: "link" },
      { number: actionCount("Improve"), title: "Strengthen useful pages", detail: "Improve titles, descriptions, headings, and copy on pages worth keeping.", tone: "warn" as const, icon: "edit" },
      { number: technicalDecisions, title: "Confirm page decisions", detail: "Approve which pages should merge, redirect, stay private, or be removed.", tone: "accent" as const, icon: "check" },
    ].map((item, index) => <div key={item.title} style={css("padding:.82rem;border:1px solid var(--border-soft);border-radius:.82rem;background:var(--surface-alt)") }><div style={css("display:flex;align-items:center;justify-content:space-between;gap:var(--space-2)") }><span aria-hidden="true" style={css("width:2rem;height:2rem;border-radius:50%;border:1px solid var(--border-soft);background:var(--surface);display:grid;place-items:center;flex:0 0 2rem;color:var(--accent)") }><Icon name={item.icon} size={14}/></span><Pill tone={item.tone}>{index + 1} · {item.number} page{item.number === 1 ? "" : "s"}</Pill></div><h3 style={css("margin:.62rem 0 .28rem;font-size:var(--text-2xs);font-weight:500")}>{item.title}</h3><p style={css("margin:0;font-size:var(--text-2xs);line-height:1.48;color:var(--fg-muted)")}>{item.detail}</p></div>)}</div></Panel>

    <Panel style="padding:var(--space-4)"><div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:.8rem;flex-wrap:wrap") }><SectionTitle title="Pages that need a decision" sub="The important changes are shown first, in plain language."/><Pill tone={changedPages.length ? "warn" : "success"}>{changedPages.length} to review</Pill></div><div style={css("display:flex;flex-direction:column;gap:var(--space-2);margin-top:.8rem") }>{!mobile && <div aria-hidden="true" style={css("display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.45fr) 6.8rem;gap:.8rem;padding:0 .8rem .08rem;font-size:var(--text-label);line-height:1.2;letter-spacing:.035em;text-transform:uppercase;color:var(--fg-faint)") }><span>Page</span><span>Finding &amp; next step</span><span style={css("text-align:right")}>Action</span></div>}{changedPages.map(({ row, decision }) => <div key={row.url} style={css("display:grid;grid-template-columns:" + (mobile ? "minmax(0,1fr) auto" : "minmax(0,1fr) minmax(0,1.45fr) 6.8rem") + ";gap:.8rem;align-items:center;padding:.72rem .8rem;border:1px solid var(--border-soft);border-radius:.75rem;background:var(--surface-alt);min-width:0") }><div style={css("min-width:0") }><strong title={row.url} style={css("display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:var(--text-2xs);font-weight:500")}>{row.url}</strong><span style={css("display:block;margin-top:.18rem;font-size:var(--text-2xs);color:var(--fg-faint)")}>{row.statusCode || "No response"} · {row.indexability}</span></div><div style={css("min-width:0" + (mobile ? ";grid-column:1/-1;grid-row:2" : "")) }><p style={css("margin:0;font-size:var(--text-2xs);line-height:1.45;color:var(--fg-muted)")}>{decision.reason}</p><div style={css("margin-top:.25rem;font-size:var(--text-2xs);line-height:1.4;color:var(--fg-faint)") }><strong style={css("font-weight:500;color:var(--fg-muted)")}>Next step:</strong> {decision.target}</div></div><span style={css("justify-self:end" + (mobile ? ";grid-column:2;grid-row:1" : ""))}><Pill tone={decision.tone}>{decision.action === "No-index" ? "Keep private" : decision.action}</Pill></span></div>)}</div>{!changedPages.length && <div style={css("padding:1.4rem;text-align:center;color:var(--fg-faint);font-size:var(--text-2xs)")}>No page changes are currently recommended.</div>}</Panel>

    <details style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden") }><summary style={css("list-style:none;cursor:pointer;padding:.9rem 1rem;display:flex;align-items:center;justify-content:space-between;gap:.8rem") }><div><h3 style={css("margin:0;font-size:var(--text-xs);font-weight:500")}>See all page decisions</h3><p style={css("margin:.2rem 0 0;font-size:var(--text-2xs);color:var(--fg-faint)")}>Open the complete page-by-page register, including pages that can stay as they are.</p></div><Pill tone="muted">{decisions.length} pages</Pill></summary><div style={css("border-top:1px solid var(--border-soft)") }><DataTable headers={["Page", "HTTP", "Search visibility", "Recommended action", "Next step", "Why"]} rows={decisions.map(({ row, decision }) => [row.url, row.statusCode || "—", row.indexability, <Pill key="action" tone={decision.tone}>{decision.action === "No-index" ? "Keep private" : decision.action}</Pill>, decision.target, decision.reason])}/></div></details>
    <details style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden") }><summary style={css("list-style:none;cursor:pointer;padding:.9rem 1rem;display:flex;align-items:center;justify-content:space-between;gap:.8rem") }><div><h3 style={css("margin:0;font-size:var(--text-xs);font-weight:500")}>Technical redirect & consolidation plan</h3><p style={css("margin:.2rem 0 0;font-size:var(--text-2xs);color:var(--fg-faint)")}>Implementation instructions for moved, duplicate, removed, or private pages.</p></div><Pill tone={redirectPlan.length ? "warn" : "success"}>{redirectPlan.length} actions</Pill></summary><div style={css("border-top:1px solid var(--border-soft)") }><DataTable headers={["Current page", "Action", "Destination / instruction", "Evidence", "Plan status"]} rows={redirectPlan.map(({ row, decision }) => [row.url, <Pill key="action" tone={decision.tone}>{decision.action}</Pill>, decision.target, rawCell(row, ["Redirect Type", "Closest Similarity Match", "No. Near Duplicates", "Meta Robots 1", "Indexability Status"]) || `${row.statusCode} · ${row.indexability}`, decision.action === "Delete" ? "Remove references" : decision.action === "No-index" ? "Confirm exclusion" : "Implement 301"])} /></div></details>
    <AuditReportFooter
      exportProfile={normalizePortalAuditExportProfile(client.name, actions.workspaceForClient(client.name).auditExport)}
      canManageExport={state.role !== "client"}
      onSaveExportProfile={update => actions.saveAuditExportProfile(client.name, update)}
      onPrint={() => { void printReportNode(document.querySelector("[data-seo-report-root]"), `${client.name} · SEO report`, normalizePortalAuditExportProfile(client.name, actions.workspaceForClient(client.name).auditExport)); }}
      cta={clientView ? undefined : { label: "Share with client", icon: "send", onClick: onContinue }}
    />
  </div>;
}

function KeywordPagePlanView({ rows, mobile }: { rows: CrawlRow[]; mobile: boolean }) {
  const keywords = keywordPlanFor(rows);
  const pageMap = pageMapFor(rows);
  if (!keywords.length && !pageMap.length) return <Panel style="padding:var(--space-5)"><SectionTitle title="Keyword & page plan" sub="Import keyword, volume, intent, and target-page columns in the crawl CSV to populate this plan."/><p style={css("margin:.8rem 0 0;font-size:var(--text-2xs);color:var(--fg-muted);line-height:1.5")}>No keyword-planning fields were found in the current source. The audit will not invent search demand or rankings.</p></Panel>;
  const totalDemand = keywords.reduce((sum, row) => sum + row.volume, 0);
  const commercialCount = keywords.filter(row => row.intent.toLowerCase() === "commercial").length;
  const changingPages = pageMap.filter(row => row.status !== "Keep").length;
  const maxVolume = Math.max(1, ...keywords.map(row => row.volume));
  return <div style={css("display:flex;flex-direction:column;gap:.85rem") }>
    <Panel style="padding:var(--space-4);background:linear-gradient(135deg,var(--surface),color-mix(in srgb,var(--accent) 7%,var(--surface-alt) 93%))">
      <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:.8rem;flex-wrap:wrap") }><div style={css("display:flex;align-items:flex-start;gap:.65rem") }><span style={css("width:2.15rem;height:2.15rem;border-radius:.72rem;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;flex-shrink:0") }><Icon name="map" size={16}/></span><div><h2 style={css("margin:0;font-size:var(--text-lg);font-weight:500")}>Search plan at a glance</h2><p style={css("margin:.28rem 0 0;font-size:var(--text-2xs);line-height:1.45;color:var(--fg-muted);max-width:31rem")}>Every imported priority keyword is paired with the page that should own it.</p></div></div><Pill tone="success">{keywords.length} keywords mapped</Pill></div>
      <div style={css("display:grid;grid-template-columns:repeat(" + (mobile ? "2" : "4") + ",minmax(0,1fr));gap:var(--space-2);margin-top:.9rem") }>{[
        { value: keywords.length, label: "Target keywords" },
        { value: totalDemand.toLocaleString(), label: "Monthly demand" },
        { value: commercialCount, label: "Commercial intent" },
        { value: changingPages, label: "Pages changing" },
      ].map(item => <div key={item.label} style={css("padding:.7rem .75rem;border:1px solid var(--border-soft);border-radius:.75rem;background:color-mix(in srgb,var(--surface) 92%,transparent 8%)") }><strong style={css("display:block;font-size:var(--text-lg);font-weight:500")}>{item.value}</strong><span style={css("display:block;margin-top:.15rem;font-size:var(--text-2xs);color:var(--fg-faint)")}>{item.label}</span></div>)}</div>
    </Panel>

    <div style={css("display:grid;grid-template-columns:" + (mobile ? "1fr" : "minmax(0,1.25fr) minmax(15rem,.75fr)") + ";gap:.85rem") }>
      <Panel style="overflow:hidden"><div style={css("padding:.9rem 1rem;border-bottom:1px solid var(--border-soft)") }><SectionTitle title="Keyword opportunities" sub="Prioritized using the imported demand, difficulty, intent, and target-page fields."/></div><div style={css("display:flex;flex-direction:column") }>{keywords.map((row,index) => <div key={`${row.keyword}-${row.page}`} style={css("display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:.65rem;align-items:center;padding:.72rem .8rem;border-bottom:1px solid var(--border-soft)") }><span style={css("width:1.55rem;height:1.55rem;border-radius:50%;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;font-size:var(--text-2xs);font-weight:500")}>{index + 1}</span><div style={css("min-width:0") }><div style={css("display:flex;align-items:center;gap:.38rem;flex-wrap:wrap") }><strong style={css("font-size:var(--text-2xs);font-weight:500")}>{row.keyword}</strong><Pill tone={row.intent.toLowerCase() === "commercial" ? "accent" : "muted"}>{row.intent}</Pill></div><div title={row.page} style={css("margin-top:.22rem;display:flex;align-items:center;gap:.28rem;font-size:var(--text-2xs);color:var(--fg-faint);min-width:0") }><Icon name="file" size={11}/><span style={css("overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{row.page}</span></div></div><div style={css("display:grid;grid-template-columns:repeat(3,auto);gap:.58rem;text-align:right") }><div><strong style={css("display:block;font-size:var(--text-2xs);font-weight:500")}>{row.rank ? `#${row.rank}` : "—"}</strong><span style={css("font-size:var(--text-2xs);color:var(--fg-faint)")}>rank</span></div><div><strong style={css("display:block;font-size:var(--text-2xs);font-weight:500")}>{row.volume.toLocaleString()}</strong><span style={css("font-size:var(--text-2xs);color:var(--fg-faint)")}>volume</span></div><div><strong style={css("display:block;font-size:var(--text-2xs);font-weight:500;color:" + (row.difficulty > 50 ? "var(--warn)" : "var(--success)"))}>{row.difficulty || "—"}</strong><span style={css("font-size:var(--text-2xs);color:var(--fg-faint)")}>difficulty</span></div></div></div>)}</div></Panel>

      <Panel style="padding:var(--space-4)"><SectionTitle title="Opportunity matrix" sub="Hover or focus a point to see its imported keyword evidence."/><div style={css("height:15rem;position:relative;margin-top:.8rem;border:1px solid var(--border-soft);border-radius:.75rem;background:linear-gradient(90deg,transparent 49.8%,var(--border-soft) 50%,transparent 50.2%),linear-gradient(0deg,transparent 49.8%,var(--border-soft) 50%,transparent 50.2%)") }>{keywords.map((row,index) => <DataVizDatum key={`${row.keyword}-${row.page}`} label={row.keyword} value={`${row.volume.toLocaleString()} monthly searches`} lines={[`Landing page · ${row.page}`, `Current rank · ${row.rank ? `#${row.rank}` : "Not supplied"}`, `Difficulty · ${row.difficulty || "Not supplied"}`, `Intent · ${row.intent}`]} align={row.volume / maxVolume > .65 ? "right" : "left"} style={"position:absolute;left:" + Math.max(10, Math.min(90, row.volume / maxVolume * 82 + 7)) + "%;top:" + Math.max(10, Math.min(88, (row.difficulty || 50) * 1.22)) + "%;transform:translate(-50%,-50%);width:1.65rem;height:1.65rem;border-radius:50%;background:var(--accent);border:2px solid var(--surface);display:grid;place-items:center;color:#fff;font-size:var(--text-2xs);font-weight:500"}>{index + 1}</DataVizDatum>)}</div></Panel>
    </div>

    <Panel style="overflow:hidden"><div style={css("padding:.9rem 1rem;border-bottom:1px solid var(--border-soft);display:flex;align-items:flex-start;justify-content:space-between;gap:.8rem;flex-wrap:wrap") }><SectionTitle title="Keyword-to-page map" sub="The imported current page, focused keyword, and final destination in one register."/><Pill tone="accent">{pageMap.length} page decisions</Pill></div><div style={css("display:flex;flex-direction:column;gap:var(--space-2);padding:.65rem") }>{pageMap.map((row,index) => <div key={`${row.current}-${row.keyword}`} style={css("display:grid;grid-template-columns:" + (mobile ? "1fr" : "auto minmax(0,.8fr) auto minmax(0,1fr) minmax(9rem,.85fr) auto") + ";gap:.65rem;align-items:center;padding:.72rem .75rem;border:1px solid var(--border-soft);border-radius:.75rem;background:var(--surface-alt)") }><span style={css("width:1.45rem;height:1.45rem;border-radius:50%;background:var(--surface);display:grid;place-items:center;font-size:var(--text-2xs);color:var(--fg-faint)")}>{index + 1}</span><div style={css("min-width:0") }><span style={css("display:block;font-size:var(--text-label);text-transform:uppercase;color:var(--fg-faint)")}>Current page</span><strong style={css("display:block;margin-top:.16rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:var(--text-2xs);font-weight:500")}>{row.current}</strong></div>{!mobile && <span aria-hidden="true">→</span>}<div style={css("min-width:0") }><span style={css("display:block;font-size:var(--text-label);text-transform:uppercase;color:var(--fg-faint)")}>Final destination</span><strong style={css("display:block;margin-top:.16rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:var(--text-2xs);font-weight:500;color:var(--accent)")}>{row.proposed}</strong></div><div style={css("min-width:0") }><span style={css("display:block;font-size:var(--text-label);text-transform:uppercase;color:var(--fg-faint)")}>Focused keyword</span><span style={css("display:block;margin-top:.16rem;font-size:var(--text-2xs);color:var(--fg-muted)")}>{row.keyword || "Not supplied"}</span></div><Pill tone={row.status === "Keep" ? "success" : row.status === "New" ? "accent" : "warn"}>{row.status}</Pill></div>)}</div></Panel>
  </div>;
}

function MetadataView({ rows }: { rows: CrawlRow[] }) { return <Panel style="overflow:hidden"><div style={css("padding:.9rem 1rem;border-bottom:1px solid var(--border-soft)") }><SectionTitle title="Landing-page-ready metadata" sub="Review current metadata beside any proposed title and description fields supplied in the crawl."/></div><DataTable headers={["Page", "Current title", "Proposed SEO title", "Proposed meta description", "Status"]} rows={rows.filter(row => row.statusCode === 200).slice(0,12).map(row => { const proposedTitle = rawCell(row, ["Proposed SEO Title", "Proposed Title", "New Title"]); const proposedDescription = rawCell(row, ["Proposed Meta Description", "Proposed Description", "New Meta Description"]); return [row.url, row.title || "Missing", proposedTitle || "Needs draft", proposedDescription || "Needs draft", <Pill key="status" tone={proposedTitle && proposedDescription ? "success" : "warn"}>{proposedTitle && proposedDescription ? "Ready to review" : "Needs draft"}</Pill>]; })}/></Panel>; }

function ArchitectureView({ rows }: { rows: CrawlRow[] }) { const branchMap = new Map<string, Set<string>>(); rows.filter(row => row.statusCode === 200).forEach(row => { let path = row.url; try { path = new URL(row.url, "https://site.local").pathname; } catch { /* keep imported path */ } const segments = path.split("/").filter(Boolean); if (!segments.length) return; const root = segments[0].replace(/[-_]+/g, " "); if (!branchMap.has(root)) branchMap.set(root, new Set()); if (segments[1]) branchMap.get(root)?.add(segments.slice(1).join(" / ").replace(/[-_]+/g, " ")); }); const branches = [...branchMap].slice(0, 8).map(([title, children]) => ({ title, children: [...children].slice(0, 8) })); return <Panel style="padding:var(--space-4)"><div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:.8rem;flex-wrap:wrap") }><SectionTitle title="Current site structure" sub="A visual map derived from the active URLs in the imported crawl."/><Pill tone="muted">Crawl evidence</Pill></div>{branches.length ? <div style={css("margin-top:1rem;text-align:center") }><span style={css("display:inline-flex;padding:.7rem 1.2rem;border:1px solid var(--accent);border-radius:.8rem;background:var(--accent-soft);color:var(--accent);font-size:var(--text-xs);font-weight:500")}>Homepage</span><div style={css("width:1px;height:1.1rem;background:var(--border);margin:0 auto")}/><div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(10rem,1fr));gap:.7rem") }>{branches.map(branch => <div key={branch.title}><div style={css("padding:.65rem;border:1px solid var(--border);border-radius:.75rem;background:var(--surface-alt);font-size:var(--text-2xs);font-weight:500;text-transform:capitalize")}>{branch.title}</div>{branch.children.length ? <><div style={css("width:1px;height:.65rem;background:var(--border);margin:0 auto")}/><div style={css("display:flex;flex-direction:column;gap:.4rem")}>{branch.children.map(child => <div key={child} style={css("padding:.55rem;border:1px solid var(--border-soft);border-radius:.65rem;font-size:var(--text-2xs);color:var(--fg-muted);text-transform:capitalize")}>{child}</div>)}</div></> : null}</div>)}</div></div> : <p style={css("margin:.85rem 0 0;font-size:var(--text-2xs);color:var(--fg-muted)")}>Import or crawl the site to build its information architecture.</p>}</Panel>; }

function RoadmapSummaryView({ mobile = false }: { mobile?: boolean }) {
  const phases = [
    {
      name: "Now · Fix the foundation", tone: "danger" as const, color: "var(--danger)", time: "Weeks 1–2", focus: "Technical health & access",
      objective: "Clear the technical blockers stopping search and answer-engine crawlers from reaching, reading, and trusting the site.",
      actions: [
        { title: "Repair broken links & redirect chains", detail: "Fix every 4xx error and redirect loop so crawl budget and link equity flow to live pages instead of dead ends." },
        { title: "Complete core on-page signals", detail: "Add the missing titles, meta descriptions, and H1s on priority pages so each one clearly states what it is about." },
        { title: "Publish valid XML & HTML sitemaps", detail: "Generate a clean XML sitemap declared in robots.txt so crawlers discover every priority URL, plus a linked HTML sitemap that helps users navigate and reinforces internal linking." },
        { title: "Confirm crawler access", detail: "Verify Googlebot, Bingbot, and answer-engine crawlers can reach the site and that robots.txt allows the right paths." },
      ],
      outcome: "A clean, fully crawlable foundation — sitemaps submitted and access confirmed — that search and answer engines can index without friction.",
    },
    {
      name: "Next · Align demand", tone: "warn" as const, color: "var(--warn)", time: "Weeks 3–6", focus: "Keywords, content & answer readiness",
      objective: "Match every priority page to real search and answer demand, then rewrite it to be answer-ready and citation-worthy.",
      actions: [
        { title: "Approve the keyword & page map", detail: "Give each priority page a focused keyword, clear intent, and defined role so effort targets attainable, high-intent demand." },
        { title: "Build answer-first copy with FAQ blocks", detail: "Lead pages with the answer and add FAQ sections for real customer questions, backed by explicit entities and evidence, so pages earn citations and featured snippets." },
        { title: "Implement & validate schema markup", detail: "Add Organization, Service, Article, and FAQ schema aligned to visible content across priority templates so engines can trust the page and surface rich results." },
      ],
      outcome: "Priority pages aligned to demand, marked up with schema and FAQs, and written to earn citations and rank in search.",
    },
    {
      name: "Later · Build authority", tone: "success" as const, color: "var(--success)", time: "Months 2–3", focus: "Content, links & measurement",
      objective: "Compound the foundation into durable topical authority, broader visibility, and a measurement loop that proves ROI.",
      actions: [
        { title: "Publish the priority content cluster", detail: "Ship the planned topic cluster with a deliberate internal-linking plan to establish topical authority and entity clarity." },
        { title: "Strengthen internal linking & entities", detail: "Route authority through the architecture to the money pages and make entities unambiguous across search systems." },
        { title: "Track rankings, citations & referrals", detail: "Measure rankings, conversions, answer-engine citations, and referral traffic to prove impact and steer the next cycle." },
      ],
      outcome: "Growing organic and answer-engine visibility, with a reporting loop that guides continuous improvement.",
    },
  ];
  return <div style={css("display:flex;flex-direction:column;gap:.7rem") }>{phases.map((phase, pi) => <Panel key={phase.name} style="padding:1.1rem 1.2rem">
    <div style={css("display:flex;align-items:center;gap:.55rem;flex-wrap:wrap") }><span style={css("width:1.7rem;height:1.7rem;border-radius:50%;flex-shrink:0;display:grid;place-items:center;font-size:var(--text-2xs);font-weight:500;background:color-mix(in srgb," + phase.color + " 14%,var(--surface) 86%);color:" + phase.color)}>{pi + 1}</span><h3 style={css("margin:0;font-size:var(--text-lg);font-weight:500;line-height:1.2")}>{phase.name}</h3><Pill tone={phase.tone}>{phase.time}</Pill><span style={css("font-size:var(--text-label);text-transform:uppercase;letter-spacing:.04em;color:var(--fg-faint);white-space:nowrap")}>{phase.focus}</span></div>
    <p style={css("margin:.5rem 0 0;font-size:var(--text-2xs);line-height:1.55;color:var(--fg-muted);max-width:44rem")}>{phase.objective}</p>
    <div style={css("display:flex;flex-direction:column;gap:var(--space-2);margin-top:.9rem") }>{phase.actions.map((action, index) => <div key={action.title} style={css("display:grid;grid-template-columns:1.35rem minmax(0,1fr);gap:.6rem;align-items:start;padding:.68rem .78rem;border:1px solid var(--border-soft);border-radius:.72rem;background:var(--surface-alt)") }><span style={css("width:1.35rem;height:1.35rem;border-radius:50%;background:var(--surface);border:1px solid color-mix(in srgb," + phase.color + " 30%,var(--border-soft) 70%);display:grid;place-items:center;font-size:var(--text-2xs);font-weight:500;color:" + phase.color + ";flex-shrink:0")}>{index + 1}</span><div style={css("min-width:0") }><div style={css("font-size:var(--text-2xs);font-weight:500;line-height:1.3")}>{action.title}</div><p style={css("margin:.2rem 0 0;font-size:var(--text-2xs);line-height:1.5;color:var(--fg-muted)")}>{action.detail}</p></div></div>)}</div>
    <div style={css("display:flex;align-items:flex-start;gap:var(--space-2);margin-top:.75rem;padding:.62rem .78rem;border-radius:.72rem;background:color-mix(in srgb," + phase.color + " 8%,var(--surface) 92%)") }><span style={css("color:" + phase.color + ";flex-shrink:0;margin-top:.02rem")}><Icon name="checkmark" size={13}/></span><p style={css("margin:0;font-size:var(--text-2xs);line-height:1.5;color:var(--fg)") }><strong style={css("font-weight:500")}>Outcome</strong> — {phase.outcome}</p></div>
  </Panel>)}</div>;
}

function RoadmapView({ actions, client, rows = [], mobile = false, complete = false, onComplete }: { actions: PortalActions; client: StudioClient; rows?: CrawlRow[]; mobile?: boolean; complete?: boolean; onComplete: () => void }) {
  const pageActions = rows.map(row => ({ row, decision: pageDecisionFor(row) })).filter(item => item.decision.action !== "Keep");
  const keywords = keywordPlanFor(rows);
  const pageMap = pageMapFor(rows);
  const planItems = [
    ...pageActions.map(({ row, decision }) => ({ workstream: "Page actions", item: `${decision.action}: ${decision.target} · ${decision.reason}`, page: row.url, phase: "Now", owner: decision.action === "Improve" ? "SEO + Copy" : "SEO + Developer", status: decision.action === "Delete" || decision.action === "Consolidate" ? "Needs approval" : "Ready" })),
    ...rows.filter(row => row.statusCode === 200 && pageDecisionFor(row).action === "Keep").map(row => ({ workstream: "Metadata", item: "Review and optimize page signals", page: row.url, phase: "Next", owner: "SEO + Copy", status: "Planned" })),
    ...keywords.map(row => ({ workstream: "Keywords", item: `Target “${row.keyword}”`, page: row.page, phase: "Next", owner: "SEO", status: "Planned" })),
    ...pageMap.map(row => ({ workstream: "Page map", item: `${row.status}: ${row.current} → ${row.proposed}`, page: row.proposed, phase: "Next", owner: "SEO + UX", status: "Needs approval" })),
    { workstream: "Search visibility", item: "Confirm Googlebot, Bingbot, and answer-engine crawler access in robots.txt", page: "Sitewide", phase: "Now", owner: "SEO + Developer", status: "Needs verification" },
    { workstream: "Search visibility", item: "Add answer-first summaries, explicit entities, and evidence-backed claims to priority pages", page: "Priority pages", phase: "Next", owner: "SEO + Copy", status: "Planned" },
    { workstream: "Search visibility", item: "Validate supported structured data against visible page content", page: "Priority templates", phase: "Next", owner: "SEO + Developer", status: "Planned" },
    { workstream: "Measurement", item: "Track rankings, conversions, answer-engine referrals, citations, and cited pages", page: "Sitewide", phase: "Later", owner: "SEO", status: "Planned" },
  ];
  const workstreams = Array.from(new Set(planItems.map(item => item.workstream))).map(workstream => ({ workstream, count: planItems.filter(item => item.workstream === workstream).length }));
  const total = planItems.length;
  const phaseMeta = [
    { phase: "Now", color: "var(--danger)", count: planItems.filter(item => item.phase === "Now").length },
    { phase: "Next", color: "var(--warn)", count: planItems.filter(item => item.phase === "Next").length },
    { phase: "Later", color: "var(--success)", count: planItems.filter(item => item.phase === "Later").length },
  ];
  const taskDrafts: TaskImportDraft[] = planItems.map((item, index) => ({
    title: item.item,
    description: `${item.workstream} · ${item.page}`,
    project: client.name,
    assignee: "Studio team",
    owner: "studio",
    priority: item.phase === "Now" ? "high" : item.phase === "Next" ? "med" : "low",
    due: item.phase === "Now" ? "This week" : item.phase === "Next" ? "Next sprint" : "Backlog",
    source: "audit",
    sourceId: `seo-plan:${client.id}:${item.workstream.toLowerCase().replace(/[^a-z0-9]+/g, "-")}:${index + 1}`,
    milestone: `SEO · ${item.phase}`,
  }));
  return <div style={css("display:flex;flex-direction:column;gap:.8rem") }>
    <Panel style="padding:1rem 1.1rem">
      <SectionTitle title="Roadmap at a glance" sub={`${total} actions across 3 phases and ${workstreams.length} workstreams.`}/>
      <div style={css("display:grid;grid-template-columns:" + (mobile ? "1fr" : "minmax(0,.85fr) minmax(0,1.15fr)") + ";gap:1.1rem;margin-top:.85rem;align-items:start") }>
        <div>
          <div style={css("font-size:var(--text-label);font-weight:500;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-faint);margin-bottom:.55rem")}>By phase</div>
          <div style={css("display:flex;height:.55rem;border-radius:999px;overflow:hidden;background:var(--surface-alt)") }>{phaseMeta.filter(p => p.count > 0).map(p => <div key={p.phase} style={css("width:" + (total ? p.count / total * 100 : 0) + "%;background:" + p.color)} />)}</div>
          <div style={css("display:flex;flex-direction:column;gap:.42rem;margin-top:.65rem") }>{phaseMeta.map(p => <div key={p.phase} style={css("display:flex;align-items:center;justify-content:space-between;gap:.6rem") }><span style={css("display:flex;align-items:center;gap:.42rem;font-size:var(--text-2xs);color:var(--fg-muted)") }><span style={css("width:.5rem;height:.5rem;border-radius:50%;background:" + p.color)}/>{p.phase}</span><strong style={css("font-size:var(--text-2xs);font-weight:500;font-variant-numeric:tabular-nums")}>{p.count}</strong></div>)}</div>
        </div>
        <div>
          <div style={css("font-size:var(--text-label);font-weight:500;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-faint);margin-bottom:.55rem")}>By workstream</div>
          <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,7.5rem),1fr));gap:.45rem") }>{workstreams.map(item => <div key={item.workstream} style={css("padding:.55rem .62rem;border:1px solid var(--border-soft);border-radius:.68rem;background:var(--surface-alt)") }><div style={css("font-size:var(--text-lg);font-weight:500;font-variant-numeric:tabular-nums")}>{item.count}</div><div style={css("margin-top:.1rem;font-size:var(--text-2xs);color:var(--fg-faint)")}>{item.workstream}</div></div>)}</div>
        </div>
      </div>
    </Panel>
    <RoadmapSummaryView mobile={mobile}/>
    <Panel style="overflow:hidden"><div style={css("padding:.9rem 1rem;border-bottom:1px solid var(--border-soft);display:flex;align-items:flex-start;justify-content:space-between;gap:.8rem;flex-wrap:wrap") }><SectionTitle title="Complete SEO plan register" sub="Every proposed action is listed with its page, phase, owner, and status."/><Pill tone="accent">{planItems.length} items</Pill></div><DataTable headers={["Workstream", "Planned action", "Page / scope", "Phase", "Owner", "Status"]} rows={planItems.map(item => [item.workstream, item.item, item.page, <Pill key="phase" tone={item.phase === "Now" ? "danger" : item.phase === "Next" ? "warn" : "success"}>{item.phase}</Pill>, item.owner, item.status])}/></Panel>
    <Panel style="padding:.9rem"><div style={css("display:flex;align-items:center;justify-content:space-between;gap:.8rem;flex-wrap:wrap") }><div><h3 style={css("margin:0;font-size:var(--text-sm);font-weight:500")}>{complete ? "SEO checkup complete" : "Ready to turn the complete plan into delivery?"}</h3><p style={css("margin:.25rem 0 0;font-size:var(--text-2xs);color:var(--fg-faint)")}>{complete ? "The reviewed report and action plan are ready for handoff." : `Create all ${planItems.length} listed actions in the studio to-do board.`}</p></div><div style={css("display:flex;align-items:center;gap:.45rem;flex-wrap:wrap") }><button type="button" onClick={() => actions.bulkImportTasks(taskDrafts)} className="pt-softbtn" style={css("height:2.2rem;padding:0 .85rem;border:1px solid var(--border);border-radius:999px;background:var(--surface);color:var(--fg);font-size:var(--text-2xs);font-weight:500;cursor:pointer")}>Create delivery tasks</button><button type="button" disabled={complete} onClick={onComplete} style={css("height:2.2rem;padding:0 .85rem;border:none;border-radius:999px;background:" + (complete ? "var(--success-soft)" : "var(--accent)") + ";color:" + (complete ? "var(--success)" : "#fff") + ";font-size:var(--text-2xs);font-weight:500;cursor:" + (complete ? "default" : "pointer"))}>{complete ? "Complete" : "Mark checkup complete"}</button></div></div></Panel>
  </div>;
}

function DataTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) { return <div style={css("overflow:auto") }><table style={css("width:100%;border-collapse:collapse;min-width:42rem") }><thead><tr>{headers.map(header => <th key={header} style={css("padding:.65rem .75rem;text-align:left;font-size:var(--text-2xs);font-weight:500;color:var(--fg-faint);background:var(--surface-alt);border-bottom:1px solid var(--border-soft);white-space:nowrap")}>{header}</th>)}</tr></thead><tbody>{rows.map((row,rowIndex) => <tr key={rowIndex}>{row.map((value,index) => <td key={index} style={css("padding:.68rem .75rem;border-bottom:1px solid var(--border-soft);font-size:var(--text-2xs);color:" + (index === 0 ? "var(--fg)" : "var(--fg-muted)") + ";max-width:17rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{value}</td>)}</tr>)}</tbody></table>{!rows.length && <div style={css("padding:2.5rem;text-align:center;color:var(--fg-faint);font-size:var(--text-2xs)")}>No matching rows.</div>}</div>; }
