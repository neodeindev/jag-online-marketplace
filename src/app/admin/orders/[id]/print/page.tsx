import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { can, requireStaffPage } from "@/lib/auth";
import { loadOrderDetail } from "@/lib/admin/order-detail";
import { isUuid } from "@/lib/admin/order-rows";
import { getStoreSettings } from "@/lib/catalog";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, formatDateTime, formatPrice } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { NoAccess } from "@/components/admin/ui";
import { PrintButton } from "@/components/admin/ops/print-button";

export const instant = false;
export const metadata: Metadata = { title: "Packing slip" };

// Hide the dashboard sidebar and header when this page is printed.
const PRINT_CSS = `
@media print {
  @page { margin: 14mm; }
  body:has(#packing-slip) aside,
  body:has(#packing-slip) header { display: none !important; }
  body:has(#packing-slip) .lg\\:pl-64 { padding-left: 0 !important; }
  body:has(#packing-slip) main { max-width: none !important; padding: 0 !important; }
  #packing-slip { box-shadow: none !important; border: 0 !important; padding: 0 !important; }
}`;

export default async function PackingSlipPage(props: PageProps<"/admin/orders/[id]/print">) {
  const user = await requireStaffPage();
  if (!can(user, "orders")) return <NoAccess section="orders" />;

  const { id } = await props.params;
  if (!isUuid(id)) notFound();

  const supabase = await createClient();
  const [settings, detail] = await Promise.all([getStoreSettings(), loadOrderDetail(supabase, id)]);
  if (!detail) notFound();
  const { order } = detail;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      <div className="no-print mb-4 flex items-center justify-between gap-3">
        <Link href={`/admin/orders/${order.id}`} className="text-[13px] font-semibold text-canopy hover:underline">
          ← Back to order
        </Link>
        <PrintButton auto />
      </div>

      <article id="packing-slip" className="mx-auto max-w-3xl rounded-2xl border border-line bg-white p-8 text-[13.5px] text-black">
        <div className="flex items-start justify-between gap-6 border-b-2 border-black pb-4">
          <div>
            <p className="display text-2xl font-black uppercase">{settings.store_name}</p>
            <p className="mt-1 leading-relaxed text-neutral-700">
              {[settings.address, settings.contact_phone, settings.contact_email].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-600">Packing slip</p>
            <p className="font-mono text-xl font-bold">{order.order_number}</p>
            <p className="text-neutral-700">{formatDateTime(order.created_at, settings.timezone)}</p>
          </div>
        </div>

        <section className="grid grid-cols-2 gap-6 py-5">
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-neutral-600">
              {order.is_pickup ? "Customer (store pickup)" : "Deliver to"}
            </p>
            <p className="font-semibold">{order.customer_name}</p>
            <p>{order.customer_phone}</p>
            {order.customer_email && <p>{order.customer_email}</p>}
            {!order.is_pickup && (
              <>
                <p className="mt-1">{[order.address_line, order.city].filter(Boolean).join(", ")}</p>
                <p className="text-neutral-700">{order.delivery_zone_name}</p>
              </>
            )}
          </div>
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-neutral-600">Payment</p>
            <p className="font-semibold">{PAYMENT_METHOD_LABELS[order.payment_method]}</p>
            <p>{PAYMENT_STATUS_LABELS[order.payment_status]}</p>
            {order.payment_method === "cash_on_delivery" && order.payment_status === "unpaid" && (
              <p className="mt-1 font-bold">Collect {formatPrice(order.total)}</p>
            )}
            {order.payment_reference && <p className="mt-1 text-neutral-700">Ref: {order.payment_reference}</p>}
          </div>
        </section>

        {order.delivery_notes && (
          <p className="mb-4 border border-black px-3 py-2">
            <span className="font-bold">Customer note:</span> {order.delivery_notes}
          </p>
        )}

        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-black text-left text-[11px] uppercase tracking-wider text-neutral-600">
              <th className="w-8 py-2 font-bold">✓</th>
              <th className="py-2 font-bold">Item</th>
              <th className="py-2 text-right font-bold">Qty</th>
              <th className="py-2 text-right font-bold">Price</th>
              <th className="py-2 text-right font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-neutral-300 align-top">
                <td className="py-2.5">
                  <span className="inline-block size-4 border border-black" aria-hidden />
                </td>
                <td className="py-2.5 pr-3">
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-[12px] text-neutral-700">
                    {item.sku && <span className="font-mono">{item.sku}</span>}
                    {item.options && Object.keys(item.options).length > 0 && (
                      <>
                        {item.sku && " · "}
                        {Object.entries(item.options)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(" · ")}
                      </>
                    )}
                  </p>
                </td>
                <td className="py-2.5 text-right text-[15px] font-bold tabular-nums">{item.quantity}</td>
                <td className="py-2.5 text-right tabular-nums">{formatPrice(item.unit_price)}</td>
                <td className="py-2.5 text-right tabular-nums">{formatPrice(item.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ml-auto mt-4 w-64 space-y-1">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">{formatPrice(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>{order.is_pickup ? "Pickup" : "Delivery"}</dt>
            <dd className="tabular-nums">{Number(order.delivery_fee) > 0 ? formatPrice(order.delivery_fee) : "Free"}</dd>
          </div>
          <div className="flex justify-between border-t border-black pt-1 text-[15px] font-bold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatPrice(order.total)}</dd>
          </div>
        </dl>

        {order.admin_notes && (
          <p className="mt-6 text-[12px] text-neutral-700">
            <span className="font-bold">Staff notes:</span> {order.admin_notes}
          </p>
        )}

        <div className="mt-10 grid grid-cols-2 gap-10 text-[12px] text-neutral-700">
          <p className="border-t border-black pt-1">Packed by</p>
          <p className="border-t border-black pt-1">Received by (customer signature)</p>
        </div>
        <p className="mt-6 text-center text-[12px] text-neutral-600">
          Thank you for shopping with {settings.store_name}!
        </p>
      </article>
    </>
  );
}
