/**
 * Price a shopper pays right now. Mirrors public.price_now() in the database,
 * which remains the source of truth at checkout.
 */
export function currentPriceFor(
  price: number,
  salePrice: number | null,
  saleEndsAt: string | null,
  now: number = Date.now(),
): number {
  if (salePrice !== null && salePrice < price && (!saleEndsAt || new Date(saleEndsAt).getTime() > now)) {
    return salePrice;
  }
  return price;
}

/** Delivery fee for a zone, mirroring place_order(): pickup is free, and so is anything over the threshold. */
export function deliveryFeeFor(
  zone: { fee: number; is_pickup: boolean } | null | undefined,
  subtotal: number,
  freeThreshold: number | null,
): number {
  if (!zone || zone.is_pickup) return 0;
  if (freeThreshold !== null && subtotal >= freeThreshold) return 0;
  return zone.fee;
}
