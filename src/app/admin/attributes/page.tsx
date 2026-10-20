import type { Metadata } from "next";
import { loadAttributes } from "@/lib/admin/catalog-admin";
import { can, requireStaffPage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AttributeManager } from "@/components/admin/catalog/attribute-manager";
import { NoAccess, PageHeader } from "@/components/admin/ui";

export const instant = false;

export const metadata: Metadata = { title: "Sizes, colours & filters" };

export default async function AttributesPage() {
  const user = await requireStaffPage();
  if (!can(user, "products")) return <NoAccess section="attributes" />;

  const supabase = await createClient();
  const attributes = await loadAttributes(supabase);
  const valueIds = attributes.flatMap((a) => a.values.map((v) => v.id));
  const usage = await Promise.all(
    valueIds.map(async (id) => {
      const { count } = await supabase
        .from("product_attribute_values")
        .select("product_id", { count: "exact", head: true })
        .eq("attribute_value_id", id);
      return [id, count ?? 0] as const;
    }),
  );

  return (
    <>
      <PageHeader
        title="Sizes, colours & filters"
        description="The choices shoppers pick from and filter by. Assign values to products on each product's page."
      />
      <AttributeManager attributes={attributes} usage={Object.fromEntries(usage)} />
    </>
  );
}
