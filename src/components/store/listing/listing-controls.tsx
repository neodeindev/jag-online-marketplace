"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { SORT_OPTIONS, type ProductSort } from "@/lib/catalog-sorts";
import { formatPrice } from "@/lib/format";
import { activeFilterCount, withChanges, type ListingState } from "@/lib/listing";
import type { Facets } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { FilterPanel } from "./filter-panel";
import { useListingNavigation } from "./listing-navigation";

export function SortSelect() {
  const { state, apply } = useListingNavigation();
  const options = state.q ? [{ value: "relevance" as ProductSort, label: "Best match" }, ...SORT_OPTIONS] : SORT_OPTIONS;
  const current = state.sort ?? (state.q ? "relevance" : "featured");
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="sr-only text-muted sm:not-sr-only">Sort by</span>
      <select
        value={current}
        onChange={(e) => apply(withChanges(state, { sort: e.target.value as ProductSort }))}
        className="h-10 rounded-xl border border-line-strong bg-white pl-3 pr-8 text-sm font-semibold text-ink outline-none focus:border-canopy"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function MobileFilters({
  facets,
  parentCategory,
  total,
}: {
  facets: Facets;
  parentCategory?: { name: string; slug: string } | null;
  total: number;
}) {
  const { state } = useListingNavigation();
  const [open, setOpen] = useState(false);
  const count = activeFilterCount(state);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="lg:hidden">
        <SlidersHorizontal className="size-4" />
        Filters
        {count > 0 && (
          <span className="inline-flex size-5 items-center justify-center rounded-full bg-ink text-[11px] text-white">{count}</span>
        )}
      </Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        side="bottom"
        title="Filters"
        footer={
          <Button className="w-full" onClick={() => setOpen(false)}>
            Show {total.toLocaleString()} {total === 1 ? "result" : "results"}
          </Button>
        }
      >
        <div className="px-5 py-4">
          <FilterPanel facets={facets} parentCategory={parentCategory} />
        </div>
      </Sheet>
    </>
  );
}

/** Removable chips for each active filter, plus "Clear all". */
export function ActiveFilters({ facets }: { facets: Facets }) {
  const { state, apply } = useListingNavigation();
  const chips: { label: string; next: ListingState }[] = [];

  for (const slug of state.brands) {
    const name = facets.brands.find((b) => b.slug === slug)?.name ?? slug;
    chips.push({ label: name, next: withChanges(state, { brands: state.brands.filter((b) => b !== slug) }) });
  }
  for (const key of state.attrs) {
    const [attrSlug, valueSlug] = key.split(":");
    const attr = facets.attributes.find((a) => a.slug === attrSlug);
    const value = attr?.values.find((v) => v.slug === valueSlug)?.value ?? valueSlug;
    chips.push({
      label: `${attr?.name ?? attrSlug}: ${value}`,
      next: withChanges(state, { attrs: state.attrs.filter((a) => a !== key) }),
    });
  }
  if (state.min !== null || state.max !== null) {
    const label =
      state.min !== null && state.max !== null
        ? `${formatPrice(state.min)} – ${formatPrice(state.max)}`
        : state.min !== null
          ? `${formatPrice(state.min)} & above`
          : `Under ${formatPrice(state.max!)}`;
    chips.push({ label, next: withChanges(state, { min: null, max: null }) });
  }
  if (state.inStock) chips.push({ label: "In stock", next: withChanges(state, { inStock: false }) });
  if (state.onSale) chips.push({ label: "On sale", next: withChanges(state, { onSale: false }) });
  if (state.featured) chips.push({ label: "Featured", next: withChanges(state, { featured: false }) });

  if (chips.length === 0) return null;

  const cleared = withChanges(state, { brands: [], attrs: [], min: null, max: null, inStock: false, onSale: false, featured: false });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={chip.label}
          type="button"
          onClick={() => apply(chip.next)}
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-ink/15 bg-white pl-3 pr-2 text-[13px] font-semibold text-ink hover:border-ink"
          aria-label={`Remove filter: ${chip.label}`}
        >
          {chip.label}
          <X className="size-3.5 text-muted" />
        </button>
      ))}
      {chips.length > 1 && (
        <button
          type="button"
          onClick={() => apply(cleared)}
          className="h-8 px-2 text-[13px] font-semibold text-canopy hover:underline"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
