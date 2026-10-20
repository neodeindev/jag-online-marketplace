import { Copy, Mail, MapPin, PackageCheck, Phone, Printer } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { can, requireStaffPage } from "@/lib/auth";
import { loadOrderDetail } from "@/lib/admin/order-detail";
import { isUuid } from "@/lib/admin/order-rows";
import { getStoreSettings } from "@/lib/catalog";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  formatDateTime,
  formatPrice,
  whatsappLink,
} from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { WhatsAppIcon } from "@/components/brand/whatsapp-icon";
import { OrderNotesForm, OrderStatusForm, PaymentStatusButtons } from "@/components/admin/ops/order-actions";
import { NoAccess, OrderStatusBadge, PageHeader, Panel, PaymentBadge, Table, Td, Th } from "@/components/admin/ui";
import { ProductImage } from "@/components/store/product-image";
import { ButtonLink } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";

export const instant = false;
export const metadata: Metadata = { title: "Order" };

export default async function AdminOrderPage(props: PageProps<"/admin/orders/[id]">) {
  const user = await requireStaffPage();
  if (!can(user, "orders")) return <NoAccess section="orders" />;

  const { id } = await props.params;
  if (!isUuid(id)) notFound();

  const supabase = await createClient();
  const [settings, detail] = await Promise.all([getStoreSettings(), loadOrderDetail(supabase, id)]);
  if (!detail) notFound();
  const { order, events } = detail;

  const firstName = order.customer_name.split(" ")[0];
  const wa = whatsappLink(
    order.customer_phone,
    `Hi ${firstName}, this is ${settings.store_name} about your order ${order.order_number}.`,
  );

  return (
    <>
      <PageHeader
        back={{ href: "/admin/orders", label: "Orders" }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-mono">{order.order_number}</span>
            <CopyButton value={order.order_number} label="Copy order number" icon={<Copy className="size-4" />} />
          </span>
        }
        description={`Placed ${formatDateTime(order.created_at, settings.timezone)} · ${order.item_count} ${order.item_count === 1 ? "item" : "items"} · ${PAYMENT_METHOD_LABELS[order.payment_method]}`}
        actions={
          <>
            <OrderStatusBadge status={order.status} className="h-8 px-3 text-[13px]" />
            <PaymentBadge status={order.payment_status} />
            <ButtonLink href={`/admin/orders/${order.id}/print`} variant="outline" size="sm" target="_blank">
              <Printer className="size-4" /> Packing slip
            </ButtonLink>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Panel title="Customer">
              <p className="font-semibold text-ink">{order.customer_name}</p>
              <ul className="mt-3 space-y-2 text-[14px]">
                <li className="flex flex-wrap items-center gap-2">
                  <Phone className="size-4 text-muted" />
                  <a href={`tel:${order.customer_phone.replace(/[^\d+]/g, "")}`} className="text-canopy hover:underline">
                    {order.customer_phone}
                  </a>
                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-full bg-[#25D366]/15 px-2.5 py-0.5 text-[12.5px] font-semibold text-[#128C4B] hover:bg-[#25D366]/25"
                    >
                      <WhatsAppIcon className="size-3.5" /> WhatsApp
                    </a>
                  )}
                </li>
                {order.customer_email && (
                  <li className="flex items-center gap-2">
                    <Mail className="size-4 text-muted" />
                    <a href={`mailto:${order.customer_email}`} className="break-all text-canopy hover:underline">
                      {order.customer_email}
                    </a>
                  </li>
                )}
              </ul>
              <p className="mt-3 text-[13px] text-muted">
                {order.user_id ? (
                  <Link href={`/admin/orders?customer=${order.user_id}`} className="font-semibold text-canopy hover:underline">
                    All orders from this customer
                  </Link>
                ) : (
                  "Guest checkout"
                )}
              </p>
            </Panel>

            <Panel title={order.is_pickup ? "Store pickup" : "Delivery"}>
              <div className="flex gap-2 text-[14px]">
                {order.is_pickup ? (
                  <PackageCheck className="mt-0.5 size-4 shrink-0 text-muted" />
                ) : (
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted" />
                )}
                <div>
                  {order.is_pickup ? (
                    <p>The customer will collect this order.</p>
                  ) : (
                    <p>{[order.address_line, order.city].filter(Boolean).join(", ") || "No address given"}</p>
                  )}
                  <p className="text-muted">{order.delivery_zone_name}</p>
                </div>
              </div>
              {order.delivery_notes && (
                <p className="mt-3 rounded-lg bg-gold-50 px-3 py-2 text-[13.5px] text-ink">
                  <span className="font-semibold">Customer note:</span> {order.delivery_notes}
                </p>
              )}
            </Panel>
          </div>

          <Panel title="Items" bodyClassName="p-0">
            <Table>
              <thead>
                <tr>
                  <Th>Product</Th>
                  <Th className="text-right">Price</Th>
                  <Th className="text-right">Qty</Th>
                  <Th className="text-right">Total</Th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-[#f3f5f4]">
                          <ProductImage src={item.image_url} alt="" sizes="48px" className="p-1" />
                        </span>
                        <div className="min-w-0">
                          {item.product_id ? (
                            <Link href={`/admin/products/${item.product_id}`} className="font-medium text-ink hover:underline">
                              {item.title}
                            </Link>
                          ) : (
                            <p className="font-medium text-ink">{item.title}</p>
                          )}
                          <p className="text-[12px] text-muted">
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
                        </div>
                      </div>
                    </Td>
                    <Td className="text-right tabular-nums">{formatPrice(item.unit_price)}</Td>
                    <Td className="text-right tabular-nums">{item.quantity}</Td>
                    <Td className="text-right font-semibold tabular-nums">{formatPrice(item.line_total)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <dl className="space-y-1.5 px-5 py-4 text-[14px]">
              <div className="flex justify-end gap-8">
                <dt className="text-muted">Subtotal</dt>
                <dd className="w-28 text-right tabular-nums">{formatPrice(order.subtotal)}</dd>
              </div>
              <div className="flex justify-end gap-8">
                <dt className="text-muted">{order.is_pickup ? "Pickup" : "Delivery"}</dt>
                <dd className="w-28 text-right tabular-nums">
                  {Number(order.delivery_fee) > 0 ? formatPrice(order.delivery_fee) : "Free"}
                </dd>
              </div>
              <div className="flex justify-end gap-8 pt-1 text-[16px] font-bold text-ink">
                <dt>Total</dt>
                <dd className="w-28 text-right tabular-nums">{formatPrice(order.total)}</dd>
              </div>
            </dl>
          </Panel>

          <Panel title="History">
            <ol className="relative space-y-5 border-l-2 border-line pl-6">
              {[...events].reverse().map((e) => (
                <li key={e.id} className="relative">
                  <span
                    className={
                      "absolute -left-[31px] top-1 size-3 rounded-full ring-4 ring-white " +
                      (e.status === "cancelled" ? "bg-flag" : e.status ? "bg-canopy" : "bg-line-strong")
                    }
                    aria-hidden
                  />
                  <p className="text-[14px] font-semibold text-ink">
                    {e.status ? ORDER_STATUS_LABELS[e.status] : "Note"}
                    {e.customer_notified && (
                      <span className="ml-2 rounded-full bg-canopy-50 px-2 py-0.5 text-[11px] font-semibold text-canopy-700">
                        Customer emailed
                      </span>
                    )}
                  </p>
                  {e.note && <p className="mt-0.5 whitespace-pre-line text-[14px] text-text">{e.note}</p>}
                  <p className="mt-0.5 text-[12.5px] text-muted">
                    {formatDateTime(e.created_at, settings.timezone)}
                    {e.actor_name && ` · ${e.actor_name}`}
                  </p>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <aside className="space-y-6">
          <Panel title="Update order">
            <OrderStatusForm
              orderId={order.id}
              status={order.status}
              isPickup={order.is_pickup}
              hasEmail={Boolean(order.customer_email)}
            />
          </Panel>
          <Panel
            title="Payment"
            description={`${PAYMENT_METHOD_LABELS[order.payment_method]} · ${formatPrice(order.total)}`}
          >
            <PaymentStatusButtons orderId={order.id} status={order.payment_status} />
            <div className="mt-5 border-t border-line pt-5">
              <OrderNotesForm
                orderId={order.id}
                paymentReference={order.payment_reference}
                adminNotes={order.admin_notes}
              />
            </div>
          </Panel>
        </aside>
      </div>
    </>
  );
}
