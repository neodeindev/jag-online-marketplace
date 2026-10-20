import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import type { ProductSort } from "./catalog-sorts";
import { currentPriceFor } from "./pricing";
import { createPublicClient } from "./supabase/public";
import type {
  Banner,
  Category,
  CategoryNode,
  DeliveryZone,
  Facets,
  PageSummary,
  ProductCardData,
  ProductDetail,
  ProductOptionGroup,
  Review,
  SearchResult,
  StoreSettings,
} from "./types";

/**
 * Public catalog reads. Everything here is cached and shared between
 * visitors; dashboard changes call updateTag() with these tags.
 */
export const CACHE_TAGS = {
  settings: "settings",
  catalog: "catalog",
  content: "content",
} as const;

// -----------------------------------------------------------------------------
// Store settings & delivery
// -----------------------------------------------------------------------------

export async function getStoreSettings(): Promise<StoreSettings> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.settings);

  const { data, error } = await createPublicClient().from("store_settings").select("*").eq("id", 1).single();
  if (error) throw new Error(`Couldn't load store settings: ${error.message}`);
  return {
    ...data,
    free_delivery_threshold: data.free_delivery_threshold === null ? null : Number(data.free_delivery_threshold),
  } as StoreSettings;
}

export async function getDeliveryZones(): Promise<DeliveryZone[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.settings);

  const { data, error } = await createPublicClient()
    .from("delivery_zones")
    .select("id, name, description, fee, estimated_days, is_pickup, is_active, sort_order")
    .eq("is_active", true)
    .order("sort_order")
    .order("name");
  if (error) throw new Error(`Couldn't load delivery areas: ${error.message}`);
  return data.map((z) => ({ ...z, fee: Number(z.fee) }));
}

// -----------------------------------------------------------------------------
// Categories
// -----------------------------------------------------------------------------

export async function getAllCategories(): Promise<Category[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.catalog);

  const { data, error } = await createPublicClient()
    .from("categories")
    .select("id, parent_id, name, slug, description, image_url, sort_order, is_active, is_featured")
    .order("sort_order")
    .order("name");
  if (error) throw new Error(`Couldn't load categories: ${error.message}`);
  return data;
}

export function buildCategoryTree(categories: Category[], { activeOnly = true } = {}): CategoryNode[] {
  const nodes = new Map<string, CategoryNode>();
  for (const c of categories) {
    if (activeOnly && !c.is_active) continue;
    nodes.set(c.id, { ...c, children: [] });
  }
  const roots: CategoryNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parent_id ? nodes.get(node.parent_id) : undefined;
    if (parent) parent.children.push(node);
    else if (!node.parent_id) roots.push(node);
  }
  return roots;
}

export async function getCategoryTree(): Promise<CategoryNode[]> {
  return buildCategoryTree(await getAllCategories());
}

/** Root-to-leaf path for a category, e.g. Fashion › Women › Dresses. */
export function categoryPath(categories: Category[], categoryId: string | null): Category[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const path: Category[] = [];
  let current = categoryId ? byId.get(categoryId) : undefined;
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current);
    current = current.parent_id ? byId.get(current.parent_id) : undefined;
  }
  return path;
}

export async function getCategoryBySlug(slug: string) {
  const categories = await getAllCategories();
  const category = categories.find((c) => c.slug === slug && c.is_active);
  if (!category) return null;
  return {
    category,
    path: categoryPath(categories, category.id),
    children: categories.filter((c) => c.parent_id === category.id && c.is_active),
  };
}

// -----------------------------------------------------------------------------
// Product listings
// -----------------------------------------------------------------------------


export interface SearchParamsInput {
  query?: string | null;
  category?: string | null;
  brands?: string[];
  attrs?: string[];
  minPrice?: number | null;
  maxPrice?: number | null;
  inStock?: boolean;
  onSale?: boolean;
  featured?: boolean;
  sort?: ProductSort;
  page?: number;
  pageSize?: number;
  ids?: string[];
}

type SearchRow = ProductCardData & { is_fuzzy: boolean; total_count: number };

