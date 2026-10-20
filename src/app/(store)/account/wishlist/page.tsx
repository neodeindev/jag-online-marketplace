import { Heart } from "lucide-react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { searchProducts } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/server";
import { ProductGrid } from "@/components/store/product-card";
import { ButtonLink } from "@/components/ui/button";

export const instant = false;
export const metadata: Metadata = { title: "Wishlist", robots: { index: false } };

export default async function WishlistPage() {
  const user = await requireUser("/account/wishlist");
  const supabase = await createClient();
  const { data } = await supabase
    .from("wishlist_items")
    .select("product_id, created_at, product:products(slug)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as unknown as { product_id: string; product: { slug: string } | null }[];
  const ids = new Set(rows.filter((r) => r.product).map((r) => r.product_id));

  const order = rows.filter((r) => r.product).map((r) => r.product_id);
  const cards = ids.size ? (await searchProducts({ ids: order, pageSize: 60 })).products : [];
  cards.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

  return (
    <section className="rounded-[20px] bg-white p-5 shadow-card sm:p-6">
      <h2 className="mb-5 text-lg font-bold text-ink">Wishlist ({ids.size})</h2>
      {ids.size === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <Heart className="mb-3 size-10 text-subtle" />
          <p className="font-bold text-ink">Nothing saved yet</p>
          <p className="mt-1 text-sm text-muted">Tap the heart on any product to save it here for later.</p>
          <ButtonLink href="/deals" className="mt-5">
            Browse deals
          </ButtonLink>
        </div>
      ) : (
        <ProductGrid products={cards} className="xl:grid-cols-4" />
      )}
    </section>
  );
}
