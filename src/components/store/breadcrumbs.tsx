import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { siteUrl } from "@/lib/utils";

export function Breadcrumbs({ items }: { items: { name: string; href?: string }[] }) {
  const all = [{ name: "Home", href: "/" }, ...items];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: all.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      ...(item.href ? { item: siteUrl(item.href) } : {}),
    })),
  };
  return (
    <nav aria-label="Breadcrumb" className="text-[13px] text-muted">
      <ol className="flex flex-wrap items-center gap-1">
        {all.map((item, i) => (
          <li key={`${item.name}-${i}`} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-3.5 text-subtle" aria-hidden />}
            {item.href && i < all.length - 1 ? (
              <Link href={item.href} className="hover:text-ink hover:underline">
                {item.name}
              </Link>
            ) : (
              <span aria-current={i === all.length - 1 ? "page" : undefined} className="font-medium text-ink">
                {item.name}
              </span>
            )}
          </li>
        ))}
      </ol>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
    </nav>
  );
}
