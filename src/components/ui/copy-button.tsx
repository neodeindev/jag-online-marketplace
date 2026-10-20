"use client";

import { Check } from "lucide-react";
import { useState, type ReactNode } from "react";

export function CopyButton({ value, label, icon }: { value: string; label: string; icon: ReactNode }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard blocked: nothing else to do.
        }
      }}
      className="inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-mist hover:text-ink"
    >
      {copied ? <Check className="size-4 text-canopy" /> : icon}
    </button>
  );
}
