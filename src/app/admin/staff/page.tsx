import type { Metadata } from "next";
import { can, requireStaffPage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hasAdminKey } from "@/lib/supabase/admin";
import { StaffManager, type StaffMember } from "@/components/admin/ops/staff-manager";
import { NoAccess, PageHeader, Panel } from "@/components/admin/ui";

export const instant = false;
export const metadata: Metadata = { title: "Staff accounts" };

export default async function StaffPage() {
  const user = await requireStaffPage();
  if (!can(user, "owner")) return <NoAccess section="staff accounts" />;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, permissions, created_at")
    .in("role", ["owner", "staff"])
    .order("role", { ascending: false })
    .order("created_at");

  // Enum order is customer < staff < owner, so descending lists owners first.
  const staff = (data ?? []) as StaffMember[];

  return (
    <>
      <PageHeader
        title="Staff accounts"
        description="Give people who help run the store their own sign-in, limited to the sections they need."
      />
      {!hasAdminKey() && (
        <p className="mb-4 rounded-xl bg-gold-50 px-4 py-3 text-[14px] text-ink">
          New sign-ins need <code className="font-mono">SUPABASE_SECRET_KEY</code> set on the server. Until then you can
          only give access to people who already created a customer account.
        </p>
      )}
      <Panel bodyClassName="p-0">
        <StaffManager staff={staff} currentUserId={user.id} />
      </Panel>
    </>
  );
}
