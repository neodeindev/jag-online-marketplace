import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabaseUrl } from "./config";
import type { Database } from "./database.types";

/**
 * Service-role client. Bypasses row level security, so only use it after the
 * caller's own permissions have been checked, and never send it to the browser.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SECRET_KEY is not set. It's needed to create staff accounts.");
  }
  return createClient<Database>(getSupabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function hasAdminKey(): boolean {
  return Boolean(process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY);
}
