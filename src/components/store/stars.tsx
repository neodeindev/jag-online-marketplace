import { cn } from "@/lib/utils";

const STAR_PATH =
  "M12 2.5l2.94 5.96 6.56.95-4.75 4.63 1.12 6.53L12 17.5l-5.87 3.07 1.12-6.53L2.5 9.41l6.56-.95z";

/** Five stars filled to the average rating (to the nearest tenth). */
export function Stars({
  rating,
  count,
  size = 14,
  className,
}: {
  rating: number;
  count?: number;
  size?: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (rating / 5) * 100));
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span
        className="relative inline-flex"
        role="img"
        aria-label={`Rated ${rating.toFixed(1)} out of 5${count !== undefined ? `, ${count} reviews` : ""}`}
      >
        <StarRow size={size} className="text-line-strong" />
        <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${pct}%` }}>
          <StarRow size={size} className="text-gold-500" />
        </span>
      </span>
      {count !== undefined && <span className="text-[12px] tabular-nums text-muted">({count})</span>}
    </span>
  );
}

function StarRow({ size, className }: { size: number; className?: string }) {
  return (
    <span className={cn("flex", className)} aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" className="shrink-0 fill-current">
          <path d={STAR_PATH} />
        </svg>
      ))}
    </span>
  );
}
