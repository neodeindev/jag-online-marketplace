/* eslint-disable @next/next/no-img-element -- logos are small, already-sized uploads */
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowheadMark } from "./arrowhead-mark";

/**
 * Uploaded logo if there is one; otherwise a wordmark built from the store
 * name: the first word heavy and wide, the rest light, after the arrowhead.
 */
export function Logo({
  storeName,
  logoUrl,
  tone = "light",
  className,
}: {
  storeName: string;
  logoUrl?: string | null;
  tone?: "light" | "dark";
  className?: string;
}) {
  const [first, ...rest] = storeName.trim().split(/\s+/);
  return (
    <Link
      href="/"
      aria-label={`${storeName} home`}
      className={cn("inline-flex shrink-0 items-center gap-2 rounded-md", className)}
    >
      {logoUrl ? (
        <img src={logoUrl} alt={storeName} className="h-9 w-auto max-w-[160px] object-contain" />
      ) : (
        <>
          <ArrowheadMark className="text-[22px]" />
          <span
            className={cn(
              "display flex items-baseline gap-1.5 text-[22px] leading-none",
              tone === "light" ? "text-white" : "text-ink",
            )}
          >
            <span className="font-black uppercase">{first}</span>
            {rest.length > 0 && (
              <span
                className={cn(
                  "hidden text-[13px] font-medium uppercase tracking-[0.18em] sm:inline",
                  tone === "light" ? "text-white/70" : "text-muted",
                )}
              >
                {rest.join(" ")}
              </span>
            )}
          </span>
        </>
      )}
    </Link>
  );
}
