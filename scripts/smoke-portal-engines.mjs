import { access } from "node:fs/promises";
import puppeteer from "puppeteer-core";

const baseUrl = process.env.PORTAL_BASE_URL || "http://localhost:3412";
const chromeCandidates = [
  process.env.CHROME_BIN,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
].filter(Boolean);

const engines = [
  { name: "Brand Audit", query: "view=audits&auditType=brand", action: "Generate audit" },
  { name: "Website Audit", query: "view=audits&auditType=website", action: "Generate audit" },
  { name: "SEO Audit", query: "view=audits&auditType=seo", action: "Generate audit" },
  { name: "Funnel Builder", query: "view=funnels&builderType=funnel", action: "Generate funnel" },
  { name: "Website Builder", query: "view=funnels&builderType=website", action: "Generate website" },
  { name: "Social Media Builder", query: "view=funnels&builderType=social", action: "New calendar" },
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
      // Continue to the next supported local browser.
    }
  }
  throw new Error("Chrome was not found. Set CHROME_BIN to run the engine smoke test.");
}

async function authenticate(page, user) {
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.evaluate(value => sessionStorage.setItem("bs-user", JSON.stringify(value)), user);
}

async function inspectRoleSwitcher(page) {
  const response = await page.goto(`${baseUrl}/dashboard?view=progress`, { waitUntil: "networkidle0", timeout: 30_000 });
  const labels = await page.evaluate(() => Array.from(document.querySelectorAll("button"))
    .map(button => (button.textContent || "").trim())
    .filter(label => ["Admin", "Client", "Dev"].includes(label)));
  const failures = [];
  if (response?.status() !== 200) failures.push(`HTTP ${response?.status() || "unknown"}`);
  if (labels.join(",") !== "Admin,Client") failures.push(`expected Admin and Client role controls, found ${labels.join(", ") || "none"}`);
  return { role: "admin", engine: "Portal role switcher", cards: 0, status: failures.length ? "FAIL" : "PASS", failures };
}

async function inspectEngine(page, engine, role) {
  const errors = [];
  const onPageError = error => errors.push(error.message);
  const onConsole = message => {
    if (message.type() === "error") errors.push(message.text());
  };
  page.on("pageerror", onPageError);
  page.on("console", onConsole);

  const response = await page.goto(`${baseUrl}/dashboard?${engine.query}`, { waitUntil: "networkidle0", timeout: 30_000 });
  await new Promise(resolve => setTimeout(resolve, 500));
  const result = await page.evaluate(({ action, role }) => {
    const bodyText = document.body.innerText;
    const cards = Array.from(document.querySelectorAll(".client-card"));
    const buttons = Array.from(document.querySelectorAll("button")).map(button => (button.textContent || "").trim());
    const foreignClients = ["Blue Ribbon", "Concertina", "Enterprise Growth System", "Feather & Tail", "Kaya Services"];
    return {
      hasContent: bodyText.trim().length > 100,
      hasOverlay: !!document.querySelector("[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay"),
      actionCount: buttons.filter(label => label === action).length,
      chooserVisible: /Choose (a|an) (client|audited client)/i.test(bodyText),
      notStartedCards: cards.filter(card => /Not started/i.test(card.textContent || "")).length,
      clientVisible: role !== "client" || bodyText.includes("CreatorIQ"),
      foreignClients: role === "client" ? foreignClients.filter(name => bodyText.includes(name)) : [],
      hiddenIdentityVisible: /\bKier\b|\bDev\b/.test(bodyText),
      roleSwitchLabels: buttons.filter(label => ["Admin", "Client", "Dev"].includes(label)),
      clientBreadcrumbVisible: role === "client" && (bodyText.includes("← Back to dashboard") || bodyText.includes("Cocoon Consult · CreatorIQ")),
      cardCount: cards.length,
    };
  }, { action: engine.action, role });

  let standaloneOpened = true;
  if (role === "admin" && result.actionCount === 1) {
    await page.evaluate(action => {
      const button = Array.from(document.querySelectorAll("button"))
        .find(candidate => (candidate.textContent || "").trim() === action);
      button?.click();
    }, engine.action);
    await new Promise(resolve => setTimeout(resolve, 500));
    standaloneOpened = await page.evaluate(() => document.body.innerText.includes("Unassigned draft"));
  }

  page.off("pageerror", onPageError);
  page.off("console", onConsole);
  const failures = [];
  if (response?.status() !== 200) failures.push(`HTTP ${response?.status() || "unknown"}`);
  if (!result.hasContent) failures.push("blank page");
  if (result.hasOverlay) failures.push("framework error overlay");
  if (result.chooserVisible) failures.push("legacy client chooser is visible");
  if (result.notStartedCards) failures.push(`${result.notStartedCards} untouched card(s)`);
  if (!result.clientVisible) failures.push("assigned client is missing");
  if (result.foreignClients.length) failures.push(`foreign clients exposed: ${result.foreignClients.join(", ")}`);
  if (result.hiddenIdentityVisible) failures.push("hidden role or team identity is visible");
  if (result.clientBreadcrumbVisible) failures.push("client engine breadcrumb is visible");
  if (role === "admin" && result.actionCount !== 1) failures.push(`expected one ${engine.action} action, found ${result.actionCount}`);
  if (role === "admin" && !standaloneOpened) failures.push("primary action did not open standalone work");
  if (errors.length) failures.push(`runtime errors: ${errors.join(" | ")}`);
  return { role, engine: engine.name, cards: result.cardCount, status: failures.length ? "FAIL" : "PASS", failures };
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
    await page.setViewport({ width: 1440, height: 1000 });
    await page.setRequestInterception(true);
    page.on("request", request => {
      const isWorkspaceWrite = request.url().includes("/api/portal-workspace-state") && request.method() !== "GET";
      if (isWorkspaceWrite) {
        request.respond({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
      } else {
        request.continue();
      }
    });
    await authenticate(page, users[role]);
    if (role === "admin") results.push(await inspectRoleSwitcher(page));
    for (const engine of engines) results.push(await inspectEngine(page, engine, role));
    await context.close();
  }
} finally {
  await browser.close();
}

console.table(results.map(({ role, engine, cards, status }) => ({ role, engine, cards, status })));
const failures = results.filter(result => result.status === "FAIL");
if (failures.length) {
  failures.forEach(result => console.error(`${result.role} · ${result.engine}: ${result.failures.join("; ")}`));
  process.exitCode = 1;
}
