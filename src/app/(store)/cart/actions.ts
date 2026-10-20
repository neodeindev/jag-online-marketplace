"use server";

import { z } from "zod";
import { currentPriceFor } from "@/lib/pricing";
import { createPublicClient } from "@/lib/supabase/public";

export interface CartProductInfo {
  id: string;
  slug: string;
  title: string;
  image: string | null;
  price: number;
  compareAt: number;
  stock: number;
}

/** Fresh price and stock for the products in a cart. Missing ids are no longer for sale. */
export async function getCartProducts(ids: string[]): Promise<CartProductInfo[]> {
  const parsed = z.array(z.uuid()).max(100).safeParse([...new Set(ids)]);
  if (!parsed.success || parsed.data.length === 0) return [];

  const { data, error } = await createPublicClient()
    .from("products")
    .select("id, slug, title, price, sale_price, sale_ends_at, stock, images:product_images(url, sort_order)")
    .in("id", parsed.data)
    .eq("status", "active");
  if (error) throw new Error("Couldn't check your cart. Refresh to try again.");

  return data.map((p) => {
    const images = [...(p.images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
    const price = Number(p.price);
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      image: images[0]?.url ?? null,
      price: currentPriceFor(price, p.sale_price === null ? null : Number(p.sale_price), p.sale_ends_at),
      compareAt: price,
      stock: p.stock,
    };
  });
}
