"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ProfileState = { ok?: boolean; error?: string; message?: string } | null;

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your name.").max(120),
  phone: z.string().trim().max(30),
  address_line: z.string().trim().max(300),
  city: z.string().trim().max(120),
  delivery_zone_id: z.union([z.literal(""), z.uuid()]),
});

export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await getSessionUser();
  if (!user) return { error: "Your session ended. Sign in again." };

  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      phone: parsed.data.phone || null,
      address_line: parsed.data.address_line || null,
      city: parsed.data.city || null,
      delivery_zone_id: parsed.data.delivery_zone_id || null,
    })
    .eq("id", user.id);
  if (error) return { error: "Couldn't save your details. Try again." };
  refresh();
  return { ok: true, message: "Details saved." };
}

const passwordSchema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters.").max(72),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "The two passwords don't match." });

export async function changePassword(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await getSessionUser();
  if (!user) return { error: "Your session ended. Sign in again." };
  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };
  return { ok: true, message: "Password changed." };
}
