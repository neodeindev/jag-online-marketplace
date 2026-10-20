"use client";

import { Eye, EyeOff, Search, Star, StarOff, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { bulkUpdateProducts, updateStock } from "@/app/admin/products/actions";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Pill, Table, Td, Th } from "@/components/admin/ui";
import { ProductImage } from "@/components/store/product-image";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";

export interface ProductListRow {
  id: string;
  title: string;
  sku: string;
  slug: string;
  price: number;
  salePrice: number | null;
  onSale: boolean;
  stock: number;
  status: "active" | "hidden";
  isFeatured: boolean;
  category: string | null;
  imageUrl: string | null;
}

export interface ProductFilterValues {
  q: string;
  category: string;
  status: string;
  stock: string;
  sort: string;
}

export function ProductFilters({
  categories,
  current,
}: {
  categories: { id: string; path: string }[];
  current: ProductFilterValues;
}) {
  const router = useRouter();
  const [q, setQ] = useState(current.q);

  function apply(changes: Partial<ProductFilterValues>) {
    const merged = { ...current, ...changes };
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) {
      if (value && !(key === "sort" && value === "newest")) next.set(key, value);
    }
    const qs = next.toString();
    router.push(qs ? `/admin/products?${qs}` : "/admin/products");
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line p-4">
      <form
        className="relative min-w-56 flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          apply({ q: q.trim() });
        }}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search title or SKU, then press Enter"
          aria-label="Search products"
          className="h-10 pl-9"
        />
      </form>
      <Select
        aria-label="Category"
        value={current.category}
        onChange={(e) => apply({ category: e.target.value })}
        className="h-10 w-auto max-w-60"
      >
        <option value="">All categories</option>
        <option value="none">No category</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.path}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Visibility"
        value={current.status}
        onChange={(e) => apply({ status: e.target.value })}
        className="h-10 w-auto"
      >
        <option value="">Shown and hidden</option>
        <option value="active">Shown in store</option>
        <option value="hidden">Hidden</option>
      </Select>
      <Select
        aria-label="Stock"
        value={current.stock}
        onChange={(e) => apply({ stock: e.target.value })}
        className="h-10 w-auto"
      >
        <option value="">Any stock</option>
        <option value="low">Low stock</option>
        <option value="out">Sold out</option>
      </Select>
      <Select
        aria-label="Sort"
        value={current.sort || "newest"}
        onChange={(e) => apply({ sort: e.target.value })}
        className="h-10 w-auto"
      >
        <option value="newest">Newest first</option>
        <option value="title">Title A–Z</option>
        <option value="price_asc">Price: low to high</option>
        <option value="price_desc">Price: high to low</option>
        <option value="stock">Stock: lowest first</option>
        <option value="best_selling">Best selling</option>
      </Select>
    </div>
  );
}

