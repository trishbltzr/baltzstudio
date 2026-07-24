import type { LighthouseInsight, LighthouseMetric, LighthouseRun } from "./auditChecklist";
import { withExclusiveServerResource } from "./serverResourceGuard";

const METRICS = [
  ["first-contentful-paint", "First Contentful Paint"],
  ["largest-contentful-paint", "Largest Contentful Paint"],
  ["speed-index", "Speed Index"],
  ["total-blocking-time", "Total Blocking Time"],
  ["cumulative-layout-shift", "Cumulative Layout Shift"],
] as const;

const LOCAL_LIGHTHOUSE_TIMEOUT_MS = 50_000;
const SANDBOX_LIGHTHOUSE_TIMEOUT_MS = 3 * 60_000;
const LIGHTHOUSE_VERSION = "13.4.0";

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

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

async function commandFailureMessage(
  result: { exitCode: number; stderr(): Promise<string> },
  fallback: string,
) {
  if (result.exitCode === 0) return null;
  const stderr = (await result.stderr()).replace(/\s+/g, " ").trim();
  return stderr.slice(-500) || fallback;
}

async function runSandboxLighthouse(url: string, strategy: "mobile" | "desktop") {
  const { Sandbox } = await import("@vercel/sandbox");
  const sandbox = await Sandbox.create({
    runtime: "node24",
    timeout: SANDBOX_LIGHTHOUSE_TIMEOUT_MS,
    resources: { vcpus: 2 },
    persistent: false,
    tags: { workload: "lighthouse", strategy },
  });
  try {
    const install = await sandbox.runCommand({
      cmd: "dnf",
      args: ["install", "-y", "https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm"],
      sudo: true,
      timeoutMs: 120_000,
    });
    const installError = await commandFailureMessage(install, "Chrome could not be installed in Vercel Sandbox.");
    if (installError) throw new Error(installError);

    const outputPath = `/vercel/sandbox/lighthouse-${strategy}.json`;
    const args = [
      "--yes",
      `lighthouse@${LIGHTHOUSE_VERSION}`,
      url,
      "--quiet",
      "--output=json",
      `--output-path=${outputPath}`,
      "--only-categories=performance,accessibility,best-practices,seo",
      "--max-wait-for-load=45000",
      "--chrome-path=/usr/bin/google-chrome-stable",
      "--chrome-flags=--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage",
      ...(strategy === "desktop" ? ["--preset=desktop"] : []),
    ];
    const run = await sandbox.runCommand({
      cmd: "npx",
      args,
      timeoutMs: 90_000,
    });
    const runError = await commandFailureMessage(run, `Vercel Sandbox Lighthouse ${strategy} failed.`);
    if (runError) throw new Error(runError);
    const output = await sandbox.readFileToBuffer({ path: outputPath });
    if (!output) throw new Error(`Vercel Sandbox Lighthouse ${strategy} produced no report.`);
    return toRun(JSON.parse(output.toString("utf8")), strategy, url);
  } finally {
    await sandbox.stop().catch(() => undefined);
  }
}

async function runLocalLighthouse(url: string, strategies: Array<"mobile" | "desktop">) {
  return withExclusiveServerResource("Chromium", async () => {
    const chromePath = process.env.CHROME_PATH
      || (process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : undefined);
    const [{ default: lighthouse }, chromeLauncher, { default: desktopConfig }] = await Promise.all([
      import(/* webpackIgnore: true */ "lighthouse"),
      import(/* webpackIgnore: true */ "chrome-launcher"),
      import(/* webpackIgnore: true */ "lighthouse/core/config/desktop-config.js"),
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
      for (const strategy of strategies) {
        try {
          successful.push(await withTimeout(
            run(strategy),
            LOCAL_LIGHTHOUSE_TIMEOUT_MS,
            `Local Google Lighthouse ${strategy} test timed out.`,
          ));
        }
        catch (error) { console.warn(`Local Lighthouse ${strategy} run failed.`, error instanceof Error ? error.message : error); }
      }
      if (!successful.length) throw new Error("Local Google Lighthouse could not complete either strategy.");
      return successful;
    } finally {
      await chrome.kill();
    }
  }, { waitMs: 20_000, maxQueue: 1 });
}

export async function runLighthouse(
  url: string,
  strategies: Array<"mobile" | "desktop"> = ["mobile", "desktop"],
) {
  if (!strategies.length) return [];
  if (process.env.VERCEL && process.env.VERCEL_SANDBOX_LIGHTHOUSE_ENABLED !== "0") {
    const sandboxResults = await Promise.allSettled(
      strategies.map(strategy => runSandboxLighthouse(url, strategy)),
    );
    const successful = sandboxResults.flatMap(result => result.status === "fulfilled" ? [result.value] : []);
    if (successful.length === strategies.length) return successful;
    for (const result of sandboxResults) {
      if (result.status === "rejected") {
        console.warn("Vercel Sandbox Lighthouse failed; using the bounded PageSpeed fallback.", result.reason);
      }
    }
  }
  try {
    return await runLocalLighthouse(url, strategies);
  } catch (localError) {
    const results = await Promise.allSettled(strategies.map(strategy => runPageSpeed(url, strategy)));
    const successful = results.flatMap(result => result.status === "fulfilled" ? [result.value] : []);
    if (successful.length) return successful;
    throw localError;
  }
}
