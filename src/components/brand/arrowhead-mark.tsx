import { cn } from "@/lib/utils";

/**
 * The store mark: a miniature of the flag's Golden Arrowhead —
 * a gold arrowhead with a red one inside, separated by a dark keyline.
 */
export function ArrowheadMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 28 22"
      className={cn("h-[1em] w-auto", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path d="M0 0 L28 11 L0 22 Z" fill="#FFC21A" />
      <path d="M0 2.6 L14.2 11 L0 19.4 Z" fill="#0E2A22" />
      <path d="M0 4.6 L10.8 11 L0 17.4 Z" fill="#D62839" />
    </svg>
  );
}
