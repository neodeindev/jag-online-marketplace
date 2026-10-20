import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getFooterPages, getPage, getStoreSettings } from "@/lib/catalog";
import { fillTokens, formatDate } from "@/lib/format";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "@/components/store/breadcrumbs";

export async function generateMetadata(props: PageProps<"/pages/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const page = await getPage(slug);
  return page ? { title: page.title, alternates: { canonical: `/pages/${page.slug}` } } : { title: "Page not found" };
}

export default function PolicyPage(props: PageProps<"/pages/[slug]">) {
  return (
    <div className="container-page pt-4">
      <Suspense fallback={<div className="skeleton mt-8 h-96 w-full max-w-3xl rounded-[20px]" />}>
        <PolicyContent params={props.params} />
      </Suspense>
    </div>
  );
}

async function PolicyContent({ params }: Pick<PageProps<"/pages/[slug]">, "params">) {
  const { slug } = await params;
  const [page, settings, pages] = await Promise.all([getPage(slug), getStoreSettings(), getFooterPages()]);
  if (!page) notFound();

  const content = fillTokens(page.content, {
    store_name: settings.store_name,
    contact_email: settings.contact_email,
    contact_phone: settings.contact_phone,
    address: settings.address,
  });

  return (
    <>
      <Breadcrumbs items={[{ name: page.title }]} />
      <div className="mt-4 grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Help pages" className="hidden lg:block">
          <ul className="sticky top-[140px] space-y-0.5">
            {pages.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/pages/${p.slug}`}
                  aria-current={p.slug === page.slug ? "page" : undefined}
                  className={cn(
                    "block rounded-lg px-3 py-2 text-[14px]",
                    p.slug === page.slug ? "bg-white font-bold text-ink shadow-card" : "text-muted hover:text-ink",
                  )}
                >
                  {p.title}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/track-order" className="block rounded-lg px-3 py-2 text-[14px] text-muted hover:text-ink">
                Track your order
              </Link>
            </li>
          </ul>
        </nav>
        <article className="rounded-[20px] bg-white p-6 shadow-card sm:p-10">
          <h1 className="display text-[30px] font-black leading-tight text-ink">{page.title}</h1>
          <p className="mb-6 mt-1 text-[13px] text-muted">Last updated {formatDate(page.updated_at, settings.timezone)}</p>
          <div className="prose-store">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        </article>
      </div>
    </>
  );
}
