import type { Metadata } from "next";
import { Suspense } from "react";
import { getAllCategories } from "@/lib/catalog";
import { parseListingParams } from "@/lib/listing";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { ListingSkeleton, ListingView } from "@/components/store/listing/listing-view";

export async function generateMetadata(props: PageProps<"/search">): Promise<Metadata> {
  const { q } = parseListingParams(await props.searchParams);
  return {
    title: q ? `Results for “${q}”` : "All products",
    robots: { index: !q, follow: true },
  };
}

export default function SearchPage(props: PageProps<"/search">) {
  return (
    <div className="container-page pt-4">
      <Suspense fallback={<ListingSkeleton />}>
        <SearchResults searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function SearchResults({ searchParams }: Pick<PageProps<"/search">, "searchParams">) {
  const state = parseListingParams(await searchParams);
  const categories = await getAllCategories();
  const category = state.category ? categories.find((c) => c.slug === state.category) : null;
  const parent = category?.parent_id ? categories.find((c) => c.id === category.parent_id) : null;

  const title = state.q
    ? category
      ? `“${state.q}” in ${category.name}`
      : `Results for “${state.q}”`
    : state.onSale
      ? "Today's deals"
      : category
        ? category.name
        : state.sort === "newest"
          ? "New arrivals"
          : state.sort === "best_selling"
            ? "Best sellers"
            : "All products";

  return (
    <>
      <Breadcrumbs items={[{ name: state.q ? "Search" : "Shop", href: "/search" }, ...(category ? [{ name: category.name }] : [])]} />
      <ListingView
        basePath="/search"
        state={state}
        title={title}
        parentCategory={category ? (parent ? { name: parent.name, slug: parent.slug } : null) : undefined}
      />
    </>
  );
}
