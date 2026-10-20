import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "./supabase/server";
import type { StaffPermission, UserRole } from "./types";

export interface SessionUser {
  id: string;
  email: string | null;
  fullName: string | null;
  role: UserRole;
  permissions: StaffPermission[];
}

/** The signed-in user and their profile, or null. Deduplicated per request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, role, permissions")
    .eq("id", userId)
    .maybeSingle();

  return {
    id: userId,
    email: profile?.email ?? (data.claims.email as string | undefined) ?? null,
    fullName: profile?.full_name ?? null,
    role: (profile?.role as UserRole | undefined) ?? "customer",
    permissions: (profile?.permissions ?? []) as StaffPermission[],
  };
});

export function can(user: SessionUser | null, permission: StaffPermission | "owner"): boolean {
  if (!user) return false;
  if (user.role === "owner") return true;
  if (permission === "owner") return false;
  return user.role === "staff" && user.permissions.includes(permission);
}

export function isStaff(user: SessionUser | null): boolean {
  return user?.role === "owner" || user?.role === "staff";
}

/** For pages: sends signed-out visitors to sign in and blocks anyone without access. */
export async function requireUser(next = "/account"): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/** For dashboard pages: customers are sent to their account; pages check section permissions with can(). */
export async function requireStaffPage(): Promise<SessionUser> {
  const user = await requireUser("/admin");
  if (!isStaff(user)) redirect("/account");
  return user;
}

/**
 * For Server Actions: returns a Supabase client acting as the user, after
 * checking they're allowed to do this. Row level security re-checks in the database.
 */
export async function authorize(permission: StaffPermission | "owner") {
  const user = await getSessionUser();
  if (!user || !can(user, permission)) {
    throw new Error("You don't have permission to do that. Ask the store owner for access.");
  }
  const supabase = await createClient();
  return { user, supabase };
}
