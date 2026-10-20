import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { getFacets, getProductRail, searchProducts } from "@/lib/catalog";
import { listingHref, withChanges, type ListingState } from "@/lib/listing";
import { cn } from "@/lib/utils";
import { ProductGrid } from "@/components/store/product-card";
import { ProductRail } from "@/components/store/product-rail";
import { SectionHeading } from "@/components/store/section-heading";
import { ButtonLink } from "@/components/ui/button";
import { FilterPanel } from "./filter-panel";
import { ActiveFilters, MobileFilters, SortSelect } from "./listing-controls";
import { ListingNavigationProvider, PendingResults } from "./listing-navigation";

const PAGE_SIZE = 24;

/**
 * Shared results layout for search, category and deals pages:
 * filter sidebar, sort, active-filter chips, product grid and pagination.
 */
export async function ListingView({
  basePath,
  state,
  title,
  subtitle,
  parentCategory,
  topSlot,
}: {
  basePath: string;
  state: ListingState;
  title: ReactNode;
  subtitle?: ReactNode;
  parentCategory?: { name: string; slug: string } | null;
  topSlot?: ReactNode;
}) {
  const [result, facets] = await Promise.all([
    searchProducts({
      query: state.q || null,
      category: state.category,
      brands: state.brands,
      attrs: state.attrs,
      minPrice: state.min,
      maxPrice: state.max,
      inStock: state.inStock,
      onSale: state.onSale,
      featured: state.featured,
      sort: state.sort ?? undefined,
      page: state.page,
      pageSize: PAGE_SIZE,
    }),
    getFacets(state.q || null, state.category),
  ]);

  const pages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const from = result.total === 0 ? 0 : (result.page - 1) * PAGE_SIZE + 1;
  const to = Math.min(result.total, result.page * PAGE_SIZE);

  return (
    <ListingNavigationProvider basePath={basePath} state={state}>
      <div className="mb-5 mt-3 flex flex-col gap-1">
        <h1 className="display text-[26px] font-black leading-tight text-ink sm:text-[32px]">{title}</h1>
        {subtitle && <div className="text-[14px] text-muted">{subtitle}</div>}
      </div>

      {topSlot}

      <div className="flex gap-8">
        <aside className="hidden w-60 shrink-0 lg:block" aria-label="Filters">
          <div className="sticky top-[140px] max-h-[calc(100dvh-160px)] overflow-y-auto pb-6 pr-2">
            <FilterPanel facets={facets} parentCategory={parentCategory} />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
            <p className="text-[14px] text-muted" aria-live="polite">
              {result.total > 0 ? (
                <>
                  <span className="font-semibold text-ink">
                    {from}–{to}
                  </span>{" "}
                  of {result.total.toLocaleString()} results
                  {state.q && (
                    <>
                      {" "}
                      for <span className="font-semibold text-flag">“{state.q}”</span>
                    </>
                  )}
                </>
              ) : (
                "No results"
              )}
            </p>
            <div className="flex items-center gap-2">
              <MobileFilters facets={facets} parentCategory={parentCategory} total={result.total} />
              <SortSelect />
            </div>
          </div>

          <div className="mb-4 empty:hidden">
            <ActiveFilters facets={facets} />
          </div>

          {result.isFuzzy && result.total > 0 && (
            <p className="mb-4 rounded-xl bg-gold-50 px-4 py-3 text-[14px] text-ink">
              No exact matches for <strong>“{state.q}”</strong>. Showing products with similar spellings.
            </p>
          )}

          <PendingResults>
            {result.products.length > 0 ? (
              <ProductGrid
                products={result.products}
                priorityCount={4}
                className="xl:grid-cols-4"
                sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 28vw, (min-width: 640px) 30vw, 46vw"
              />
            ) : (
              <EmptyResults basePath={basePath} state={state} />
            )}
          </PendingResults>

          {pages > 1 && <Pagination basePath={basePath} state={state} pages={pages} />}
        </div>
      </div>
    </ListingNavigationProvider>
  );
}

