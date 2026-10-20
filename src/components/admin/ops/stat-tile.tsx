import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Label · value · optional change vs the previous period · optional link. */
export function StatTile({
  label,
  value,
  detail,
  delta,
  href,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  delta?: { percent: number | null; period: string };
  href?: string;
  tone?: "default" | "attention";
}) {
  const body = (
    <>
      <p className="text-[13px] font-medium text-muted">{label}</p>
      <p className="mt-1.5 text-[26px] font-semibold leading-none text-ink">{value}</p>
      {delta && (
        <p className="mt-2 flex items-center gap-1 text-[12.5px]">
          {delta.percent === null ? (
            <span className="text-muted">No sales in the previous {delta.period}</span>
          ) : (
            <>
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 font-semibold",
                  delta.percent > 0 && "text-canopy",
                  delta.percent < 0 && "text-flag",
                  delta.percent === 0 && "text-muted",
                )}
              >
                {delta.percent > 0 ? (
                  <ArrowUpRight className="size-3.5" aria-hidden />
                ) : delta.percent < 0 ? (
                  <ArrowDownRight className="size-3.5" aria-hidden />
                ) : null}
                {delta.percent > 0 ? "Up" : delta.percent < 0 ? "Down" : "No change"}
                {delta.percent !== 0 && ` ${Math.abs(delta.percent)}%`}
              </span>
              <span className="text-muted">vs previous {delta.period}</span>
            </>
          )}
        </p>
      )}
      {detail && <p className="mt-2 text-[12.5px] text-muted">{detail}</p>}
    </>
  );

  const classes = cn(
    "block rounded-2xl border bg-white p-4",
    tone === "attention" ? "border-gold bg-gold-50/50" : "border-line",
  );

  if (!href) return <div className={classes}>{body}</div>;
  return (
    <Link href={href} className={cn(classes, "group transition hover:border-ink/40")}>
      {body}
      <span className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-semibold text-canopy group-hover:underline">
        View <ArrowRight className="size-3.5" />
      </span>
    </Link>
  );
}
