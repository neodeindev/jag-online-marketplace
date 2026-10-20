import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ArrowheadMark } from "@/components/brand/arrowhead-mark";

export function SectionHeading({
  title,
  href,
  linkLabel = "See all",
  aside,
  className,
}: {
  title: ReactNode;
  href?: string;
  linkLabel?: string;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-4", className)}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <h2 className="display flex items-center gap-2.5 text-[22px] font-extrabold leading-none text-ink sm:text-[26px]">
          <ArrowheadMark className="text-[18px] sm:text-[20px]" />
          {title}
        </h2>
        {aside}
      </div>
      {href && (
        <Link
          href={href}
          className="group inline-flex shrink-0 items-center gap-1 text-sm font-bold text-canopy hover:text-canopy-700"
        >
          {linkLabel}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
