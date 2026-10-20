"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ProductCardData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ProductCard } from "./product-card";

/** Horizontally scrolling row of product cards with arrow buttons on desktop. */
export function ProductRail({ products, className }: { products: ProductCardData[]; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () =>
      setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <div className={cn("group/rail relative", className)}>
      <div
        ref={ref}
        className="scrollbar-none -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:gap-4 sm:px-6"
      >
        {products.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            sizes="(min-width: 1024px) 200px, 42vw"
            className="w-[42%] shrink-0 snap-start sm:w-[28%] md:w-[22%] lg:w-[17%] xl:w-[15%]"
          />
        ))}
      </div>
      <RailButton side="left" hidden={edges.start} onClick={() => scroll(-1)} />
      <RailButton side="right" hidden={edges.end} onClick={() => scroll(1)} />
    </div>
  );
}

function RailButton({ side, hidden, onClick }: { side: "left" | "right"; hidden: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Scroll back" : "Scroll forward"}
      className={cn(
        "absolute top-[28%] z-10 hidden size-11 items-center justify-center rounded-full border border-line bg-white text-ink shadow-card transition hover:scale-105 md:flex",
        side === "left" ? "-left-3" : "-right-3",
        hidden && "md:hidden",
      )}
    >
      {side === "left" ? <ChevronLeft className="size-5" /> : <ChevronRight className="size-5" />}
    </button>
  );
}
