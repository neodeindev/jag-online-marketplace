"use client";

import { Truck } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { useStoreConfig } from "@/components/providers/store-config";

/** "Add G$3,200 more for free delivery" with a progress bar. */
export function FreeDeliveryMeter({ subtotal }: { subtotal: number }) {
  const { freeDeliveryThreshold } = useStoreConfig();
  if (!freeDeliveryThreshold || subtotal <= 0) return null;

  const remaining = Math.max(0, freeDeliveryThreshold - subtotal);
  const pct = Math.min(100, (subtotal / freeDeliveryThreshold) * 100);

  return (
    <div className="rounded-xl bg-canopy-50 px-3.5 py-3">
      <p className="flex items-center gap-2 text-[13px] font-medium text-ink">
        <Truck className="size-4 shrink-0 text-canopy" aria-hidden />
        {remaining > 0 ? (
          <span>
            Add <strong className="tabular-nums">{formatPrice(remaining)}</strong> more for free delivery
          </span>
        ) : (
          <span>
            <strong>Free delivery</strong> unlocked on this order
          </span>
        )}
      </p>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-canopy-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-label="Progress to free delivery"
      >
        <div className="h-full rounded-full bg-canopy transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
