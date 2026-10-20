import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublishableKey, getSupabaseUrl } from "./config";
import type { Database } from "./database.types";

/**
 * Supabase client acting as the signed-in visitor (row level security applies).
 * Reads the session from cookies, so it can only be used at request time:
 * in Server Actions, Route Handlers, or components inside a <Suspense> boundary.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components can't set cookies. The proxy refreshes sessions instead.
        }
      },
    },
  });
}
