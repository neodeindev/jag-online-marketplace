import { ImageIcon, Plus } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { can, requireStaffPage } from "@/lib/auth";
import { BANNER_COLUMNS, BANNER_THEMES, bannerState, type BannerRow, type BannerState } from "@/lib/admin/banners";
import { getStoreSettings } from "@/lib/catalog";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { isOptimizableImage } from "@/lib/utils";
import { BannerActiveToggle, BannerMoveButtons } from "@/components/admin/ops/banner-row-controls";
import { EmptyState, NoAccess, PageHeader, Panel, Pill } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/button";

export const instant = false;
export const metadata: Metadata = { title: "Homepage banners" };

const STATE_PILL: Record<BannerState, { tone: "good" | "warn" | "bad" | "neutral"; label: string }> = {
  live: { tone: "good", label: "Live" },
  scheduled: { tone: "warn", label: "Scheduled" },
  ended: { tone: "bad", label: "Ended" },
  hidden: { tone: "neutral", label: "Hidden" },
};

/** Each banner with whether it's live right now (evaluated per request). */
function withState(rows: BannerRow[]) {
  const now = Date.now();
  return rows.map((b) => ({ ...b, state: bannerState(b, now) }));
}

export default async function BannersPage() {
  const user = await requireStaffPage();
  if (!can(user, "content")) return <NoAccess section="homepage banners" />;

  const supabase = await createClient();
  const [settings, result] = await Promise.all([
    getStoreSettings(),
    supabase.from("banners").select(BANNER_COLUMNS).order("sort_order").order("created_at"),
  ]);
  const banners = withState((result.data ?? []) as BannerRow[]);

  const groups = [
    {
      placement: "hero" as const,
      title: "Hero carousel",
      description: "The large rotating banners at the top of the homepage. Two to four works best.",
    },
    {
      placement: "promo" as const,
      title: "Promo tiles",
      description: "Up to three smaller banners shown further down the homepage.",
    },
  ];

  return (
    <>
      <PageHeader
        title="Homepage banners"
        description="Promote deals, new arrivals and categories. Changes appear on the homepage within a minute."
        actions={
          <ButtonLink href="/admin/banners/new">
            <Plus className="size-4" /> New banner
          </ButtonLink>
        }
      />

      <div className="space-y-6">
        {groups.map((group) => {
          const items = banners.filter((b) => b.placement === group.placement);
          return (
            <Panel key={group.placement} title={group.title} description={group.description} bodyClassName="p-0">
              {items.length === 0 ? (
                <EmptyState
                  icon={<ImageIcon className="size-9" />}
                  title={`No ${group.title.toLowerCase()} yet`}
                  action={
                    <ButtonLink href={`/admin/banners/new?placement=${group.placement}`} variant="outline" size="sm">
                      <Plus className="size-4" /> Add one
                    </ButtonLink>
                  }
                />
              ) : (
                <ul className="divide-y divide-line">
                  {items.map((b, i) => {
                    const state = STATE_PILL[b.state];
                    const swatch = BANNER_THEMES.find((t) => t.value === b.theme)?.swatch ?? "#0e2a22";
                    return (
                      <li key={b.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                        <BannerMoveButtons id={b.id} first={i === 0} last={i === items.length - 1} />
                        <Link
                          href={`/admin/banners/${b.id}`}
                          className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg ring-1 ring-line"
                          style={{ background: swatch }}
                        >
                          <Image
                            src={b.image_url}
                            alt=""
                            fill
                            sizes="112px"
                            unoptimized={!isOptimizableImage(b.image_url)}
                            className={b.layout === "cover" ? "object-cover" : "object-contain p-1.5"}
                          />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <Link href={`/admin/banners/${b.id}`} className="font-semibold text-ink hover:underline">
                            {b.title}
                          </Link>
                          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
                            <Pill tone={state.tone}>{state.label}</Pill>
                            {b.link_url && <span className="truncate">→ {b.link_url}</span>}
                            {(b.starts_at || b.ends_at) && (
                              <span>
                                {b.starts_at ? `From ${formatDateTime(b.starts_at, settings.timezone)}` : "Now"}
                                {b.ends_at ? ` until ${formatDateTime(b.ends_at, settings.timezone)}` : ""}
                              </span>
                            )}
                          </p>
                        </div>
                        <BannerActiveToggle id={b.id} active={b.is_active} />
                        <ButtonLink href={`/admin/banners/${b.id}`} variant="outline" size="sm">
                          Edit
                        </ButtonLink>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          );
        })}
      </div>
    </>
  );
}
