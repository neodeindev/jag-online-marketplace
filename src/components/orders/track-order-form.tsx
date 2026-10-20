"use client";

import { useActionState } from "react";
import { trackOrder, type TrackState } from "@/app/(store)/track-order/actions";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { ProductImage } from "@/components/store/product-image";
import { OrderTimeline } from "./order-timeline";

export function TrackOrderForm() {
  const [state, action, pending] = useActionState<TrackState, FormData>(trackOrder, {
    order: null,
    error: null,
    submitted: false,
  });

  return (
    <div className="mt-6 space-y-6">
      <form action={action} className="grid gap-4 rounded-[20px] bg-white p-5 shadow-card sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-6">
        <Field label="Order number" htmlFor="track-order">
          <Input id="track-order" name="order" placeholder="JAG-100045" autoCapitalize="characters" required />
        </Field>
        <Field label="Phone or email" htmlFor="track-contact">
          <Input id="track-contact" name="contact" placeholder="600 0000 or you@example.com" required />
        </Field>
        <Button type="submit" variant="dark" size="lg" disabled={pending}>
          {pending ? "Checking…" : "Track order"}
        </Button>
      </form>

      {state.error && (
        <p role="alert" className="rounded-xl bg-flag-50 p-4 text-[14px] font-medium text-flag-600">
          {state.error}
        </p>
      )}

      {state.order && (
        <section className="space-y-5 rounded-[20px] bg-white p-5 shadow-card sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-mono text-xl font-bold text-ink">{state.order.order_number}</h2>
            <p className="text-muted">
              {state.order.item_count} items · <span className="font-semibold text-ink">{formatPrice(state.order.total)}</span>
            </p>
          </div>
          <OrderTimeline order={state.order} />
          <ul className="divide-y divide-line border-t border-line">
            {state.order.items.map((item, i) => (
              <li key={`${item.title}-${i}`} className="flex items-center gap-3 py-3 text-[14px]">
                <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-[#f3f5f4]">
                  <ProductImage src={item.image_url} alt="" sizes="48px" className="p-1" />
                </span>
                <span className="flex-1">
                  {item.title}
                  {Object.keys(item.options).length > 0 && (
                    <span className="text-muted"> · {Object.values(item.options).join(", ")}</span>
                  )}
                </span>
                <span className="text-muted">× {item.quantity}</span>
              </li>
            ))}
          </ul>
          <p className="text-[13px] text-muted">
            {state.order.is_pickup ? "Store pickup" : `Delivering to ${state.order.delivery_zone_name}`}
          </p>
        </section>
      )}
    </div>
  );
}
