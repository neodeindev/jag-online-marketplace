import Link from "next/link";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, formatDateTime, formatPrice } from "@/lib/format";
import type { OrderView } from "@/lib/types";
import { ProductImage } from "@/components/store/product-image";

/** Items, totals and delivery details for an order (customer-facing). */
export function OrderDetails({ order }: { order: OrderView }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="rounded-[20px] bg-white p-5 shadow-card sm:p-6">
        <h2 className="display-tight mb-3 text-lg font-extrabold text-ink">Items</h2>
        <ul className="divide-y divide-line">
          {order.items.map((item, i) => (
            <li key={`${item.title}-${i}`} className="flex gap-4 py-4">
              <span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-[#f3f5f4]">
                <ProductImage src={item.image_url} alt="" sizes="64px" className="p-1.5" />
              </span>
              <div className="min-w-0 flex-1 text-[14px]">
                {item.product_slug ? (
                  <Link href={`/p/${item.product_slug}`} className="font-semibold text-ink hover:underline">
                    {item.title}
                  </Link>
                ) : (
                  <p className="font-semibold text-ink">{item.title}</p>
                )}
                {Object.keys(item.options).length > 0 && (
                  <p className="text-[13px] text-muted">
                    {Object.entries(item.options).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                  </p>
                )}
                <p className="text-[13px] text-muted">
                  {item.quantity} × {formatPrice(item.unit_price)}
                </p>
              </div>
              <span className="font-semibold tabular-nums">{formatPrice(item.line_total)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-2 space-y-1.5 border-t border-line pt-4 text-[14px]">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="tabular-nums">{formatPrice(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">{order.is_pickup ? "Pickup" : "Delivery"}</dt>
            <dd className="tabular-nums">{order.delivery_fee > 0 ? formatPrice(order.delivery_fee) : "Free"}</dd>
          </div>
          <div className="flex items-baseline justify-between pt-2">
            <dt className="font-bold text-ink">Total</dt>
            <dd className="display text-xl font-black tabular-nums text-ink">{formatPrice(order.total)}</dd>
          </div>
        </dl>
      </section>

      <aside className="space-y-4">
        <section className="rounded-[20px] bg-white p-5 text-[14px] shadow-card">
          <h2 className="mb-2 font-bold text-ink">{order.is_pickup ? "Pickup" : "Delivery"}</h2>
          <p className="leading-relaxed text-text">
            {order.customer_name}
            {order.customer_phone && (
              <>
                <br />
                {order.customer_phone}
              </>
            )}
            {!order.is_pickup && (order.address_line || order.city) && (
              <>
                <br />
                {[order.address_line, order.city].filter(Boolean).join(", ")}
              </>
            )}
            <br />
            <span className="text-muted">{order.is_pickup ? "Store pickup" : order.delivery_zone_name}</span>
          </p>
          {order.delivery_notes && <p className="mt-2 text-muted">Note: {order.delivery_notes}</p>}
        </section>
        <section className="rounded-[20px] bg-white p-5 text-[14px] shadow-card">
          <h2 className="mb-2 font-bold text-ink">Payment</h2>
          <p>{PAYMENT_METHOD_LABELS[order.payment_method]}</p>
          <p className="text-muted">{PAYMENT_STATUS_LABELS[order.payment_status]}</p>
          <p className="mt-3 text-[12.5px] text-muted">Placed {formatDateTime(order.created_at)}</p>
        </section>
      </aside>
    </div>
  );
}
