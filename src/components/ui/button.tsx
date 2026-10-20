import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const variants = {
  primary:
    "bg-gold text-ink hover:bg-gold-500 active:bg-gold-600 shadow-[inset_0_-2px_0_rgb(0_0_0/0.08)] font-bold",
  dark: "bg-ink text-white hover:bg-ink-800 active:bg-ink-700 font-semibold",
  canopy: "bg-canopy text-white hover:bg-canopy-600 active:bg-canopy-700 font-semibold",
  outline: "border border-line-strong bg-white text-ink hover:border-ink hover:bg-mist font-semibold",
  ghost: "text-ink hover:bg-ink/5 font-semibold",
  danger: "bg-flag text-white hover:bg-flag-600 font-semibold",
  "danger-outline": "border border-flag/40 bg-white text-flag hover:bg-flag-50 font-semibold",
} as const;

const sizes = {
  sm: "h-8 px-3 text-sm gap-1.5 rounded-lg",
  md: "h-10 px-4 text-[15px] gap-2 rounded-xl",
  lg: "h-12 px-6 text-base gap-2 rounded-xl",
  icon: "h-10 w-10 rounded-xl",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(
    "inline-flex shrink-0 items-center justify-center whitespace-nowrap transition-colors select-none",
    "disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

type ButtonProps = ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize };

export function Button({ variant = "primary", size = "md", className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize };

export function ButtonLink({ variant = "primary", size = "md", className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}
