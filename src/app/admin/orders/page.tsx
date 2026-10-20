import { Receipt, Search, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { can, requireStaffPage } from "@/lib/auth";
import {
  ORDER_LIST_COLUMNS,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  isUuid,
  searchTerm,
  type OrderListRow,
} from "@/lib/admin/order-rows";
import { getStoreSettings } from "@/lib/catalog";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  formatDateTime,
  formatPrice,
} from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { OrderStatus, PaymentMethod, PaymentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AutoSubmitSelect } from "@/components/admin/ops/auto-submit-select";
import {
  EmptyState,
  FilterTabs,
  NoAccess,
  OrderStatusBadge,
  PageHeader,
  Panel,
  PaymentBadge,
  SimplePagination,
  Table,
  Td,
  Th,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

export const instant = false;
export const metadata: Metadata = { title: "Orders" };

const PAGE_SIZE = 30;

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function OrdersPage(props: PageProps<"/admin/orders">) {
  const user = await requireStaffPage();
  if (!can(user, "orders")) return <NoAccess section="orders" />;

  const query = await props.searchParams;
  const statusParam = one(query.status);
  const status = ORDER_STATUSES.includes(statusParam as OrderStatus) ? (statusParam as OrderStatus) : null;
  const methodParam = one(query.method);
  const method = PAYMENT_METHODS.includes(methodParam as PaymentMethod) ? (methodParam as PaymentMethod) : null;
  const paymentParam = one(query.payment);
  const payment = PAYMENT_STATUSES.includes(paymentParam as PaymentStatus) ? (paymentParam as PaymentStatus) : null;
  const customerParam = one(query.customer);
  const customer = isUuid(customerParam) ? customerParam : null;
  const q = searchTerm(one(query.q));
  const page = Math.max(1, Math.min(1000, Number(one(query.page)) || 1));

  const supabase = await createClient();

  let list = supabase
    .from("orders")
    .select(ORDER_LIST_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (status) list = list.eq("status", status);
  if (method) list = list.eq("payment_method", method);
  if (payment) list = list.eq("payment_status", payment);
  if (customer) list = list.eq("user_id", customer);
  if (q) {
    list = list.or(
      `order_number.ilike.%${q}%,customer_name.ilike.%${q}%,customer_phone.ilike.%${q}%,customer_email.ilike.%${q}%`,
    );
  }

  // Tab counts follow the customer filter but not the others, so tabs stay comparable.
  const countFor = (s: OrderStatus | null) => {
    let c = supabase.from("orders").select("id", { count: "exact", head: true });
    if (s) c = c.eq("status", s);
    if (customer) c = c.eq("user_id", customer);
    return c;
  };

  const [settings, result, customerProfile, ...counts] = await Promise.all([
    getStoreSettings(),
    list,
    customer
      ? supabase.from("profiles").select("full_name, email").eq("id", customer).maybeSingle()
      : Promise.resolve({ data: null }),
    countFor(null),
    ...ORDER_STATUSES.map((s) => countFor(s)),
  ]);

  const rows = (result.data ?? []) as OrderListRow[];
  const total = result.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const href = (changes: Record<string, string | number | null>) => {
    const params = new URLSearchParams();
    const merged: Record<string, string | number | null> = {
      status,
      method,
      payment,
      customer,
      q: q || null,
      page: null,
      ...changes,
    };
    for (const [key, value] of Object.entries(merged)) {
      if (value !== null && value !== "" && !(key === "page" && value === 1)) params.set(key, String(value));
    }
    const qs = params.toString();
    return qs ? `/admin/orders?${qs}` : "/admin/orders";
  };

  const tabs = [
    { href: href({ status: null }), label: "All", count: counts[0].count ?? 0, active: status === null },
    ...ORDER_STATUSES.map((s, i) => ({
      href: href({ status: s }),
      label: ORDER_STATUS_LABELS[s] === "Order placed" ? "Pending" : ORDER_STATUS_LABELS[s],
      count: counts[i + 1].count ?? 0,
      active: status === s,
    })),
  ];

  const filtered = Boolean(q || method || payment);
  const customerName = customerProfile.data
    ? ((customerProfile.data as { full_name: string | null; email: string | null }).full_name ??
      (customerProfile.data as { email: string | null }).email)
    : null;

  return (
    <>
      <PageHeader
        title="Orders"
        description="New orders arrive as Pending. Confirm them with the customer, then move them along as you prepare and deliver."
      />

      {customer && (
        <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-[13px] ring-1 ring-line">
          Showing orders from <strong className="text-ink">{customerName ?? "this customer"}</strong>
          <Link href={href({ customer: null })} className="text-muted hover:text-ink" aria-label="Show all customers">
            <X className="size-4" />
          </Link>
        </p>
      )}

      <FilterTabs tabs={tabs} />

      <form action="/admin/orders" className="mb-4 flex flex-wrap items-end gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        {customer && <input type="hidden" name="customer" value={customer} />}
        <label className="relative min-w-60 flex-1">
          <span className="sr-only">Search orders</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <Input name="q" defaultValue={q} placeholder="Order number, name, phone or email" className="pl-9" />
        </label>
        <label>
          <span className="sr-only">Payment method</span>
          <AutoSubmitSelect name="method" defaultValue={method ?? ""} className="w-auto">
            <option value="">All payment methods</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_METHOD_LABELS[m]}
              </option>
            ))}
          </AutoSubmitSelect>
        </label>
        <label>
          <span className="sr-only">Payment status</span>
          <AutoSubmitSelect name="payment" defaultValue={payment ?? ""} className="w-auto">
            <option value="">Paid and unpaid</option>
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PAYMENT_STATUS_LABELS[s]}
              </option>
            ))}
          </AutoSubmitSelect>
        </label>
        <Button type="submit" variant="dark" className="h-11">
          Search
        </Button>
        {filtered && (
          <Link href={href({ q: null, method: null, payment: null })} className="h-11 px-2 text-sm font-semibold leading-[44px] text-canopy hover:underline">
            Clear
          </Link>
        )}
      </form>

      <Panel bodyClassName="p-0">
        {rows.length === 0 ? (
          <EmptyState icon={<Receipt className="size-9" />} title={filtered || status ? "No orders match" : "No orders yet"}>
            {filtered || status
              ? "Try another status or clear the search."
              : "When customers check out, their orders will appear here and you'll get an email alert."}
          </EmptyState>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Order</Th>
                  <Th>Customer</Th>
                  <Th className="text-right">Items</Th>
                  <Th className="text-right">Total</Th>
                  <Th>Payment</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id} className={cn("relative transition hover:bg-mist/70", o.status === "pending" && "bg-gold-50/60")}>
                    <Td>
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="font-mono text-[13px] font-bold text-ink after:absolute after:inset-0 hover:underline"
                      >
                        {o.order_number}
                      </Link>
                      <p className="whitespace-nowrap text-[12px] text-muted">{formatDateTime(o.created_at, settings.timezone)}</p>
                    </Td>
                    <Td>
                      <p className="font-medium text-ink">{o.customer_name}</p>
                      <p className="text-[12px] text-muted">
                        {o.customer_phone} · {o.is_pickup ? "Pickup" : o.delivery_zone_name}
                      </p>
                    </Td>
                    <Td className="text-right tabular-nums">{o.item_count}</Td>
                    <Td className="text-right font-semibold tabular-nums">{formatPrice(o.total)}</Td>
                    <Td>
                      <p className="mb-1 whitespace-nowrap text-[12.5px] text-muted">{PAYMENT_METHOD_LABELS[o.payment_method]}</p>
                      <PaymentBadge status={o.payment_status} />
                    </Td>
                    <Td>
                      <OrderStatusBadge status={o.status} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <SimplePagination page={page} pages={pages} href={(p) => href({ page: p })} />
          </>
        )}
      </Panel>
      {total > 0 && (
        <p className="mt-3 text-[13px] text-muted">
          {total.toLocaleString()} {total === 1 ? "order" : "orders"}
        </p>
      )}
    </>
  );
}
