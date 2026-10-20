"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { fail, type ActionResult } from "@/lib/action-result";
import { authorize } from "@/lib/auth";
import { inputFailure, parseInput } from "@/lib/admin/validate";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";

const permissions = z
  .array(z.enum(["products", "orders", "content", "customers"]))
  .min(1, "Choose at least one section this person can manage.");

const addSchema = z.object({
  email: z.email("Enter a valid email address.").transform((v) => v.trim().toLowerCase()),
  fullName: z.string().trim().min(2, "Enter their full name.").max(120),
  password: z.string().min(8, "The temporary password needs at least 8 characters.").max(72),
  permissions,
});

export type AddStaffOutcome =
  | { status: "created"; userId: string }
  | { status: "exists"; userId: string; name: string | null; email: string };

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Creates a sign-in for a new staff member. If the email already has an
 * account (for example a customer), nothing is changed and the caller is
 * offered to give that account access instead.
 */
export async function addStaff(input: z.input<typeof addSchema>): Promise<ActionResult<AddStaffOutcome>> {
  try {
    const data = parseInput(addSchema, input);
    const { supabase } = await authorize("owner");

    const { data: existing, error: lookupError } = await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .ilike("email", escapeLike(data.email))
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) {
      const profile = existing as { id: string; full_name: string | null; email: string; role: string };
      if (profile.role !== "customer") {
        return { ok: false, error: "That person already has dashboard access.", field: "email" };
      }
      return {
        ok: true,
        data: { status: "exists", userId: profile.id, name: profile.full_name, email: profile.email },
      };
    }

    if (!hasAdminKey()) {
      return {
        ok: false,
        error:
          "New sign-ins can't be created because SUPABASE_SECRET_KEY isn't set on the server. Add it to the hosting environment, or ask the person to create a customer account first and give that account access.",
      };
    }

    const { data: created, error: createError } = await createAdminClient().auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (createError || !created.user) {
      throw new Error(createError?.message ?? "The account couldn't be created.");
    }

    const { error: accessError } = await supabase.rpc("owner_set_access", {
      p_user_id: created.user.id,
      p_role: "staff",
      p_permissions: data.permissions,
    });
    if (accessError) {
      throw new Error(`The sign-in was created but access couldn't be set: ${accessError.message}. Try "Edit access" on their row.`);
    }

    refresh();
    return { ok: true, message: `${data.fullName} can now sign in`, data: { status: "created", userId: created.user.id } };
  } catch (error) {
    return inputFailure(error, fail);
  }
}

const accessSchema = z.object({ userId: z.uuid(), permissions });

/** Gives an existing account staff access, or changes which sections a staff member can use. */
export async function setStaffAccess(input: z.input<typeof accessSchema>): Promise<ActionResult> {
  try {
    const data = parseInput(accessSchema, input);
    const { supabase } = await authorize("owner");
    const { error } = await supabase.rpc("owner_set_access", {
      p_user_id: data.userId,
      p_role: "staff",
      p_permissions: data.permissions,
    });
    if (error) throw error;
    refresh();
    return { ok: true, message: "Access updated" };
  } catch (error) {
    return inputFailure(error, fail);
  }
}

/** Turns a staff member back into a regular customer account. */
export async function removeStaffAccess(userId: string): Promise<ActionResult> {
  try {
    const id = parseInput(z.uuid(), userId);
    const { supabase, user } = await authorize("owner");
    if (id === user.id) return { ok: false, error: "You can't remove your own owner access." };
    const { error } = await supabase.rpc("owner_set_access", { p_user_id: id, p_role: "customer", p_permissions: [] });
    if (error) throw error;
    refresh();
    return { ok: true, message: "Dashboard access removed" };
  } catch (error) {
    return inputFailure(error, fail);
  }
}
