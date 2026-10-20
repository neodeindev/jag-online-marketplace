"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { fail, type ActionResult } from "@/lib/action-result";
import { authorize } from "@/lib/auth";
import { inputFailure, parseInput } from "@/lib/admin/validate";
import { CACHE_TAGS } from "@/lib/catalog";

const zoneSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2, "Name the area.").max(80),
  description: z.string().trim().max(240),
  fee: z.number({ message: "Enter the delivery fee in GYD." }).min(0, "The fee can't be negative.").max(1_000_000),
  estimatedDays: z.string().trim().max(60),
  isPickup: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(999),
});

export async function saveZone(input: z.input<typeof zoneSchema>): Promise<ActionResult> {
  try {
    const data = parseInput(zoneSchema, input);
    const { supabase } = await authorize("owner");
    const row = {
      name: data.name,
      description: data.description || null,
      fee: data.isPickup ? 0 : data.fee,
      estimated_days: data.estimatedDays || null,
      is_pickup: data.isPickup,
      is_active: data.isActive,
      sort_order: data.sortOrder,
    };
    const { error } = data.id
      ? await supabase.from("delivery_zones").update(row).eq("id", data.id)
      : await supabase.from("delivery_zones").insert(row);
    if (error) throw error;

    updateTag(CACHE_TAGS.settings);
    refresh();
    return { ok: true, message: data.id ? "Delivery area saved" : "Delivery area added" };
  } catch (error) {
    return inputFailure(error, fail);
  }
}

export async function deleteZone(id: string): Promise<ActionResult> {
  try {
    const zoneId = parseInput(z.uuid(), id);
    const { supabase } = await authorize("owner");
    const { count } = await supabase
      .from("delivery_zones")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .neq("id", zoneId);
    if ((count ?? 0) === 0) {
      return { ok: false, error: "Keep at least one active delivery area so customers can check out." };
    }
    // Past orders keep a copy of the area name, so deleting is safe.
    const { error } = await supabase.from("delivery_zones").delete().eq("id", zoneId);
    if (error) throw error;
    updateTag(CACHE_TAGS.settings);
    refresh();
    return { ok: true, message: "Delivery area deleted" };
  } catch (error) {
    return inputFailure(error, fail);
  }
}
