import type { Metadata } from "next";
import { can, requireStaffPage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { StoreSettings } from "@/lib/types";
import { SettingsForm } from "@/components/admin/ops/settings-form";
import { EmptyState, NoAccess, PageHeader, Panel } from "@/components/admin/ui";

export const instant = false;
export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireStaffPage();
  if (!can(user, "owner")) return <NoAccess section="store settings" />;

  // Read fresh (not the storefront cache) so the form shows what was just saved.
  const supabase = await createClient();
  const { data, error } = await supabase.from("store_settings").select("*").eq("id", 1).single();

  if (error || !data) {
    return (
      <>
        <PageHeader title="Settings" />
        <Panel>
          <EmptyState title="Settings couldn't load">{error?.message ?? "Refresh the page to try again."}</EmptyState>
        </Panel>
      </>
    );
  }
  const s = data as StoreSettings;

  return (
    <>
      <PageHeader title="Settings" description="Your store's name, contact details, payment methods and order alerts." />
      <SettingsForm
        initial={{
          storeName: s.store_name,
          tagline: s.tagline ?? "",
          logoUrl: s.logo_url,
          contactEmail: s.contact_email ?? "",
          contactPhone: s.contact_phone ?? "",
          whatsappNumber: s.whatsapp_number ?? "",
          address: s.address ?? "",
          businessHours: s.business_hours ?? "",
          announcement: s.announcement ?? "",
          orderPrefix: s.order_prefix,
          notificationEmails: (s.order_notification_emails ?? []).join(", "),
          freeDeliveryThreshold: s.free_delivery_threshold === null ? "" : String(Number(s.free_delivery_threshold)),
          lowStockThreshold: String(s.low_stock_threshold),
          codEnabled: s.cash_on_delivery_enabled,
          bankEnabled: s.bank_transfer_enabled,
          mmgEnabled: s.mmg_enabled,
          bankInstructions: s.bank_transfer_instructions ?? "",
          mmgInstructions: s.mmg_instructions ?? "",
          facebookUrl: s.facebook_url ?? "",
          instagramUrl: s.instagram_url ?? "",
          tiktokUrl: s.tiktok_url ?? "",
        }}
      />
    </>
  );
}
