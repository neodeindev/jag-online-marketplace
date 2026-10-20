"use client";

import { Check, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { formatPrice } from "@/lib/format";
import { listingHref, priceBrackets, toggleValue, withChanges } from "@/lib/listing";
import type { Facets } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useListingNavigation } from "./listing-navigation";

/**
 * Amazon-style filter sidebar. Every change updates the URL, so filtered
 * results can be shared, bookmarked and navigated with the back button.
 */
export function FilterPanel({
  facets,
  parentCategory,
}: {
  facets: Facets;
  parentCategory?: { name: string; slug: string } | null;
}) {
  const { basePath, state, apply: go } = useListingNavigation();
  const isCategoryPage = basePath.startsWith("/c/");

  const categoryHref = (slug: string) =>
    isCategoryPage ? listingHref(`/c/${slug}`, withChanges(state, {})) : listingHref(basePath, withChanges(state, { category: slug }));

  const brackets = priceBrackets(facets.price.min, facets.price.max);

  return (
    <div className="space-y-1 text-[14px]">
      {(facets.categories.length > 0 || parentCategory || state.category) && (
        <FilterGroup title="Category">
          <ul className="space-y-1">
            {parentCategory !== undefined && (
              <li>
                <Link
                  href={
                    parentCategory
                      ? categoryHref(parentCategory.slug)
                      : isCategoryPage
                        ? listingHref("/search", withChanges(state, { category: null }))
                        : listingHref(basePath, withChanges(state, { category: null }))
                  }
                  className="text-[13px] font-semibold text-canopy hover:underline"
                >
                  ‹ {parentCategory ? parentCategory.name : "All categories"}
                </Link>
              </li>
            )}
            {facets.categories.map((c) => (
              <li key={c.slug}>
                <Link
                  href={categoryHref(c.slug)}
                  className="flex items-center justify-between gap-2 rounded-md py-1 text-text hover:text-canopy"
                >
                  <span>{c.name}</span>
                  <span className="text-[12px] tabular-nums text-subtle">{c.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </FilterGroup>
      )}

      <FilterGroup title="Price">
        {brackets.length > 0 && (
          <ul className="mb-3 space-y-1">
            {brackets.map((b) => {
              const active = state.min === b.min && state.max === b.max;
              const label =
                b.min === null
                  ? `Under ${formatPrice(b.max!)}`
                  : b.max === null
                    ? `${formatPrice(b.min)} & above`
                    : `${formatPrice(b.min)} – ${formatPrice(b.max)}`;
              return (
                <li key={label}>
                  <button
                    type="button"
                    onClick={() => go(withChanges(state, active ? { min: null, max: null } : { min: b.min, max: b.max }))}
                    className={cn("py-0.5 text-left hover:text-canopy", active ? "font-bold text-ink" : "text-text")}
                  >
                    {label}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <PriceInputs
          key={`${state.min}-${state.max}`}
          min={state.min}
          max={state.max}
          onApply={(min, max) => go(withChanges(state, { min, max }))}
        />
      </FilterGroup>

      {facets.brands.length > 0 && (
        <FilterGroup title="Brand">
          <ShowMoreList
            items={facets.brands}
            limit={8}
            render={(b) => (
              <CheckRow
                key={b.slug}
                checked={state.brands.includes(b.slug)}
                onChange={() => go(withChanges(state, { brands: toggleValue(state.brands, b.slug) }))}
                label={b.name}
                count={b.count}
              />
            )}
          />
        </FilterGroup>
      )}

      {facets.attributes.map((attr) => (
        <FilterGroup key={attr.slug} title={attr.name}>
          {attr.kind === "color" ? (
            <ul className="flex flex-wrap gap-2">
              {attr.values.map((v) => {
                const key = `${attr.slug}:${v.slug}`;
                const checked = state.attrs.includes(key);
                return (
                  <li key={v.slug}>
                    <button
                      type="button"
                      onClick={() => go(withChanges(state, { attrs: toggleValue(state.attrs, key) }))}
                      aria-pressed={checked}
                      title={`${v.value} (${v.count})`}
                      className={cn(
                        "relative inline-flex size-8 items-center justify-center rounded-full ring-1 ring-black/15 transition",
                        checked ? "ring-2 ring-ink ring-offset-2" : "hover:ring-ink/40",
                      )}
                      style={{ background: v.hex ?? "#ddd" }}
                    >
                      <span className="sr-only">
                        {v.value} ({v.count})
                      </span>
                      {checked && (
                        <Check
                          className={cn("size-4", isLight(v.hex) ? "text-ink" : "text-white")}
                          strokeWidth={3}
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : attr.values.every((v) => v.value.length <= 4) ? (
            <ul className="flex flex-wrap gap-1.5">
              {attr.values.map((v) => {
                const key = `${attr.slug}:${v.slug}`;
                const checked = state.attrs.includes(key);
                return (
                  <li key={v.slug}>
                    <button
                      type="button"
                      onClick={() => go(withChanges(state, { attrs: toggleValue(state.attrs, key) }))}
                      aria-pressed={checked}
                      className={cn(
                        "inline-flex h-9 min-w-11 items-center justify-center rounded-lg border px-2.5 text-[13px] font-semibold transition",
                        checked ? "border-ink bg-ink text-white" : "border-line-strong bg-white text-text hover:border-ink",
                      )}
                    >
                      {v.value}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <ShowMoreList
              items={attr.values}
              limit={8}
              render={(v) => {
                const key = `${attr.slug}:${v.slug}`;
                return (
                  <CheckRow
                    key={v.slug}
                    checked={state.attrs.includes(key)}
                    onChange={() => go(withChanges(state, { attrs: toggleValue(state.attrs, key) }))}
                    label={v.value}
                    count={v.count}
                  />
                );
              }}
            />
          )}
        </FilterGroup>
      ))}

      <FilterGroup title="Availability & deals">
        <CheckRow
          checked={state.inStock}
          onChange={() => go(withChanges(state, { inStock: !state.inStock }))}
          label="In stock only"
          count={facets.in_stock}
        />
        <CheckRow
          checked={state.onSale}
          onChange={() => go(withChanges(state, { onSale: !state.onSale }))}
          label="On sale"
          count={facets.on_sale}
        />
      </FilterGroup>
    </div>
  );
}

function isLight(hex: string | null) {
  if (!hex) return true;
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return r * 0.299 + g * 0.587 + b * 0.114 > 160;
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="border-b border-line py-4 first:pt-0 last:border-b-0">
      <h3>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between text-left text-[14px] font-bold text-ink"
        >
          {title}
          <ChevronDown className={cn("size-4 text-muted transition-transform", !open && "-rotate-90")} />
        </button>
      </h3>
      {open && <div className="mt-3">{children}</div>}
    </section>
  );
}

function CheckRow({
  checked,
  onChange,
  label,
  count,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  count?: number;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1 hover:text-canopy">
      <input type="checkbox" checked={checked} onChange={onChange} className="size-[17px] rounded accent-canopy" />
      <span className={cn("flex-1", checked && "font-semibold text-ink")}>{label}</span>
      {count !== undefined && <span className="text-[12px] tabular-nums text-subtle">{count}</span>}
    </label>
  );
}

function ShowMoreList<T>({ items, limit, render }: { items: T[]; limit: number; render: (item: T) => ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, limit);
  return (
    <div>
      <div className="space-y-0.5">{visible.map(render)}</div>
      {items.length > limit && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-[13px] font-semibold text-canopy hover:underline"
        >
          {expanded ? "Show fewer" : `Show all ${items.length}`}
        </button>
      )}
    </div>
  );
}

function PriceInputs({
  min,
  max,
  onApply,
}: {
  min: number | null;
  max: number | null;
  onApply: (min: number | null, max: number | null) => void;
}) {
  const [low, setLow] = useState(min?.toString() ?? "");
  const [high, setHigh] = useState(max?.toString() ?? "");
  const parse = (v: string) => {
    const n = Number(v.replace(/[^\d]/g, ""));
    return v.trim() && Number.isFinite(n) ? n : null;
  };
  return (
    <form
      className="flex items-center gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        let a = parse(low);
        let b = parse(high);
        if (a !== null && b !== null && a > b) [a, b] = [b, a];
        onApply(a, b);
      }}
    >
      <label className="sr-only" htmlFor="price-min">
        Minimum price
      </label>
      <input
        id="price-min"
        inputMode="numeric"
        placeholder="Min"
        value={low}
        onChange={(e) => setLow(e.target.value)}
        className="h-9 w-full min-w-0 rounded-lg border border-line-strong bg-white px-2.5 text-[13px] outline-none focus:border-canopy"
      />
      <span className="text-muted">–</span>
      <label className="sr-only" htmlFor="price-max">
        Maximum price
      </label>
      <input
        id="price-max"
        inputMode="numeric"
        placeholder="Max"
        value={high}
        onChange={(e) => setHigh(e.target.value)}
        className="h-9 w-full min-w-0 rounded-lg border border-line-strong bg-white px-2.5 text-[13px] outline-none focus:border-canopy"
      />
      <button
        type="submit"
        className="h-9 shrink-0 rounded-lg border border-line-strong bg-white px-3 text-[13px] font-bold text-ink hover:border-ink"
      >
        Go
      </button>
    </form>
  );
}
