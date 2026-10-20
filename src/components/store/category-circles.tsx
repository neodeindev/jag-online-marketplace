import Link from "next/link";
import type { CSSProperties } from "react";
import type { CategoryTile } from "@/lib/catalog";
import { ProductImage } from "./product-image";

const MAX_PER_ROW = 9;

/**
 * Round category shortcuts: a sideways-scrolling row on phones and tablets,
 * evenly balanced rows on desktop (14 shortcuts become two rows of 7).
 */
export function CategoryCircles({ tiles }: { tiles: CategoryTile[] }) {
  if (tiles.length === 0) return null;
  const columns = Math.ceil(tiles.length / Math.ceil(tiles.length / MAX_PER_ROW));
  return (
    <nav aria-label="Shop by category">
      <ul
        style={{ "--cols": columns } as CSSProperties}
        className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:gap-5 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-[repeat(var(--cols),minmax(0,1fr))] lg:gap-x-4 lg:gap-y-6 lg:overflow-visible lg:px-0"
      >
        {tiles.map((tile) => (
          <li key={tile.slug} className="w-[76px] shrink-0 sm:w-24 lg:justify-self-center">
            <Link href={`/c/${tile.slug}`} className="group flex flex-col items-center gap-2 text-center">
              <span className="relative block size-[76px] overflow-hidden rounded-full bg-white ring-1 ring-line transition group-hover:ring-2 group-hover:ring-gold sm:size-24">
                <ProductImage src={tile.image_url} alt="" sizes="96px" className="p-3 transition-transform duration-300 group-hover:scale-110" />
              </span>
              <span className="line-clamp-2 text-[12.5px] font-semibold leading-tight text-ink sm:text-[13.5px]">
                {tile.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
