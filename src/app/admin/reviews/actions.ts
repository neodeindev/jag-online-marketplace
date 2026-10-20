"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { fail, type ActionResult } from "@/lib/action-result";
import { authorize } from "@/lib/auth";
import { CACHE_TAGS } from "@/lib/catalog";

const statusSchema = z.object({ id: z.uuid(), status: z.enum(["pending", "published", "hidden"]) });

/** Publishing or hiding a review also updates the product's star rating (database trigger). */
export async function setReviewStatus(id: string, status: "pending" | "published" | "hidden"): Promise<ActionResult> {
  const parsed = statusSchema.safeParse({ id, status });
  if (!parsed.success) return { ok: false, error: "Review not found." };
  try {
    const { supabase } = await authorize("products");
    const { error } = await supabase.from("reviews").update({ status: parsed.data.status }).eq("id", parsed.data.id);
    if (error) return fail(error);
    updateTag(CACHE_TAGS.catalog);
    const message = { published: "Review published", hidden: "Review hidden", pending: "Review moved back to pending" }[parsed.data.status];
    return { ok: true, message };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteReview(id: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Review not found." };
  try {
    const { supabase } = await authorize("products");
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) return fail(error);
    updateTag(CACHE_TAGS.catalog);
    return { ok: true, message: "Review deleted" };
  } catch (error) {
    return fail(error);
  }
}
