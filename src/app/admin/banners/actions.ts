"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { fail, type ActionResult } from "@/lib/action-result";
import { authorize } from "@/lib/auth";
import { isValidBannerLink } from "@/lib/admin/banners";
import { zonedInputToIso } from "@/lib/admin/datetime";
import { removeStorageFiles } from "@/lib/admin/ops-storage";
import { inputFailure, parseInput } from "@/lib/admin/validate";
import { CACHE_TAGS, getStoreSettings } from "@/lib/catalog";
import type { TablesUpdate } from "@/lib/supabase/database.types";

const BUCKET = "site-assets";

const bannerSchema = z
  .object({
    id: z.uuid().optional(),
    title: z.string().trim().min(2, "Add a headline.").max(120, "Keep the headline under 120 characters."),
    subtitle: z.string().trim().max(240, "Keep the subtitle under 240 characters."),
    ctaLabel: z.string().trim().max(40, "Keep the button label short."),
    linkUrl: z
      .string()
      .trim()
      .max(500)
      .refine(isValidBannerLink, "Use a page on this site like /deals, or a full web address starting with https://"),
    imageUrl: z.string().trim().min(1, "Upload an image."),
    storagePath: z.string().trim().max(500).nullable(),
    placement: z.enum(["hero", "promo"]),
    layout: z.enum(["split", "cover"]),
    theme: z.enum(["forest", "gold", "red", "mist", "ink"]),
    startsAt: z.string().trim(),
    endsAt: z.string().trim(),
    isActive: z.boolean(),
  });

export async function saveBanner(input: z.input<typeof bannerSchema>): Promise<ActionResult<{ id: string }>> {
  try {
    const data = parseInput(bannerSchema, input);
    const { supabase } = await authorize("content");
    const settings = await getStoreSettings();
    const startsAt = zonedInputToIso(data.startsAt, settings.timezone);
    const endsAt = zonedInputToIso(data.endsAt, settings.timezone);
    if (startsAt && endsAt && endsAt <= startsAt) {
      return { ok: false, error: "The end time must be after the start time.", field: "endsAt" };
    }

    const row = {
      title: data.title,
      subtitle: data.subtitle || null,
      cta_label: data.ctaLabel || null,
      link_url: data.linkUrl || null,
      image_url: data.imageUrl,
      storage_path: data.storagePath,
      placement: data.placement,
      layout: data.layout,
      theme: data.theme,
      starts_at: startsAt,
      ends_at: endsAt,
      is_active: data.isActive,
    };

    let id = data.id;
    if (id) {
      const { data: existing, error: readError } = await supabase
        .from("banners")
        .select("storage_path, placement")
        .eq("id", id)
        .single();
      if (readError) throw readError;
      const before = existing as { storage_path: string | null; placement: string };

      const changes: TablesUpdate<"banners"> = { ...row };
      if (before.placement !== data.placement) changes.sort_order = await nextSortOrder(supabase, data.placement);
      const { error } = await supabase.from("banners").update(changes).eq("id", id);
      if (error) throw error;
      if (before.storage_path && before.storage_path !== data.storagePath) {
        await removeStorageFiles(supabase, BUCKET, [before.storage_path]);
      }
    } else {
      const { data: created, error } = await supabase
        .from("banners")
        .insert({ ...row, sort_order: await nextSortOrder(supabase, data.placement) })
        .select("id")
        .single();
      if (error) throw error;
      id = (created as { id: string }).id;
    }

    updateTag(CACHE_TAGS.content);
    refresh();
    return { ok: true, message: data.id ? "Banner saved" : "Banner created", data: { id } };
  } catch (error) {
    return inputFailure(error, fail);
  }
}

async function nextSortOrder(supabase: Awaited<ReturnType<typeof authorize>>["supabase"], placement: string) {
  const { data } = await supabase
    .from("banners")
    .select("sort_order")
    .eq("placement", placement)
    .order("sort_order", { ascending: false })
    .limit(1);
  const top = (data as { sort_order: number }[] | null)?.[0]?.sort_order;
  return top === undefined ? 0 : top + 1;
}

export async function deleteBanner(id: string): Promise<ActionResult> {
  try {
    const bannerId = parseInput(z.uuid(), id);
    const { supabase } = await authorize("content");
    const { data, error } = await supabase.from("banners").delete().eq("id", bannerId).select("storage_path").maybeSingle();
    if (error) throw error;
    await removeStorageFiles(supabase, BUCKET, [(data as { storage_path: string | null } | null)?.storage_path]);
    updateTag(CACHE_TAGS.content);
    refresh();
    return { ok: true, message: "Banner deleted" };
  } catch (error) {
    return inputFailure(error, fail);
  }
}

export async function setBannerActive(id: string, active: boolean): Promise<ActionResult> {
  try {
    const bannerId = parseInput(z.uuid(), id);
    const { supabase } = await authorize("content");
    const { error } = await supabase.from("banners").update({ is_active: active }).eq("id", bannerId);
    if (error) throw error;
    updateTag(CACHE_TAGS.content);
    refresh();
    return { ok: true, message: active ? "Banner shown on the homepage" : "Banner hidden" };
  } catch (error) {
    return inputFailure(error, fail);
  }
}

/** Swaps a banner with its neighbour, then renumbers the placement 0..n. */
export async function moveBanner(id: string, direction: "up" | "down"): Promise<ActionResult> {
  try {
    const bannerId = parseInput(z.uuid(), id);
    const { supabase } = await authorize("content");
    const { data: current, error: readError } = await supabase
      .from("banners")
      .select("placement")
      .eq("id", bannerId)
      .single();
    if (readError) throw readError;

    const { data: siblings, error } = await supabase
      .from("banners")
      .select("id, sort_order")
      .eq("placement", (current as { placement: string }).placement)
      .order("sort_order")
      .order("created_at");
    if (error) throw error;

    const ids = (siblings as { id: string }[]).map((s) => s.id);
    const index = ids.indexOf(bannerId);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= ids.length) return { ok: true };
    [ids[index], ids[target]] = [ids[target], ids[index]];

    const results = await Promise.all(
      ids.map((bid, i) => supabase.from("banners").update({ sort_order: i }).eq("id", bid)),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) throw failed.error;

    updateTag(CACHE_TAGS.content);
    refresh();
    return { ok: true };
  } catch (error) {
    return inputFailure(error, fail);
  }
}
