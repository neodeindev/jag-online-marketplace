import type { Metadata } from "next";
import { can, requireStaffPage } from "@/lib/auth";
import { ImportWizard } from "@/components/admin/catalog/import-wizard";
import { NoAccess, PageHeader } from "@/components/admin/ui";

export const instant = false;

export const metadata: Metadata = { title: "Import / export products" };

export default async function ImportProductsPage() {
  const user = await requireStaffPage();
  if (!can(user, "products")) return <NoAccess section="products" />;

  return (
    <>
      <PageHeader
        title="Import / export products"
        description="Add or update many products at once from a spreadsheet saved as CSV."
        back={{ href: "/admin/products", label: "Products" }}
      />
      <ImportWizard />
    </>
  );
}
