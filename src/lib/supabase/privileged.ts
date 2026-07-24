import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabaseBrowserEnv } from "./env";
import { createSupabaseServerClient } from "./server";
import type { Database } from "./types";

/**
 * Legacy shared JSON tables are intentionally inaccessible through the public
 * Supabase key. Route handlers authorize the actor first, then use this
 * server-only client to read or mutate those legacy records.
 */
export async function createSupabasePrivilegedServerClient() {
  const secretKey =
    process.env.SUPABASE_SECRET_KEY?.trim()
    || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secretKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SUPABASE_SECRET_KEY is required for protected legacy portal storage.");
    }
    return createSupabaseServerClient();
  }
  const { url } = getSupabaseBrowserEnv();
  return createClient<Database>(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
