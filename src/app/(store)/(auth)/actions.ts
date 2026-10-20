"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/utils";

export type AuthState = { error?: string; message?: string; fields?: Record<string, string> } | null;

/** Only allow redirects back into this site. */
function safeNext(value: FormDataEntryValue | null, fallback = "/account"): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}

const emailSchema = z.email("Enter a valid email address.").transform((v) => v.toLowerCase().trim());
const passwordSchema = z.string().min(8, "Use at least 8 characters for your password.").max(72);

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = emailSchema.safeParse(formData.get("email"));
  const password = z.string().min(1, "Enter your password.").safeParse(formData.get("password"));
  const fields = { email: String(formData.get("email") ?? "") };
  if (!email.success) return { error: email.error.issues[0].message, fields };
  if (!password.success) return { error: password.error.issues[0].message, fields };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: email.data, password: password.data });
  if (error) {
    return {
      error: /email not confirmed/i.test(error.message)
        ? "Confirm your email first — check your inbox for the link we sent."
        : "That email and password don't match. Check them and try again.",
      fields,
    };
  }
  redirect(safeNext(formData.get("next")));
}

const signUpSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(120),
  email: emailSchema,
  phone: z.string().trim().max(30).optional(),
  password: passwordSchema,
});

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const fields = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
  };
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };

  const next = safeNext(formData.get("next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.name, phone: parsed.data.phone ?? null },
      emailRedirectTo: siteUrl(`/auth/callback?next=${encodeURIComponent(next)}`),
    },
  });
  if (error) {
    return {
      error: /already registered|already exists/i.test(error.message)
        ? "There's already an account with that email. Sign in instead, or reset your password."
        : error.message,
      fields,
    };
  }
  // With email confirmation on, there's no session until the link is clicked.
  if (!data.session) {
    return { message: `Almost done — we've sent a confirmation link to ${parsed.data.email}. Open it to finish creating your account.` };
  }
  redirect(next);
}

export async function requestPasswordReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return { error: email.error.issues[0].message };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: siteUrl("/auth/callback?next=/reset-password"),
  });
  // Same message whether or not the account exists.
  return { message: `If there's an account for ${email.data}, a reset link is on its way. It expires in an hour.` };
}

export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const password = passwordSchema.safeParse(formData.get("password"));
  if (!password.success) return { error: password.error.issues[0].message };
  if (formData.get("password") !== formData.get("confirm")) return { error: "The two passwords don't match." };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { error: "Your reset link has expired. Request a new one." };
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) return { error: error.message };
  redirect("/account?password=updated");
}
