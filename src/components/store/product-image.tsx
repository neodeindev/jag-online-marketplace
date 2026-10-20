import Image from "next/image";
import { ImageOff } from "lucide-react";
import { cn, isOptimizableImage } from "@/lib/utils";

/**
 * Product photo that fills its (relatively positioned) parent.
 * Images from our storage are resized by Next.js; anything else is shown as-is.
 * `multiply` blends white photo backgrounds into the tile colour.
 */
export function ProductImage({
  src,
  alt,
  sizes,
  priority,
  className,
  fit = "contain",
  multiply = true,
}: {
  src: string | null | undefined;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  fit?: "contain" | "cover";
  multiply?: boolean;
}) {
  if (!src) {
    return (
      <div className={cn("absolute inset-0 flex items-center justify-center text-subtle", className)}>
        <ImageOff className="size-8" aria-hidden />
        <span className="sr-only">{alt} — no photo</span>
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={!isOptimizableImage(src)}
      className={cn(
        fit === "contain" ? "object-contain" : "object-cover",
        multiply && "mix-blend-multiply",
        className,
      )}
    />
  );
}
