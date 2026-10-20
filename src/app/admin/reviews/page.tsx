import { BadgeCheck, MessageSquareText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { can, requireStaffPage } from "@/lib/auth";
import { getStoreSettings } from "@/lib/catalog";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { ReviewActions } from "@/components/admin/catalog/review-actions";
import { EmptyState, FilterTabs, NoAccess, PageHeader, SimplePagination } from "@/components/admin/ui";
import { Stars } from "@/components/store/stars";

export const instant = false;

export const metadata: Metadata = { title: "Reviews" };

const PAGE_SIZE = 30;
const STATUSES = ["pending", "published", "hidden"] as const;
type Status = (typeof STATUSES)[number];

interface ReviewRow {
  id: string;
  author_name: string;
  rating: number;
  title: string | null;
  body: string | null;
  is_verified_purchase: boolean;
  status: Status;
  created_at: string;
  product: { id: string; title: string; slug: string; status: string } | null;
}

export default async function ReviewsPage(props: PageProps<"/admin/reviews">) {
  const user = await requireStaffPage();
  if (!can(user, "products")) return <NoAccess section="reviews" />;

  const params = await props.searchParams;
  const raw = Array.isArray(params.status) ? params.status[0] : params.status;
  const status: Status = STATUSES.includes(raw as Status) ? (raw as Status) : "pending";
  const pageRaw = Number(Array.isArray(params.page) ? params.page[0] : params.page);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;

  const supabase = await createClient();
  const [settings, counts, list] = await Promise.all([
    getStoreSettings(),
    Promise.all(
      STATUSES.map(async (s) => {
        const { count } = await supabase.from("reviews").select("id", { count: "exact", head: true }).eq("status", s);
        return [s, count ?? 0] as const;
      }),
    ),
    supabase
      .from("reviews")
      .select(
        "id, author_name, rating, title, body, is_verified_purchase, status, created_at, product:products(id, title, slug, status)",
        { count: "exact" },
      )
      .eq("status", status)
      .order("created_at", { ascending: status === "pending" })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
  ]);
  if (list.error) throw new Error(`Couldn't load reviews: ${list.error.message}`);

  const countMap = Object.fromEntries(counts) as Record<Status, number>;
  const rows = (list.data ?? []) as unknown as ReviewRow[];
  const pages = Math.max(1, Math.ceil((list.count ?? 0) / PAGE_SIZE));
  const labels: Record<Status, string> = { pending: "Waiting for review", published: "Published", hidden: "Hidden" };

  return (
    <>
      <PageHeader
        title="Reviews"
        description="New reviews wait here until you publish them. Published reviews count towards a product's star rating."
      />
      <FilterTabs
        tabs={STATUSES.map((s) => ({
          href: s === "pending" ? "/admin/reviews" : `/admin/reviews?status=${s}`,
          label: labels[s],
          count: countMap[s],
          active: s === status,
        }))}
      />
      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        {rows.length === 0 ? (
          <EmptyState icon={<MessageSquareText className="size-9" />} title={status === "pending" ? "You're all caught up" : `No ${labels[status].toLowerCase()} reviews`}>
            {status === "pending"
              ? "New reviews from customers will appear here for you to check."
              : "Reviews you move here will be listed on this tab."}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <li key={r.id} className="grid gap-3 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Stars rating={r.rating} size={15} />
                    {r.title && <span className="font-bold text-ink">{r.title}</span>}
                  </div>
                  {r.body ? (
                    <p className="mt-2 whitespace-pre-line text-[14.5px] leading-relaxed text-text">{r.body}</p>
                  ) : (
                    <p className="mt-2 text-[13.5px] italic text-muted">Rating only — no written review.</p>
                  )}
                  <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
                    <span className="font-semibold text-ink">{r.author_name}</span>
                    {r.is_verified_purchase && (
                      <span className="inline-flex items-center gap-1 font-semibold text-canopy">
                        <BadgeCheck className="size-4" /> Verified purchase
                      </span>
                    )}
                    <span>· {formatDateTime(r.created_at, settings.timezone)}</span>
                    {r.product && (
                      <>
                        <span>· on</span>
                        <Link href={`/admin/products/${r.product.id}`} className="font-semibold text-canopy hover:underline">
                          {r.product.title}
                        </Link>
                      </>
                    )}
                  </p>
                </div>
                <ReviewActions id={r.id} status={r.status} />
              </li>
            ))}
          </ul>
        )}
        <SimplePagination
          page={page}
          pages={pages}
          href={(p) => `/admin/reviews?${new URLSearchParams({ ...(status !== "pending" ? { status } : {}), ...(p > 1 ? { page: String(p) } : {}) }).toString()}`}
        />
      </div>
    </>
  );
}
