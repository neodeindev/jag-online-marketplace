import { Download, Package, Plus, Upload } from "lucide-react";
import type { Metadata } from "next";
import { loadCategories } from "@/lib/admin/catalog-admin";
import { categoryPathMap, flattenCategories, subtreeIds } from "@/lib/admin/category-tree";
import { can, requireStaffPage } from "@/lib/auth";
import { getStoreSettings } from "@/lib/catalog";
import { currentPriceFor } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";
import { ProductFilters, ProductTable, type ProductListRow } from "@/components/admin/catalog/product-table";
import { EmptyState, NoAccess, PageHeader, SimplePagination } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/button";

export const instant = false;

export const metadata: Metadata = { title: "Products" };

const PAGE_SIZE = 50;

interface Row {
  id: string;
  title: string;
  sku: string;
  slug: string;
  price: number;
  sale_price: number | null;
  sale_ends_at: string | null;
  stock: number;
  status: "active" | "hidden";
  is_featured: boolean;
  category_id: string | null;
  images: { url: string; sort_order: number }[];
}

function one(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export default async function ProductsPage(props: PageProps<"/admin/products">) {
  const user = await requireStaffPage();
  if (!can(user, "products")) return <NoAccess section="products" />;

  const params = await props.searchParams;
  const q = one(params.q).replace(/[,()"'\\%*]/g, " ").trim().slice(0, 80);
  const category = one(params.category);
  const status = one(params.status);
  const stock = one(params.stock);
  const sort = one(params.sort) || "newest";
  const page = Math.max(1, Math.min(1000, Number(one(params.page)) || 1));

  const supabase = await createClient();
  const [categories, settings] = await Promise.all([loadCategories(supabase), getStoreSettings()]);
  const paths = categoryPathMap(categories);

  let query = supabase
    .from("products")
    .select(
      "id, title, sku, slug, price, sale_price, sale_ends_at, stock, status, is_featured, category_id, images:product_images(url, sort_order)",
      { count: "exact" },
    );
  if (q) query = query.or(`title.ilike.%${q}%,sku.ilike.%${q}%`);
  if (category === "none") query = query.is("category_id", null);
  else if (/^[0-9a-f-]{36}$/i.test(category)) query = query.in("category_id", subtreeIds(categories, category));
  if (status === "active" || status === "hidden") query = query.eq("status", status);
  if (stock === "out") query = query.eq("stock", 0);
  if (stock === "low") query = query.gt("stock", 0).lte("stock", settings.low_stock_threshold);

  switch (sort) {
    case "title":
      query = query.order("title");
      break;
    case "price_asc":
      query = query.order("price");
      break;
    case "price_desc":
      query = query.order("price", { ascending: false });
      break;
    case "stock":
      query = query.order("stock").order("title");
      break;
    case "best_selling":
      query = query.order("sold_count", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data, count, error } = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) throw new Error(`Couldn't load products: ${error.message}`);

  const rows: ProductListRow[] = ((data ?? []) as unknown as Row[]).map((r) => {
    const price = Number(r.price);
    const sale = r.sale_price === null ? null : Number(r.sale_price);
    const current = currentPriceFor(price, sale, r.sale_ends_at);
    return {
      id: r.id,
      title: r.title,
      sku: r.sku,
      slug: r.slug,
      price,
      salePrice: sale,
      onSale: current < price,
      stock: r.stock,
      status: r.status,
      isFeatured: r.is_featured,
      category: r.category_id ? (paths.get(r.category_id) ?? null) : null,
      imageUrl: [...(r.images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? null,
    };
  });

  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = Boolean(q || category || status || stock);
  const pageHref = (p: number) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries({ q, category, status, stock, sort: sort === "newest" ? "" : sort })) {
      if (value) next.set(key, value);
    }
    if (p > 1) next.set("page", String(p));
    const qs = next.toString();
    return qs ? `/admin/products?${qs}` : "/admin/products";
  };

  return (
    <>
      <PageHeader
        title="Products"
        description={`${total.toLocaleString()} ${filtered ? "matching" : "in your catalog"}. Click a stock number to change it.`}
        actions={
          <>
            <ButtonLink href="/admin/products/export" variant="outline" prefetch={false}>
              <Download className="size-4" /> Export CSV
            </ButtonLink>
            <ButtonLink href="/admin/products/import" variant="outline">
              <Upload className="size-4" /> Import
            </ButtonLink>
            <ButtonLink href="/admin/products/new">
              <Plus className="size-4" /> Add product
            </ButtonLink>
          </>
        }
      />
      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        <ProductFilters
          key={`${q}-${category}-${status}-${stock}-${sort}`}
          categories={flattenCategories(categories).map(({ category: c, path }) => ({ id: c.id, path }))}
          current={{ q, category, status, stock, sort }}
        />
        {rows.length === 0 ? (
          <EmptyState
            icon={<Package className="size-9" />}
            title={filtered ? "No products match these filters" : "No products yet"}
            action={
              filtered ? (
                <ButtonLink href="/admin/products" variant="outline">
                  Clear filters
                </ButtonLink>
              ) : (
                <div className="flex gap-2">
                  <ButtonLink href="/admin/products/new">Add your first product</ButtonLink>
                  <ButtonLink href="/admin/products/import" variant="outline">
                    Import a spreadsheet
                  </ButtonLink>
                </div>
              )
            }
          >
            {filtered ? "Try a different search or remove a filter." : "Add products one by one, or import them all at once from a CSV file."}
          </EmptyState>
        ) : (
          <ProductTable key={`${page}-${q}-${category}-${status}-${stock}-${sort}`} rows={rows} lowStockThreshold={settings.low_stock_threshold} />
        )}
        <SimplePagination page={page} pages={pages} href={pageHref} />
      </div>
    </>
  );
}
