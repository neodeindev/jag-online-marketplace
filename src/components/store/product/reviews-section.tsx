import { BadgeCheck } from "lucide-react";
import { getProductReviews } from "@/lib/catalog";
import { formatDate } from "@/lib/format";
import { Stars } from "@/components/store/stars";
import { ReviewForm } from "./review-form";

export async function ReviewsSection({
  productId,
  slug,
  ratingAvg,
  ratingCount,
}: {
  productId: string;
  slug: string;
  ratingAvg: number;
  ratingCount: number;
}) {
  const reviews = await getProductReviews(productId);
  const distribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((r) => r.rating === stars).length,
  }));
  const total = Math.max(1, reviews.length);

  return (
    <section id="reviews" className="scroll-mt-40">
      <h2 className="display mb-5 text-[22px] font-extrabold text-ink">Customer reviews</h2>
      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <div>
          {ratingCount > 0 ? (
            <>
              <div className="flex items-center gap-3">
                <span className="display text-4xl font-black text-ink">{ratingAvg.toFixed(1)}</span>
                <div>
                  <Stars rating={ratingAvg} size={18} />
                  <p className="text-sm text-muted">
                    {ratingCount} {ratingCount === 1 ? "review" : "reviews"}
                  </p>
                </div>
              </div>
              <ul className="mt-4 space-y-1.5">
                {distribution.map((d) => (
                  <li key={d.stars} className="flex items-center gap-2 text-[13px]">
                    <span className="w-10 text-muted">{d.stars} star</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-mist">
                      <span className="block h-full rounded-full bg-gold-500" style={{ width: `${(d.count / total) * 100}%` }} />
                    </span>
                    <span className="w-6 text-right tabular-nums text-muted">{d.count}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted">No reviews yet. Bought this? Be the first to share what you think.</p>
          )}
          <div className="mt-5">
            <ReviewForm productId={productId} slug={slug} />
          </div>
        </div>

        {reviews.length > 0 && (
          <ul className="divide-y divide-line">
            {reviews.map((r) => (
              <li key={r.id} className="py-5 first:pt-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="inline-flex size-8 items-center justify-center rounded-full bg-canopy-50 text-sm font-bold text-canopy-700">
                    {r.author_name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="font-semibold text-ink">{r.author_name}</span>
                  {r.is_verified_purchase && (
                    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-canopy">
                      <BadgeCheck className="size-4" /> Verified purchase
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Stars rating={r.rating} size={14} />
                  {r.title && <span className="font-bold text-ink">{r.title}</span>}
                </div>
                <p className="mt-1 text-[12px] text-muted">Reviewed {formatDate(r.created_at)}</p>
                {r.body && <p className="mt-2 whitespace-pre-line text-[14.5px] leading-relaxed">{r.body}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
