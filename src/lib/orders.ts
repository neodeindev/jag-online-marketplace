import "server-only";

import { getStoreSettings } from "./catalog";
import { sendEmail } from "./email/brevo";
import { newOrderAlert, orderReceipt, orderStatusUpdate } from "./email/templates";
import { createPublicClient } from "./supabase/public";
import type { OrderStatus, OrderView } from "./types";

export function normalizeOrder(raw: unknown): OrderView {
  const o = raw as OrderView;
  return {
    ...o,
    subtotal: Number(o.subtotal),
    delivery_fee: Number(o.delivery_fee),
    total: Number(o.total),
    items: (o.items ?? []).map((i) => ({
      ...i,
      unit_price: Number(i.unit_price),
      line_total: Number(i.line_total),
      options: (i.options ?? {}) as Record<string, string>,
    })),
    timeline: o.timeline ?? [],
  };
}

/** Looks up an order with the access token from the checkout link. */
export async function getOrderWithToken(orderNumber: string, token: string): Promise<OrderView | null> {
  const { data, error } = await createPublicClient().rpc("get_order", {
    p_order_number: orderNumber,
    p_access_token: token,
  });
  if (error || !data) return null;
  return normalizeOrder(data);
}

function storeRecipients(emails: string[], fallback: string | null) {
  const list = emails.filter(Boolean).length ? emails : fallback ? [fallback] : [];
  return [...new Set(list.map((e) => e.trim().toLowerCase()))].map((email) => ({ email }));
}

/** New-order alert to the store, and a receipt to the customer if they gave an email. */
export async function sendNewOrderEmails(order: OrderView) {
  const settings = await getStoreSettings();
  const alert = newOrderAlert(order, settings);
  const receipt = orderReceipt(order, settings);
  const replyTo = order.customer_email ? { email: order.customer_email, name: order.customer_name } : undefined;
  const storeReplyTo = settings.contact_email ? { email: settings.contact_email, name: settings.store_name } : undefined;

  await Promise.all([
    sendEmail({ to: storeRecipients(settings.order_notification_emails, settings.contact_email), ...alert, replyTo }),
    order.customer_email
      ? sendEmail({ to: [{ email: order.customer_email, name: order.customer_name }], ...receipt, replyTo: storeReplyTo })
      : Promise.resolve(null),
  ]);
}

export async function sendStatusEmail(order: OrderView, status: OrderStatus, note: string | null) {
  if (!order.customer_email) return { sent: false as const, reason: "No customer email" };
  const settings = await getStoreSettings();
  const message = orderStatusUpdate(order, status, note, settings);
  return sendEmail({
    to: [{ email: order.customer_email, name: order.customer_name }],
    ...message,
    replyTo: settings.contact_email ? { email: settings.contact_email, name: settings.store_name } : undefined,
  });
}
