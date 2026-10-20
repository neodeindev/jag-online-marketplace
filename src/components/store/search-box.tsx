"use client";

import { Clock, Search, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { formatPrice } from "@/lib/format";
import { cn, isOptimizableImage } from "@/lib/utils";

interface Suggestions {
  products: { slug: string; title: string; current_price: number; image_url: string | null }[];
  categories: { slug: string; name: string; parent_name: string | null }[];
  brands: { slug: string; name: string }[];
}

type Item =
  | { kind: "query"; label: string; href: string }
  | { kind: "product"; label: string; href: string; image: string | null; price: number }
  | { kind: "category"; label: string; href: string; detail: string | null }
  | { kind: "brand"; label: string; href: string };

const RECENT_KEY = "jag-recent-searches";

function readRecent(): string[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string").slice(0, 6) : [];
  } catch {
    return [];
  }
}

function saveRecent(query: string) {
  try {
    const next = [query, ...readRecent().filter((q) => q.toLowerCase() !== query.toLowerCase())].slice(0, 6);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

/**
 * Header search: department picker, instant suggestions as you type,
 * recent searches when empty, and full keyboard support.
 */
export function SearchBox({
  departments,
  className,
  autoFocus,
}: {
  departments: { slug: string; name: string }[];
  className?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [data, setData] = useState<Suggestions | null>(null);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`, { signal: controller.signal });
        if (res.ok) setData((await res.json()) as Suggestions);
      } catch {
        // aborted or offline: keep the previous suggestions
      }
    }, 140);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const items: Item[] = useMemo(() => {
    const term = query.trim();
    if (!term) {
      return recent.map((q) => ({ kind: "query" as const, label: q, href: `/search?q=${encodeURIComponent(q)}` }));
    }
    const list: Item[] = [{ kind: "query", label: term, href: searchHref(term, department) }];
    if (data && term.length >= 2) {
      for (const c of data.categories) {
        list.push({ kind: "category", label: c.name, detail: c.parent_name, href: `/c/${c.slug}` });
      }
      for (const b of data.brands) {
        list.push({ kind: "brand", label: b.name, href: `/search?brand=${b.slug}` });
      }
      for (const p of data.products) {
        list.push({ kind: "product", label: p.title, href: `/p/${p.slug}`, image: p.image_url, price: p.current_price });
      }
    }
    return list;
  }, [data, department, query, recent]);

  function go(href: string, term?: string) {
    if (term) saveRecent(term);
    setOpen(false);
    setActive(-1);
    inputRef.current?.blur();
    router.push(href);
  }

  function submit() {
    const term = query.trim();
    if (active >= 0 && items[active]) {
      const item = items[active];
      go(item.href, item.kind === "query" ? item.label : undefined);
      return;
    }
    if (!term) {
      go(department ? `/c/${department}` : "/search");
      return;
    }
    go(searchHref(term, department), term);
  }

  const showPanel = open && items.length > 0;
  const firstProduct = items.findIndex((i) => i.kind === "product");

  return (
    <div className={cn("relative", className)}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex h-11 w-full overflow-hidden rounded-xl bg-white ring-2 ring-transparent transition focus-within:ring-gold"
      >
        {departments.length > 0 && (
          <label className="relative hidden shrink-0 border-r border-line bg-mist lg:block">
            <span className="sr-only">Search in</span>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="h-full max-w-40 appearance-none bg-transparent pl-3 pr-7 text-[13px] font-medium text-ink outline-none"
            >
              <option value="">All</option>
              {departments.map((d) => (
                <option key={d.slug} value={d.slug}>
                  {d.name}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted">▼</span>
          </label>
        )}
        <input
          ref={inputRef}
          type="search"
          name="q"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => {
            setRecent(readRecent());
            setOpen(true);
          }}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((i) => Math.min(items.length - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(-1, i - 1));
            } else if (e.key === "Escape") {
              setOpen(false);
              setActive(-1);
            }
          }}
          placeholder="Search products, brands and categories"
          aria-label="Search products"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          enterKeyHint="search"
          className="min-w-0 flex-1 bg-transparent px-3.5 text-[15px] text-text outline-none placeholder:text-subtle [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="px-2 text-subtle hover:text-ink"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        )}
        <button
          type="submit"
          className="flex w-12 shrink-0 items-center justify-center bg-gold text-ink transition hover:bg-gold-500"
          aria-label="Search"
        >
          <Search className="size-5" strokeWidth={2.6} />
        </button>
      </form>

      {showPanel && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-[calc(100%+6px)] z-50 max-h-[70vh] overflow-y-auto rounded-xl border border-line bg-white py-2 shadow-pop animate-fade-in"
        >
          {!query.trim() && (
            <li className="px-4 pb-1 pt-1 text-[11px] font-bold uppercase tracking-wider text-subtle">Recent searches</li>
          )}
          {items.map((item, index) => (
            <li key={`${item.kind}-${item.href}`} role="presentation">
              {index === firstProduct && (
                <p className="mt-1 border-t border-line px-4 pb-1 pt-2.5 text-[11px] font-bold uppercase tracking-wider text-subtle">
                  Products
                </p>
              )}
              <a
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                href={item.href}
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.preventDefault();
                  go(item.href, item.kind === "query" ? item.label : undefined);
                }}
                onMouseEnter={() => setActive(index)}
                className={cn(
                  "flex items-center gap-3 px-4 py-2 text-[14px] text-text",
                  index === active && "bg-mist",
                )}
              >
                {item.kind === "query" && (
                  <>
                    {query.trim() ? (
                      <Search className="size-4 shrink-0 text-subtle" />
                    ) : (
                      <Clock className="size-4 shrink-0 text-subtle" />
                    )}
                    <span className="truncate">
                      {query.trim() ? (
                        <>
                          Search for <strong className="font-semibold text-ink">“{item.label}”</strong>
                        </>
                      ) : (
                        item.label
                      )}
                    </span>
                  </>
                )}
                {item.kind === "category" && (
                  <>
                    <span className="inline-flex h-5 shrink-0 items-center rounded bg-canopy-50 px-1.5 text-[10px] font-bold uppercase tracking-wide text-canopy-700">
                      Category
                    </span>
                    <span className="truncate">
                      {item.label}
                      {item.detail && <span className="text-muted"> in {item.detail}</span>}
                    </span>
                  </>
                )}
                {item.kind === "brand" && (
                  <>
                    <span className="inline-flex h-5 shrink-0 items-center rounded bg-gold-50 px-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-700">
                      Brand
                    </span>
                    <span className="truncate">{item.label}</span>
                  </>
                )}
                {item.kind === "product" && (
                  <>
                    <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-[#f3f5f4]">
                      {item.image && (
                        <Image
                          src={item.image}
                          alt=""
                          fill
                          sizes="40px"
                          unoptimized={!isOptimizableImage(item.image)}
                          className="object-contain p-1 mix-blend-multiply"
                        />
                      )}
                    </span>
                    <span className="line-clamp-2 flex-1 leading-snug">{item.label}</span>
                    <span className="shrink-0 font-semibold tabular-nums text-ink">{formatPrice(item.price)}</span>
                  </>
                )}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function searchHref(term: string, department: string) {
  const params = new URLSearchParams({ q: term });
  if (department) params.set("category", department);
  return `/search?${params.toString()}`;
}
