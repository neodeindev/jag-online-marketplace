import "server-only";

import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

/** Storage path for a public URL in one of our buckets, or null for outside links. */
export function storagePathFromUrl(url: string | null | undefined, bucket: string): string | null {
  if (!url) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const prefix = `${base}/storage/v1/object/public/${bucket}/`;
  return base && url.startsWith(prefix) ? decodeURIComponent(url.slice(prefix.length)) : null;
}

/** Removes files we no longer reference. Failures are logged, not thrown — the database change already happened. */
export async function removeStorageFiles(supabase: Client, bucket: string, paths: (string | null | undefined)[]) {
  const list = paths.filter((p): p is string => Boolean(p));
  if (list.length === 0) return;
  const { error } = await supabase.storage.from(bucket).remove(list);
  if (error) console.error(`[storage] Couldn't remove ${list.join(", ")} from ${bucket}:`, error.message);
}
