import type { OrderStatus, PaymentMethod, PaymentStatus } from "./types";

const numberFormat = new Intl.NumberFormat("en-GY", { maximumFractionDigits: 0 });
const numberFormatCents = new Intl.NumberFormat("en-GY", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "G$12,500" — whole dollars unless the amount has cents. */
export function formatPrice(amount: number | string | null | undefined, symbol = "G$"): string {
  const value = Number(amount ?? 0);
  const formatted = Number.isInteger(value) ? numberFormat.format(value) : numberFormatCents.format(value);
  return `${symbol}${formatted}`;
}

/** Whole-number percentage saved, e.g. 23 for 23% off. */
export function discountPercent(price: number, current: number): number {
  if (!price || current >= price) return 0;
  return Math.round(((price - current) / price) * 100);
}

export function formatDate(value: string | Date, timeZone = "America/Guyana"): string {
  return new Intl.DateTimeFormat("en-GY", { dateStyle: "medium", timeZone }).format(new Date(value));
}

export function formatDateTime(value: string | Date, timeZone = "America/Guyana"): string {
  return new Intl.DateTimeFormat("en-GY", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Order placed",
  confirmed: "Confirmed",
  processing: "Being prepared",
  ready_for_pickup: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash_on_delivery: "Cash on delivery",
  bank_transfer: "Bank transfer",
  mmg: "MMG",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  paid: "Paid",
  refunded: "Refunded",
};

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${numberFormat.format(count)} ${count === 1 ? singular : plural}`;
}

/** Digits-only WhatsApp link, e.g. https://wa.me/5926001234?text=... */
export function whatsappLink(number: string | null | undefined, message?: string): string | null {
  const digits = (number ?? "").replace(/\D/g, "");
  if (digits.length < 7) return null;
  const query = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${query}`;
}

/** Fill {{store_name}}-style tokens in policy page content. */
export function fillTokens(template: string, values: Record<string, string | null | undefined>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => values[key] ?? match);
}
