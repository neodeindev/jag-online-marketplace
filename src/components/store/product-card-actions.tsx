"use client";

import { Heart, Plus, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cart } from "@/lib/cart-store";
import type { ProductCardData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useSession } from "@/components/providers/session-provider";

export function WishlistHeart({
  productId,
  title,
  className,
}: {
  productId: string;
  title: string;
  className?: string;
}) {
  const { wishlist, toggleWishlist } = useSession();
  const saved = wishlist.has(productId);
  return (
    <button
      type="button"
      onClick={() => toggleWishlist(productId, title)}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${title} from wishlist` : `Save ${title} to wishlist`}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm backdrop-blur",
        "transition hover:scale-105 hover:text-flag",
        saved && "text-flag",
        className,
      )}
    >
      <Heart className={cn("size-[18px]", saved && "fill-current")} strokeWidth={2.2} />
    </button>
  );
}

/**
 * Round gold "+" on product cards. Products with choices (size, colour)
 * open the product page instead, so the shopper can pick.
 */
export function QuickAdd({ product }: { product: ProductCardData }) {
  const soldOut = product.stock <= 0;
  const base =
    "inline-flex size-10 items-center justify-center rounded-full shadow-[0_4px_12px_-2px_rgb(14_42_34/0.35)] transition hover:scale-105";

  if (soldOut) return null;

  if (product.has_options) {
    return (
      <Link
        href={`/p/${product.slug}`}
        className={cn(base, "bg-white text-ink")}
        aria-label={`Choose options for ${product.title}`}
        title="Choose options"
      >
        <SlidersHorizontal className="size-[18px]" strokeWidth={2.4} />
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={cn(base, "bg-gold text-ink")}
      aria-label={`Add ${product.title} to cart`}
      title="Add to cart"
      onClick={() => {
        const added = cart.add(
          {
            productId: product.id,
            slug: product.slug,
            title: product.title,
            image: product.image_url,
            price: product.current_price,
            compareAt: product.price,
            options: {},
            maxStock: product.stock,
          },
          1,
        );
        if (added > 0) cart.openDrawer();
        else toast.info(`You already have all ${product.stock} in your cart.`);
      }}
    >
      <Plus className="size-5" strokeWidth={2.8} />
    </button>
  );
}
