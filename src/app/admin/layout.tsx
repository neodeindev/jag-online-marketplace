import type { Metadata } from "next";
import { can, requireStaffPage } from "@/lib/auth";
import { getStoreSettings } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/admin-shell";

export const instant = false;

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s · Dashboard" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireStaffPage();
  const settings = await getStoreSettings();

  let pendingOrders = 0;
  if (can(user, "orders")) {
    const supabase = await createClient();
    const { count } = await supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending");
    pendingOrders = count ?? 0;
  }

  return (
    <AdminShell
      storeName={settings.store_name}
      user={{
        name: user.fullName ?? user.email ?? "Staff",
        email: user.email,
        role: user.role,
        permissions: user.permissions,
      }}
      pendingOrders={pendingOrders}
    >
      {children}
    </AdminShell>
  );
}
