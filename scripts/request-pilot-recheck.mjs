import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const baseUrl = process.env.PILOT_BASE_URL || "http://localhost:3412";
const clientId = process.env.PILOT_CLIENT_ID;
const adminEmail = process.env.PILOT_ADMIN_EMAIL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const checkKeys = (process.env.PILOT_CHECK_KEYS || "")
  .split(",")
  .map(value => value.trim())
  .filter(Boolean);
const resumeRunId = process.env.PILOT_RESUME_RUN_ID?.trim();

if (!clientId || !adminEmail || !supabaseUrl || !publishableKey || !secretKey || (!resumeRunId && !checkKeys.length)) {
  throw new Error("Pilot client, admin, Supabase credentials, and either a run to resume or check keys are required.");
}

const privileged = createClient(supabaseUrl, secretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const { data: link, error: linkError } = await privileged.auth.admin.generateLink({
  type: "magiclink",
  email: adminEmail,
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
const cookie = cookies.map(value => `${value.name}=${value.value}`).join("; ");

const response = await fetch(new URL(
  resumeRunId ? `/api/service-runs/${resumeRunId}/recover` : "/api/service-runs/recheck",
  baseUrl,
), {
  method: "POST",
  headers: {
    "content-type": "application/json",
    cookie,
    ...(resumeRunId ? {} : { "idempotency-key": `pilot-timeout-${Date.now()}` }),
  },
  body: resumeRunId ? undefined : JSON.stringify({
    clientId,
    serviceKind: "website",
    scope: "changed",
    reason: "manual",
    checkKeys,
  }),
});
const body = await response.json();
if (!response.ok) throw new Error(body?.error || `Recheck request returned ${response.status}.`);
console.log(JSON.stringify({
  runId: body.run?.id || body.runId,
  state: body.run?.state || "resuming",
  workflowRunId: body.dispatch?.workflowRunId,
  checkCount: resumeRunId ? undefined : checkKeys.length,
  resumedFrom: body.resumedFrom,
}));
