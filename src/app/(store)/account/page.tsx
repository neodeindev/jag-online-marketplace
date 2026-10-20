import { ChevronRight, Package } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ORDER_STATUS_LABELS, formatDate, formatPrice } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ProductImage } from "@/components/store/product-image";
import { ButtonLink } from "@/components/ui/button";

export const instant = false;
export const metadata: Metadata = { title: "Your orders", robots: { index: false } };

interface OrderRow {
  id: string;
  order_number: string;
  status: OrderStatus;
  total: number;
  item_count: number;
  created_at: string;
  items: { title: string; image_url: string | null }[];
}

const TONE: Record<OrderStatus, string> = {
  pending: "bg-gold-100 text-ink",
  confirmed: "bg-canopy-50 text-canopy-700",
  processing: "bg-canopy-50 text-canopy-700",
  ready_for_pickup: "bg-canopy-100 text-canopy-700",
  out_for_delivery: "bg-canopy-100 text-canopy-700",
  delivered: "bg-canopy text-white",
  cancelled: "bg-flag-50 text-flag-600",
};

export default async function AccountOrdersPage(props: PageProps<"/account">) {
  const user = await requireUser("/account");
  const query = await props.searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("id, order_number, status, total, item_count, created_at, items:order_items(title, image_url)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const orders = (data ?? []) as OrderRow[];

  return (
    <div className="space-y-4">
      {query.password === "updated" && (
        <p className="rounded-xl bg-canopy-50 px-4 py-3 text-[14px] font-medium text-canopy-700">Your password was updated.</p>
      )}
      <section className="rounded-[20px] bg-white shadow-card">
        <h2 className="border-b border-line px-5 py-4 text-lg font-bold text-ink">Your orders</h2>
        {orders.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <Package className="mb-3 size-10 text-subtle" />
            <p className="font-bold text-ink">No orders yet</p>
            <p className="mt-1 text-sm text-muted">Orders you place while signed in will show up here.</p>
            <ButtonLink href="/" className="mt-5">
              Start shopping
            </ButtonLink>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/order/${encodeURIComponent(o.order_number)}`} className="flex items-center gap-4 px-5 py-4 transition hover:bg-mist/60">
                  <div className="flex -space-x-3">
                    {o.items.slice(0, 3).map((item, i) => (
                      <span key={i} className="relative size-12 overflow-hidden rounded-xl border-2 border-white bg-[#f3f5f4]">
                        <ProductImage src={item.image_url} alt="" sizes="48px" className="p-1" />
                      </span>
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[14px] font-bold text-ink">{o.order_number}</p>
                    <p className="text-[13px] text-muted">
                      {formatDate(o.created_at)} · {o.item_count} {o.item_count === 1 ? "item" : "items"}
                    </p>
                  </div>
                  <span className={cn("hidden rounded-full px-2.5 py-1 text-[12px] font-bold sm:inline-flex", TONE[o.status])}>
                    {ORDER_STATUS_LABELS[o.status]}
                  </span>
                  <span className="font-semibold tabular-nums text-ink">{formatPrice(o.total)}</span>
                  <ChevronRight className="size-4 text-subtle" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="text-[13px] text-muted">
        Ordered as a guest?{" "}
        <Link href="/track-order" className="font-semibold text-canopy hover:underline">
          Track it with your order number
        </Link>
        .
      </p>
    </div>
  );
}
