import type { MetadataRoute } from "next";
import { getAllCategories, getFooterPages, getProductSlugs } from "@/lib/catalog";
import { siteUrl } from "@/lib/utils";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, pages] = await Promise.all([getProductSlugs(), getAllCategories(), getFooterPages()]);
  return [
    { url: siteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: siteUrl("/deals"), changeFrequency: "daily", priority: 0.8 },
    ...categories
      .filter((c) => c.is_active)
      .map((c) => ({ url: siteUrl(`/c/${c.slug}`), changeFrequency: "daily" as const, priority: 0.7 })),
    ...products.map((p) => ({
      url: siteUrl(`/p/${p.slug}`),
      lastModified: new Date(p.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...pages.map((p) => ({ url: siteUrl(`/pages/${p.slug}`), changeFrequency: "monthly" as const, priority: 0.3 })),
  ];
}
