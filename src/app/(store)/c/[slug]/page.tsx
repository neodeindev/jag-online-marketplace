import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCategoryBySlug } from "@/lib/catalog";
import { parseListingParams } from "@/lib/listing";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { ListingSkeleton, ListingView } from "@/components/store/listing/listing-view";
import { ProductImage } from "@/components/store/product-image";

export async function generateMetadata(props: PageProps<"/c/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const found = await getCategoryBySlug(slug);
  if (!found) return { title: "Category not found" };
  const { category, path } = found;
  return {
    title: category.name,
    description:
      category.description ?? `Shop ${path.map((c) => c.name).join(" › ")} online with delivery across Guyana.`,
    alternates: { canonical: `/c/${category.slug}` },
  };
}

export default function CategoryPage(props: PageProps<"/c/[slug]">) {
  return (
    <div className="container-page pt-4">
      <Suspense fallback={<ListingSkeleton />}>
        <CategoryResults params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function CategoryResults({
  params,
  searchParams,
}: Pick<PageProps<"/c/[slug]">, "params" | "searchParams">) {
  const { slug } = await params;
  const found = await getCategoryBySlug(slug);
  if (!found) notFound();

  const { category, path, children } = found;
  const state = parseListingParams(await searchParams, category.slug);
  const parent = path.length > 1 ? path[path.length - 2] : null;

  // Sub-category photos come from the facet data's first product image when none is set.
  const subcategories = children.length > 0 && (
    <nav aria-label={`${category.name} sub-categories`} className="mb-6">
      <ul className="scrollbar-none -mx-4 flex gap-2.5 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
        {children.map((child) => (
          <li key={child.id} className="shrink-0">
            <Link
              href={`/c/${child.slug}`}
              className="flex h-12 items-center gap-2.5 rounded-full border border-line bg-white pl-1.5 pr-4 text-[14px] font-semibold text-ink transition hover:border-ink"
            >
              <span className="relative size-9 overflow-hidden rounded-full bg-[#f3f5f4]">
                {child.image_url && <ProductImage src={child.image_url} alt="" sizes="36px" className="p-1" />}
              </span>
              {child.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );

  return (
    <>
      <Breadcrumbs
        items={path.map((c, i) => ({ name: c.name, href: i < path.length - 1 ? `/c/${c.slug}` : undefined }))}
      />
      <ListingView
        basePath={`/c/${category.slug}`}
        state={state}
        title={category.name}
        subtitle={category.description}
        parentCategory={parent ? { name: parent.name, slug: parent.slug } : null}
        topSlot={subcategories || undefined}
      />
    </>
  );
}
