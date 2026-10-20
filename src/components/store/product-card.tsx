import Link from "next/link";
import { discountPercent } from "@/lib/format";
import type { ProductCardData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Price } from "./price";
import { ProductImage } from "./product-image";
import { QuickAdd, WishlistHeart } from "./product-card-actions";
import { Stars } from "./stars";

export function ProductCard({
  product,
  priority,
  sizes = "(min-width: 1280px) 18vw, (min-width: 1024px) 22vw, (min-width: 640px) 30vw, 46vw",
  className,
}: {
  product: ProductCardData;
  priority?: boolean;
  sizes?: string;
  className?: string;
}) {
  const off = discountPercent(product.price, product.current_price);
  const soldOut = product.stock <= 0;
  const lowStock = !soldOut && product.stock <= 5;
  const href = `/p/${product.slug}`;

  return (
    <article className={cn("group relative flex flex-col", className)}>
      <div className="relative aspect-square overflow-hidden rounded-[var(--radius-card)] bg-[#f3f5f4]">
        <ProductImage
            src={product.image_url}
            alt=""
            sizes={sizes}
            priority={priority}
            className={cn(
              "p-[9%] transition-[opacity,transform] duration-300 group-hover:scale-[1.03]",
              product.hover_image_url && "group-hover:opacity-0",
              soldOut && "opacity-60",
            )}
          />
          {product.hover_image_url && (
            <ProductImage
              src={product.hover_image_url}
              alt=""
              sizes={sizes}
              className="p-[9%] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            />
          )}

        {off > 0 && !soldOut && <span className="arrow-tag absolute left-0 top-3">−{off}%</span>}
        {soldOut && (
          <span className="absolute left-3 top-3 rounded-full bg-ink px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
            Sold out
          </span>
        )}

        <WishlistHeart productId={product.id} title={product.title} className="absolute right-2.5 top-2.5 z-10" />
        <div className="absolute bottom-2.5 right-2.5 z-10">
          <QuickAdd product={product} />
        </div>
      </div>

      <div className="flex flex-1 flex-col px-0.5 pt-2.5">
        {product.brand_name && (
          <p className="mb-0.5 truncate text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
            {product.brand_name}
          </p>
        )}
        <h3 className="line-clamp-2 text-[14px] font-medium leading-snug text-text">
          <Link href={href} className="after:absolute after:inset-0 after:content-[''] hover:underline">
            {product.title}
          </Link>
        </h3>
        {product.rating_count > 0 && (
          <Stars rating={product.rating_avg} count={product.rating_count} size={12} className="mt-1" />
        )}
        <Price price={product.price} current={product.current_price} size="sm" className="mt-1.5" />
        <div className="mt-1.5 flex min-h-4 items-center gap-2">
          {product.colors.length > 0 && (
            <span className="flex items-center gap-1" aria-label={`Colours: ${product.colors.map((c) => c.name).join(", ")}`}>
              {product.colors.slice(0, 5).map((c) => (
                <span
                  key={c.name}
                  title={c.name}
                  className="size-3 rounded-full ring-1 ring-black/15"
                  style={{ background: c.hex ?? "#ccc" }}
                />
              ))}
              {product.colors.length > 5 && (
                <span className="text-[11px] text-muted">+{product.colors.length - 5}</span>
              )}
            </span>
          )}
          {lowStock && <span className="text-[12px] font-semibold text-flag">Only {product.stock} left</span>}
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({
  products,
  className,
  priorityCount = 0,
  sizes,
}: {
  products: ProductCardData[];
  className?: string;
  priorityCount?: number;
  sizes?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4 xl:grid-cols-5", className)}>
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < priorityCount} sizes={sizes} />
      ))}
    </div>
  );
}
