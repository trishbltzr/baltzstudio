import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const secretKey = process.env.SUPABASE_SECRET_KEY?.trim()
  || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const portalBaseUrl = (process.env.PORTAL_BASE_URL || "http://localhost:3412").replace(/\/$/, "");

assert.ok(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL is required.");
assert.ok(publishableKey, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required.");
assert.ok(secretKey, "SUPABASE_SECRET_KEY is required.");

const clientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
};
const publicClient = createClient(supabaseUrl, publishableKey, clientOptions);
const privilegedClient = createClient(supabaseUrl, secretKey, clientOptions);
const protectedTables = [
  "dashboard_state",
  "dashboard_project_state",
  "dashboard_user_state",
  "portal_audit_runs",
  "portal_workspace_state",
];

function isMissingTable(error) {
  return error?.code === "42P01"
    || error?.code === "PGRST205"
    || /could not find the table|does not exist/i.test(error?.message || "");
}

function isPermissionDenied(error) {
  return error?.code === "42501"
    || /permission denied|not allowed|forbidden/i.test(error?.message || "");
}

function isDeniedResult(result) {
  return result?.status === 401
    || result?.status === 403
    || isPermissionDenied(result?.error);
}

const verifiedTables = [];
for (const table of protectedTables) {
  const privilegedResult = await privilegedClient
    .from(table)
    .select("*", { count: "exact", head: true });
  if (privilegedResult.error && isMissingTable(privilegedResult.error)) continue;
  assert.ifError(privilegedResult.error);

  const publicResult = await publicClient
    .from(table)
    .select("*", { count: "exact", head: true });
  assert.ok(
    isDeniedResult(publicResult),
    `${table} must reject publishable-key reads after hardening.`,
  );
  verifiedTables.push(table);
}

assert.ok(verifiedTables.length >= 4, "Expected at least four protected legacy tables.");

const publicWorkflowResult = await publicClient.rpc("workflow_service_run_context", {
  p_run_id: "00000000-0000-0000-0000-000000000000",
  p_dispatch_token: "invalid-public-capability",
});
assert.ok(
  isDeniedResult(publicWorkflowResult),
  "Publishable-key callers must not execute durable workflow RPCs.",
);

const privilegedWorkflowResult = await privilegedClient.rpc("workflow_service_run_context", {
  p_run_id: "00000000-0000-0000-0000-000000000000",
  p_dispatch_token: "invalid-server-capability",
});
assert.match(
  privilegedWorkflowResult.error?.message || "",
  /invalid|expired/i,
  "The server role must reach the RPC but still reject an invalid capability token.",
);

const bucketResult = await privilegedClient.storage.getBucket("portal-uploads");
if (!bucketResult.error && bucketResult.data) {
  assert.equal(bucketResult.data.public, false, "portal-uploads must remain private.");
}

const loginResponse = await fetch(`${portalBaseUrl}/api/dev-login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    email: "trisha@baltazarstudio.co",
    password: "studio123",
  }),
});
assert.equal(loginResponse.status, 200, "Local staff login must succeed.");
const cookie = loginResponse.headers.get("set-cookie")?.split(";")[0];
assert.ok(cookie, "Local staff login must return a signed session cookie.");

const workspaceResponse = await fetch(`${portalBaseUrl}/api/portal-workspace-state`, {
  headers: { cookie },
});
assert.equal(
  workspaceResponse.status,
  200,
  `Privileged workspace read failed after hardening: ${await workspaceResponse.text()}`,
);

const auditResponse = await fetch(`${portalBaseUrl}/api/portal-audit-runs`, {
  headers: { cookie },
});
assert.equal(
  auditResponse.status,
  200,
  `Privileged audit read failed after hardening: ${await auditResponse.text()}`,
);

console.log(`legacy portal hardening verified (${verifiedTables.join(", ")})`);
