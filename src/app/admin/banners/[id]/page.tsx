import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { can, requireStaffPage } from "@/lib/auth";
import { BANNER_COLUMNS, type BannerRow } from "@/lib/admin/banners";
import { isoToZonedInput } from "@/lib/admin/datetime";
import { isUuid } from "@/lib/admin/order-rows";
import { getStoreSettings } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/server";
import { BannerForm } from "@/components/admin/ops/banner-form";
import { NoAccess, PageHeader } from "@/components/admin/ui";

export const instant = false;
export const metadata: Metadata = { title: "Edit banner" };

export default async function EditBannerPage(props: PageProps<"/admin/banners/[id]">) {
  const user = await requireStaffPage();
  if (!can(user, "content")) return <NoAccess section="homepage banners" />;

  const { id } = await props.params;
  if (!isUuid(id)) notFound();

  const supabase = await createClient();
  const [settings, result] = await Promise.all([
    getStoreSettings(),
    supabase.from("banners").select(BANNER_COLUMNS).eq("id", id).maybeSingle(),
  ]);
  const banner = result.data as BannerRow | null;
  if (!banner) notFound();

  return (
    <>
      <PageHeader back={{ href: "/admin/banners", label: "Homepage banners" }} title="Edit banner" />
      <BannerForm
        timeZone={settings.timezone}
        initial={{
          id: banner.id,
          title: banner.title,
          subtitle: banner.subtitle ?? "",
          ctaLabel: banner.cta_label ?? "",
          linkUrl: banner.link_url ?? "",
          imageUrl: banner.image_url,
          storagePath: banner.storage_path,
          placement: banner.placement,
          layout: banner.layout,
          theme: banner.theme,
          startsAt: isoToZonedInput(banner.starts_at, settings.timezone),
          endsAt: isoToZonedInput(banner.ends_at, settings.timezone),
          isActive: banner.is_active,
        }}
      />
    </>
  );
}
