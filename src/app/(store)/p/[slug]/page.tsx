import { Banknote, Landmark, PackageCheck, ShieldCheck, Smartphone, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getDeliveryZones, getProduct, getRelatedProducts, getStoreSettings } from "@/lib/catalog";
import { discountPercent, formatPrice } from "@/lib/format";
import type { ProductCardData, ProductDetail } from "@/lib/types";
import { siteUrl } from "@/lib/utils";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { Countdown } from "@/components/store/countdown";
import { Price } from "@/components/store/price";
import { ProductGallery } from "@/components/store/product/product-gallery";
import { ProductPurchase } from "@/components/store/product/product-purchase";
import { ReviewsSection } from "@/components/store/product/reviews-section";
import { ProductRail } from "@/components/store/product-rail";
import { RecentlyViewed, TrackView } from "@/components/store/recently-viewed";
import { SectionHeading } from "@/components/store/section-heading";
import { Stars } from "@/components/store/stars";

export async function generateMetadata(props: PageProps<"/p/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProduct(slug);
  if (!product) return { title: "Product not found" };
  const description = product.description.replace(/[#*_`>\[\]]/g, "").slice(0, 155).trim();
  const image = product.images[0]?.url;
  return {
    title: product.title,
    description,
    alternates: { canonical: `/p/${product.slug}` },
    openGraph: {
      type: "website",
      title: product.title,
      description,
      images: image ? [{ url: image, alt: product.title }] : undefined,
    },
  };
}

export default function ProductPage(props: PageProps<"/p/[slug]">) {
  return (
    <div className="container-page pb-6 pt-4">
      <Suspense fallback={<ProductSkeleton />}>
        <ProductContent params={props.params} />
      </Suspense>
    </div>
  );
}

async function ProductContent({ params }: Pick<PageProps<"/p/[slug]">, "params">) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const [settings, zones, related] = await Promise.all([
    getStoreSettings(),
    getDeliveryZones(),
    getRelatedProducts(product.id, product.category?.slug ?? null),
  ]);

  const off = discountPercent(product.price, product.current_price);
  const deliveryZones = zones.filter((z) => !z.is_pickup);
  const pickup = zones.find((z) => z.is_pickup);
  const cheapest = deliveryZones.length ? Math.min(...deliveryZones.map((z) => z.fee)) : null;
  const freeDelivery = settings.free_delivery_threshold !== null && product.current_price >= settings.free_delivery_threshold;

  const card: ProductCardData = {
    id: product.id,
    slug: product.slug,
    title: product.title,
    brand_name: product.brand?.name ?? null,
    price: product.price,
    current_price: product.current_price,
    sale_ends_at: product.sale_ends_at,
    stock: product.stock,
    image_url: product.images[0]?.url ?? null,
    hover_image_url: product.images[1]?.url ?? null,
    rating_avg: product.rating_avg,
    rating_count: product.rating_count,
    colors: [],
    has_options: product.options.length > 0,
  };

  const specs = [
    ...(product.brand ? [{ label: "Brand", value: product.brand.name }] : []),
    ...product.details.map((d) => ({ label: d.name, value: d.values.join(", ") })),
    ...product.specifications,
    { label: "SKU", value: product.sku },
  ];

  return (
    <>
      <TrackView product={card} />
      <ProductJsonLd product={product} storeName={settings.store_name} />

      <Breadcrumbs
        items={[
          ...product.breadcrumbs.map((c) => ({ name: c.name, href: `/c/${c.slug}` })),
          { name: product.title },
        ]}
      />

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-10">
        <div className="lg:sticky lg:top-[140px] lg:self-start">
          <ProductGallery
            images={product.images}
            title={product.title}
            badge={off > 0 ? <span className="arrow-tag arrow-tag-lg">−{off}%</span> : undefined}
          />
        </div>

        <div className="min-w-0">
          {product.brand && (
            <Link
              href={`/search?brand=${product.brand.slug}`}
              className="text-[13px] font-bold uppercase tracking-[0.1em] text-canopy hover:underline"
            >
              {product.brand.name}
            </Link>
          )}
          <h1 className="display-tight mt-1 text-[24px] font-extrabold leading-tight text-ink sm:text-[30px]">
            {product.title}
          </h1>
          {product.rating_count > 0 && (
            <a href="#reviews" className="mt-2 inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
              <Stars rating={product.rating_avg} size={16} />
              <span className="font-semibold text-ink">{product.rating_avg.toFixed(1)}</span>
              <span>
                ({product.rating_count} {product.rating_count === 1 ? "review" : "reviews"})
              </span>
            </a>
          )}

          <div className="mt-5 rounded-2xl bg-white p-5 shadow-card">
            <Price price={product.price} current={product.current_price} size="lg" />
            {off > 0 && (
              <p className="mt-2 text-sm font-semibold text-canopy">
                You save {formatPrice(product.price - product.current_price)}
              </p>
            )}
            {product.sale_ends_at && off > 0 && (
              <Countdown
                endsAt={product.sale_ends_at}
                label="Deal ends in"
                className="mt-3 rounded-lg bg-flag-50 px-3 py-1.5 text-[13px] font-semibold text-flag"
              />
            )}
            <p className="mt-3 text-[14px]">
              {product.stock <= 0 ? (
                <span className="font-bold text-flag">Sold out — check back soon</span>
              ) : product.stock <= settings.low_stock_threshold ? (
                <span className="font-bold text-flag">Only {product.stock} left in stock — order soon</span>
              ) : (
                <span className="font-bold text-canopy">In stock</span>
              )}
            </p>

            <div className="mt-5 border-t border-line pt-5">
              <ProductPurchase product={product} />
            </div>
          </div>

          <ul className="mt-4 divide-y divide-line rounded-2xl border border-line bg-white text-[14px]">
            <li className="flex gap-3 p-4">
              <Truck className="mt-0.5 size-5 shrink-0 text-canopy" />
              <div>
                <p className="font-bold text-ink">
                  {freeDelivery ? "Free delivery" : cheapest !== null ? `Delivery from ${formatPrice(cheapest)}` : "Delivery available"}
                </p>
                <p className="text-muted">
                  To {deliveryZones.length} areas across Guyana.{" "}
                  {settings.free_delivery_threshold !== null && !freeDelivery && (
                    <>Free on orders over {formatPrice(settings.free_delivery_threshold)}. </>
                  )}
                  <Link href="/pages/delivery" className="font-semibold text-canopy hover:underline">
                    See areas and fees
                  </Link>
                </p>
              </div>
            </li>
            {pickup && (
              <li className="flex gap-3 p-4">
                <PackageCheck className="mt-0.5 size-5 shrink-0 text-canopy" />
                <div>
                  <p className="font-bold text-ink">Free store pickup</p>
                  <p className="text-muted">{pickup.estimated_days ?? pickup.description}</p>
                </div>
              </li>
            )}
            <li className="flex gap-3 p-4">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-canopy" />
              <div>
                <p className="font-bold text-ink">Pay your way</p>
                <p className="flex flex-wrap gap-x-4 gap-y-1 text-muted">
                  {settings.cash_on_delivery_enabled && (
                    <span className="inline-flex items-center gap-1.5">
                      <Banknote className="size-4" /> Cash on delivery
                    </span>
                  )}
                  {settings.bank_transfer_enabled && (
                    <span className="inline-flex items-center gap-1.5">
                      <Landmark className="size-4" /> Bank transfer
                    </span>
                  )}
                  {settings.mmg_enabled && (
                    <span className="inline-flex items-center gap-1.5">
                      <Smartphone className="size-4" /> MMG
                    </span>
                  )}
                </p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section>
          <h2 className="display mb-4 text-[22px] font-extrabold text-ink">About this item</h2>
          {product.description ? (
            <div className="prose-store">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{product.description}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-muted">No description yet.</p>
          )}
        </section>
        <section>
          <h2 className="display mb-4 text-[22px] font-extrabold text-ink">Specifications</h2>
          <dl className="overflow-hidden rounded-2xl border border-line bg-white text-[14px]">
            {specs.map((s, i) => (
              <div key={`${s.label}-${i}`} className="grid grid-cols-[40%_1fr] border-b border-line last:border-b-0">
                <dt className="bg-mist px-4 py-2.5 font-semibold text-ink">{s.label}</dt>
                <dd className="px-4 py-2.5">{s.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <div className="mt-14">
        <ReviewsSection
          productId={product.id}
          slug={product.slug}
          ratingAvg={product.rating_avg}
          ratingCount={product.rating_count}
        />
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <SectionHeading
            title="You may also like"
            href={product.category ? `/c/${product.category.slug}` : undefined}
            linkLabel={product.category ? `More in ${product.category.name}` : undefined}
          />
          <ProductRail products={related} />
        </section>
      )}

      <RecentlyViewed excludeId={product.id} className="mt-14" />
    </>
  );
}

function ProductJsonLd({ product, storeName }: { product: ProductDetail; storeName: string }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    sku: product.sku,
    description: product.description.slice(0, 5000),
    image: product.images.map((i) => i.url),
    brand: product.brand ? { "@type": "Brand", name: product.brand.name } : undefined,
    category: product.breadcrumbs.map((b) => b.name).join(" > ") || undefined,
    aggregateRating:
      product.rating_count > 0
        ? { "@type": "AggregateRating", ratingValue: product.rating_avg, reviewCount: product.rating_count }
        : undefined,
    offers: {
      "@type": "Offer",
      url: siteUrl(`/p/${product.slug}`),
      priceCurrency: "GYD",
      price: product.current_price,
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: storeName },
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

function ProductSkeleton() {
  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-2">
      <div className="skeleton aspect-square w-full rounded-[20px]" />
      <div className="space-y-4">
        <div className="skeleton h-4 w-24" />
        <div className="skeleton h-9 w-4/5" />
        <div className="skeleton h-5 w-40" />
        <div className="skeleton h-56 w-full rounded-2xl" />
        <div className="skeleton h-32 w-full rounded-2xl" />
      </div>
    </div>
  );
}
