"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { fail, type ActionResult } from "@/lib/action-result";
import { catalogStoragePath, removeCatalogFiles } from "@/lib/admin/catalog-storage";
import { authorize } from "@/lib/auth";
import { CACHE_TAGS } from "@/lib/catalog";
import { slugify } from "@/lib/utils";

const BUCKET = "site-assets";

const categorySchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "Give the category a name.").max(80, "Keep the name under 80 characters."),
  slug: z.string().trim().max(100),
  parentId: z.uuid().nullable(),
  description: z.string().trim().max(500, "Keep the description under 500 characters."),
  imageUrl: z.string().trim().url().nullable(),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
});

export type CategoryInput = z.input<typeof categorySchema>;

export async function saveCategory(input: CategoryInput): Promise<ActionResult<{ id: string }>> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Check the form and try again.", field: issue?.path[0]?.toString() };
  }
  const c = parsed.data;
  if (c.id && c.parentId === c.id) return { ok: false, error: "A category can't be inside itself.", field: "parentId" };

  try {
    const { supabase } = await authorize("products");
    const slug = slugify(c.slug || c.name) || "category";
    const { data: clash } = await supabase.from("categories").select("id").eq("slug", slug).maybeSingle();
    if (clash && (clash as { id: string }).id !== c.id) {
      return { ok: false, error: "Another category already uses that web address. Change the slug.", field: "slug" };
    }

    const values = {
      name: c.name,
      slug,
      parent_id: c.parentId,
      description: c.description || null,
      image_url: c.imageUrl,
      is_active: c.isActive,
      is_featured: c.isFeatured,
    };

    let id = c.id;
    if (id) {
      const { data: before } = await supabase.from("categories").select("image_url").eq("id", id).maybeSingle();
      const { error } = await supabase.from("categories").update(values).eq("id", id);
      if (error) return fail(error);
      const oldUrl = (before as { image_url: string | null } | null)?.image_url;
      if (oldUrl && oldUrl !== c.imageUrl) await removeCatalogFiles(supabase, BUCKET, [catalogStoragePath(oldUrl, BUCKET)]);
    } else {
      // New categories go to the end of their group.
      const siblings = c.parentId
        ? supabase.from("categories").select("sort_order").eq("parent_id", c.parentId)
        : supabase.from("categories").select("sort_order").is("parent_id", null);
      const { data: last } = await siblings.order("sort_order", { ascending: false }).limit(1);
      const sortOrder = ((last ?? []) as { sort_order: number }[])[0]?.sort_order ?? -1;
      const { data, error } = await supabase
        .from("categories")
        .insert({ ...values, sort_order: sortOrder + 1 })
        .select("id")
        .single();
      if (error) return fail(error);
      id = (data as { id: string }).id;
    }

    updateTag(CACHE_TAGS.catalog);
    return { ok: true, message: "Category saved", data: { id } };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Category not found." };
  try {
    const { supabase } = await authorize("products");
    const { count } = await supabase.from("categories").select("id", { count: "exact", head: true }).eq("parent_id", id);
    if ((count ?? 0) > 0) {
      return { ok: false, error: "This category has sub-categories. Move or delete them first." };
    }
    const { data: before } = await supabase.from("categories").select("image_url").eq("id", id).maybeSingle();
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return fail(error);
    await removeCatalogFiles(supabase, BUCKET, [catalogStoragePath((before as { image_url: string | null } | null)?.image_url, BUCKET)]);
    updateTag(CACHE_TAGS.catalog);
    return { ok: true, message: "Category deleted" };
  } catch (error) {
    return fail(error);
  }
}

/** Moves a category one place up or down among its siblings, renumbering the group. */
export async function moveCategory(id: string, direction: "up" | "down"): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Category not found." };
  try {
    const { supabase } = await authorize("products");
    const { data: current, error: findError } = await supabase.from("categories").select("parent_id").eq("id", id).maybeSingle();
    if (findError) return fail(findError);
    if (!current) return { ok: false, error: "Category not found." };
    const parentId = (current as { parent_id: string | null }).parent_id;
    const group = parentId
      ? supabase.from("categories").select("id").eq("parent_id", parentId)
      : supabase.from("categories").select("id").is("parent_id", null);
    const { data: siblings, error } = await group.order("sort_order").order("name");
    if (error) return fail(error);

    const ids = ((siblings ?? []) as { id: string }[]).map((s) => s.id);
    const index = ids.indexOf(id);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || target < 0 || target >= ids.length) return { ok: true };
    [ids[index], ids[target]] = [ids[target], ids[index]];

    for (const [order, siblingId] of ids.entries()) {
      const { error: updateError } = await supabase.from("categories").update({ sort_order: order }).eq("id", siblingId);
      if (updateError) return fail(updateError);
    }
    updateTag(CACHE_TAGS.catalog);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
