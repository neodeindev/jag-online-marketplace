import { createClient } from "@supabase/supabase-js";
import { getSupabasePublishableKey, getSupabaseUrl } from "./config";
import type { Database } from "./database.types";

/**
 * Anonymous client with no session. Used for public catalog reads inside
 * `"use cache"` functions, which can't touch cookies.
 */
export function createPublicClient() {
  return createClient<Database>(getSupabaseUrl(), getSupabasePublishableKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
