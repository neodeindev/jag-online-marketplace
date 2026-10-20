import type { Metadata } from "next";
import { loadAttributes, loadBrands, loadCategories } from "@/lib/admin/catalog-admin";
import { can, requireStaffPage } from "@/lib/auth";
import { getStoreSettings } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/admin/catalog/product-form";
import { NoAccess, PageHeader } from "@/components/admin/ui";

export const instant = false;

export const metadata: Metadata = { title: "Add product" };

export default async function NewProductPage() {
  const user = await requireStaffPage();
  if (!can(user, "products")) return <NoAccess section="products" />;

  const supabase = await createClient();
  const [categories, brands, attributes, settings] = await Promise.all([
    loadCategories(supabase),
    loadBrands(supabase),
    loadAttributes(supabase),
    getStoreSettings(),
  ]);

  return (
    <>
      <PageHeader
        title="Add product"
        description="Fill in the basics and add photos. You can save it hidden and finish later."
        back={{ href: "/admin/products", label: "Products" }}
      />
      <ProductForm
        product={null}
        categories={categories}
        brands={brands}
        attributes={attributes}
        timeZone={settings.timezone}
        lowStockThreshold={settings.low_stock_threshold}
      />
    </>
  );
}
