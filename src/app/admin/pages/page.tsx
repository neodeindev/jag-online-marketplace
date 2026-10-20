import { FileText, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { can, requireStaffPage } from "@/lib/auth";
import { getStoreSettings } from "@/lib/catalog";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, NoAccess, PageHeader, Panel, Pill, Table, Td, Th } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/button";

export const instant = false;
export const metadata: Metadata = { title: "Policy pages" };

interface PageRow {
  id: string;
  slug: string;
  title: string;
  is_published: boolean;
  show_in_footer: boolean;
  sort_order: number;
  updated_at: string;
}

export default async function AdminPagesPage() {
  const user = await requireStaffPage();
  if (!can(user, "content")) return <NoAccess section="policy pages" />;

  const supabase = await createClient();
  const [settings, result] = await Promise.all([
    getStoreSettings(),
    supabase
      .from("pages")
      .select("id, slug, title, is_published, show_in_footer, sort_order, updated_at")
      .order("sort_order")
      .order("title"),
  ]);
  const pages = (result.data ?? []) as PageRow[];

  return (
    <>
      <PageHeader
        title="Policy pages"
        description="Delivery, returns, privacy and other pages linked from the footer. Review them before launch — text in [square brackets] is a placeholder."
        actions={
          <ButtonLink href="/admin/pages/new">
            <Plus className="size-4" /> New page
          </ButtonLink>
        }
      />
      <Panel bodyClassName="p-0">
        {pages.length === 0 ? (
          <EmptyState icon={<FileText className="size-9" />} title="No pages yet" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Page</Th>
                <Th>Status</Th>
                <Th>Footer</Th>
                <Th>Last edited</Th>
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.id} className="relative hover:bg-mist/60">
                  <Td>
                    <Link href={`/admin/pages/${p.id}`} className="font-semibold text-ink after:absolute after:inset-0 hover:underline">
                      {p.title}
                    </Link>
                    <p className="font-mono text-[12px] text-muted">/pages/{p.slug}</p>
                  </Td>
                  <Td>
                    <Pill tone={p.is_published ? "good" : "neutral"}>{p.is_published ? "Published" : "Draft"}</Pill>
                  </Td>
                  <Td className="text-muted">{p.show_in_footer ? `Shown (#${p.sort_order})` : "Hidden"}</Td>
                  <Td className="whitespace-nowrap text-muted">{formatDate(p.updated_at, settings.timezone)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
