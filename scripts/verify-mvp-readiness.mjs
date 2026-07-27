import { readFile } from "node:fs/promises";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const requiredCore = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "OPENAI_API_KEY",
];

function missing(keys) {
  return keys.filter(key => !process.env[key]?.trim());
}

const checks = [];
const record = (name, ok, detail) => checks.push({ name, ok, detail });
const coreMissing = missing(requiredCore);
record("core_environment", coreMissing.length === 0, coreMissing.length ? `Missing: ${coreMissing.join(", ")}` : "Ready");

const baseUrl = (process.env.PORTAL_BASE_URL || "http://localhost:3412").replace(/\/$/, "");
try {
  const loginResponse = await fetch(`${baseUrl}/login`, { redirect: "manual" });
  record("login_route", loginResponse.status >= 200 && loginResponse.status < 400, `HTTP ${loginResponse.status}`);

  const authResponse = await fetch(`${baseUrl}/api/auth/me`, { redirect: "manual" });
  record("unauthenticated_access", authResponse.status === 401 || authResponse.status === 403, `HTTP ${authResponse.status}`);

  const devLoginResponse = await fetch(`${baseUrl}/api/dev-login`, { method: "POST", redirect: "manual" });
  record("development_login", devLoginResponse.status === 404, `HTTP ${devLoginResponse.status}`);

  const expectedHeaders = [
    "x-content-type-options",
    "x-frame-options",
    "referrer-policy",
    "permissions-policy",
  ];
  const missingHeaders = expectedHeaders.filter(header => !loginResponse.headers.get(header));
  record("security_headers", missingHeaders.length === 0, missingHeaders.length ? `Missing: ${missingHeaders.join(", ")}` : "Present");
} catch (error) {
  record("local_server", false, error instanceof Error ? error.message : "Unable to reach the application.");
}

const sourceChecks = [
  ["src/portal/store.ts", /seed(?:Tasks|Threads|JourneyGates|Escalations)\s*\(/],
  ["src/portal/funnels/Funnels.tsx", /seedFunnelBuilds\s*\(/],
  ["src/portal/builders/SeoProjectWorkspace.tsx", /tasks prepared for import/],
  ["src/portal/funnels/Funnels.tsx", /onCopy:\s*\(\)\s*=>\s*showToast\(/],
  ["src/portal/views/ClientDetail.tsx", /STUDIO_CLIENTS|DETAIL_(?:BIRTHDAYS|CITIES|NOTES|SINCE)/],
  ["src/portal/views/ProgressDeliverySections.tsx", /STUDIO_CLIENTS|ADMIN_STATS|ALL_PROJECTS/],
  ["src/portal/builders/WebsiteBuilder.tsx", /clientsVisibleToRole/],
  ["src/portal/builders/SocialMediaBuilder.tsx", /clientsVisibleToRole/],
];
for (const [path, pattern] of sourceChecks) {
  const source = await readFile(path, "utf8");
  record(`source:${path}`, !pattern.test(source), pattern.test(source) ? "Contains an MVP-blocking fallback or decorative action." : "Clear");
}

const failed = checks.filter(check => !check.ok);
console.log(JSON.stringify({
  ok: failed.length === 0,
  baseUrl,
  checks,
  blockers: failed.map(check => ({ name: check.name, detail: check.detail })),
}, null, 2));

if (failed.length) process.exitCode = 1;
