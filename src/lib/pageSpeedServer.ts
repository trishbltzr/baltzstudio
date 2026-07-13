import type { LighthouseInsight, LighthouseMetric, LighthouseRun } from "./auditChecklist";

const METRICS = [
  ["first-contentful-paint", "First Contentful Paint"],
  ["largest-contentful-paint", "Largest Contentful Paint"],
  ["speed-index", "Speed Index"],
  ["total-blocking-time", "Total Blocking Time"],
  ["cumulative-layout-shift", "Cumulative Layout Shift"],
] as const;

const categoryScore = (category: unknown) => {
  const score = (category as { score?: unknown } | undefined)?.score;
  return typeof score === "number" ? Math.round(score * 100) : 0;
};

function toRun(result: any, strategy: "mobile" | "desktop", fallbackUrl: string): LighthouseRun {
  const audits = result.audits || {};
  const metrics: LighthouseMetric[] = METRICS.map(([id, label]) => ({
    id,
    label,
    displayValue: typeof audits[id]?.displayValue === "string" ? audits[id].displayValue : "Not reported",
    score: typeof audits[id]?.score === "number" ? Math.round(audits[id].score * 100) : null,
  }));
  const categoryByAudit = new Map<string, LighthouseInsight["category"]>();
  const categoryKeys = [["performance", "performance"], ["accessibility", "accessibility"], ["best-practices", "bestPractices"], ["seo", "seo"]] as const;
  for (const [resultKey, category] of categoryKeys) {
    for (const reference of result.categories?.[resultKey]?.auditRefs || []) {
      if (typeof reference?.id === "string" && (reference.weight || 0) > 0) categoryByAudit.set(reference.id, category);
    }
  }
  const cleanDescription = (value: unknown) => typeof value === "string"
    ? value.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1").replace(/`/g, "").replace(/\s+/g, " ").trim().slice(0, 280)
    : "";
  const insights: LighthouseInsight[] = Object.entries<any>(audits)
    .flatMap(([id, audit]) => {
      const category = categoryByAudit.get(id);
      if (!category || typeof audit?.score !== "number" || audit.score >= 0.9 || METRICS.some(([metricId]) => metricId === id)) return [];
      return [{ id, title: String(audit.title || id), description: cleanDescription(audit.description), displayValue: typeof audit.displayValue === "string" ? audit.displayValue : null, score: Math.round(audit.score * 100), category }];
    })
    .sort((left, right) => left.score - right.score)
    .slice(0, 12);
  return {
    strategy,
    testedUrl: result.finalUrl || result.requestedUrl || fallbackUrl,
    fetchedAt: result.fetchTime || new Date().toISOString(),
    lighthouseVersion: result.lighthouseVersion || "Unknown",
    scores: {
      performance: categoryScore(result.categories?.performance),
      accessibility: categoryScore(result.categories?.accessibility),
      bestPractices: categoryScore(result.categories?.["best-practices"]),
      seo: categoryScore(result.categories?.seo),
    },
    metrics,
    insights,
  };
}

async function runPageSpeed(url: string, strategy: "mobile" | "desktop"): Promise<LighthouseRun> {
  const endpoint = new URL("https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed");
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("strategy", strategy);
  endpoint.searchParams.set("locale", "en");
  endpoint.searchParams.set("utm_source", "baltazar-studio-dashboard");
  ["performance", "accessibility", "best-practices", "seo"].forEach(value => endpoint.searchParams.append("category", value));
  if (process.env.GOOGLE_PAGESPEED_API_KEY) endpoint.searchParams.set("key", process.env.GOOGLE_PAGESPEED_API_KEY);

  const response = await fetch(endpoint, { signal: AbortSignal.timeout(45_000), cache: "no-store" });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.lighthouseResult) {
    const message = payload?.error?.message;
    throw new Error(typeof message === "string" ? message : `Google Lighthouse ${strategy} test failed.`);
  }

  return toRun(payload.lighthouseResult, strategy, url);
}

async function runLocalLighthouse(url: string) {
  const chromePath = process.env.CHROME_PATH
    || (process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : undefined);
  const [{ default: lighthouse }, chromeLauncher, { default: desktopConfig }] = await Promise.all([
    import("lighthouse"),
    import("chrome-launcher"),
    import("lighthouse/core/config/desktop-config.js"),
  ]);
  const chrome = await chromeLauncher.launch({ chromePath, chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"] });
  try {
    const run = async (strategy: "mobile" | "desktop") => {
      const result = await lighthouse(url, {
        port: chrome.port,
        logLevel: "error",
        output: "json",
        onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
      }, strategy === "desktop" ? desktopConfig : undefined);
      if (!result?.lhr) throw new Error(`Local Google Lighthouse ${strategy} test failed.`);
      return toRun(result.lhr, strategy, url);
    };
    const successful: LighthouseRun[] = [];
    for (const strategy of ["mobile", "desktop"] as const) {
      try { successful.push(await run(strategy)); }
      catch (error) { console.warn(`Local Lighthouse ${strategy} run failed.`, error instanceof Error ? error.message : error); }
    }
    if (!successful.length) throw new Error("Local Google Lighthouse could not complete either strategy.");
    return successful;
  } finally {
    await chrome.kill();
  }
}

export async function runLighthouse(url: string) {
  try {
    return await runLocalLighthouse(url);
  } catch (localError) {
    const results = await Promise.allSettled([runPageSpeed(url, "mobile"), runPageSpeed(url, "desktop")]);
    const successful = results.flatMap(result => result.status === "fulfilled" ? [result.value] : []);
    if (successful.length) return successful;
    throw localError;
  }
}
