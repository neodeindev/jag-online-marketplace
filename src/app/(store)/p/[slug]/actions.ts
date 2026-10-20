"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const reviewSchema = z.object({
  productId: z.uuid(),
  rating: z.coerce.number().int().min(1, "Choose a star rating.").max(5),
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().max(2000).optional(),
});

export type ReviewState = { ok: boolean; message: string } | null;

export async function submitReview(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const parsed = reviewSchema.safeParse({
    productId: formData.get("productId"),
    rating: formData.get("rating"),
    title: formData.get("title") || undefined,
    body: formData.get("body") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check your review and try again." };
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return { ok: false, message: "Sign in to write a review." };

  const { error } = await supabase.rpc("submit_review", {
    p_product_id: parsed.data.productId,
    p_rating: parsed.data.rating,
    p_title: parsed.data.title,
    p_body: parsed.data.body,
  });
  if (error) return { ok: false, message: error.message };

  return { ok: true, message: "Thanks! Your review will appear once it's been checked." };
}