function toCard(row: SearchRow): ProductCardData {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    brand_name: row.brand_name,
    price: Number(row.price),
    current_price: Number(row.current_price),
    sale_ends_at: row.sale_ends_at,
    stock: row.stock,
    image_url: row.image_url,
    hover_image_url: row.hover_image_url,
    rating_avg: Number(row.rating_avg),
    rating_count: row.rating_count,
    colors: Array.isArray(row.colors) ? row.colors : [],
    has_options: row.has_options,
  };
}

export async function searchProducts(input: SearchParamsInput): Promise<SearchResult> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CACHE_TAGS.catalog);

  const page = Math.max(1, Math.floor(input.page ?? 1));
  const pageSize = Math.min(60, Math.max(1, input.pageSize ?? 24));
  const query = input.query?.trim() || null;
  const sort = input.sort ?? (query ? "relevance" : "featured");

  const { data, error } = await createPublicClient().rpc("search_products", {
    p_query: query ?? undefined,
    p_category_slug: input.category ?? undefined,
    p_brand_slugs: input.brands?.length ? input.brands : undefined,
    p_attrs: input.attrs?.length ? input.attrs : undefined,
    p_min_price: input.minPrice ?? undefined,
    p_max_price: input.maxPrice ?? undefined,
    p_in_stock: input.inStock ?? false,
    p_on_sale: input.onSale ?? false,
    p_featured: input.featured ?? false,
    p_sort: sort,
    p_limit: pageSize,
    p_offset: (page - 1) * pageSize,
    p_ids: input.ids ?? undefined,
  });
  if (error) throw new Error(`Search failed: ${error.message}`);

  const rows = (data ?? []) as unknown as SearchRow[];
  return {
    products: rows.map(toCard),
    total: rows.length ? Number(rows[0].total_count) : 0,
    isFuzzy: rows.some((r) => r.is_fuzzy),
    page,
    pageSize,
  };
}

export async function getFacets(query: string | null, category: string | null): Promise<Facets> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CACHE_TAGS.catalog);

  const { data, error } = await createPublicClient().rpc("search_facets", {
    p_query: query?.trim() || undefined,
    p_category_slug: category ?? undefined,
  });
  if (error) throw new Error(`Couldn't load filters: ${error.message}`);
  const facets = data as unknown as Facets;
  return {
    ...facets,
    price: {
      min: facets.price.min === null ? null : Number(facets.price.min),
      max: facets.price.max === null ? null : Number(facets.price.max),
    },
  };
}

/** A short list for homepage rails and "related items". */
export async function getProductRail(
  kind: "deals" | "new" | "featured" | "best_selling",
  limit = 12,
): Promise<ProductCardData[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CACHE_TAGS.catalog);

  const params: SearchParamsInput = { pageSize: limit };
  if (kind === "deals") Object.assign(params, { onSale: true, inStock: true, sort: "best_selling" });
  if (kind === "new") Object.assign(params, { sort: "newest", inStock: true });
  if (kind === "featured") Object.assign(params, { featured: true, sort: "featured" });
  if (kind === "best_selling") Object.assign(params, { sort: "best_selling", inStock: true });
  return (await searchProducts(params)).products;
}

export async function getRelatedProducts(productId: string, categorySlug: string | null): Promise<ProductCardData[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CACHE_TAGS.catalog);

  const related: ProductCardData[] = [];
  const add = (products: ProductCardData[]) => {
    for (const p of products) {
      if (p.id !== productId && !related.some((r) => r.id === p.id)) related.push(p);
    }
  };

  // The product's own category first, then its parents: Dresses, then Women, then Fashion.
  if (categorySlug) {
    const categories = await getAllCategories();
    const category = categories.find((c) => c.slug === categorySlug);
    const lineage = category ? categoryPath(categories, category.id).reverse() : [];
    for (const c of lineage) {
      if (related.length >= 12) break;
      add((await searchProducts({ category: c.slug, sort: "best_selling", pageSize: 13 })).products);
    }
  }
  if (related.length < 8) {
    add((await searchProducts({ sort: "best_selling", inStock: true, pageSize: 16 })).products);
  }
  return related.slice(0, 12);
}

