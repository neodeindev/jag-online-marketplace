"use client";

import { useEffect, useMemo } from "react";
import { rememberViewed, useRecentlyViewed } from "@/lib/recently-viewed";
import type { ProductCardData } from "@/lib/types";
import { ProductRail } from "./product-rail";
import { SectionHeading } from "./section-heading";

/** "Recently viewed" rail from this device's history. Hidden until there's something to show. */
export function RecentlyViewed({ excludeId, className }: { excludeId?: string; className?: string }) {
  const all = useRecentlyViewed();
  const items = useMemo(() => all.filter((p) => p.id !== excludeId), [all, excludeId]);

  if (items.length < 2) return null;

  return (
    <section className={className}>
      <SectionHeading title="Recently viewed" />
      <ProductRail products={items} />
    </section>
  );
}

/** Drop on a product page to add it to the visitor's history. */
export function TrackView({ product }: { product: ProductCardData }) {
  useEffect(() => {
    rememberViewed(product);
  }, [product]);
  return null;
}
