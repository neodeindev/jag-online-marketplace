import { Banknote, Landmark, Smartphone, Truck } from "lucide-react";
import Link from "next/link";
import {
  getBanners,
  getCategoryTiles,
  getDepartmentCards,
  getProductRail,
  getStoreSettings,
} from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { CategoryCircles } from "@/components/store/category-circles";
import { Countdown } from "@/components/store/countdown";
import { DepartmentCard } from "@/components/store/department-card";
import { BannerSlide, HeroCarousel } from "@/components/store/hero-carousel";
import { ProductGrid } from "@/components/store/product-card";
import { ProductRail } from "@/components/store/product-rail";
import { RecentlyViewed } from "@/components/store/recently-viewed";
import { SectionHeading } from "@/components/store/section-heading";

export default async function HomePage() {
  const [settings, banners, tiles, departments, deals, fresh, bestSellers, featured] = await Promise.all([
    getStoreSettings(),
    getBanners(),
    getCategoryTiles(),
    getDepartmentCards(4),
    getProductRail("deals", 16),
    getProductRail("new", 10),
    getProductRail("best_selling", 16),
    getProductRail("featured", 10),
  ]);

  const hero = banners.filter((b) => b.placement === "hero");
  const promos = banners.filter((b) => b.placement === "promo").slice(0, 3);
  const nextDealEnd = deals
    .map((d) => d.sale_ends_at)
    .filter((d): d is string => Boolean(d))
    .sort()[0];

  return (
    <div className="container-page space-y-10 pt-4 sm:space-y-14 sm:pt-6">
      {hero.length > 0 && <HeroCarousel banners={hero} />}

      <TrustStrip
        cod={settings.cash_on_delivery_enabled}
        bank={settings.bank_transfer_enabled}
        mmg={settings.mmg_enabled}
        freeOver={settings.free_delivery_threshold}
      />

      <CategoryCircles tiles={tiles} />

      {deals.length > 0 && (
        <section className="rounded-[20px] bg-white p-4 shadow-card sm:p-6">
          <SectionHeading
            title="Today's deals"
            href="/deals"
            linkLabel="See all deals"
            aside={
              nextDealEnd ? (
                <Countdown
                  endsAt={nextDealEnd}
                  label="Next deal ends in"
                  className="rounded-full bg-flag px-3 py-1 text-[12.5px] font-semibold text-white"
                />
              ) : undefined
            }
          />
          <ProductRail products={deals} />
        </section>
      )}

      {departments.length > 0 && (
        <section aria-label="Shop by department" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {departments.map((card) => (
            <DepartmentCard key={card.slug} card={card} />
          ))}
        </section>
      )}

      {fresh.length > 0 && (
        <section>
          <SectionHeading title="New arrivals" href="/search?sort=newest" />
          <ProductGrid products={fresh} />
        </section>
      )}

      {promos.length > 0 && (
        <section aria-label="Promotions" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {promos.map((b) => (
            <div key={b.id} className="h-[190px] overflow-hidden rounded-[20px] sm:h-[210px]">
              <BannerSlide banner={b} compact />
            </div>
          ))}
        </section>
      )}

      {bestSellers.length > 0 && (
        <section>
          <SectionHeading title="Best sellers" href="/search?sort=best_selling" />
          <ProductRail products={bestSellers} />
        </section>
      )}

      {featured.length > 0 && (
        <section>
          <SectionHeading title="Picked for you" href="/search?featured=1" />
          <ProductGrid products={featured} />
        </section>
      )}

      <RecentlyViewed />

      {settings.free_delivery_threshold ? (
        <p className="text-center text-sm text-muted">
          Free delivery on orders over {formatPrice(settings.free_delivery_threshold)}.{" "}
          <Link href="/pages/delivery" className="font-semibold text-canopy hover:underline">
            Delivery areas and fees
          </Link>
        </p>
      ) : null}
    </div>
  );
}

function TrustStrip({
  cod,
  bank,
  mmg,
  freeOver,
}: {
  cod: boolean;
  bank: boolean;
  mmg: boolean;
  freeOver: number | null;
}) {
  const items = [
    { show: true, icon: <Truck className="size-5" />, title: "Delivery across Guyana", text: freeOver ? `Free over ${formatPrice(freeOver)}` : "Fees shown at checkout" },
    { show: cod, icon: <Banknote className="size-5" />, title: "Pay on delivery", text: "Cash when it arrives" },
    { show: bank, icon: <Landmark className="size-5" />, title: "Bank transfer", text: "Any local bank" },
    { show: mmg, icon: <Smartphone className="size-5" />, title: "MMG accepted", text: "No card needed" },
  ].filter((i) => i.show);

  return (
    <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-4">
      {items.map((item) => (
        <li key={item.title} className="flex items-center gap-3 bg-white px-3 py-3 sm:px-4">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-canopy-50 text-canopy">
            {item.icon}
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block text-[13.5px] font-bold text-ink">{item.title}</span>
            <span className="block text-[12.5px] text-muted">{item.text}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
