"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublishableKey, getSupabaseUrl } from "./config";
import type { Database } from "./database.types";

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

/** Browser client acting as the signed-in visitor. One instance per tab. */
export function createClient() {
  client ??= createBrowserClient<Database>(getSupabaseUrl(), getSupabasePublishableKey());
  return client;
}
