import type { ProductSort } from "./catalog-sorts";

/**
 * Listing filters as they appear in the URL:
 *   /search?q=phone&brand=samsung,apple&attr=colour:black&min=10000&max=50000&stock=1&deals=1&sort=price_asc&page=2
 * Category pages use the path (/c/phones) instead of `category`.
 */
export interface ListingState {
  q: string;
  category: string | null;
  brands: string[];
  attrs: string[];
  min: number | null;
  max: number | null;
  inStock: boolean;
  onSale: boolean;
  featured: boolean;
  sort: ProductSort | null;
  page: number;
}

const SORTS: ProductSort[] = ["relevance", "featured", "price_asc", "price_desc", "newest", "best_selling", "rating"];

type RawParams = Record<string, string | string[] | undefined>;

function list(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value : value ? [value] : [];
  return [...new Set(raw.flatMap((v) => v.split(",")).map((v) => v.trim().toLowerCase()).filter(Boolean))];
}

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function num(value: string | string[] | undefined): number | null {
  const v = one(value);
  const digits = v?.replace(/[^\d.]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function parseListingParams(params: RawParams, category: string | null = null): ListingState {
  const sort = one(params.sort) as ProductSort | undefined;
  const page = Number(one(params.page) ?? "1");
  return {
    q: (one(params.q) ?? "").trim().slice(0, 100),
    category: category ?? (one(params.category)?.trim() || null),
    brands: list(params.brand).slice(0, 20),
    attrs: list(params.attr).filter((a) => /^[a-z0-9-]+:[a-z0-9-]+$/.test(a)).slice(0, 30),
    min: num(params.min),
    max: num(params.max),
    inStock: one(params.stock) === "1",
    onSale: one(params.deals) === "1",
    featured: one(params.featured) === "1",
    sort: sort && SORTS.includes(sort) ? sort : null,
    page: Number.isFinite(page) && page >= 1 ? Math.min(Math.floor(page), 500) : 1,
  };
}

/** Query string for a listing state. `includeCategory` is false on /c/[slug] pages. */
export function listingQuery(state: ListingState, includeCategory: boolean): string {
  const p = new URLSearchParams();
  if (state.q) p.set("q", state.q);
  if (includeCategory && state.category) p.set("category", state.category);
  if (state.brands.length) p.set("brand", state.brands.join(","));
  for (const a of state.attrs) p.append("attr", a);
  if (state.min !== null) p.set("min", String(state.min));
  if (state.max !== null) p.set("max", String(state.max));
  if (state.inStock) p.set("stock", "1");
  if (state.onSale) p.set("deals", "1");
  if (state.featured) p.set("featured", "1");
  if (state.sort) p.set("sort", state.sort);
  if (state.page > 1) p.set("page", String(state.page));
  const qs = p.toString();
  return qs ? `?${qs}` : "";
}

export function listingHref(basePath: string, state: ListingState): string {
  const isCategoryPage = basePath.startsWith("/c/");
  return `${basePath}${listingQuery(state, !isCategoryPage)}`;
}

/** Change filters and go back to page 1. */
export function withChanges(state: ListingState, changes: Partial<ListingState>): ListingState {
  return { ...state, page: 1, ...changes };
}

export function toggleValue(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}

export function activeFilterCount(state: ListingState): number {
  return (
    state.brands.length +
    state.attrs.length +
    (state.min !== null || state.max !== null ? 1 : 0) +
    (state.inStock ? 1 : 0) +
    (state.onSale ? 1 : 0) +
    (state.featured ? 1 : 0)
  );
}

/** Handy price brackets based on the range of prices in the results. */
export function priceBrackets(min: number | null, max: number | null): { label: string; min: number | null; max: number | null }[] {
  if (min === null || max === null || max <= 0 || max - min < 1000) return [];
  const steps = [1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000, 1000000];
  const candidates = steps.filter((s) => s > min && s < max);
  if (candidates.length === 0) return [];
  const picks = candidates.length <= 3 ? candidates : [candidates[0], candidates[Math.floor(candidates.length / 2)], candidates.at(-1)!];
  const brackets: { label: string; min: number | null; max: number | null }[] = [];
  let lower: number | null = null;
  for (const p of picks) {
    brackets.push({ label: "", min: lower, max: p });
    lower = p;
  }
  brackets.push({ label: "", min: lower, max: null });
  return brackets;
}
