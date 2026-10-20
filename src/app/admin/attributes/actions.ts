"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { fail, type ActionResult } from "@/lib/action-result";
import { authorize } from "@/lib/auth";
import { CACHE_TAGS } from "@/lib/catalog";
import { slugify } from "@/lib/utils";

type Supabase = Awaited<ReturnType<typeof authorize>>["supabase"];

function firstIssue(error: z.ZodError) {
  const issue = error.issues[0];
  return { ok: false as const, error: issue?.message ?? "Check the form and try again.", field: issue?.path[0]?.toString() };
}

/** Swap a row with its neighbour, then renumber the whole group so orders stay unique. */
async function reorder(
  supabase: Supabase,
  table: "attributes" | "attribute_values",
  ids: string[],
  id: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  const index = ids.indexOf(id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= ids.length) return { ok: true };
  [ids[index], ids[target]] = [ids[target], ids[index]];
  for (const [order, rowId] of ids.entries()) {
    const { error } = await supabase.from(table).update({ sort_order: order }).eq("id", rowId);
    if (error) return fail(error);
  }
  updateTag(CACHE_TAGS.catalog);
  return { ok: true };
}

// -----------------------------------------------------------------------------
// Attributes
// -----------------------------------------------------------------------------

const attributeSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "Give the attribute a name, e.g. Size.").max(60, "Keep the name under 60 characters."),
  kind: z.enum(["select", "color"]),
  isFilterable: z.boolean(),
  isOption: z.boolean(),
});

export async function saveAttribute(input: z.input<typeof attributeSchema>): Promise<ActionResult> {
  const parsed = attributeSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const a = parsed.data;
  try {
    const { supabase } = await authorize("products");
    const values = { name: a.name, kind: a.kind, is_filterable: a.isFilterable, is_option: a.isOption };
    if (a.id) {
      const { error } = await supabase.from("attributes").update(values).eq("id", a.id);
      if (error) return fail(error);
    } else {
      let slug = slugify(a.name) || "attribute";
      const { data: clash } = await supabase.from("attributes").select("id").eq("slug", slug).maybeSingle();
      if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
      const { data: last } = await supabase.from("attributes").select("sort_order").order("sort_order", { ascending: false }).limit(1);
      const sortOrder = (((last ?? []) as { sort_order: number }[])[0]?.sort_order ?? -1) + 1;
      const { error } = await supabase.from("attributes").insert({ ...values, slug, sort_order: sortOrder });
      if (error) return fail(error);
    }
    updateTag(CACHE_TAGS.catalog);
    return { ok: true, message: a.id ? "Attribute saved" : "Attribute added" };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteAttribute(id: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Attribute not found." };
  try {
    const { supabase } = await authorize("products");
    const { error } = await supabase.from("attributes").delete().eq("id", id);
    if (error) return fail(error);
    updateTag(CACHE_TAGS.catalog);
    return { ok: true, message: "Attribute deleted" };
  } catch (error) {
    return fail(error);
  }
}

export async function moveAttribute(id: string, direction: "up" | "down"): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Attribute not found." };
  try {
    const { supabase } = await authorize("products");
    const { data, error } = await supabase.from("attributes").select("id").order("sort_order").order("name");
    if (error) return fail(error);
    return reorder(supabase, "attributes", ((data ?? []) as { id: string }[]).map((r) => r.id), id, direction);
  } catch (error) {
    return fail(error);
  }
}

// -----------------------------------------------------------------------------
// Values
// -----------------------------------------------------------------------------

const valueSchema = z.object({
  id: z.uuid().optional(),
  attributeId: z.uuid(),
  value: z.string().trim().min(1, "Enter a value, e.g. Medium.").max(60, "Keep the value under 60 characters."),
  colorHex: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Colours look like #1B1B1B.")
    .nullable(),
});

export async function saveAttributeValue(input: z.input<typeof valueSchema>): Promise<ActionResult> {
  const parsed = valueSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const v = parsed.data;
  try {
    const { supabase } = await authorize("products");

    const { data: siblings, error: listError } = await supabase
      .from("attribute_values")
      .select("id, value, slug, sort_order")
      .eq("attribute_id", v.attributeId);
    if (listError) return fail(listError);
    const rows = (siblings ?? []) as { id: string; value: string; slug: string; sort_order: number }[];
    if (rows.some((r) => r.id !== v.id && r.value.toLowerCase() === v.value.toLowerCase())) {
      return { ok: false, error: `“${v.value}” is already in the list.`, field: "value" };
    }

    let slug = slugify(v.value) || "value";
    if (rows.some((r) => r.id !== v.id && r.slug === slug)) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

    if (v.id) {
      const { error } = await supabase
        .from("attribute_values")
        .update({ value: v.value, slug, color_hex: v.colorHex?.toUpperCase() ?? null })
        .eq("id", v.id);
      if (error) return fail(error);
    } else {
      const sortOrder = rows.reduce((max, r) => Math.max(max, r.sort_order), -1) + 1;
      const { error } = await supabase.from("attribute_values").insert({
        attribute_id: v.attributeId,
        value: v.value,
        slug,
        color_hex: v.colorHex?.toUpperCase() ?? null,
        sort_order: sortOrder,
      });
      if (error) return fail(error);
    }
    updateTag(CACHE_TAGS.catalog);
    return { ok: true, message: v.id ? "Value saved" : "Value added" };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteAttributeValue(id: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Value not found." };
  try {
    const { supabase } = await authorize("products");
    const { error } = await supabase.from("attribute_values").delete().eq("id", id);
    if (error) return fail(error);
    updateTag(CACHE_TAGS.catalog);
    return { ok: true, message: "Value deleted" };
  } catch (error) {
    return fail(error);
  }
}

export async function moveAttributeValue(id: string, direction: "up" | "down"): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Value not found." };
  try {
    const { supabase } = await authorize("products");
    const { data: current, error: findError } = await supabase
      .from("attribute_values")
      .select("attribute_id")
      .eq("id", id)
      .maybeSingle();
    if (findError) return fail(findError);
    if (!current) return { ok: false, error: "Value not found." };
    const { data, error } = await supabase
      .from("attribute_values")
      .select("id")
      .eq("attribute_id", (current as { attribute_id: string }).attribute_id)
      .order("sort_order")
      .order("value");
    if (error) return fail(error);
    return reorder(supabase, "attribute_values", ((data ?? []) as { id: string }[]).map((r) => r.id), id, direction);
  } catch (error) {
    return fail(error);
  }
}
