"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Slide-over panel built on the native <dialog> element, which handles
 * focus trapping, Escape to close and the backdrop.
 */
export function Sheet({
  open,
  onClose,
  side = "right",
  title,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  side?: "left" | "right" | "bottom";
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      document.documentElement.style.overflow = "hidden";
    } else if (!open && dialog.open) {
      dialog.close();
    }
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={() => {
        document.documentElement.style.overflow = "";
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "fixed m-0 flex max-h-none max-w-none flex-col overflow-hidden bg-white p-0 text-text shadow-pop",
        "backdrop:bg-ink/55 backdrop:backdrop-blur-[2px] open:flex [&:not([open])]:hidden",
        side === "right" && "inset-y-0 right-0 left-auto h-dvh w-[min(420px,100vw)] open:animate-slide-in-right",
        side === "left" && "inset-y-0 left-0 right-auto h-dvh w-[min(360px,90vw)] open:animate-slide-in-left",
        side === "bottom" &&
          "inset-x-0 bottom-0 top-auto max-h-[88dvh] w-full rounded-t-2xl open:animate-slide-up",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
        <h2 className="display-tight text-lg font-extrabold text-ink">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="-mr-2 inline-flex size-9 items-center justify-center rounded-full text-muted hover:bg-mist hover:text-ink"
          aria-label="Close"
        >
          <X className="size-5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      {footer && <div className="border-t border-line bg-white px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">{footer}</div>}
    </dialog>
  );
}
