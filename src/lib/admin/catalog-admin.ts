import "server-only";

import type { createClient } from "@/lib/supabase/server";

/** Dashboard reads for the catalog area. All run as the signed-in staff member. */

export type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

export interface AdminCategory {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  is_featured: boolean;
}

export interface AdminBrand {
  id: string;
  name: string;
  slug: string;
}

export interface AdminAttributeValue {
  id: string;
  attribute_id: string;
  value: string;
  slug: string;
  color_hex: string | null;
  sort_order: number;
}

export interface AdminAttribute {
  id: string;
  name: string;
  slug: string;
  kind: "select" | "color";
  is_filterable: boolean;
  is_option: boolean;
  sort_order: number;
  values: AdminAttributeValue[];
}

export async function loadCategories(supabase: ServerSupabase): Promise<AdminCategory[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, parent_id, name, slug, description, image_url, sort_order, is_active, is_featured")
    .order("sort_order")
    .order("name");
  if (error) throw new Error(`Couldn't load categories: ${error.message}`);
  return (data ?? []) as AdminCategory[];
}

export async function loadBrands(supabase: ServerSupabase): Promise<AdminBrand[]> {
  const { data, error } = await supabase.from("brands").select("id, name, slug").order("name");
  if (error) throw new Error(`Couldn't load brands: ${error.message}`);
  return (data ?? []) as AdminBrand[];
}

export async function loadAttributes(supabase: ServerSupabase): Promise<AdminAttribute[]> {
  const { data, error } = await supabase
    .from("attributes")
    .select(
      "id, name, slug, kind, is_filterable, is_option, sort_order, values:attribute_values(id, attribute_id, value, slug, color_hex, sort_order)",
    )
    .order("sort_order")
    .order("name");
  if (error) throw new Error(`Couldn't load attributes: ${error.message}`);
  return ((data ?? []) as unknown as AdminAttribute[]).map((a) => ({
    ...a,
    values: [...(a.values ?? [])].sort((x, y) => x.sort_order - y.sort_order || x.value.localeCompare(y.value)),
  }));
}

/** Number of products per category/brand id, using one count query each (fine for store-sized catalogs). */
export async function countProductsBy(
  supabase: ServerSupabase,
  column: "category_id" | "brand_id",
  ids: string[],
): Promise<Map<string, number>> {
  const counts = await Promise.all(
    ids.map(async (id) => {
      const { count } = await supabase.from("products").select("id", { count: "exact", head: true }).eq(column, id);
      return [id, count ?? 0] as const;
    }),
  );
  return new Map(counts);
}
