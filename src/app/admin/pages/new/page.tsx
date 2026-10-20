import type { Metadata } from "next";
import { can, requireStaffPage } from "@/lib/auth";
import { getStoreSettings } from "@/lib/catalog";
import { PageForm } from "@/components/admin/ops/page-form";
import { NoAccess, PageHeader } from "@/components/admin/ui";

export const instant = false;
export const metadata: Metadata = { title: "New page" };

export default async function NewPolicyPage() {
  const user = await requireStaffPage();
  if (!can(user, "content")) return <NoAccess section="policy pages" />;
  const settings = await getStoreSettings();

  return (
    <>
      <PageHeader back={{ href: "/admin/pages", label: "Policy pages" }} title="New page" />
      <PageForm
        tokens={{
          store_name: settings.store_name,
          contact_email: settings.contact_email,
          contact_phone: settings.contact_phone,
          address: settings.address,
        }}
        initial={{ title: "", slug: "", content: "", isPublished: true, showInFooter: true, sortOrder: 10 }}
      />
    </>
  );
}
