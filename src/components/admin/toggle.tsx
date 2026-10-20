"use client";

import { cn } from "@/lib/utils";

/** On/off switch. Works as a controlled input or inside a form via `name`. */
export function Toggle({
  checked,
  onChange,
  label,
  description,
  name,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  name?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label className={cn("flex cursor-pointer items-start justify-between gap-4", disabled && "cursor-not-allowed opacity-60", className)}>
      <span>
        <span className="block text-[14px] font-semibold text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-[13px] text-muted">{description}</span>}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          type="checkbox"
          role="switch"
          name={name}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="h-6 w-11 rounded-full bg-line-strong transition peer-checked:bg-canopy peer-focus-visible:ring-2 peer-focus-visible:ring-canopy peer-focus-visible:ring-offset-2" />
        <span className="absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
