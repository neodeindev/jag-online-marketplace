"use client";

import { ArrowDown, ArrowUp, Check, ExternalLink, Eye, Pencil, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { createBrand, deleteProduct, saveProduct, type ProductInput } from "@/app/admin/products/actions";
import type { AdminAttribute, AdminBrand } from "@/lib/admin/catalog-admin";
import { flattenCategories, type CategoryLike } from "@/lib/admin/category-tree";
import { fromZonedInput, toZonedInput } from "@/lib/admin/datetime";
import { discountPercent, formatPrice } from "@/lib/format";
import { cn, slugify } from "@/lib/utils";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Toggle } from "@/components/admin/toggle";
import { Button } from "@/components/ui/button";
import { Field, FieldError, Input, Label, Select, Textarea } from "@/components/ui/field";
import { ProductImagesEditor, type EditorImage } from "./product-images-editor";

export interface ProductFormInitial {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  sale_price: number | null;
  sale_ends_at: string | null;
  sku: string;
  stock: number;
  category_id: string | null;
  brand_id: string | null;
  status: "active" | "hidden";
  is_featured: boolean;
  specifications: { label: string; value: string }[];
  attribute_value_ids: string[];
  images: { id: string; url: string; storage_path: string | null; alt: string | null; width: number | null; height: number | null }[];
}

interface SpecRow {
  key: string;
  label: string;
  value: string;
}

interface FormState {
  title: string;
  slug: string;
  slugTouched: boolean;
  description: string;
  price: string;
  salePrice: string;
  saleEndsAt: string;
  sku: string;
  stock: string;
  categoryId: string;
  brandId: string;
  status: "active" | "hidden";
  isFeatured: boolean;
  specifications: SpecRow[];
  attributeValueIds: string[];
}

let keySeed = 0;
const nextKey = () => `k${++keySeed}`;

function initialState(product: ProductFormInitial | null, timeZone: string): FormState {
  return {
    title: product?.title ?? "",
    slug: product?.slug ?? "",
    slugTouched: Boolean(product),
    description: product?.description ?? "",
    price: product ? String(product.price) : "",
    salePrice: product?.sale_price != null ? String(product.sale_price) : "",
    saleEndsAt: toZonedInput(product?.sale_ends_at, timeZone),
    sku: product?.sku ?? "",
    stock: product ? String(product.stock) : "0",
    categoryId: product?.category_id ?? "",
    brandId: product?.brand_id ?? "",
    status: product?.status ?? "active",
    isFeatured: product?.is_featured ?? false,
    specifications: (product?.specifications ?? []).map((s, i) => ({ key: `s${i}`, label: s.label, value: s.value })),
    attributeValueIds: [...(product?.attribute_value_ids ?? [])].sort(),
  };
}

function initialImages(product: ProductFormInitial | null): EditorImage[] {
  return (product?.images ?? []).map((img) => ({
    key: img.id,
    id: img.id,
    url: img.url,
    storagePath: img.storage_path,
    alt: img.alt ?? "",
    width: img.width,
    height: img.height,
    status: "ready",
    isNew: false,
  }));
}

function snapshot(state: FormState, images: EditorImage[]) {
  return JSON.stringify({
    ...state,
    slugTouched: undefined,
    specifications: state.specifications.map(({ label, value }) => ({ label, value })),
    attributeValueIds: [...state.attributeValueIds].sort(),
    images: images.map((i) => [i.id ?? i.storagePath ?? i.key, i.alt]),
  });
}

