import Link from "next/link";
import type { DepartmentCard as DepartmentCardData } from "@/lib/catalog";
import { discountPercent } from "@/lib/format";
import { ProductImage } from "./product-image";

/** Amazon-style department card: four product photos and a link through. */
export function DepartmentCard({ card }: { card: DepartmentCardData }) {
  return (
    <section className="card flex flex-col p-4 sm:p-5">
      <h3 className="display-tight mb-3 text-lg font-extrabold text-ink">{card.name}</h3>
      <ul className="grid flex-1 grid-cols-2 gap-3">
        {card.products.slice(0, 4).map((p) => {
          const off = discountPercent(p.price, p.current_price);
          return (
            <li key={p.id}>
              <Link href={`/p/${p.slug}`} className="group block">
                <span className="relative block aspect-square overflow-hidden rounded-xl bg-[#f3f5f4]">
                  <ProductImage
                    src={p.image_url}
                    alt=""
                    sizes="(min-width: 1024px) 140px, 40vw"
                    className="p-2.5 transition-transform duration-300 group-hover:scale-105"
                  />
                  {off > 0 && <span className="arrow-tag absolute left-0 top-2 scale-90 origin-left">−{off}%</span>}
                </span>
                <span className="mt-1.5 line-clamp-1 text-[12.5px] text-muted group-hover:text-ink">{p.title}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <Link href={`/c/${card.slug}`} className="mt-3 text-sm font-bold text-canopy hover:text-canopy-700">
        Shop {card.name.toLowerCase()}
      </Link>
    </section>
  );
}
