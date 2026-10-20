import type { Metadata } from "next";
import { can, requireStaffPage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { DeliveryZone } from "@/lib/types";
import { DeliveryZonesManager } from "@/components/admin/ops/delivery-zones";
import { NoAccess, PageHeader, Panel } from "@/components/admin/ui";

export const instant = false;
export const metadata: Metadata = { title: "Delivery areas" };

export default async function DeliveryPage() {
  const user = await requireStaffPage();
  if (!can(user, "owner")) return <NoAccess section="delivery areas" />;

  const supabase = await createClient();
  const [zonesResult, settingsResult] = await Promise.all([
    supabase
      .from("delivery_zones")
      .select("id, name, description, fee, estimated_days, is_pickup, is_active, sort_order")
      .order("sort_order")
      .order("name"),
    // Read directly so the threshold is current right after a settings change.
    supabase.from("store_settings").select("free_delivery_threshold").eq("id", 1).single(),
  ]);

  const zones = ((zonesResult.data ?? []) as DeliveryZone[]).map((z) => ({ ...z, fee: Number(z.fee) }));
  const threshold = (settingsResult.data as { free_delivery_threshold: number | null } | null)?.free_delivery_threshold;

  return (
    <>
      <PageHeader
        title="Delivery areas"
        description="The areas customers choose from at checkout, with the fee and delivery time for each. Past orders keep the fee they were charged."
      />
      <Panel bodyClassName="p-0">
        <DeliveryZonesManager zones={zones} freeThreshold={threshold === null || threshold === undefined ? null : Number(threshold)} />
      </Panel>
    </>
  );
}
