import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { can, requireStaffPage } from "@/lib/auth";
import { isUuid } from "@/lib/admin/order-rows";
import { getStoreSettings } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/server";
import { PageForm } from "@/components/admin/ops/page-form";
import { NoAccess, PageHeader } from "@/components/admin/ui";

export const instant = false;
export const metadata: Metadata = { title: "Edit page" };

interface PageRow {
  id: string;
  slug: string;
  title: string;
  content: string;
  is_published: boolean;
  show_in_footer: boolean;
  sort_order: number;
}

export default async function EditPolicyPage(props: PageProps<"/admin/pages/[id]">) {
  const user = await requireStaffPage();
  if (!can(user, "content")) return <NoAccess section="policy pages" />;

  const { id } = await props.params;
  if (!isUuid(id)) notFound();

  const supabase = await createClient();
  const [settings, result] = await Promise.all([
    getStoreSettings(),
    supabase
      .from("pages")
      .select("id, slug, title, content, is_published, show_in_footer, sort_order")
      .eq("id", id)
      .maybeSingle(),
  ]);
  const page = result.data as PageRow | null;
  if (!page) notFound();

  return (
    <>
      <PageHeader back={{ href: "/admin/pages", label: "Policy pages" }} title={page.title} />
      <PageForm
        tokens={{
          store_name: settings.store_name,
          contact_email: settings.contact_email,
          contact_phone: settings.contact_phone,
          address: settings.address,
        }}
        initial={{
          id: page.id,
          title: page.title,
          slug: page.slug,
          content: page.content,
          isPublished: page.is_published,
          showInFooter: page.show_in_footer,
          sortOrder: page.sort_order,
        }}
      />
    </>
  );
}
