import { MapPin, Percent } from "lucide-react";
import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS, getCategoryTree, getDeliveryZones, getFooterPages, getStoreSettings } from "@/lib/catalog";
import { Logo } from "@/components/brand/logo";
import { AccountMenu, CartButton, WishlistLink } from "./header-actions";
import { CategoryMenu, MobileMenuButton } from "./mobile-menu";
import { SearchBox } from "./search-box";

export async function SiteHeader() {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.settings, CACHE_TAGS.catalog, CACHE_TAGS.content);

  const [settings, tree, zones, pages] = await Promise.all([
    getStoreSettings(),
    getCategoryTree(),
    getDeliveryZones(),
    getFooterPages(),
  ]);
  const departments = tree.map((c) => ({ slug: c.slug, name: c.name }));
  const deliveryAreas = zones.filter((z) => !z.is_pickup).length;

  return (
    <>
      {settings.announcement && (
        <div className="bg-ink-800 px-4 py-1.5 text-center text-[12.5px] font-medium text-white/85">
          {settings.announcement}
        </div>
      )}
      <header className="no-print sticky top-0 z-40 shadow-[0_6px_16px_-10px_rgb(14_42_34/0.5)]">
        <div className="bg-ink">
          <div className="container-page flex h-16 items-center gap-1.5 sm:gap-3">
            <MobileMenuButton className="-ml-2 lg:hidden" />
            <Logo storeName={settings.store_name} logoUrl={settings.logo_url} />

            {deliveryAreas > 0 && (
              <Link
                href="/pages/delivery"
                className="ml-2 hidden shrink-0 items-center gap-1.5 rounded-xl px-2 py-1 text-white transition hover:bg-white/10 xl:flex"
              >
                <MapPin className="size-5 text-gold" />
                <span className="flex flex-col leading-tight">
                  <span className="text-[11px] text-white/65">Delivering to</span>
                  <span className="text-sm font-bold">{deliveryAreas} areas in Guyana</span>
                </span>
              </Link>
            )}

            <SearchBox departments={departments} className="mx-2 hidden flex-1 md:block" />

            <div className="ml-auto flex items-center md:ml-0">
              <AccountMenu />
              <WishlistLink />
              <CartButton />
            </div>
          </div>
          <div className="container-page pb-3 md:hidden">
            <SearchBox departments={[]} />
          </div>
        </div>
        <div className="flag-rule" />
        <nav aria-label="Departments" className="hidden border-b border-line bg-white lg:block">
          <div className="container-page flex h-11 items-center gap-1 text-[14px]">
            <Link
              href="/deals"
              className="mr-1 inline-flex h-8 items-center gap-1.5 rounded-lg bg-flag-50 px-3 font-bold text-flag transition hover:bg-flag-100"
            >
              <Percent className="size-4" strokeWidth={2.6} />
              Today&apos;s deals
            </Link>
            <Link href="/search?sort=newest" className="inline-flex h-8 items-center rounded-lg px-3 font-semibold text-ink hover:bg-mist">
              New arrivals
            </Link>
            {tree.map((node) => (
              <div key={node.id} className="group relative">
                <Link
                  href={`/c/${node.slug}`}
                  className="inline-flex h-8 items-center rounded-lg px-3 text-text hover:bg-mist group-focus-within:bg-mist"
                >
                  {node.name}
                </Link>
                {node.children.length > 0 && (
                  <div className="invisible absolute left-0 top-full z-50 pt-1.5 opacity-0 transition-[opacity,visibility] duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                    <div className="flex min-w-60 gap-8 rounded-xl border border-line bg-white p-5 shadow-pop">
                      {node.children.map((child) => (
                        <div key={child.id} className="min-w-36">
                          <Link href={`/c/${child.slug}`} className="block font-bold text-ink hover:text-canopy">
                            {child.name}
                          </Link>
                          {child.children.length > 0 && (
                            <ul className="mt-2 space-y-1.5">
                              {child.children.map((leaf) => (
                                <li key={leaf.id}>
                                  <Link href={`/c/${leaf.slug}`} className="text-[13.5px] text-muted hover:text-ink">
                                    {leaf.name}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </nav>
      </header>
      <CategoryMenu tree={tree} pages={pages} />
    </>
  );
}