export function ProductTable({ rows, lowStockThreshold }: { rows: ProductListRow[]; lowStockThreshold: number }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [pending, startTransition] = useTransition();
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function run(action: "show" | "hide" | "feature" | "unfeature" | "delete") {
    const ids = [...selected];
    startTransition(async () => {
      const result = await bulkUpdateProducts(ids, action);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Done");
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <div>
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-gold-50 px-5 py-2.5">
          <span className="mr-2 text-[13.5px] font-semibold text-ink">{selected.size} selected</span>
          <Button size="sm" variant="outline" onClick={() => run("show")} disabled={pending}>
            <Eye className="size-4" /> Show
          </Button>
          <Button size="sm" variant="outline" onClick={() => run("hide")} disabled={pending}>
            <EyeOff className="size-4" /> Hide
          </Button>
          <Button size="sm" variant="outline" onClick={() => run("feature")} disabled={pending}>
            <Star className="size-4" /> Feature
          </Button>
          <Button size="sm" variant="outline" onClick={() => run("unfeature")} disabled={pending}>
            <StarOff className="size-4" /> Unfeature
          </Button>
          <ConfirmButton
            confirmLabel={`Click again to delete ${selected.size}`}
            onConfirm={() => run("delete")}
            disabled={pending}
          >
            <Trash2 className="size-4" /> Delete
          </ConfirmButton>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="ml-auto text-[13px] font-semibold text-muted hover:text-ink"
          >
            Clear selection
          </button>
        </div>
      )}
      <Table>
        <thead>
          <tr>
            <Th className="w-10">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))}
                aria-label="Select all products on this page"
                className="size-4 accent-canopy"
              />
            </Th>
            <Th>Product</Th>
            <Th>Category</Th>
            <Th className="text-right">Price</Th>
            <Th className="text-right">Stock</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={cn("hover:bg-mist/50", selected.has(row.id) && "bg-gold-50/60")}>
              <Td>
                <input
                  type="checkbox"
                  checked={selected.has(row.id)}
                  onChange={() => toggle(row.id)}
                  aria-label={`Select ${row.title}`}
                  className="size-4 accent-canopy"
                />
              </Td>
              <Td>
                <Link href={`/admin/products/${row.id}`} className="group flex items-center gap-3">
                  <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-[#f3f5f4]">
                    <ProductImage src={row.imageUrl} alt="" sizes="48px" className="p-1" />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="line-clamp-1 font-semibold text-ink group-hover:underline">{row.title}</span>
                      {row.isFeatured && (
                        <Star className="size-3.5 shrink-0 fill-gold-500 text-gold-500" aria-label="Featured" />
                      )}
                    </span>
                    <span className="font-mono text-[12px] text-muted">{row.sku}</span>
                  </span>
                </Link>
              </Td>
              <Td className="max-w-56 text-[13px] text-muted">
                <span className="line-clamp-1">{row.category ?? "—"}</span>
              </Td>
              <Td className="whitespace-nowrap text-right tabular-nums">
                {row.onSale && row.salePrice !== null ? (
                  <>
                    <span className="font-semibold text-flag">{formatPrice(row.salePrice)}</span>
                    <span className="block text-[12px] text-muted line-through">{formatPrice(row.price)}</span>
                  </>
                ) : (
                  <span className="font-semibold text-ink">{formatPrice(row.price)}</span>
                )}
              </Td>
              <Td className="text-right">
                <StockCell id={row.id} stock={row.stock} lowStockThreshold={lowStockThreshold} />
              </Td>
              <Td>
                <Pill tone={row.status === "active" ? "good" : "neutral"}>{row.status === "active" ? "In store" : "Hidden"}</Pill>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

/** Click the number to change stock without opening the product. */
function StockCell({ id, stock, lowStockThreshold }: { id: string; stock: number; lowStockThreshold: number }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(stock));
  const [pending, startTransition] = useTransition();

  function save() {
    const next = Number(value);
    if (!Number.isInteger(next) || next < 0) {
      toast.error("Stock must be a whole number of 0 or more.");
      return;
    }
    if (next === stock) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const result = await updateStock(id, next);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Stock updated");
      setEditing(false);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <form
        className="inline-flex items-center justify-end gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <input
          type="number"
          min={0}
          step={1}
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setValue(String(stock));
              setEditing(false);
            }
          }}
          aria-label="Stock"
          className="h-8 w-20 rounded-lg border border-line-strong px-2 text-right text-[13px] tabular-nums outline-none focus:border-canopy"
        />
        <Button type="submit" size="sm" variant="dark" disabled={pending}>
          Save
        </Button>
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setValue(String(stock));
        setEditing(true);
      }}
      title="Click to change stock"
      className={cn(
        "inline-flex h-7 min-w-10 items-center justify-center rounded-md px-2 text-[13.5px] font-semibold tabular-nums hover:ring-1 hover:ring-line-strong",
        stock === 0 ? "bg-flag-50 text-flag-600" : stock <= lowStockThreshold ? "bg-gold-100 text-ink" : "text-ink",
      )}
    >
      {stock === 0 ? "Sold out" : stock}
    </button>
  );
}
