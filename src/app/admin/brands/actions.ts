"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { fail, type ActionResult } from "@/lib/action-result";
import { authorize } from "@/lib/auth";
import { CACHE_TAGS } from "@/lib/catalog";
import { slugify } from "@/lib/utils";

const brandSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "Enter a brand name.").max(80, "Keep the name under 80 characters."),
  slug: z.string().trim().max(100),
});

export async function saveBrand(input: z.input<typeof brandSchema>): Promise<ActionResult> {
  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Check the brand and try again.", field: issue?.path[0]?.toString() };
  }
  const { id, name } = parsed.data;
  const slug = slugify(parsed.data.slug || name) || "brand";
  try {
    const { supabase } = await authorize("products");
    const { data: nameClash } = await supabase.from("brands").select("id").ilike("name", name).maybeSingle();
    if (nameClash && (nameClash as { id: string }).id !== id) return { ok: false, error: "A brand with that name already exists.", field: "name" };
    const { data: slugClash } = await supabase.from("brands").select("id").eq("slug", slug).maybeSingle();
    if (slugClash && (slugClash as { id: string }).id !== id) {
      return { ok: false, error: "Another brand already uses that web address.", field: "slug" };
    }
    const { error } = id
      ? await supabase.from("brands").update({ name, slug }).eq("id", id)
      : await supabase.from("brands").insert({ name, slug });
    if (error) return fail(error);
    updateTag(CACHE_TAGS.catalog);
    return { ok: true, message: id ? "Brand saved" : "Brand added" };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteBrand(id: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Brand not found." };
  try {
    const { supabase } = await authorize("products");
    const { error } = await supabase.from("brands").delete().eq("id", id);
    if (error) return fail(error);
    updateTag(CACHE_TAGS.catalog);
    return { ok: true, message: "Brand deleted" };
  } catch (error) {
    return fail(error);
  }
}
