"use client";

import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ProductImage as ProductImageData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ProductImage } from "@/components/store/product-image";

/** Thumbnails beside a large photo on desktop; a swipeable strip on phones. Click to view full screen. */
export function ProductGallery({ images, title, badge }: { images: ProductImageData[]; title: string; badge?: React.ReactNode }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const onScroll = () => setActive(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (zoom && !d.open) d.showModal();
    if (!zoom && d.open) d.close();
  }, [zoom]);

  const select = (i: number) => {
    setActive(i);
    const el = stripRef.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  if (images.length === 0) {
    return (
      <div className="relative aspect-square overflow-hidden rounded-[20px] bg-white">
        <ProductImage src={null} alt={title} sizes="50vw" />
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      {images.length > 1 && (
        <ul className="hidden w-[72px] shrink-0 flex-col gap-2 md:flex" aria-label="Photos">
          {images.map((img, i) => (
            <li key={img.id}>
              <button
                type="button"
                onClick={() => select(i)}
                onMouseEnter={() => select(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === active}
                className={cn(
                  "relative block size-[72px] overflow-hidden rounded-xl bg-white ring-1 ring-line transition",
                  i === active ? "ring-2 ring-ink" : "hover:ring-ink/40",
                )}
              >
                <ProductImage src={img.url} alt="" sizes="72px" className="p-1.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative min-w-0 flex-1">
        <div
          ref={stripRef}
          className="scrollbar-none flex aspect-square snap-x snap-mandatory overflow-x-auto rounded-[20px] bg-white"
        >
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => {
                setActive(i);
                setZoom(true);
              }}
              className="relative h-full w-full shrink-0 snap-start cursor-zoom-in"
              aria-label={`View photo ${i + 1} of ${images.length} full screen`}
            >
              <ProductImage
                src={img.url}
                alt={img.alt ?? (i === 0 ? title : `${title} — photo ${i + 1}`)}
                sizes="(min-width: 1024px) 560px, 100vw"
                priority={i === 0}
                className="p-[6%]"
              />
            </button>
          ))}
        </div>
        {badge && <div className="pointer-events-none absolute left-0 top-4">{badge}</div>}
        <span className="pointer-events-none absolute right-3 top-3 hidden items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[12px] font-semibold text-muted shadow-sm md:inline-flex">
          <Expand className="size-3.5" /> Click to enlarge
        </span>
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 md:hidden">
            {images.map((img, i) => (
              <span key={img.id} className={cn("h-1.5 rounded-full transition-all", i === active ? "w-5 bg-ink" : "w-1.5 bg-ink/25")} />
            ))}
          </div>
        )}
      </div>

      <dialog
        ref={dialogRef}
        onClose={() => setZoom(false)}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-white p-0 backdrop:bg-black/80"
      >
        <div className="relative flex h-full flex-col">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm font-semibold text-muted">
              {active + 1} / {images.length}
            </p>
            <button
              type="button"
              onClick={() => setZoom(false)}
              className="inline-flex size-10 items-center justify-center rounded-full hover:bg-mist"
              aria-label="Close"
            >
              <X className="size-6" />
            </button>
          </div>
          <div className="relative flex-1">
            {zoom && (
              <ProductImage src={images[active]?.url} alt={title} sizes="100vw" className="p-4" multiply={false} />
            )}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setActive((a) => (a - 1 + images.length) % images.length)}
                  className="absolute left-3 top-1/2 inline-flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-card"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="size-6" />
                </button>
                <button
                  type="button"
                  onClick={() => setActive((a) => (a + 1) % images.length)}
                  className="absolute right-3 top-1/2 inline-flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-card"
                  aria-label="Next photo"
                >
                  <ChevronRight className="size-6" />
                </button>
              </>
            )}
          </div>
        </div>
      </dialog>
    </div>
  );
}
