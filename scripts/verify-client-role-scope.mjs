import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const tenantId = process.env.PILOT_TENANT_ID;
const clientId = process.env.PILOT_CLIENT_ID;
const baseUrl = process.env.PILOT_BASE_URL || "http://localhost:3412";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!tenantId || !clientId) throw new Error("PILOT_TENANT_ID and PILOT_CLIENT_ID are required.");
if (!supabaseUrl || !publishableKey || !secretKey) {
  throw new Error("Supabase URL, publishable key, and secret key are required.");
}

const privileged = createClient(supabaseUrl, secretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const temporaryEmail = `client-scope-check+${Date.now()}@example.com`;
let temporaryUserId = null;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function authenticatedCookieHeader(email) {
  const { data: link, error: linkError } = await privileged.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkError) throw linkError;
  const tokenHash = link?.properties?.hashed_token;
  if (!tokenHash) throw new Error("Supabase did not return a magic-link token hash.");

  let cookies = [];
  const sessionClient = createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll: () => [],
      setAll: values => {
        cookies = values;
      },
    },
  });
  const { error: verifyError } = await sessionClient.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });
  if (verifyError) throw verifyError;
  assert(cookies.length > 0, "Supabase did not establish a cookie session.");
  return cookies.map(cookie => `${cookie.name}=${cookie.value}`).join("; ");
}

async function request(path, cookie) {
  const response = await fetch(new URL(path, baseUrl), {
    headers: { cookie },
    redirect: "manual",
  });
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = await response.text();
  }
  return { status: response.status, body };
}

try {
  const { data: created, error: createError } = await privileged.auth.admin.createUser({
    email: temporaryEmail,
    email_confirm: true,
  });
  if (createError) throw createError;
  temporaryUserId = created.user?.id ?? null;
  if (!temporaryUserId) throw new Error("Temporary client user was not created.");

  const { error: membershipError } = await privileged
    .from("portal_tenant_memberships")
    .insert({
      tenant_id: tenantId,
      user_id: temporaryUserId,
      role: "client",
      client_id: clientId,
    });
  if (membershipError) throw membershipError;

  const cookie = await authenticatedCookieHeader(temporaryEmail);
  const [runs, governance, clients] = await Promise.all([
    request("/api/service-runs?active=false", cookie),
    request("/api/workflow-governance", cookie),
    request("/api/portal-clients", cookie),
  ]);

  assert(runs.status === 200, `Client service-runs request returned ${runs.status}.`);
  assert(runs.body?.role === "client", "Client service-runs response did not preserve the client role.");
  assert(Array.isArray(runs.body?.runs), "Client service-runs response did not contain a run list.");
  assert(
    runs.body.runs.every(run => run.clientId === clientId),
    "Client service-runs response included another client's run.",
  );

  const forbiddenRunKeys = new Set([
    "workflowId",
    "checkpoint",
    "selectedCheckKeys",
    "agent",
    "toolTrace",
    "blockerCode",
    "recoveryAction",
    "exceptionKind",
    "triggerKind",
    "playbook",
  ]);
  for (const run of runs.body.runs) {
    for (const key of forbiddenRunKeys) {
      assert(!(key in run), `Client service-runs response exposed staff field: ${key}.`);
    }
  }

  assert(governance.status === 403, `Client governance request returned ${governance.status}, expected 403.`);
  assert(clients.status === 200, `Client portal-clients request returned ${clients.status}.`);
  assert(Array.isArray(clients.body?.clients), "Client portal-clients response did not contain a client list.");
  assert(
    clients.body.clients.every(client => client.id === clientId),
    "Client portal-clients response included another client.",
  );

  console.log(JSON.stringify({
    ok: true,
    role: runs.body.role,
    scopedRunCount: runs.body.runs.length,
    scopedClientCount: clients.body.clients.length,
    governanceStatus: governance.status,
    staffFieldsExposed: false,
  }));
} finally {
  if (temporaryUserId) {
    await privileged
      .from("portal_tenant_memberships")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("user_id", temporaryUserId);
    await privileged.auth.admin.deleteUser(temporaryUserId);
  }
}
