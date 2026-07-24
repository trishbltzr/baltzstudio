/**
 * Shared-hosting safety defaults.
 *
 * Workflow's Local World is intended for development and defaults to very high
 * concurrency. On Hostinger's managed Node runtime that can exhaust the
 * account-wide process/request allowance and make even /login return 503.
 *
 * Keep the value configurable so a future durable worker can raise it
 * deliberately, while making the current single-process deployment safe.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;

  process.env.WORKFLOW_LOCAL_QUEUE_CONCURRENCY ??=
    process.env.NODE_ENV === "production" ? "1" : "4";
}
