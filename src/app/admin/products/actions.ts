"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { fail, type ActionResult } from "@/lib/action-result";
import { removeCatalogFiles } from "@/lib/admin/catalog-storage";
import { authorize } from "@/lib/auth";
import { CACHE_TAGS } from "@/lib/catalog";
import { slugify } from "@/lib/utils";

const PRODUCT_BUCKET = "product-images";

const imageSchema = z.object({
  id: z.uuid().optional(),
  url: z.string().trim().url("Each image needs a valid link."),
  storagePath: z.string().trim().max(500).nullable(),
  alt: z.string().trim().max(200).nullable(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
});

const productSchema = z
  .object({
    id: z.uuid().optional(),
    title: z.string().trim().min(1, "Give the product a title.").max(200, "Keep the title under 200 characters."),
    slug: z
      .string()
      .trim()
      .max(160)
      .transform((s) => slugify(s)),
    description: z.string().max(20000, "The description is too long."),
    price: z.number({ message: "Enter a price." }).min(0, "Price can't be negative.").max(100_000_000),
    salePrice: z.number().min(0, "Sale price can't be negative.").nullable(),
    saleEndsAt: z.iso.datetime({ offset: true, message: "Choose a valid end date." }).nullable(),
    sku: z.string().trim().max(64, "Keep the SKU under 64 characters."),
    stock: z.number().int("Stock must be a whole number.").min(0, "Stock can't be below zero.").max(1_000_000),
    categoryId: z.uuid().nullable(),
    brandId: z.uuid().nullable(),
    status: z.enum(["active", "hidden"]),
    isFeatured: z.boolean(),
    specifications: z
      .array(z.object({ label: z.string().trim().max(80), value: z.string().trim().max(300) }))
      .max(60),
    attributeValueIds: z.array(z.uuid()).max(200),
    images: z.array(imageSchema).max(20, "Up to 20 photos per product."),
  })
  .superRefine((p, ctx) => {
    if (p.salePrice !== null && p.salePrice >= p.price) {
      ctx.addIssue({ code: "custom", path: ["salePrice"], message: "Sale price must be lower than the regular price." });
    }
  });

export type ProductInput = z.input<typeof productSchema>;

export interface SavedProduct {
  id: string;
  slug: string;
  /** Saved photo rows in display order, so the form can track them. */
  images: { id: string; storagePath: string | null }[];
}

export async function saveProduct(input: ProductInput): Promise<ActionResult<SavedProduct>> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Check the form and try again.", field: issue?.path[0]?.toString() };
  }
  const p = parsed.data;

  try {
    const { supabase } = await authorize("products");

    const slug = p.slug || slugify(p.title) || "product";
    const row = {
      title: p.title,
      slug,
      description: p.description,
      price: p.price,
      sale_price: p.salePrice,
      sale_ends_at: p.salePrice === null ? null : p.saleEndsAt,
      stock: p.stock,
      brand_id: p.brandId,
      category_id: p.categoryId,
      status: p.status,
      is_featured: p.isFeatured,
      specifications: p.specifications.filter((s) => s.label && s.value),
    };

    let productId = p.id;
    if (productId) {
      const { error } = await supabase
        .from("products")
        .update({ ...row, ...(p.sku ? { sku: p.sku } : {}) })
        .eq("id", productId);
      if (error) return fail(error);
    } else {
      const { data, error } = await supabase
        .from("products")
        .insert({ ...row, ...(p.sku ? { sku: p.sku } : {}) })
        .select("id")
        .single();
      if (error) return fail(error);
      productId = (data as { id: string }).id;
    }

    // Attributes: replace with the chosen values.
    const { error: delAttrError } = p.attributeValueIds.length
      ? await supabase
          .from("product_attribute_values")
          .delete()
          .eq("product_id", productId)
          .not("attribute_value_id", "in", `(${p.attributeValueIds.join(",")})`)
      : await supabase.from("product_attribute_values").delete().eq("product_id", productId);
    if (delAttrError) return fail(delAttrError);
    if (p.attributeValueIds.length) {
      const { error } = await supabase
        .from("product_attribute_values")
        .upsert(
          p.attributeValueIds.map((id) => ({ product_id: productId, attribute_value_id: id })),
          { onConflict: "product_id,attribute_value_id", ignoreDuplicates: true },
        );
      if (error) return fail(error);
    }

    // Images: remove dropped ones (and their files), update the rest, add new ones.
    const { data: existing, error: imgError } = await supabase
      .from("product_images")
      .select("id, storage_path")
      .eq("product_id", productId);
    if (imgError) return fail(imgError);
    const existingRows = (existing ?? []) as { id: string; storage_path: string | null }[];
    const keptIds = new Set(p.images.map((i) => i.id).filter(Boolean));
    const removed = existingRows.filter((r) => !keptIds.has(r.id));
    if (removed.length) {
      const { error } = await supabase.from("product_images").delete().in("id", removed.map((r) => r.id));
      if (error) return fail(error);
      // Never delete a file that one of the incoming photos still points at.
      const stillUsed = new Set(p.images.map((i) => i.storagePath).filter(Boolean));
      const paths = removed.map((r) => r.storage_path).filter((x): x is string => Boolean(x) && !stillUsed.has(x));
      await removeCatalogFiles(supabase, PRODUCT_BUCKET, paths);
    }
    const existingIds = new Set(existingRows.map((r) => r.id));
    const savedImages: SavedProduct["images"] = [];
    for (const [index, image] of p.images.entries()) {
      if (image.id && existingIds.has(image.id)) {
        const { error } = await supabase
          .from("product_images")
          .update({ sort_order: index, alt: image.alt || null })
          .eq("id", image.id);
        if (error) return fail(error);
        savedImages.push({ id: image.id, storagePath: image.storagePath });
      } else {
        const { data: inserted, error } = await supabase
          .from("product_images")
          .insert({
            product_id: productId,
            url: image.url,
            storage_path: image.storagePath,
            alt: image.alt || null,
            width: image.width,
            height: image.height,
            sort_order: index,
          })
          .select("id")
          .single();
        if (error) return fail(error);
        savedImages.push({ id: (inserted as { id: string }).id, storagePath: image.storagePath });
      }
    }

    updateTag(CACHE_TAGS.catalog);
    return { ok: true, message: "Product saved", data: { id: productId, slug, images: savedImages } };
  } catch (error) {
    return fail(error);
  }
}

