"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseBrowserEnv } from "./env";
import type { Database } from "./types";

export function createSupabaseBrowserClient() {
  const { url, publishableKey } = getSupabaseBrowserEnv();

  return createBrowserClient<Database>(url, publishableKey);
}
