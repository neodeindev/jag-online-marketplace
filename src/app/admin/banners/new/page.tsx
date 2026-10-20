import type { Metadata } from "next";
import { can, requireStaffPage } from "@/lib/auth";
import { getStoreSettings } from "@/lib/catalog";
import { BannerForm } from "@/components/admin/ops/banner-form";
import { NoAccess, PageHeader } from "@/components/admin/ui";

export const instant = false;
export const metadata: Metadata = { title: "New banner" };

export default async function NewBannerPage(props: PageProps<"/admin/banners/new">) {
  const user = await requireStaffPage();
  if (!can(user, "content")) return <NoAccess section="homepage banners" />;
  const [settings, query] = await Promise.all([getStoreSettings(), props.searchParams]);
  const placement = query.placement === "promo" ? "promo" : "hero";

  return (
    <>
      <PageHeader back={{ href: "/admin/banners", label: "Homepage banners" }} title="New banner" />
      <BannerForm
        timeZone={settings.timezone}
        initial={{
          title: "",
          subtitle: "",
          ctaLabel: "",
          linkUrl: "",
          imageUrl: "",
          storagePath: null,
          placement,
          layout: "split",
          theme: "forest",
          startsAt: "",
          endsAt: "",
          isActive: true,
        }}
      />
    </>
  );
}
