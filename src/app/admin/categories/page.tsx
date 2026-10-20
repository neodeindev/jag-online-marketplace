import type { Metadata } from "next";
import { countProductsBy, loadCategories } from "@/lib/admin/catalog-admin";
import { can, requireStaffPage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CategoryManager } from "@/components/admin/catalog/category-manager";
import { NoAccess, PageHeader } from "@/components/admin/ui";

export const instant = false;

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const user = await requireStaffPage();
  if (!can(user, "products")) return <NoAccess section="categories" />;

  const supabase = await createClient();
  const categories = await loadCategories(supabase);
  const counts = await countProductsBy(
    supabase,
    "category_id",
    categories.map((c) => c.id),
  );

  return (
    <>
      <PageHeader
        title="Categories"
        description="Organise the store menu. Use the arrows to set the order shoppers see."
      />
      <CategoryManager categories={categories} productCounts={Object.fromEntries(counts)} />
    </>
  );
}
