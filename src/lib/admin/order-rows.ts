import type { OrderStatus, PaymentMethod, PaymentStatus } from "@/lib/types";

/** Columns the dashboard reads for order lists. */
export const ORDER_LIST_COLUMNS =
  "id, order_number, created_at, customer_name, customer_phone, customer_email, item_count, total, payment_method, payment_status, status, is_pickup, delivery_zone_name";

export interface OrderListRow {
  id: string;
  order_number: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  item_count: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  status: OrderStatus;
  is_pickup: boolean;
  delivery_zone_name: string;
}

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "ready_for_pickup",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

export const PAYMENT_METHODS: PaymentMethod[] = ["cash_on_delivery", "bank_transfer", "mmg"];
export const PAYMENT_STATUSES: PaymentStatus[] = ["unpaid", "paid", "refunded"];

/** Strips characters that would break a PostgREST `or()` filter. */
export function searchTerm(value: string | undefined): string {
  return (value ?? "").replace(/[,()*%\\:"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

export function isUuid(value: string | undefined): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}
