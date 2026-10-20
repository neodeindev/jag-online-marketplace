import "server-only";

import type { ServerSupabase } from "./catalog-admin";

/** Storage path from a public Supabase Storage URL in `bucket`, or null for links hosted elsewhere. */
export function catalogStoragePath(url: string | null | undefined, bucket: string): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  const path = url.slice(index + marker.length).split("?")[0];
  try {
    return decodeURIComponent(path) || null;
  } catch {
    return path || null;
  }
}

/** Deletes files we no longer use. Logs instead of throwing: the database change already succeeded. */
export async function removeCatalogFiles(supabase: ServerSupabase, bucket: string, paths: (string | null | undefined)[]) {
  const list = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  for (let i = 0; i < list.length; i += 100) {
    const { error } = await supabase.storage.from(bucket).remove(list.slice(i, i + 100));
    if (error) console.error(`[storage] Couldn't remove files from ${bucket}:`, error.message);
  }
}
