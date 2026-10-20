import type { Metadata } from "next";
import { Suspense } from "react";
import { parseListingParams } from "@/lib/listing";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { ListingSkeleton, ListingView } from "@/components/store/listing/listing-view";

export const metadata: Metadata = {
  title: "Today's deals",
  description: "Discounts on electronics, fashion, beauty and home — delivered across Guyana.",
};

export default function DealsPage(props: PageProps<"/deals">) {
  return (
    <div className="container-page pt-4">
      <Suspense fallback={<ListingSkeleton />}>
        <Deals searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function Deals({ searchParams }: Pick<PageProps<"/deals">, "searchParams">) {
  const state = { ...parseListingParams(await searchParams), onSale: true };
  return (
    <>
      <Breadcrumbs items={[{ name: "Today's deals" }]} />
      <ListingView
        basePath="/search"
        state={{ ...state, sort: state.sort ?? "best_selling" }}
        title={
          <span className="inline-flex items-center gap-3">
            Today&apos;s deals <span className="arrow-tag arrow-tag-lg">SALE</span>
          </span>
        }
        subtitle="Prices cut across the store. While stocks last."
      />
    </>
  );
}
