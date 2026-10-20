"use client";

import { useRouter } from "next/navigation";
import { createContext, use, useOptimistic, useTransition, type ReactNode } from "react";
import { listingHref, type ListingState } from "@/lib/listing";
import { cn } from "@/lib/utils";

interface ListingNavigation {
  basePath: string;
  /** The listing state, including a change whose results are still loading. */
  state: ListingState;
  /** Shows `next` in the filters straight away and loads its results in a transition. */
  apply: (next: ListingState) => void;
  pending: boolean;
}

const Ctx = createContext<ListingNavigation | null>(null);

/**
 * Filter changes tick the checkbox (or move the chip, or change the sort)
 * immediately, while the current results stay visible, dimmed, until the new
 * ones arrive.
 */
export function ListingNavigationProvider({
  basePath,
  state,
  children,
}: {
  basePath: string;
  state: ListingState;
  children: ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(state);
  const apply = (next: ListingState) =>
    startTransition(() => {
      setOptimistic(next);
      router.push(listingHref(basePath, next), { scroll: false });
    });
  return <Ctx value={{ basePath, state: optimistic, apply, pending }}>{children}</Ctx>;
}

export function useListingNavigation(): ListingNavigation {
  const value = use(Ctx);
  if (!value) throw new Error("useListingNavigation must be used inside <ListingNavigationProvider>");
  return value;
}

export function PendingResults({ children, className }: { children: ReactNode; className?: string }) {
  const { pending } = useListingNavigation();
  return (
    <div className={cn("transition-opacity duration-150", pending && "pointer-events-none opacity-50", className)} aria-busy={pending}>
      {children}
    </div>
  );
}
