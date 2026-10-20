"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { fail, type ActionResult } from "@/lib/action-result";
import type { ImportPayload } from "@/lib/admin/product-csv";
import { authorize } from "@/lib/auth";
import { CACHE_TAGS } from "@/lib/catalog";
import type { Json } from "@/lib/supabase/database.types";

export interface ImportRowResult {
  row: number;
  sku: string | null;
  status: "created" | "updated" | "error";
  message?: string;
}

/** Which of these SKUs already exist (lower-cased), so the preview can tell updates from new products. */
export async function findExistingSkus(skus: string[]): Promise<ActionResult<string[]>> {
  const parsed = z.array(z.string().trim().min(1).max(64)).max(5000).safeParse(skus);
  if (!parsed.success) return { ok: false, error: "Couldn't read the SKUs in this file." };
  try {
    const { supabase } = await authorize("products");
    const wanted = new Set(parsed.data.map((s) => s.toLowerCase()));
    const found: string[] = [];
    // Read all SKUs in pages of 1,000 (the API limit) and compare here; exact, case-insensitive.
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from("products").select("sku").order("sku").range(from, from + 999);
      if (error) return fail(error);
      const batch = (data ?? []) as { sku: string }[];
      for (const { sku } of batch) if (wanted.has(sku.toLowerCase())) found.push(sku.toLowerCase());
      if (batch.length < 1000) break;
    }
    return { ok: true, data: found };
  } catch (error) {
    return fail(error);
  }
}

const payloadSchema = z.array(z.record(z.string(), z.unknown())).min(1).max(100);

/**
 * Imports up to 100 rows at a time through admin_import_products(), which
 * matches by SKU, creates missing categories/brands/attributes, and reports
 * per-row results. `row` in each result is the 1-based position in `rows`.
 */
export async function importProductChunk(rows: ImportPayload[]): Promise<ActionResult<ImportRowResult[]>> {
  const parsed = payloadSchema.safeParse(rows);
  if (!parsed.success) return { ok: false, error: "Send between 1 and 100 rows at a time." };
  try {
    const { supabase } = await authorize("products");
    const { data, error } = await supabase.rpc("admin_import_products", { p_rows: parsed.data as Json });
    if (error) return fail(error);
    const results = ((data ?? []) as { row: number; sku: string | null; status: string; message?: string }[]).map((r) => ({
      row: r.row,
      sku: r.sku,
      status: (r.status === "created" || r.status === "updated" ? r.status : "error") as ImportRowResult["status"],
      message: r.message,
    }));
    if (results.some((r) => r.status !== "error")) updateTag(CACHE_TAGS.catalog);
    return { ok: true, data: results };
  } catch (error) {
    return fail(error);
  }
}
