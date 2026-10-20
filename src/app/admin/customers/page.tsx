import { Search, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { can, requireStaffPage } from "@/lib/auth";
import { searchTerm } from "@/lib/admin/order-rows";
import { getStoreSettings } from "@/lib/catalog";
import { formatDate, formatPrice } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, NoAccess, PageHeader, Panel, SimplePagination, Table, Td, Th } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

export const instant = false;
export const metadata: Metadata = { title: "Customers" };

const PAGE_SIZE = 50;

interface CustomerRow {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  order_count: number;
  total_spent: number;
  last_order_at: string | null;
  total_count: number;
}

export default async function CustomersPage(props: PageProps<"/admin/customers">) {
  const user = await requireStaffPage();
  if (!can(user, "customers") && !can(user, "orders")) return <NoAccess section="customers" />;

  const query = await props.searchParams;
  const q = searchTerm(Array.isArray(query.q) ? query.q[0] : query.q);
  const page = Math.max(1, Math.min(1000, Number(Array.isArray(query.page) ? query.page[0] : query.page) || 1));

  const supabase = await createClient();
  const [settings, result] = await Promise.all([
    getStoreSettings(),
    supabase.rpc("admin_customers", {
      p_search: q || undefined,
      p_limit: PAGE_SIZE,
      p_offset: (page - 1) * PAGE_SIZE,
    }),
  ]);

  const rows = (result.data ?? []) as CustomerRow[];
  const total = rows.length ? Number(rows[0].total_count) : 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/admin/customers?${qs}` : "/admin/customers";
  };

  return (
    <>
      <PageHeader
        title="Customers"
        description="Shoppers who created an account. Guest checkouts appear in Orders only."
      />

      <form action="/admin/customers" className="mb-4 flex gap-2">
        <label className="relative max-w-md flex-1">
          <span className="sr-only">Search customers</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <Input name="q" defaultValue={q} placeholder="Name, email or phone" className="pl-9" />
        </label>
        <Button type="submit" variant="dark" className="h-11">
          Search
        </Button>
      </form>

      <Panel bodyClassName="p-0">
        {result.error ? (
          <EmptyState title="Customers couldn't load">{result.error.message}</EmptyState>
        ) : rows.length === 0 ? (
          <EmptyState icon={<Users className="size-9" />} title={q ? "No customers match" : "No customer accounts yet"}>
            {q ? "Try a different name, email or phone number." : "Customers who sign up will be listed here."}
          </EmptyState>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Customer</Th>
                  <Th>Phone</Th>
                  <Th>Joined</Th>
                  <Th className="text-right">Orders</Th>
                  <Th className="text-right">Total spent</Th>
                  <Th>Last order</Th>
                  <Th>
                    <span className="sr-only">Actions</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="hover:bg-mist/60">
                    <Td>
                      <p className="font-medium text-ink">{c.full_name ?? "—"}</p>
                      {c.email && (
                        <a href={`mailto:${c.email}`} className="text-[12.5px] text-canopy hover:underline">
                          {c.email}
                        </a>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap">{c.phone ?? <span className="text-muted">—</span>}</Td>
                    <Td className="whitespace-nowrap text-muted">{formatDate(c.created_at, settings.timezone)}</Td>
                    <Td className="text-right tabular-nums">{c.order_count}</Td>
                    <Td className="text-right font-semibold tabular-nums">{formatPrice(c.total_spent)}</Td>
                    <Td className="whitespace-nowrap text-muted">
                      {c.last_order_at ? formatDate(c.last_order_at, settings.timezone) : "—"}
                    </Td>
                    <Td className="text-right">
                      {Number(c.order_count) > 0 && can(user, "orders") && (
                        <Link
                          href={`/admin/orders?customer=${c.id}`}
                          className="whitespace-nowrap text-[13px] font-semibold text-canopy hover:underline"
                        >
                          View orders
                        </Link>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <SimplePagination page={page} pages={pages} href={href} />
          </>
        )}
      </Panel>
      {total > 0 && (
        <p className="mt-3 text-[13px] text-muted">
          {total.toLocaleString()} {total === 1 ? "customer" : "customers"}
        </p>
      )}
    </>
  );
}