export function ProductForm({
  product,
  categories,
  brands: initialBrands,
  attributes,
  timeZone,
  lowStockThreshold,
}: {
  product: ProductFormInitial | null;
  categories: CategoryLike[];
  brands: AdminBrand[];
  attributes: AdminAttribute[];
  timeZone: string;
  lowStockThreshold: number;
}) {
  const router = useRouter();
  const [state, setState] = useState<FormState>(() => initialState(product, timeZone));
  const [images, setImages] = useState<EditorImage[]>(() => initialImages(product));
  const [saved, setSaved] = useState(() => snapshot(initialState(product, timeZone), initialImages(product)));
  const [brands, setBrands] = useState(initialBrands);
  const [newBrand, setNewBrand] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const draftFolder = useRef<string | null>(null);

  const categoryOptions = useMemo(() => flattenCategories(categories), [categories]);
  const dirty = snapshot(state, images) !== saved;
  const uploading = images.some((i) => i.status === "uploading");

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setState((s) => ({ ...s, [key]: value }));
    if (error?.field === key) setError(null);
  };

  const price = Number(state.price);
  const sale = state.salePrice.trim() === "" ? null : Number(state.salePrice);
  const off = sale !== null && Number.isFinite(sale) && Number.isFinite(price) ? discountPercent(price, sale) : 0;
  const stock = Number(state.stock);

  function folder() {
    if (product) return `products/${product.id}`;
    draftFolder.current ??= `products/draft-${crypto.randomUUID()}`;
    return draftFolder.current;
  }

  function fieldError(field: string) {
    return error?.field === field ? error.message : undefined;
  }

  function submit() {
    setError(null);
    if (uploading) {
      toast.error("Wait for the photos to finish uploading.");
      return;
    }
    if (images.some((i) => i.status === "error")) {
      toast.error("Remove the photos that failed to upload, then save.");
      return;
    }
    if (state.price.trim() === "" || !Number.isFinite(price)) {
      setError({ message: "Enter a price.", field: "price" });
      return;
    }
    if (sale !== null && !Number.isFinite(sale)) {
      setError({ message: "Sale price must be a number.", field: "salePrice" });
      return;
    }
    if (!Number.isInteger(stock)) {
      setError({ message: "Stock must be a whole number.", field: "stock" });
      return;
    }

    const input: ProductInput = {
      id: product?.id,
      title: state.title,
      slug: state.slug || slugify(state.title),
      description: state.description,
      price,
      salePrice: sale,
      saleEndsAt: sale !== null && state.saleEndsAt ? fromZonedInput(state.saleEndsAt, timeZone) : null,
      sku: state.sku,
      stock,
      categoryId: state.categoryId || null,
      brandId: state.brandId || null,
      status: state.status,
      isFeatured: state.isFeatured,
      specifications: state.specifications
        .map(({ label, value }) => ({ label: label.trim(), value: value.trim() }))
        .filter((s) => s.label && s.value),
      attributeValueIds: state.attributeValueIds,
      images: images.map((i) => ({
        id: i.isNew ? undefined : i.id,
        url: i.url,
        storagePath: i.storagePath,
        alt: i.alt.trim() || null,
        width: i.width,
        height: i.height,
      })),
    };

    startTransition(async () => {
      const result = await saveProduct(input);
      if (!result.ok) {
        setError({ message: result.error, field: result.field });
        toast.error(result.error);
        return;
      }
      toast.success("Product saved");
      // Photos are now stored rows: track them by id so the next save doesn't add them twice.
      const savedImages: EditorImage[] = images.map((img, index) => {
        const row = result.data.images[index];
        return row ? { ...img, id: row.id, isNew: false } : img;
      });
      setImages(savedImages);
      setSaved(snapshot(state, savedImages));
      if (!product) {
        router.replace(`/admin/products/${result.data.id}`);
      } else {
        router.refresh();
      }
    });
  }

  function addBrand() {
    const name = newBrand?.trim();
    if (!name) return;
    startTransition(async () => {
      const result = await createBrand(name);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setBrands((prev) =>
        prev.some((b) => b.id === result.data.id) ? prev : [...prev, result.data].sort((a, b) => a.name.localeCompare(b.name)),
      );
      set("brandId", result.data.id);
      setNewBrand(null);
      toast.success(result.message ?? "Brand added");
    });
  }

  function toggleValue(id: string) {
    set(
      "attributeValueIds",
      state.attributeValueIds.includes(id) ? state.attributeValueIds.filter((v) => v !== id) : [...state.attributeValueIds, id],
    );
  }

  function moveSpec(index: number, to: number) {
    if (to < 0 || to >= state.specifications.length) return;
    const next = [...state.specifications];
    const [row] = next.splice(index, 1);
    next.splice(to, 0, row);
    set("specifications", next);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      noValidate
      className="pb-4"
    >
      {error && !error.field && (
        <p role="alert" className="mb-4 rounded-xl bg-flag-50 px-4 py-3 text-[14px] font-medium text-flag-600">
          {error.message}
        </p>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Section title="Basics">
            <div className="space-y-4">
              <Field label="Title" htmlFor="product-title" error={fieldError("title")}>
                <Input
                  id="product-title"
                  value={state.title}
                  maxLength={200}
                  onChange={(e) => {
                    const title = e.target.value;
                    setState((s) => ({ ...s, title, slug: s.slugTouched ? s.slug : slugify(title) }));
                    if (error?.field === "title") setError(null);
                  }}
                  aria-invalid={Boolean(fieldError("title"))}
                  placeholder="e.g. Samsung Galaxy A15, 128 GB, Black"
                  required
                />
              </Field>
              <Field
                label="Web address"
                htmlFor="product-slug"
                hint={`Shown as /p/${state.slug || slugify(state.title) || "…"}. Changing it breaks old links to this product.`}
                error={fieldError("slug")}
              >
                <Input
                  id="product-slug"
                  value={state.slug}
                  maxLength={160}
                  onChange={(e) => setState((s) => ({ ...s, slug: e.target.value, slugTouched: true }))}
                  onBlur={() => setState((s) => ({ ...s, slug: slugify(s.slug) }))}
                  className="font-mono text-[14px]"
                />
              </Field>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <Label htmlFor="product-description" className="mb-0">
                    Description
                  </Label>
                  <div className="flex rounded-lg bg-mist p-0.5 text-[12.5px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setPreview(false)}
                      className={cn("inline-flex items-center gap-1 rounded-md px-2.5 py-1", !preview ? "bg-white text-ink shadow-sm" : "text-muted")}
                    >
                      <Pencil className="size-3.5" /> Write
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreview(true)}
                      className={cn("inline-flex items-center gap-1 rounded-md px-2.5 py-1", preview ? "bg-white text-ink shadow-sm" : "text-muted")}
                    >
                      <Eye className="size-3.5" /> Preview
                    </button>
                  </div>
                </div>
                {preview ? (
                  <div className="prose-store min-h-40 rounded-xl border border-line bg-mist/40 px-4 py-3">
                    {state.description.trim() ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{state.description}</ReactMarkdown>
                    ) : (
                      <p className="text-muted">Nothing to preview yet.</p>
                    )}
                  </div>
                ) : (
                  <Textarea
                    id="product-description"
                    rows={9}
                    value={state.description}
                    onChange={(e) => set("description", e.target.value)}
                    placeholder={"What is it, who is it for, and what's included?\n\n- Use dashes for bullet points\n- **Bold** important details"}
                  />
                )}
                <p className="mt-1.5 text-[13px] text-muted">
                  Supports simple formatting: <code>**bold**</code>, <code>- bullet points</code>, <code>## headings</code>.
                </p>
              </div>
            </div>
          </Section>

          <Section title="Photos">
            <ProductImagesEditor images={images} onChange={setImages} folder={folder} />
          </Section>

          <Section
            title="Options and filters"
            description="Pick every size, colour or other option this product comes in. Attributes marked “Shopper picks one” become choices on the product page (e.g. choose a size); the others show in the specifications and the search filters."
          >
            {attributes.length === 0 ? (
              <p className="text-[14px] text-muted">
                No attributes yet.{" "}
                <Link href="/admin/attributes" className="font-semibold text-canopy hover:underline">
                  Add sizes, colours and filters
                </Link>
              </p>
            ) : (
              <div className="space-y-5">
                {attributes.map((attr) => {
                  const chosen = attr.values.filter((v) => state.attributeValueIds.includes(v.id)).length;
                  return (
                    <fieldset key={attr.id}>
                      <legend className="mb-2 flex flex-wrap items-center gap-2 text-[14px] font-semibold text-ink">
                        {attr.name}
                        {attr.is_option && (
                          <span className="rounded-full bg-gold-100 px-2 py-0.5 text-[11px] font-bold text-ink">Shopper picks one</span>
                        )}
                        {attr.is_filterable && (
                          <span className="rounded-full bg-canopy-50 px-2 py-0.5 text-[11px] font-bold text-canopy-700">Search filter</span>
                        )}
                        {chosen > 0 && <span className="text-[12px] font-normal text-muted">{chosen} selected</span>}
                      </legend>
                      {attr.values.length === 0 ? (
                        <p className="text-[13px] text-muted">
                          No values yet —{" "}
                          <Link href="/admin/attributes" className="font-semibold text-canopy hover:underline">
                            add some
                          </Link>
                          .
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {attr.values.map((v) => {
                            const on = state.attributeValueIds.includes(v.id);
                            return (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() => toggleValue(v.id)}
                                aria-pressed={on}
                                className={cn(
                                  "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-semibold transition",
                                  on ? "border-ink bg-ink text-white" : "border-line-strong bg-white text-text hover:border-ink",
                                )}
                              >
                                {attr.kind === "color" && (
                                  <span className="size-3.5 rounded-full ring-1 ring-black/20" style={{ background: v.color_hex ?? "#ddd" }} />
                                )}
                                {v.value}
                                {on && <Check className="size-3.5" strokeWidth={3} />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </fieldset>
                  );
                })}
              </div>
            )}
          </Section>

          <Section title="Specifications" description="Facts shoppers compare: material, dimensions, warranty, what's in the box.">
            {state.specifications.length > 0 && (
              <ul className="mb-3 space-y-2">
                {state.specifications.map((row, index) => (
                  <li key={row.key} className="flex items-center gap-2">
                    <Input
                      aria-label={`Specification ${index + 1} label`}
                      value={row.label}
                      maxLength={80}
                      placeholder="Label, e.g. Material"
                      onChange={(e) =>
                        set(
                          "specifications",
                          state.specifications.map((s) => (s.key === row.key ? { ...s, label: e.target.value } : s)),
                        )
                      }
                      className="h-10 w-[38%]"
                    />
                    <Input
                      aria-label={`Specification ${index + 1} value`}
                      value={row.value}
                      maxLength={300}
                      placeholder="Value, e.g. 100% cotton"
                      onChange={(e) =>
                        set(
                          "specifications",
                          state.specifications.map((s) => (s.key === row.key ? { ...s, value: e.target.value } : s)),
                        )
                      }
                      className="h-10 flex-1"
                    />
                    <IconButton label="Move up" onClick={() => moveSpec(index, index - 1)} disabled={index === 0}>
                      <ArrowUp className="size-4" />
                    </IconButton>
                    <IconButton
                      label="Move down"
                      onClick={() => moveSpec(index, index + 1)}
                      disabled={index === state.specifications.length - 1}
                    >
                      <ArrowDown className="size-4" />
                    </IconButton>
                    <IconButton
                      label="Remove"
                      danger
                      onClick={() => set("specifications", state.specifications.filter((s) => s.key !== row.key))}
                    >
                      <Trash2 className="size-4" />
                    </IconButton>
                  </li>
                ))}
              </ul>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => set("specifications", [...state.specifications, { key: nextKey(), label: "", value: "" }])}
            >
              <Plus className="size-4" /> Add specification
            </Button>
          </Section>
        </div>

        <div className="space-y-5">
          <Section title="Visibility">
            <div className="space-y-4">
              <Toggle
                checked={state.status === "active"}
                onChange={(on) => set("status", on ? "active" : "hidden")}
                label="Show in store"
                description={state.status === "active" ? "Shoppers can find and buy it." : "Hidden from shoppers. Only staff can see it."}
              />
              <Toggle
                checked={state.isFeatured}
                onChange={(on) => set("isFeatured", on)}
                label="Feature on homepage"
                description="Appears in “Picked for you” and ranks higher in listings."
              />
            </div>
          </Section>

          <Section title="Pricing">
            <div className="space-y-4">
              <Field label="Price (G$)" htmlFor="product-price" error={fieldError("price")}>
                <Input
                  id="product-price"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  value={state.price}
                  onChange={(e) => set("price", e.target.value)}
                  aria-invalid={Boolean(fieldError("price"))}
                  required
                />
              </Field>
              <Field
                label="Sale price (G$)"
                htmlFor="product-sale"
                hint={off > 0 ? `Shows as ${off}% off.` : "Optional. Leave empty when not on sale."}
                error={fieldError("salePrice")}
              >
                <Input
                  id="product-sale"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  value={state.salePrice}
                  onChange={(e) => set("salePrice", e.target.value)}
                  aria-invalid={Boolean(fieldError("salePrice"))}
                />
              </Field>
              {state.salePrice.trim() !== "" && (
                <Field
                  label="Sale ends"
                  htmlFor="product-sale-ends"
                  hint="Optional. Shows a countdown, and the regular price returns automatically."
                  error={fieldError("saleEndsAt")}
                >
                  <div className="flex gap-2">
                    <Input
                      id="product-sale-ends"
                      type="datetime-local"
                      value={state.saleEndsAt}
                      onChange={(e) => set("saleEndsAt", e.target.value)}
                    />
                    {state.saleEndsAt && (
                      <IconButton label="Clear end date" onClick={() => set("saleEndsAt", "")}>
                        <X className="size-4" />
                      </IconButton>
                    )}
                  </div>
                </Field>
              )}
              {Number.isFinite(price) && state.price !== "" && (
                <p className="rounded-lg bg-mist px-3 py-2 text-[13px] text-muted">
                  Shoppers pay{" "}
                  <strong className="text-ink">
                    {formatPrice(sale !== null && Number.isFinite(sale) && sale < price ? sale : price)}
                  </strong>
                  {off > 0 && <> instead of {formatPrice(price)}</>}
                </p>
              )}
            </div>
          </Section>

          <Section title="Inventory">
            <div className="space-y-4">
              <Field
                label="SKU"
                htmlFor="product-sku"
                hint={product ? "Your stock code. Used to match rows when importing a spreadsheet." : "Leave empty to create one automatically."}
                error={fieldError("sku")}
              >
                <Input
                  id="product-sku"
                  value={state.sku}
                  maxLength={64}
                  onChange={(e) => set("sku", e.target.value)}
                  className="font-mono text-[14px]"
                />
              </Field>
              <Field
                label="In stock"
                htmlFor="product-stock"
                hint={
                  stock === 0
                    ? "Shows as “Sold out” in the store."
                    : stock > 0 && stock <= lowStockThreshold
                      ? `Shows “Only ${stock} left”.`
                      : "Goes down automatically when orders are placed."
                }
                error={fieldError("stock")}
              >
                <Input
                  id="product-stock"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={state.stock}
                  onChange={(e) => set("stock", e.target.value)}
                  aria-invalid={Boolean(fieldError("stock"))}
                />
              </Field>
            </div>
          </Section>

          <Section title="Organisation">
            <div className="space-y-4">
              <Field label="Category" htmlFor="product-category" error={fieldError("categoryId")}>
                <Select id="product-category" value={state.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                  <option value="">No category</option>
                  {categoryOptions.map(({ category, path }) => (
                    <option key={category.id} value={category.id}>
                      {path}
                    </option>
                  ))}
                </Select>
              </Field>
              <div>
                <Label htmlFor="product-brand">Brand</Label>
                {newBrand === null ? (
                  <div className="flex gap-2">
                    <Select id="product-brand" value={state.brandId} onChange={(e) => set("brandId", e.target.value)}>
                      <option value="">No brand</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </Select>
                    <Button variant="outline" onClick={() => setNewBrand("")} aria-label="Add a new brand" className="h-11">
                      <Plus className="size-4" /> New
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      id="product-brand"
                      autoFocus
                      value={newBrand}
                      maxLength={80}
                      placeholder="New brand name"
                      onChange={(e) => setNewBrand(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addBrand();
                        } else if (e.key === "Escape") {
                          setNewBrand(null);
                        }
                      }}
                    />
                    <Button variant="dark" onClick={addBrand} disabled={pending || !newBrand.trim()} className="h-11">
                      Add
                    </Button>
                    <IconButton label="Cancel" onClick={() => setNewBrand(null)}>
                      <X className="size-4" />
                    </IconButton>
                  </div>
                )}
              </div>
            </div>
          </Section>

          {product && (
            <Section title="Danger zone">
              <p className="mb-3 text-[13px] text-muted">
                Deleting removes the product and its photos for good. Past orders keep their details. To stop selling it
                for now, turn off “Show in store” instead.
              </p>
              <ConfirmButton
                confirmLabel="Click again to delete"
                disabled={pending}
                onConfirm={() =>
                  startTransition(async () => {
                    const result = await deleteProduct(product.id);
                    if (!result.ok) {
                      toast.error(result.error);
                      return;
                    }
                    toast.success("Product deleted");
                    setSaved(snapshot(state, images));
                    router.replace("/admin/products");
                  })
                }
              >
                <Trash2 className="size-4" /> Delete product
              </ConfirmButton>
            </Section>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 mt-6 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={cn("text-[13.5px]", dirty ? "font-semibold text-ink" : "text-muted")}>
            {uploading ? "Uploading photos…" : dirty ? "You have unsaved changes" : product ? "All changes saved" : "New product"}
          </p>
          <div className="flex items-center gap-2">
            {product && state.status === "active" && (
              <Link
                href={`/p/${product.slug}`}
                target="_blank"
                className="inline-flex h-10 items-center gap-1.5 px-2 text-sm font-semibold text-canopy hover:underline"
              >
                View in store <ExternalLink className="size-3.5" />
              </Link>
            )}
            <Link href="/admin/products" className="inline-flex h-10 items-center px-3 text-sm font-semibold text-muted hover:text-ink">
              {dirty ? "Cancel" : "Back to products"}
            </Link>
            <Button type="submit" disabled={pending || uploading}>
              {pending ? "Saving…" : product ? "Save product" : "Create product"}
            </Button>
          </div>
        </div>
        {error?.field && <FieldError className="mt-1">{error.message}</FieldError>}
      </div>
    </form>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <h2 className="text-[15px] font-bold text-ink">{title}</h2>
      {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-muted transition disabled:opacity-30",
        danger ? "hover:bg-flag-50 hover:text-flag" : "hover:bg-mist hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