async function removeProductsWithFiles(supabase: Awaited<ReturnType<typeof authorize>>["supabase"], ids: string[]) {
  const { data: images, error: imgError } = await supabase
    .from("product_images")
    .select("storage_path")
    .in("product_id", ids);
  if (imgError) throw imgError;
  const { error } = await supabase.from("products").delete().in("id", ids);
  if (error) throw error;
  const paths = ((images ?? []) as { storage_path: string | null }[])
    .map((i) => i.storage_path)
    .filter((x): x is string => Boolean(x));
  await removeCatalogFiles(supabase, PRODUCT_BUCKET, paths);
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Product not found." };
  try {
    const { supabase } = await authorize("products");
    await removeProductsWithFiles(supabase, [id]);
    updateTag(CACHE_TAGS.catalog);
    return { ok: true, message: "Product deleted" };
  } catch (error) {
    return fail(error);
  }
}

const bulkSchema = z.object({
  ids: z.array(z.uuid()).min(1, "Select at least one product.").max(500),
  action: z.enum(["show", "hide", "feature", "unfeature", "delete"]),
});

export async function bulkUpdateProducts(
  ids: string[],
  action: "show" | "hide" | "feature" | "unfeature" | "delete",
): Promise<ActionResult> {
  const parsed = bulkSchema.safeParse({ ids, action });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Select products first." };
  try {
    const { supabase } = await authorize("products");
    const n = parsed.data.ids.length;
    const noun = n === 1 ? "product" : "products";
    if (parsed.data.action === "delete") {
      await removeProductsWithFiles(supabase, parsed.data.ids);
      updateTag(CACHE_TAGS.catalog);
      refresh();
      return { ok: true, message: `${n} ${noun} deleted` };
    }
    const changes =
      parsed.data.action === "show"
        ? { status: "active" as const }
        : parsed.data.action === "hide"
          ? { status: "hidden" as const }
          : { is_featured: parsed.data.action === "feature" };
    const { error } = await supabase.from("products").update(changes).in("id", parsed.data.ids);
    if (error) return fail(error);
    updateTag(CACHE_TAGS.catalog);
    refresh();
    const verb = { show: "shown in store", hide: "hidden", feature: "featured", unfeature: "unfeatured" }[parsed.data.action];
    return { ok: true, message: `${n} ${noun} ${verb}` };
  } catch (error) {
    return fail(error);
  }
}

export async function updateStock(id: string, stock: number): Promise<ActionResult> {
  const parsed = z
    .object({ id: z.uuid(), stock: z.number().int("Stock must be a whole number.").min(0, "Stock can't be below zero.").max(1_000_000) })
    .safeParse({ id, stock });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the stock number." };
  try {
    const { supabase } = await authorize("products");
    const { error } = await supabase.from("products").update({ stock: parsed.data.stock }).eq("id", parsed.data.id);
    if (error) return fail(error);
    updateTag(CACHE_TAGS.catalog);
    refresh();
    return { ok: true, message: "Stock updated" };
  } catch (error) {
    return fail(error);
  }
}

export async function createBrand(name: string): Promise<ActionResult<{ id: string; name: string; slug: string }>> {
  const clean = name.trim();
  if (!clean) return { ok: false, error: "Enter a brand name." };
  if (clean.length > 80) return { ok: false, error: "Keep the brand name under 80 characters." };
  try {
    const { supabase } = await authorize("products");
    const { data: existing } = await supabase.from("brands").select("id, name, slug").ilike("name", clean).maybeSingle();
    if (existing) {
      return { ok: true, message: "Brand already exists — selected it", data: existing as { id: string; name: string; slug: string } };
    }
    let slug = slugify(clean) || "brand";
    const { data: clash } = await supabase.from("brands").select("id").eq("slug", slug).maybeSingle();
    if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 7)}`;
    const { data, error } = await supabase.from("brands").insert({ name: clean, slug }).select("id, name, slug").single();
    if (error) return fail(error);
    updateTag(CACHE_TAGS.catalog);
    return { ok: true, message: "Brand added", data: data as { id: string; name: string; slug: string } };
  } catch (error) {
    return fail(error);
  }
}

/** Removes uploaded files that were never saved to a product (e.g. removed before saving). */
export async function discardUploadedImages(paths: string[]): Promise<ActionResult> {
  const parsed = z.array(z.string().regex(/^products\/[\w-]+\/[\w-]+\.(webp|jpg)$/)).max(50).safeParse(paths);
  if (!parsed.success || parsed.data.length === 0) return { ok: true };
  try {
    const { supabase } = await authorize("products");
    // Only delete files that aren't attached to any product.
    const { data } = await supabase.from("product_images").select("storage_path").in("storage_path", parsed.data);
    const attached = new Set(((data ?? []) as { storage_path: string }[]).map((r) => r.storage_path));
    const orphans = parsed.data.filter((p) => !attached.has(p));
    await removeCatalogFiles(supabase, PRODUCT_BUCKET, orphans);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
