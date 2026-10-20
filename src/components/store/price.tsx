import { discountPercent, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Current price in the display face; when discounted, the original price is
 * struck through and an arrowhead tag shows the saving.
 */
export function Price({
  price,
  current,
  size = "md",
  showTag = true,
  className,
}: {
  price: number;
  current: number;
  size?: "sm" | "md" | "lg";
  showTag?: boolean;
  className?: string;
}) {
  const off = discountPercent(price, current);
  return (
    <div className={cn("flex flex-wrap items-center gap-x-2 gap-y-1", className)}>
      <span
        className={cn(
          "display font-extrabold tabular-nums leading-none",
          off ? "text-flag" : "text-ink",
          size === "sm" && "text-[16px]",
          size === "md" && "text-[19px]",
          size === "lg" && "text-[30px] sm:text-[34px]",
        )}
      >
        {formatPrice(current)}
      </span>
      {off > 0 && (
        <>
          <span
            className={cn(
              "tabular-nums text-muted line-through decoration-muted/70",
              size === "lg" ? "text-base" : "text-[13px]",
            )}
          >
            {formatPrice(price)}
          </span>
          {showTag && size === "lg" && <span className="arrow-tag arrow-tag-lg">−{off}%</span>}
        </>
      )}
    </div>
  );
}