// -----------------------------------------------------------------------------
// Product detail
// -----------------------------------------------------------------------------

interface ProductRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  sku: string;
  price: number;
  sale_price: number | null;
  sale_ends_at: string | null;
  stock: number;
  status: "active" | "hidden";
  rating_avg: number;
  rating_count: number;
  specifications: unknown;
  updated_at: string;
  category_id: string | null;
  brand: { name: string; slug: string } | null;
  images: { id: string; url: string; alt: string | null; width: number | null; height: number | null; sort_order: number }[];
  attributes: {
    value: {
      value: string;
      slug: string;
      color_hex: string | null;
      sort_order: number;
      attribute: { name: string; slug: string; kind: "select" | "color"; is_option: boolean; sort_order: number };
    } | null;
  }[];
}

export async function getProduct(slug: string): Promise<ProductDetail | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CACHE_TAGS.catalog);

  const { data, error } = await createPublicClient()
    .from("products")
    .select(
      `id, slug, title, description, sku, price, sale_price, sale_ends_at, stock, status,
       rating_avg, rating_count, specifications, updated_at, category_id,
       brand:brands(name, slug),
       images:product_images(id, url, alt, width, height, sort_order),
       attributes:product_attribute_values(
         value:attribute_values(value, slug, color_hex, sort_order,
           attribute:attributes(name, slug, kind, is_option, sort_order))
       )`,
    )
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw new Error(`Couldn't load product: ${error.message}`);
  if (!data) return null;

  const row = data as unknown as ProductRow;
  const categories = await getAllCategories();
  const path = categoryPath(categories, row.category_id);
  const leaf = path.at(-1) ?? null;

  const groups = new Map<
    string,
    { name: string; slug: string; kind: "select" | "color"; isOption: boolean; sort: number; values: { value: string; hex: string | null; sort: number }[] }
  >();
  for (const { value } of row.attributes) {
    if (!value) continue;
    const a = value.attribute;
    const group = groups.get(a.slug) ?? {
      name: a.name,
      slug: a.slug,
      kind: a.kind,
      isOption: a.is_option,
      sort: a.sort_order,
      values: [],
    };
    group.values.push({ value: value.value, hex: value.color_hex, sort: value.sort_order });
    groups.set(a.slug, group);
  }
  const sortedGroups = [...groups.values()]
    .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name))
    .map((g) => ({ ...g, values: g.values.sort((a, b) => a.sort - b.sort || a.value.localeCompare(b.value)) }));

  const options: ProductOptionGroup[] = sortedGroups
    .filter((g) => g.isOption)
    .map((g) => ({ name: g.name, slug: g.slug, kind: g.kind, values: g.values.map(({ value, hex }) => ({ value, hex })) }));

  const price = Number(row.price);
  const salePrice = row.sale_price === null ? null : Number(row.sale_price);

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    sku: row.sku,
    price,
    sale_price: salePrice,
    sale_ends_at: row.sale_ends_at,
    current_price: currentPriceFor(price, salePrice, row.sale_ends_at),
    stock: row.stock,
    status: row.status,
    rating_avg: Number(row.rating_avg),
    rating_count: row.rating_count,
    specifications: Array.isArray(row.specifications)
      ? (row.specifications as { label?: unknown; value?: unknown }[])
          .filter((s) => s && typeof s.label === "string" && typeof s.value === "string")
          .map((s) => ({ label: String(s.label), value: String(s.value) }))
      : [],
    brand: row.brand,
    category: leaf ? { id: leaf.id, name: leaf.name, slug: leaf.slug } : null,
    breadcrumbs: path.map((c) => ({ name: c.name, slug: c.slug })),
    images: [...row.images]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(({ id, url, alt, width, height }) => ({ id, url, alt, width, height })),
    options,
    details: sortedGroups.filter((g) => !g.isOption).map((g) => ({ name: g.name, values: g.values.map((v) => v.value) })),
    updated_at: row.updated_at,
  };
}

