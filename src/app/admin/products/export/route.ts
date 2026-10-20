import { can, getSessionUser } from "@/lib/auth";
import { categoryPathMap } from "@/lib/admin/category-tree";
import { productsToCsv, type ExportProduct } from "@/lib/admin/product-csv";
import { createClient } from "@/lib/supabase/server";

interface ExportRow {
  sku: string;
  title: string;
  description: string;
  price: number;
  sale_price: number | null;
  stock: number;
  status: "active" | "hidden";
  is_featured: boolean;
  category_id: string | null;
  specifications: unknown;
  brand: { name: string } | null;
  images: { url: string; sort_order: number }[];
  attributes: { value: { value: string; sort_order: number; attribute: { name: string; sort_order: number } | null } | null }[];
}

const BATCH = 1000;

/** Downloads every product as a CSV that can be edited and imported again. */
export async function GET() {
  const user = await getSessionUser();
  if (!can(user, "products")) {
    return new Response("You don't have permission to export products.", { status: 403 });
  }

  const supabase = await createClient();
  const { data: categories, error: catError } = await supabase.from("categories").select("id, parent_id, name, sort_order");
  if (catError) return new Response(`Couldn't load categories: ${catError.message}`, { status: 500 });
  const paths = categoryPathMap(
    (categories ?? []) as { id: string; parent_id: string | null; name: string; sort_order: number }[],
    " > ",
  );

  const rows: ExportProduct[] = [];
  // The API returns at most 1,000 rows per request, so page through.
  for (let from = 0; ; from += BATCH) {
    const { data, error } = await supabase
      .from("products")
      .select(
        `sku, title, description, price, sale_price, stock, status, is_featured, category_id, specifications,
         brand:brands(name),
         images:product_images(url, sort_order),
         attributes:product_attribute_values(value:attribute_values(value, sort_order, attribute:attributes(name, sort_order)))`,
      )
      .order("created_at")
      .range(from, from + BATCH - 1);
    if (error) return new Response(`Couldn't load products: ${error.message}`, { status: 500 });
    const batch = (data ?? []) as unknown as ExportRow[];

    for (const p of batch) {
      const attrs = new Map<string, { sort: number; values: { value: string; sort: number }[] }>();
      for (const { value } of p.attributes ?? []) {
        if (!value?.attribute) continue;
        const group = attrs.get(value.attribute.name) ?? { sort: value.attribute.sort_order, values: [] };
        group.values.push({ value: value.value, sort: value.sort_order });
        attrs.set(value.attribute.name, group);
      }
      const attributes: Record<string, string[]> = {};
      for (const [name, group] of [...attrs.entries()].sort((a, b) => a[1].sort - b[1].sort)) {
        attributes[name] = group.values.sort((a, b) => a.sort - b.sort).map((v) => v.value);
      }

      rows.push({
        sku: p.sku,
        title: p.title,
        description: p.description,
        price: Number(p.price),
        sale_price: p.sale_price === null ? null : Number(p.sale_price),
        stock: p.stock,
        brand: p.brand?.name ?? null,
        category: p.category_id ? (paths.get(p.category_id) ?? null) : null,
        status: p.status,
        featured: p.is_featured,
        attributes,
        specifications: Array.isArray(p.specifications)
          ? (p.specifications as { label?: unknown; value?: unknown }[])
              .filter((s) => typeof s?.label === "string" && typeof s?.value === "string")
              .map((s) => ({ label: String(s.label), value: String(s.value) }))
          : [],
        images: [...(p.images ?? [])].sort((a, b) => a.sort_order - b.sort_order).map((i) => i.url),
      });
    }
    if (batch.length < BATCH) break;
  }

  const date = new Date().toISOString().slice(0, 10);
  // A byte-order mark helps Excel open the file as UTF-8 (accents, "›", etc.).
  return new Response(`﻿${productsToCsv(rows)}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="products-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
