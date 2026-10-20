"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuantityStepper({
  value,
  max,
  onChange,
  label,
  size = "md",
  allowRemove = false,
}: {
  value: number;
  max: number;
  onChange: (next: number) => void;
  label: string;
  size?: "sm" | "md";
  allowRemove?: boolean;
}) {
  const btn = cn(
    "inline-flex items-center justify-center text-ink transition hover:bg-mist disabled:opacity-35 disabled:hover:bg-transparent",
    size === "sm" ? "size-8" : "size-10",
  );
  const atMin = value <= 1;
  return (
    <div
      className={cn(
        "inline-flex items-center overflow-hidden rounded-full border border-line-strong bg-white",
        size === "sm" ? "h-8" : "h-10",
      )}
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        className={btn}
        onClick={() => onChange(value - 1)}
        disabled={atMin && !allowRemove}
        aria-label={atMin && allowRemove ? "Remove" : "Decrease quantity"}
      >
        {atMin && allowRemove ? <Trash2 className="size-3.5" /> : <Minus className="size-3.5" strokeWidth={2.6} />}
      </button>
      <span className={cn("min-w-7 text-center font-semibold tabular-nums", size === "sm" ? "text-sm" : "text-[15px]")} aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={btn}
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        <Plus className="size-3.5" strokeWidth={2.6} />
      </button>
    </div>
  );
}
