"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { fail, type ActionResult } from "@/lib/action-result";
import { authorize } from "@/lib/auth";
import { inputFailure, parseInput } from "@/lib/admin/validate";
import { CACHE_TAGS } from "@/lib/catalog";

const pageSchema = z.object({
  id: z.uuid().optional(),
  title: z.string().trim().min(2, "Add a title.").max(120),
  slug: z
    .string()
    .trim()
    .min(1, "Add a web address.")
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes only, like returns-policy."),
  content: z.string().max(50_000, "This page is too long. Split it into two pages."),
  isPublished: z.boolean(),
  showInFooter: z.boolean(),
  sortOrder: z.number().int().min(0).max(999),
});

export async function savePage(input: z.input<typeof pageSchema>): Promise<ActionResult<{ id: string }>> {
  try {
    const data = parseInput(pageSchema, input);
    const { supabase } = await authorize("content");
    const row = {
      title: data.title,
      slug: data.slug,
      content: data.content,
      is_published: data.isPublished,
      show_in_footer: data.showInFooter,
      sort_order: data.sortOrder,
    };

    let id = data.id;
    if (id) {
      const { error } = await supabase.from("pages").update(row).eq("id", id);
      if (error) throw error;
    } else {
      const { data: created, error } = await supabase.from("pages").insert(row).select("id").single();
      if (error) throw error;
      id = (created as { id: string }).id;
    }

    updateTag(CACHE_TAGS.content);
    refresh();
    return { ok: true, message: data.id ? "Page saved" : "Page created", data: { id } };
  } catch (error) {
    const result = inputFailure(error, fail);
    if (/pages_slug_key|already used/.test(result.error)) {
      return { ok: false, error: "Another page already uses that web address.", field: "slug" };
    }
    return result;
  }
}

export async function deletePage(id: string): Promise<ActionResult> {
  try {
    const pageId = parseInput(z.uuid(), id);
    const { supabase } = await authorize("content");
    const { error } = await supabase.from("pages").delete().eq("id", pageId);
    if (error) throw error;
    updateTag(CACHE_TAGS.content);
    refresh();
    return { ok: true, message: "Page deleted" };
  } catch (error) {
    return inputFailure(error, fail);
  }
}
