import { AlertTriangle, PackageX, Receipt } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { can, requireStaffPage } from "@/lib/auth";
import { ORDER_LIST_COLUMNS, type OrderListRow } from "@/lib/admin/order-rows";
import { getStoreSettings } from "@/lib/catalog";
import { PAYMENT_METHOD_LABELS, formatDateTime, formatPrice } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { RevenueChart, type DailyPoint } from "@/components/admin/ops/revenue-chart";
import { StatTile } from "@/components/admin/ops/stat-tile";
import { EmptyState, OrderStatusBadge, PageHeader, Panel, PaymentBadge, Table, Td, Th } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/button";

export const instant = false;
export const metadata: Metadata = { title: "Overview" };

interface Dashboard {
  today: { orders: number; revenue: number };
  period: { orders: number; revenue: number; average: number };
  previous_period: { orders: number; revenue: number };
  pending_orders: number;
  unpaid_orders: number;
  products: { total: number; active: number; out_of_stock: number; low_stock: number };
  customers: number;
  daily: DailyPoint[];
  top_products: { title: string; quantity: number; revenue: number }[];
  low_stock_items: { id: string; title: string; sku: string; stock: number }[];
}

const RANGES = [7, 30, 90] as const;

function greeting(timeZone: string) {
  const hour = Number(new Intl.DateTimeFormat("en-GY", { hour: "numeric", hourCycle: "h23", timeZone }).format(new Date()));
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function AdminOverviewPage(props: PageProps<"/admin">) {
  const user = await requireStaffPage();
  const query = await props.searchParams;
  const requested = Number(Array.isArray(query.days) ? query.days[0] : query.days);
  const days = (RANGES as readonly number[]).includes(requested) ? requested : 30;

  const showOrders = can(user, "orders");
  const showProducts = can(user, "products");
  const supabase = await createClient();

  const [settings, dashboardResult, recentResult] = await Promise.all([
    getStoreSettings(),
    supabase.rpc("admin_dashboard", { p_days: days }),
    showOrders
      ? supabase.from("orders").select(ORDER_LIST_COLUMNS).order("created_at", { ascending: false }).limit(8)
      : Promise.resolve({ data: [] as OrderListRow[], error: null }),
  ]);

  const firstName = (user.fullName ?? user.email ?? "there").split(/[\s@]/)[0];

  if (dashboardResult.error || !dashboardResult.data) {
    return (
      <>
        <PageHeader title={`${greeting(settings.timezone)}, ${firstName}`} />
        <Panel>
          <EmptyState icon={<AlertTriangle className="size-9" />} title="The overview couldn't load">
            {dashboardResult.error?.message ?? "Refresh the page to try again."}
          </EmptyState>
        </Panel>
      </>
    );
  }

  const d = dashboardResult.data as unknown as Dashboard;
  const recent = (recentResult.data ?? []) as OrderListRow[];
  const revenue = Number(d.period.revenue);
  const previous = Number(d.previous_period.revenue);
  const change = previous > 0 ? Math.round(((revenue - previous) / previous) * 100) : null;
  const daily = d.daily.map((p) => ({ day: p.day, orders: Number(p.orders), revenue: Number(p.revenue) }));
  const periodLabel = `${days} days`;

  return (
    <>
      <PageHeader
        title={`${greeting(settings.timezone)}, ${firstName}`}
        description={`Here's how ${settings.store_name} is doing.`}
        actions={
          showOrders ? (
            <ButtonLink href="/admin/orders?status=pending" variant={d.pending_orders > 0 ? "primary" : "outline"}>
              <Receipt className="size-4" />
              {d.pending_orders > 0 ? `${d.pending_orders} new ${d.pending_orders === 1 ? "order" : "orders"} to confirm` : "Order inbox"}
            </ButtonLink>
          ) : undefined
        }
      />

      {showOrders && (
        <nav aria-label="Time range" className="mb-5 flex gap-1">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={r === 30 ? "/admin" : `/admin?days=${r}`}
              aria-current={r === days ? "true" : undefined}
              className={cn(
                "inline-flex h-9 items-center rounded-full px-4 text-[13.5px] font-semibold transition",
                r === days ? "bg-ink text-white" : "bg-white text-muted ring-1 ring-line hover:text-ink",
              )}
            >
              Last {r} days
            </Link>
          ))}
        </nav>
      )}

      {showOrders && (
        <section aria-label="Sales" className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Today"
            value={formatPrice(d.today.revenue)}
            detail={`${d.today.orders} ${Number(d.today.orders) === 1 ? "order" : "orders"} so far`}
          />
          <StatTile
            label={`Revenue, last ${periodLabel}`}
            value={formatPrice(revenue)}
            delta={{ percent: change, period: periodLabel }}
          />
          <StatTile
            label="Average order"
            value={formatPrice(Math.round(Number(d.period.average)))}
            detail={`${d.period.orders} orders in the last ${periodLabel}`}
          />
          <StatTile
            label="Awaiting payment"
            value={d.unpaid_orders}
            detail="Confirmed orders marked unpaid"
            href={d.unpaid_orders > 0 ? "/admin/orders?payment=unpaid" : undefined}
            tone={d.unpaid_orders > 0 ? "attention" : "default"}
          />
        </section>
      )}

      {showOrders && (
        <Panel
          title={`Revenue, last ${periodLabel}`}
          description={`${formatPrice(revenue)} from ${d.period.orders} orders. Cancelled orders aren't counted.`}
          className="mb-6"
        >
          <RevenueChart data={daily} title={`Daily revenue, last ${periodLabel}`} />
        </Panel>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {showOrders && (
          <Panel
            title="Recent orders"
            actions={
              <Link href="/admin/orders" className="text-[13px] font-semibold text-canopy hover:underline">
                All orders
              </Link>
            }
            bodyClassName="p-0"
          >
            {recent.length === 0 ? (
              <EmptyState icon={<Receipt className="size-9" />} title="No orders yet">
                New orders will appear here as soon as customers check out.
              </EmptyState>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Order</Th>
                    <Th>Customer</Th>
                    <Th className="text-right">Total</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((o) => (
                    <tr key={o.id} className={cn("relative hover:bg-mist/60", o.status === "pending" && "bg-gold-50/50")}>
                      <Td>
                        <Link
                          href={`/admin/orders/${o.id}`}
                          className="font-mono text-[13px] font-bold text-ink after:absolute after:inset-0 hover:underline"
                        >
                          {o.order_number}
                        </Link>
                        <p className="text-[12px] text-muted">{formatDateTime(o.created_at, settings.timezone)}</p>
                      </Td>
                      <Td>
                        <p className="font-medium text-ink">{o.customer_name}</p>
                        <p className="text-[12px] text-muted">{PAYMENT_METHOD_LABELS[o.payment_method]}</p>
                      </Td>
                      <Td className="text-right font-semibold tabular-nums">{formatPrice(o.total)}</Td>
                      <Td>
                        <div className="flex flex-wrap gap-1">
                          <OrderStatusBadge status={o.status} />
                          <PaymentBadge status={o.payment_status} />
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Panel>
        )}

        <div className="space-y-6">
          {showProducts && (
            <Panel
              title="Stock to watch"
              description={`Low means ${settings.low_stock_threshold} or fewer left.`}
              actions={
                <div className="flex gap-3 text-[13px] font-semibold">
                  <Link href="/admin/products?stock=low" className="text-canopy hover:underline">
                    {d.products.low_stock} low
                  </Link>
                  <Link href="/admin/products?stock=out" className="text-flag hover:underline">
                    {d.products.out_of_stock} sold out
                  </Link>
                </div>
              }
              bodyClassName="p-0"
            >
              {d.low_stock_items.length === 0 ? (
                <EmptyState icon={<PackageX className="size-8" />} title="Stock levels look healthy">
                  No active products are running low.
                </EmptyState>
              ) : (
                <ul className="divide-y divide-line">
                  {d.low_stock_items.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <Link href={`/admin/products/${p.id}`} className="line-clamp-1 text-[14px] font-medium text-ink hover:underline">
                          {p.title}
                        </Link>
                        <p className="font-mono text-[12px] text-muted">{p.sku}</p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-bold tabular-nums",
                          p.stock === 0 ? "bg-flag-50 text-flag-600" : "bg-gold-100 text-ink",
                        )}
                      >
                        {p.stock === 0 ? "Sold out" : `${p.stock} left`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}

          {showOrders && (
            <Panel title={`Top products, last ${periodLabel}`} bodyClassName="p-0">
              {d.top_products.length === 0 ? (
                <EmptyState title="No sales in this period" />
              ) : (
                <ol className="divide-y divide-line">
                  {d.top_products.map((p, i) => (
                    <li key={p.title} className="flex items-center gap-3 px-5 py-3">
                      <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-mist text-[12px] font-bold text-muted">
                        {i + 1}
                      </span>
                      <span className="line-clamp-1 flex-1 text-[14px] text-ink">{p.title}</span>
                      <span className="shrink-0 text-right text-[13px]">
                        <span className="block font-semibold tabular-nums">{p.quantity} sold</span>
                        <span className="block text-muted tabular-nums">{formatPrice(p.revenue)}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          )}

          {showProducts && (
            <Panel title="Catalog">
              <dl className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <dt className="text-[12px] text-muted">Products</dt>
                  <dd className="text-xl font-semibold text-ink">{d.products.total}</dd>
                </div>
                <div>
                  <dt className="text-[12px] text-muted">Visible in store</dt>
                  <dd className="text-xl font-semibold text-ink">{d.products.active}</dd>
                </div>
                <div>
                  <dt className="text-[12px] text-muted">Customers</dt>
                  <dd className="text-xl font-semibold text-ink">{d.customers}</dd>
                </div>
              </dl>
            </Panel>
          )}

          {!showOrders && !showProducts && (
            <Panel>
              <EmptyState title="Welcome to the dashboard">
                Use the menu to open the sections you have access to.
              </EmptyState>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