async function EmptyResults({ basePath, state }: { basePath: string; state: ListingState }) {
  const popular = await getProductRail("best_selling", 12);
  const hasFilters =
    state.brands.length || state.attrs.length || state.min !== null || state.max !== null || state.inStock || state.onSale;
  return (
    <div>
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-white px-6 py-14 text-center">
        <SearchX className="mb-3 size-10 text-subtle" />
        <p className="display-tight text-lg font-extrabold text-ink">
          {state.q ? `Nothing found for “${state.q}”` : "No products match these filters"}
        </p>
        <p className="mt-1 max-w-md text-sm text-muted">
          {hasFilters
            ? "Try removing a filter or widening the price range."
            : "Check the spelling, or try a more general word like “shoes” or “phone”."}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {hasFilters ? (
            <ButtonLink
              href={listingHref(basePath, withChanges(state, { brands: [], attrs: [], min: null, max: null, inStock: false, onSale: false }))}
              variant="dark"
            >
              Clear filters
            </ButtonLink>
          ) : null}
          <ButtonLink href="/search" variant="outline">
            Browse everything
          </ButtonLink>
        </div>
      </div>
      {popular.length > 0 && (
        <section className="mt-10">
          <SectionHeading title="Popular right now" />
          <ProductRail products={popular} />
        </section>
      )}
    </div>
  );
}

function Pagination({ basePath, state, pages }: { basePath: string; state: ListingState; pages: number }) {
  const current = state.page;
  const visible = new Set([1, pages, current - 1, current, current + 1].filter((p) => p >= 1 && p <= pages));
  const sorted = [...visible].sort((a, b) => a - b);
  const href = (page: number) => listingHref(basePath, { ...state, page });

  return (
    <nav aria-label="Pages" className="mt-10 flex items-center justify-center gap-1.5">
      <PageLink href={current > 1 ? href(current - 1) : undefined} label="Previous page">
        <ChevronLeft className="size-4" /> <span className="hidden sm:inline">Previous</span>
      </PageLink>
      {sorted.map((page, i) => (
        <span key={page} className="flex items-center gap-1.5">
          {i > 0 && page - sorted[i - 1] > 1 && <span className="px-1 text-muted">…</span>}
          <Link
            href={href(page)}
            aria-current={page === current ? "page" : undefined}
            className={cn(
              "inline-flex size-10 items-center justify-center rounded-xl text-sm font-semibold tabular-nums",
              page === current ? "bg-ink text-white" : "border border-line-strong bg-white text-ink hover:border-ink",
            )}
          >
            {page}
          </Link>
        </span>
      ))}
      <PageLink href={current < pages ? href(current + 1) : undefined} label="Next page">
        <span className="hidden sm:inline">Next</span> <ChevronRight className="size-4" />
      </PageLink>
    </nav>
  );
}

function PageLink({ href, label, children }: { href?: string; label: string; children: ReactNode }) {
  const classes =
    "inline-flex h-10 items-center gap-1 rounded-xl border border-line-strong bg-white px-3 text-sm font-semibold text-ink";
  if (!href) {
    return (
      <span className={cn(classes, "opacity-40")} aria-disabled>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} aria-label={label} className={cn(classes, "hover:border-ink")}>
      {children}
    </Link>
  );
}

export function ListingSkeleton() {
  return (
    <div className="mt-3">
      <div className="skeleton mb-6 h-9 w-64" />
      <div className="flex gap-8">
        <div className="hidden w-60 shrink-0 space-y-4 lg:block">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton h-5 w-full" />
          ))}
        </div>
        <div className="grid flex-1 grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i}>
              <div className="skeleton aspect-square w-full rounded-[14px]" />
              <div className="skeleton mt-3 h-4 w-4/5" />
              <div className="skeleton mt-2 h-5 w-1/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
