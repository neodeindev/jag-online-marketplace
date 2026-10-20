import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center py-20 text-center">
      <SearchX className="mb-4 size-12 text-subtle" />
      <h1 className="display text-[30px] font-black text-ink">We couldn&apos;t find that page</h1>
      <p className="mt-2 max-w-md text-muted">
        The link may be old, or the product may no longer be available. Try searching, or start from the homepage.
      </p>
      <div className="mt-6 flex gap-2">
        <ButtonLink href="/">Go to homepage</ButtonLink>
        <ButtonLink href="/search" variant="outline">
          Browse products
        </ButtonLink>
      </div>
    </div>
  );
}