export async function getProductReviews(productId: string): Promise<Review[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CACHE_TAGS.catalog);

  const { data, error } = await createPublicClient()
    .from("reviews")
    .select("id, author_name, rating, title, body, is_verified_purchase, created_at")
    .eq("product_id", productId)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw new Error(`Couldn't load reviews: ${error.message}`);
  return data;
}

/** Slugs of every active product, for the sitemap. */
export async function getProductSlugs(): Promise<{ slug: string; updated_at: string }[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.catalog);

  const { data, error } = await createPublicClient()
    .from("products")
    .select("slug, updated_at")
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(5000);
  if (error) throw new Error(`Couldn't load products: ${error.message}`);
  return data;
}

// -----------------------------------------------------------------------------
// Content
// -----------------------------------------------------------------------------

export async function getBanners(): Promise<Banner[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CACHE_TAGS.content);

  const { data, error } = await createPublicClient()
    .from("banners")
    .select("id, title, subtitle, cta_label, link_url, image_url, placement, layout, theme")
    .order("sort_order")
    .order("created_at");
  if (error) throw new Error(`Couldn't load banners: ${error.message}`);
  return data as Banner[];
}

export async function getPage(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.content);

  const { data, error } = await createPublicClient()
    .from("pages")
    .select("slug, title, content, updated_at")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) throw new Error(`Couldn't load page: ${error.message}`);
  return data;
}

export async function getFooterPages(): Promise<PageSummary[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.content);

  const { data, error } = await createPublicClient()
    .from("pages")
    .select("slug, title")
    .eq("is_published", true)
    .eq("show_in_footer", true)
    .order("sort_order")
    .order("title");
  if (error) throw new Error(`Couldn't load pages: ${error.message}`);
  return data;
}

export interface SearchSuggestions {
  products: { slug: string; title: string; current_price: number; image_url: string | null }[];
  categories: { slug: string; name: string; parent_name: string | null }[];
  brands: { slug: string; name: string }[];
}

export async function getSearchSuggestions(query: string): Promise<SearchSuggestions> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CACHE_TAGS.catalog);

  const { data, error } = await createPublicClient().rpc("search_suggestions", { p_query: query });
  if (error) throw new Error(`Suggestions failed: ${error.message}`);
  const result = data as unknown as SearchSuggestions;
  return {
    ...result,
    products: result.products.map((p) => ({ ...p, current_price: Number(p.current_price) })),
  };
}

// -----------------------------------------------------------------------------
// Homepage
// -----------------------------------------------------------------------------

export interface CategoryTile {
  slug: string;
  name: string;
  image_url: string | null;
}

/** Featured categories (or top-level ones), each with a photo. */
export async function getCategoryTiles(): Promise<CategoryTile[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.catalog);

  const categories = (await getAllCategories()).filter((c) => c.is_active);
  const featured = categories.filter((c) => c.is_featured);
  const list = (featured.length > 0 ? featured : categories.filter((c) => !c.parent_id)).slice(0, 14);

  return Promise.all(
    list.map(async (c) => ({
      slug: c.slug,
      name: c.name,
      image_url:
        c.image_url ??
        (await searchProducts({ category: c.slug, sort: "best_selling", pageSize: 1 })).products[0]?.image_url ??
        null,
    })),
  );
}

export interface DepartmentCard {
  slug: string;
  name: string;
  products: ProductCardData[];
}

/** Top-level departments with four popular products each. */
export async function getDepartmentCards(limit = 4): Promise<DepartmentCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.catalog);

  const roots = (await getAllCategories()).filter((c) => c.is_active && !c.parent_id);
  const cards = await Promise.all(
    roots.map(async (c) => ({
      slug: c.slug,
      name: c.name,
      products: (await searchProducts({ category: c.slug, sort: "best_selling", inStock: true, pageSize: 4 })).products,
    })),
  );
  return cards.filter((c) => c.products.length >= 4).slice(0, limit);
}
