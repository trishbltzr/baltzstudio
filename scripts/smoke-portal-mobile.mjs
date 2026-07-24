import { access } from "node:fs/promises";
import puppeteer from "puppeteer-core";

const baseUrl = process.env.PORTAL_BASE_URL || "http://localhost:3412";
const chromeCandidates = [
  process.env.CHROME_BIN,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
].filter(Boolean);

const routes = [
  ["Dashboard", "view=progress"],
  ["Clients", "view=clients"],
  ["To-do's", "view=tasks"],
  ["Team access", "view=team"],
  ["Brand Audit", "view=audits&auditType=brand"],
  ["Website Audit", "view=audits&auditType=website"],
  ["SEO Audit", "view=audits&auditType=seo"],
  ["Funnel Builder", "view=funnels&builderType=funnel"],
  ["Website Builder", "view=funnels&builderType=website"],
  ["Social Media Builder", "view=funnels&builderType=social"],
  ["Inbox", "view=inbox"],
  ["Playbooks", "view=playbooks"],
  ["Billing", "view=billing"],
];

const users = {
  admin: { email: "trisha@baltazarstudio.co", role: "admin", name: "Trisha Baltazar" },
  client: { email: "creator-iq@client.baltazarstudio.co", role: "client", name: "CreatorIQ", clientName: "CreatorIQ" },
};

async function chromePath() {
  for (const candidate of chromeCandidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next local Chrome-compatible browser.
    }
  }
  throw new Error("Chrome was not found. Set CHROME_BIN to run the mobile smoke test.");
}

async function authenticate(page, user) {
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  const result = await page.evaluate(async value => {
    const response = await fetch("/api/dev-login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: value.email,
        password: value.role === "admin" ? "studio123" : "client123",
      }),
    });
    const payload = await response.json().catch(() => null);
    if (response.ok && payload?.user) sessionStorage.setItem("bs-user", JSON.stringify(payload.user));
    return { ok: response.ok, error: payload?.error };
  }, user);
  if (!result.ok) throw new Error(result.error || `Unable to authenticate ${user.role} smoke session.`);
}

async function inspectRoute(page, name, query, role) {
  const errors = [];
  const onPageError = error => errors.push(error.message);
  page.on("pageerror", onPageError);
  const response = await page.goto(`${baseUrl}/dashboard?${query}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForFunction(() => document.body.innerText.trim().length > 100, { timeout: 5_000 }).catch(() => undefined);
  await new Promise(resolve => setTimeout(resolve, 150));
  const result = await page.evaluate(roleName => {
    const bodyText = document.body.innerText;
    const grid = document.querySelector(".pt-client-picker-grid");
    const columns = grid ? getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length : null;
    return {
      bodyLength: bodyText.trim().length,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      hasOverlay: Boolean(document.querySelector("[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay")),
      columns,
      hiddenIdentityVisible: /\bKier\b|\bDev\b/.test(bodyText),
      foreignClientVisible: roleName === "client" && ["Blue Ribbon", "Concertina", "Enterprise Growth System", "Feather & Tail", "Kaya Services"].some(client => bodyText.includes(client)),
    };
  }, role);
  page.off("pageerror", onPageError);

  const failures = [];
  if (response?.status() !== 200) failures.push(`HTTP ${response?.status() || "unknown"}`);
  if (result.bodyLength < 100) failures.push("blank or incomplete page");
  if (result.overflow > 1) failures.push(`${result.overflow}px horizontal overflow`);
  if (result.hasOverlay) failures.push("framework error overlay");
  if (result.columns !== null && result.columns !== 1) failures.push(`expected one mobile grid column, found ${result.columns}`);
  if (result.hiddenIdentityVisible) failures.push("hidden role or team identity is visible");
  if (result.foreignClientVisible) failures.push("foreign client is visible in client mode");
  if (errors.length) failures.push(`runtime errors: ${errors.join(" | ")}`);
  return { role, route: name, columns: result.columns ?? "—", status: failures.length ? "FAIL" : "PASS", failures };
}

const browser = await puppeteer.launch({
  executablePath: await chromePath(),
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

const results = [];
try {
  for (const role of ["admin", "client"]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    await page.setRequestInterception(true);
    page.on("request", request => {
      const isWorkspaceWrite = request.url().includes("/api/portal-workspace-state") && request.method() !== "GET";
      if (isWorkspaceWrite) request.respond({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
      else request.continue();
    });
    await authenticate(page, users[role]);
    const selectedRoutes = role === "admin" ? routes : routes.filter(([, query]) => query === "view=progress" || query.includes("view=audits") || query.includes("view=funnels"));
    for (const [name, query] of selectedRoutes) results.push(await inspectRoute(page, name, query, role));
    await context.close();
  }
} finally {
  await browser.close();
}

console.table(results.map(({ role, route, columns, status }) => ({ role, route, columns, status })));
const failures = results.filter(result => result.status === "FAIL");
if (failures.length) {
  failures.forEach(result => console.error(`${result.role} · ${result.route}: ${result.failures.join("; ")}`));
  process.exitCode = 1;
}
