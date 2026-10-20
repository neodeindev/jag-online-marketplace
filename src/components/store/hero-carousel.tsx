"use client";

import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Banner } from "@/lib/types";
import { cn, isOptimizableImage } from "@/lib/utils";

const THEMES: Record<Banner["theme"], { panel: string; text: string; sub: string; cta: string; shape: string; overlay: string }> = {
  forest: {
    panel: "bg-canopy-700",
    text: "text-white",
    sub: "text-white/80",
    cta: "bg-gold text-ink hover:bg-gold-500",
    shape: "#0f6848",
    overlay: "from-canopy-700/95 via-canopy-700/70",
  },
  ink: {
    panel: "bg-ink",
    text: "text-white",
    sub: "text-white/75",
    cta: "bg-gold text-ink hover:bg-gold-500",
    shape: "#15372d",
    overlay: "from-ink/95 via-ink/70",
  },
  gold: {
    panel: "bg-gold",
    text: "text-ink",
    sub: "text-ink/75",
    cta: "bg-ink text-white hover:bg-ink-800",
    shape: "#f5b400",
    overlay: "from-gold/95 via-gold/70",
  },
  red: {
    panel: "bg-flag",
    text: "text-white",
    sub: "text-white/85",
    cta: "bg-gold text-ink hover:bg-gold-500",
    shape: "#b81f2f",
    overlay: "from-flag/95 via-flag/70",
  },
  mist: {
    panel: "bg-canopy-50",
    text: "text-ink",
    sub: "text-ink/70",
    cta: "bg-ink text-white hover:bg-ink-800",
    shape: "#d3ece0",
    overlay: "from-canopy-50/95 via-canopy-50/75",
  },
};

export function BannerSlide({ banner, priority, compact }: { banner: Banner; priority?: boolean; compact?: boolean }) {
  const theme = THEMES[banner.theme] ?? THEMES.forest;
  const optimized = isOptimizableImage(banner.image_url);
  const content = (
    <div className={cn("flex max-w-[34rem] flex-col items-start", compact ? "gap-2" : "gap-3 sm:gap-4")}>
      <h2
        className={cn(
          "display font-black leading-[0.98] text-balance",
          theme.text,
          compact ? "text-[22px] sm:text-[26px]" : "text-[24px] sm:text-[40px] lg:text-[52px]",
        )}
      >
        {banner.title}
      </h2>
      {banner.subtitle && (
        <p
          className={cn(
            "max-w-[30rem] text-pretty",
            theme.sub,
            compact ? "text-sm" : "line-clamp-2 text-[14px] sm:line-clamp-none sm:text-lg",
          )}
        >
          {banner.subtitle}
        </p>
      )}
      {banner.link_url && (
        <span
          className={cn(
            "mt-1 inline-flex items-center gap-2 whitespace-nowrap rounded-xl font-bold transition",
            theme.cta,
            compact ? "h-9 px-4 text-sm" : "h-11 px-4 text-[15px] sm:h-12 sm:px-6",
          )}
        >
          {banner.cta_label || "Shop now"} <ArrowRight className="size-4" />
        </span>
      )}
    </div>
  );

  const body =
    banner.layout === "cover" ? (
      <div className={cn("relative h-full overflow-hidden", theme.panel)}>
        <Image
          src={banner.image_url}
          alt=""
          fill
          priority={priority}
          sizes="(min-width: 1440px) 1392px, 100vw"
          unoptimized={!optimized}
          className="object-cover"
        />
        <div className={cn("absolute inset-0 bg-gradient-to-r to-transparent", theme.overlay)} />
        <div className="relative flex h-full items-center px-6 py-8 sm:px-12 lg:px-16">{content}</div>
      </div>
    ) : (
      <div className={cn("relative grid h-full grid-cols-[1.5fr_1fr] items-center overflow-hidden sm:grid-cols-[1.1fr_1fr]", theme.panel)}>
        {/* Oversized arrowhead behind the product, echoing the flag. */}
        <svg
          viewBox="0 0 100 80"
          preserveAspectRatio="none"
          className="pointer-events-none absolute -right-[6%] top-0 h-full w-[62%]"
          aria-hidden
        >
          <path d="M0 0 L100 40 L0 80 Z" fill={theme.shape} />
          <path d="M0 14 L64 40 L0 66 Z" fill="none" stroke="rgb(255 255 255 / 0.18)" strokeWidth="0.6" />
        </svg>
        <div className={cn("relative z-10", compact ? "px-5 py-6" : "py-6 pl-5 pr-2 sm:px-12 sm:py-8 lg:px-16")}>{content}</div>
        <div className={cn("relative z-10 flex h-full items-center justify-center", compact ? "p-3" : "p-4 sm:p-8")}>
          <div
            className={cn(
              "relative aspect-square w-full rotate-[-3deg] overflow-hidden rounded-2xl bg-white shadow-pop",
              compact ? "max-w-[150px]" : "max-w-[340px]",
            )}
          >
            <Image
              src={banner.image_url}
              alt=""
              fill
              priority={priority}
              sizes="(min-width: 1024px) 340px, 40vw"
              unoptimized={!optimized}
              className="object-contain p-[8%]"
            />
          </div>
        </div>
      </div>
    );

  return banner.link_url ? (
    <Link href={banner.link_url} className="block h-full" aria-label={banner.title}>
      {body}
    </Link>
  ) : (
    body
  );
}

/** Auto-advancing banner carousel. Swipe on phones; pauses on hover or focus. */
export function HeroCarousel({ banners }: { banners: Banner[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = banners.length;

  const goTo = useCallback((i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const next = (i + count) % count;
    track.scrollTo({ left: next * track.clientWidth, behavior: "smooth" });
  }, [count]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () => setIndex(Math.round(track.scrollLeft / Math.max(1, track.clientWidth)));
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (paused || count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => goTo(index + 1), 6500);
    return () => window.clearInterval(id);
  }, [count, goTo, index, paused]);

  if (count === 0) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured offers"
      className="group/hero relative overflow-hidden rounded-[20px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        ref={trackRef}
        className="scrollbar-none flex h-[320px] snap-x snap-mandatory overflow-x-auto sm:h-[360px] lg:h-[420px]"
      >
        {banners.map((banner, i) => (
          <div
            key={banner.id}
            className="h-full w-full shrink-0 snap-start"
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
          >
            <BannerSlide banner={banner} priority={i === 0} />
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label="Previous offer"
            className="absolute left-3 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-ink opacity-0 shadow-card transition group-hover/hero:opacity-100 focus-visible:opacity-100 md:flex"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label="Next offer"
            className="absolute right-3 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-ink opacity-0 shadow-card transition group-hover/hero:opacity-100 focus-visible:opacity-100 md:flex"
          >
            <ChevronRight className="size-5" />
          </button>
          {/* Bottom-right on phones, where the button would otherwise sit under the dots. */}
          <div className="absolute bottom-3 right-3 flex gap-1.5 rounded-full bg-black/20 px-2 py-1.5 backdrop-blur-sm sm:left-1/2 sm:right-auto sm:-translate-x-1/2">
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Show offer ${i + 1}`}
                aria-current={i === index}
                className={cn("h-2 rounded-full transition-all", i === index ? "w-6 bg-gold" : "w-2 bg-white/70 hover:bg-white")}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
