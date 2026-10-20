"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { fail, type ActionResult } from "@/lib/action-result";
import { authorize } from "@/lib/auth";
import { removeStorageFiles, storagePathFromUrl } from "@/lib/admin/ops-storage";
import { inputFailure, parseInput } from "@/lib/admin/validate";
import { CACHE_TAGS } from "@/lib/catalog";

const optionalUrl = (label: string) =>
  z
    .string()
    .trim()
    .max(300)
    .refine((v) => !v || /^https?:\/\/\S+\.\S+/.test(v), `${label} should be a full web address starting with https://`);

const settingsSchema = z
  .object({
    storeName: z.string().trim().min(2, "Enter the store name.").max(60),
    tagline: z.string().trim().max(160),
    logoUrl: z.string().trim().max(500).nullable(),
    contactEmail: z.union([z.literal(""), z.email("Enter a valid contact email.")]),
    contactPhone: z.string().trim().max(40),
    whatsappNumber: z
      .string()
      .trim()
      .transform((v) => v.replace(/\D/g, ""))
      .refine((v) => v === "" || (v.length >= 7 && v.length <= 15), "Enter the WhatsApp number with country code, digits only — e.g. 5926001234."),
    address: z.string().trim().max(200),
    businessHours: z.string().trim().max(120),
    announcement: z.string().trim().max(200, "Keep the announcement under 200 characters."),
    orderPrefix: z
      .string()
      .trim()
      .transform((v) => v.toUpperCase())
      .refine((v) => /^[A-Z0-9]{2,8}$/.test(v), "Use 2–8 letters or numbers, like JAG."),
    notificationEmails: z.string().max(1000),
    freeDeliveryThreshold: z.string().trim().max(20),
    lowStockThreshold: z.number().int().min(0, "Use 0 or more.").max(10_000),
    codEnabled: z.boolean(),
    bankEnabled: z.boolean(),
    mmgEnabled: z.boolean(),
    bankInstructions: z.string().trim().max(2000),
    mmgInstructions: z.string().trim().max(2000),
    facebookUrl: optionalUrl("The Facebook link"),
    instagramUrl: optionalUrl("The Instagram link"),
    tiktokUrl: optionalUrl("The TikTok link"),
  })
  .superRefine((v, ctx) => {
    if (!v.codEnabled && !v.bankEnabled && !v.mmgEnabled) {
      ctx.addIssue({ code: "custom", path: ["codEnabled"], message: "Keep at least one payment method turned on." });
    }
    if (v.bankEnabled && !v.bankInstructions) {
      ctx.addIssue({
        code: "custom",
        path: ["bankInstructions"],
        message: "Add bank transfer instructions so customers know where to pay.",
      });
    }
    if (v.mmgEnabled && !v.mmgInstructions) {
      ctx.addIssue({ code: "custom", path: ["mmgInstructions"], message: "Add MMG instructions so customers know where to pay." });
    }
  });

export type SettingsInput = z.input<typeof settingsSchema>;

function parseEmails(raw: string): { emails: string[]; invalid: string | null } {
  const emails = [...new Set(raw.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))];
  const invalid = emails.find((e) => !z.email().safeParse(e).success) ?? null;
  return { emails, invalid };
}

export async function saveSettings(input: SettingsInput): Promise<ActionResult> {
  try {
    const data = parseInput(settingsSchema, input);
    const { supabase } = await authorize("owner");

    const { emails, invalid } = parseEmails(data.notificationEmails);
    if (invalid) return { ok: false, error: `“${invalid}” isn't a valid email address.`, field: "notificationEmails" };
    if (emails.length > 5) return { ok: false, error: "Use up to 5 alert addresses.", field: "notificationEmails" };

    let threshold: number | null = null;
    if (data.freeDeliveryThreshold) {
      threshold = Number(data.freeDeliveryThreshold.replace(/[^\d.]/g, ""));
      if (!Number.isFinite(threshold) || threshold < 0) {
        return { ok: false, error: "Enter an amount in GYD, or leave it blank.", field: "freeDeliveryThreshold" };
      }
    }

    const { data: current, error: readError } = await supabase.from("store_settings").select("logo_url").eq("id", 1).single();
    if (readError) throw readError;
    const previousLogo = (current as { logo_url: string | null }).logo_url;

    const { error } = await supabase
      .from("store_settings")
      .update({
        store_name: data.storeName,
        tagline: data.tagline || null,
        logo_url: data.logoUrl || null,
        contact_email: data.contactEmail || null,
        contact_phone: data.contactPhone || null,
        whatsapp_number: data.whatsappNumber || null,
        address: data.address || null,
        business_hours: data.businessHours || null,
        announcement: data.announcement || null,
        order_prefix: data.orderPrefix,
        order_notification_emails: emails,
        free_delivery_threshold: threshold,
        low_stock_threshold: data.lowStockThreshold,
        cash_on_delivery_enabled: data.codEnabled,
        bank_transfer_enabled: data.bankEnabled,
        mmg_enabled: data.mmgEnabled,
        bank_transfer_instructions: data.bankInstructions || null,
        mmg_instructions: data.mmgInstructions || null,
        facebook_url: data.facebookUrl || null,
        instagram_url: data.instagramUrl || null,
        tiktok_url: data.tiktokUrl || null,
      })
      .eq("id", 1);
    if (error) throw error;

    if (previousLogo && previousLogo !== (data.logoUrl || null)) {
      await removeStorageFiles(supabase, "site-assets", [storagePathFromUrl(previousLogo, "site-assets")]);
    }

    updateTag(CACHE_TAGS.settings);
    refresh();
    return { ok: true, message: "Settings saved" };
  } catch (error) {
    return inputFailure(error, fail);
  }
}
