import type { Metadata } from "next";
import { countProductsBy, loadBrands } from "@/lib/admin/catalog-admin";
import { can, requireStaffPage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BrandManager } from "@/components/admin/catalog/brand-manager";
import { NoAccess, PageHeader } from "@/components/admin/ui";

export const instant = false;

export const metadata: Metadata = { title: "Brands" };

export default async function BrandsPage() {
  const user = await requireStaffPage();
  if (!can(user, "products")) return <NoAccess section="brands" />;

  const supabase = await createClient();
  const brands = await loadBrands(supabase);
  const counts = await countProductsBy(
    supabase,
    "brand_id",
    brands.map((b) => b.id),
  );

  return (
    <>
      <PageHeader
        title="Brands"
        description="Shown on product pages and as a filter in search. Deleting a brand keeps its products."
      />
      <BrandManager brands={brands} productCounts={Object.fromEntries(counts)} />
    </>
  );
}
