import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, formatDateTime, formatPrice } from "@/lib/format";
import type { OrderStatus, OrderView, StoreSettings } from "@/lib/types";
import { siteUrl } from "@/lib/utils";

/*
 * Email templates. Table layout and inline styles keep them readable in
 * Gmail, Outlook and phone mail apps.
 */

const INK = "#0e2a22";
const GOLD = "#ffc21a";
const RED = "#d62839";
const MUTED = "#5b6b65";
const LINE = "#dce3df";

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function nl2br(value: string): string {
  return esc(value).replace(/\n/g, "<br>");
}

function layout(settings: StoreSettings, preheader: string, body: string): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(settings.store_name)}</title></head>
<body style="margin:0;padding:0;background:#f2f5f3;font-family:Arial,Helvetica,sans-serif;color:#15231e;">
<span style="display:none;max-height:0;overflow:hidden;">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f5f3;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;">
<tr><td style="background:${INK};padding:20px 28px;">
<span style="font-size:20px;font-weight:900;letter-spacing:0.5px;color:#ffffff;text-transform:uppercase;">${esc(settings.store_name)}</span>
</td></tr>
<tr><td style="height:3px;background:${GOLD};line-height:3px;font-size:0;">&nbsp;</td></tr>
<tr><td style="height:2px;background:${RED};line-height:2px;font-size:0;">&nbsp;</td></tr>
<tr><td style="padding:28px;">${body}</td></tr>
<tr><td style="padding:18px 28px;background:#f7f9f8;color:${MUTED};font-size:12px;line-height:1.6;">
${esc(settings.store_name)}${settings.address ? ` · ${esc(settings.address)}` : ""}<br>
${settings.contact_phone ? `Phone/WhatsApp: ${esc(settings.contact_phone)}` : ""}${settings.contact_email ? ` · ${esc(settings.contact_email)}` : ""}
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function itemsTable(order: OrderView): string {
  const rows = order.items
    .map((item) => {
      const options = Object.entries(item.options ?? {})
        .map(([k, v]) => `${esc(k)}: ${esc(v)}`)
        .join(" · ");
      return `<tr>
<td style="padding:10px 0;border-bottom:1px solid ${LINE};font-size:14px;">
<strong>${esc(item.title)}</strong>${options ? `<br><span style="color:${MUTED};font-size:12px;">${options}</span>` : ""}
<br><span style="color:${MUTED};font-size:12px;">${item.quantity} × ${formatPrice(item.unit_price)}</span>
</td>
<td align="right" style="padding:10px 0;border-bottom:1px solid ${LINE};font-size:14px;white-space:nowrap;">${formatPrice(item.line_total)}</td>
</tr>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
${rows}
<tr><td style="padding:8px 0 0;font-size:14px;color:${MUTED};">Subtotal</td><td align="right" style="padding:8px 0 0;font-size:14px;">${formatPrice(order.subtotal)}</td></tr>
<tr><td style="padding:4px 0;font-size:14px;color:${MUTED};">${order.is_pickup ? "Pickup" : "Delivery"}</td><td align="right" style="padding:4px 0;font-size:14px;">${order.delivery_fee > 0 ? formatPrice(order.delivery_fee) : "Free"}</td></tr>
<tr><td style="padding:8px 0;font-size:16px;font-weight:bold;">Total</td><td align="right" style="padding:8px 0;font-size:18px;font-weight:bold;">${formatPrice(order.total)}</td></tr>
</table>`;
}

function itemsText(order: OrderView): string {
  return [
    ...order.items.map(
      (i) =>
        `- ${i.title}${Object.keys(i.options ?? {}).length ? ` (${Object.entries(i.options).map(([k, v]) => `${k}: ${v}`).join(", ")})` : ""} × ${i.quantity} = ${formatPrice(i.line_total)}`,
    ),
    `Subtotal: ${formatPrice(order.subtotal)}`,
    `${order.is_pickup ? "Pickup" : "Delivery"}: ${order.delivery_fee > 0 ? formatPrice(order.delivery_fee) : "Free"}`,
    `Total: ${formatPrice(order.total)}`,
  ].join("\n");
}

function deliveryBlock(order: OrderView): string {
  const lines = [
    esc(order.customer_name),
    order.customer_phone && esc(order.customer_phone),
    order.customer_email && esc(order.customer_email),
    order.is_pickup ? `<strong>Store pickup</strong>` : [order.address_line, order.city].filter(Boolean).map(esc).join(", "),
    !order.is_pickup && esc(order.delivery_zone_name),
    order.delivery_notes && `<em>Note: ${esc(order.delivery_notes)}</em>`,
  ].filter(Boolean);
  return lines.join("<br>");
}

export function paymentInstructions(order: Pick<OrderView, "payment_method">, settings: StoreSettings): string | null {
  if (order.payment_method === "bank_transfer") return settings.bank_transfer_instructions;
  if (order.payment_method === "mmg") return settings.mmg_instructions;
  return null;
}

export function orderUrl(order: Pick<OrderView, "order_number" | "access_token">): string {
  return siteUrl(`/order/${encodeURIComponent(order.order_number)}${order.access_token ? `?token=${order.access_token}` : ""}`);
}

/** Alert to the store when a new order comes in. */
export function newOrderAlert(order: OrderView, settings: StoreSettings) {
  const adminUrl = siteUrl(`/admin/orders/${order.id}`);
  const body = `
<h1 style="margin:0 0 4px;font-size:22px;color:${INK};">New order ${esc(order.order_number)}</h1>
<p style="margin:0 0 16px;color:${MUTED};font-size:14px;">${formatDateTime(order.created_at, settings.timezone)} · ${esc(PAYMENT_METHOD_LABELS[order.payment_method])}</p>
<p style="margin:0;font-size:14px;line-height:1.6;">${deliveryBlock(order)}</p>
${itemsTable(order)}
<a href="${esc(adminUrl)}" style="display:inline-block;background:${GOLD};color:${INK};font-weight:bold;text-decoration:none;padding:12px 20px;border-radius:10px;">Open in dashboard</a>`;
  return {
    subject: `New order ${order.order_number} — ${formatPrice(order.total)} (${PAYMENT_METHOD_LABELS[order.payment_method]})`,
    html: layout(settings, `${order.customer_name} ordered ${order.item_count} item(s)`, body),
    text: [
      `New order ${order.order_number}`,
      `${order.customer_name} · ${order.customer_phone ?? ""} · ${order.customer_email ?? ""}`,
      order.is_pickup ? "Store pickup" : `${order.address_line ?? ""}, ${order.city ?? ""} (${order.delivery_zone_name})`,
      order.delivery_notes ? `Note: ${order.delivery_notes}` : "",
      `Payment: ${PAYMENT_METHOD_LABELS[order.payment_method]}`,
      "",
      itemsText(order),
      "",
      adminUrl,
    ]
      .filter((l) => l !== undefined)
      .join("\n"),
  };
}

/** Receipt to the customer right after checkout. */
export function orderReceipt(order: OrderView, settings: StoreSettings) {
  const instructions = paymentInstructions(order, settings);
  const url = orderUrl(order);
  const body = `
<h1 style="margin:0 0 8px;font-size:22px;color:${INK};">Thanks, ${esc(order.customer_name.split(" ")[0])}! We've got your order.</h1>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Order <strong>${esc(order.order_number)}</strong> · ${esc(PAYMENT_METHOD_LABELS[order.payment_method])}<br>
We'll contact you shortly to confirm ${order.is_pickup ? "when it's ready for pickup" : "a delivery time"}.</p>
${
  instructions
    ? `<div style="background:#fff7dc;border-radius:10px;padding:16px;margin:0 0 16px;font-size:14px;line-height:1.6;"><strong>How to pay</strong><br>${nl2br(instructions)}<br><br>Amount: <strong>${formatPrice(order.total)}</strong> · Reference: <strong>${esc(order.order_number)}</strong></div>`
    : order.payment_method === "cash_on_delivery"
      ? `<div style="background:#e8f4ee;border-radius:10px;padding:16px;margin:0 0 16px;font-size:14px;">Please have <strong>${formatPrice(order.total)}</strong> ready ${order.is_pickup ? "when you collect" : "for the driver"}.</div>`
      : ""
}
${itemsTable(order)}
<p style="margin:0 0 4px;font-size:13px;color:${MUTED};">${order.is_pickup ? "Pickup" : "Delivering to"}</p>
<p style="margin:0 0 20px;font-size:14px;line-height:1.6;">${deliveryBlock(order)}</p>
<a href="${esc(url)}" style="display:inline-block;background:${INK};color:#ffffff;font-weight:bold;text-decoration:none;padding:12px 20px;border-radius:10px;">View your order</a>`;
  return {
    subject: `Your ${settings.store_name} order ${order.order_number}`,
    html: layout(settings, `Order ${order.order_number} received — ${formatPrice(order.total)}`, body),
    text: [
      `Thanks, ${order.customer_name}! We've got your order ${order.order_number}.`,
      `Payment: ${PAYMENT_METHOD_LABELS[order.payment_method]}`,
      instructions ? `\nHow to pay:\n${instructions}\nAmount: ${formatPrice(order.total)} · Reference: ${order.order_number}\n` : "",
      itemsText(order),
      "",
      `View your order: ${url}`,
    ].join("\n"),
  };
}

const STATUS_MESSAGES: Partial<Record<OrderStatus, string>> = {
  confirmed: "Your order is confirmed and we're getting it ready.",
  processing: "We're preparing your order now.",
  ready_for_pickup: "Your order is ready for pickup.",
  out_for_delivery: "Your order is on its way. Please keep your phone nearby.",
  delivered: "Your order has been delivered. Enjoy, and thank you for shopping with us!",
  cancelled: "Your order has been cancelled. If you didn't ask for this, please contact us.",
};

/** Customer update when staff change an order's status. */
export function orderStatusUpdate(order: OrderView, status: OrderStatus, note: string | null, settings: StoreSettings) {
  const url = orderUrl(order);
  const label = ORDER_STATUS_LABELS[status];
  const message = STATUS_MESSAGES[status] ?? `Your order status is now: ${label}.`;
  const body = `
<p style="margin:0 0 6px;font-size:13px;color:${MUTED};">Order ${esc(order.order_number)}</p>
<h1 style="margin:0 0 12px;font-size:22px;color:${INK};">${esc(label)}</h1>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;">${esc(message)}</p>
${note ? `<div style="background:#f2f5f3;border-radius:10px;padding:14px 16px;margin:0 0 16px;font-size:14px;line-height:1.6;">${nl2br(note)}</div>` : ""}
<a href="${esc(url)}" style="display:inline-block;background:${INK};color:#ffffff;font-weight:bold;text-decoration:none;padding:12px 20px;border-radius:10px;">View your order</a>`;
  return {
    subject: `Order ${order.order_number}: ${label}`,
    html: layout(settings, message, body),
    text: [`Order ${order.order_number}: ${label}`, message, note ?? "", `View your order: ${url}`].filter(Boolean).join("\n\n"),
  };
}
