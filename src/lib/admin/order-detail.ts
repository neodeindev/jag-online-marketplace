import "server-only";

import type { createClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/lib/types";
import type { OrderListRow } from "./order-rows";

export interface OrderItemRow {
  id: string;
  product_id: string | null;
  title: string;
  sku: string | null;
  image_url: string | null;
  options: Record<string, string> | null;
  unit_price: number;
  quantity: number;
  line_total: number;
}

export interface OrderDetailRow extends OrderListRow {
  user_id: string | null;
  address_line: string | null;
  city: string | null;
  delivery_notes: string | null;
  subtotal: number;
  delivery_fee: number;
  admin_notes: string | null;
  payment_reference: string | null;
  updated_at: string;
  items: OrderItemRow[];
}

export interface OrderEventRow {
  id: number;
  status: OrderStatus | null;
  note: string | null;
  actor_id: string | null;
  customer_notified: boolean;
  created_at: string;
  actor_name: string | null;
}

type Client = Awaited<ReturnType<typeof createClient>>;

/** One order with its items and full history, read as the signed-in staff member. */
export async function loadOrderDetail(supabase: Client, id: string) {
  const [orderResult, eventsResult] = await Promise.all([
    supabase
      .from("orders")
      .select(
        `id, order_number, created_at, updated_at, user_id, customer_name, customer_phone, customer_email,
         address_line, city, delivery_zone_name, is_pickup, delivery_notes, item_count, subtotal, delivery_fee, total,
         payment_method, payment_status, payment_reference, status, admin_notes,
         items:order_items(id, product_id, title, sku, image_url, options, unit_price, quantity, line_total)`,
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("order_events")
      .select("id, status, note, actor_id, customer_notified, created_at")
      .eq("order_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (orderResult.error) throw new Error(orderResult.error.message);
  if (!orderResult.data) return null;

  const order = orderResult.data as OrderDetailRow;
  order.items = [...(order.items ?? [])].sort((a, b) => a.title.localeCompare(b.title));

  const events = (eventsResult.data ?? []) as Omit<OrderEventRow, "actor_name">[];
  const actorIds = [...new Set(events.map((e) => e.actor_id).filter((v): v is string => Boolean(v)))];
  const names = new Map<string, string>();
  if (actorIds.length) {
    const { data } = await supabase.from("profiles").select("id, full_name, email").in("id", actorIds);
    for (const p of (data ?? []) as { id: string; full_name: string | null; email: string | null }[]) {
      names.set(p.id, p.full_name ?? p.email ?? "Staff");
    }
  }

  return {
    order,
    events: events.map((e) => ({
      ...e,
      actor_name: e.actor_id ? (e.actor_id === order.user_id ? order.customer_name : (names.get(e.actor_id) ?? null)) : null,
    })) as OrderEventRow[],
  };
}
