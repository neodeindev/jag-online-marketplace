import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadAttributes, loadBrands, loadCategories } from "@/lib/admin/catalog-admin";
import { can, requireStaffPage } from "@/lib/auth";
import { getStoreSettings } from "@/lib/catalog";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { ProductForm, type ProductFormInitial } from "@/components/admin/catalog/product-form";
import { NoAccess, PageHeader, Pill } from "@/components/admin/ui";

export const instant = false;

export const metadata: Metadata = { title: "Edit product" };

interface ProductRow {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  sale_price: number | null;
  sale_ends_at: string | null;
  sku: string;
  stock: number;
  category_id: string | null;
  brand_id: string | null;
  status: "active" | "hidden";
  is_featured: boolean;
  specifications: unknown;
  sold_count: number;
  updated_at: string;
  images: { id: string; url: string; storage_path: string | null; alt: string | null; width: number | null; height: number | null; sort_order: number }[];
  attributes: { attribute_value_id: string }[];
}

export default async function EditProductPage(props: PageProps<"/admin/products/[id]">) {
  const user = await requireStaffPage();
  if (!can(user, "products")) return <NoAccess section="products" />;

  const { id } = await props.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const [{ data, error }, categories, brands, attributes, settings] = await Promise.all([
    supabase
      .from("products")
      .select(
        `id, title, slug, description, price, sale_price, sale_ends_at, sku, stock, category_id, brand_id, status,
         is_featured, specifications, sold_count, updated_at,
         images:product_images(id, url, storage_path, alt, width, height, sort_order),
         attributes:product_attribute_values(attribute_value_id)`,
      )
      .eq("id", id)
      .maybeSingle(),
    loadCategories(supabase),
    loadBrands(supabase),
    loadAttributes(supabase),
    getStoreSettings(),
  ]);
  if (error) throw new Error(`Couldn't load this product: ${error.message}`);
  if (!data) notFound();

  const row = data as unknown as ProductRow;
  const product: ProductFormInitial = {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    price: Number(row.price),
    sale_price: row.sale_price === null ? null : Number(row.sale_price),
    sale_ends_at: row.sale_ends_at,
    sku: row.sku,
    stock: row.stock,
    category_id: row.category_id,
    brand_id: row.brand_id,
    status: row.status,
    is_featured: row.is_featured,
    specifications: Array.isArray(row.specifications)
      ? (row.specifications as { label?: unknown; value?: unknown }[])
          .filter((s) => typeof s?.label === "string" && typeof s?.value === "string")
          .map((s) => ({ label: String(s.label), value: String(s.value) }))
      : [],
    attribute_value_ids: row.attributes.map((a) => a.attribute_value_id),
    images: [...row.images]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(({ id: imageId, url, storage_path, alt, width, height }) => ({ id: imageId, url, storage_path, alt, width, height })),
  };

  return (
    <>
      <PageHeader
        title={row.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Pill tone={row.status === "active" ? "good" : "neutral"}>{row.status === "active" ? "In store" : "Hidden"}</Pill>
            <span className="font-mono">{row.sku}</span>
            <span>· {row.sold_count} sold</span>
            <span>· Updated {formatDateTime(row.updated_at, settings.timezone)}</span>
          </span>
        }
        back={{ href: "/admin/products", label: "Products" }}
      />
      <ProductForm
        product={product}
        categories={categories}
        brands={brands}
        attributes={attributes}
        timeZone={settings.timezone}
        lowStockThreshold={settings.low_stock_threshold}
      />
    </>
  );
}
