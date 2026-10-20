"use client";

import { ArrowDown, ArrowUp, FolderTree, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteCategory, moveCategory, saveCategory } from "@/app/admin/categories/actions";
import type { AdminCategory } from "@/lib/admin/catalog-admin";
import { flattenCategories, subtreeIds } from "@/lib/admin/category-tree";
import { cn, slugify } from "@/lib/utils";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Toggle } from "@/components/admin/toggle";
import { EmptyState, Pill } from "@/components/admin/ui";
import { ProductImage } from "@/components/store/product-image";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { SingleImageField } from "./single-image-field";

interface Draft {
  id?: string;
  name: string;
  slug: string;
  slugTouched: boolean;
  parentId: string;
  description: string;
  imageUrl: string | null;
  isActive: boolean;
  isFeatured: boolean;
}

const emptyDraft = (parentId = ""): Draft => ({
  name: "",
  slug: "",
  slugTouched: false,
  parentId,
  description: "",
  imageUrl: null,
  isActive: true,
  isFeatured: false,
});

export function CategoryManager({
  categories,
  productCounts,
}: {
  categories: AdminCategory[];
  productCounts: Record<string, number>;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const flat = useMemo(() => flattenCategories(categories), [categories]);

  // Siblings in display order, to know which rows can move up or down.
  const siblingIndex = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const { category } of flat) {
      const key = category.parent_id ?? "root";
      groups.set(key, [...(groups.get(key) ?? []), category.id]);
    }
    const info = new Map<string, { index: number; size: number }>();
    for (const ids of groups.values()) ids.forEach((id, index) => info.set(id, { index, size: ids.length }));
    return info;
  }, [flat]);

  function open(category?: AdminCategory, parentId?: string) {
    setError(null);
    setDraft(
      category
        ? {
            id: category.id,
            name: category.name,
            slug: category.slug,
            slugTouched: true,
            parentId: category.parent_id ?? "",
            description: category.description ?? "",
            imageUrl: category.image_url,
            isActive: category.is_active,
            isFeatured: category.is_featured,
          }
        : emptyDraft(parentId),
    );
  }

  function save() {
    if (!draft) return;
    startTransition(async () => {
      const result = await saveCategory({
        id: draft.id,
        name: draft.name,
        slug: draft.slug || slugify(draft.name),
        parentId: draft.parentId || null,
        description: draft.description,
        imageUrl: draft.imageUrl,
        isActive: draft.isActive,
        isFeatured: draft.isFeatured,
      });
      if (!result.ok) {
        setError({ message: result.error, field: result.field });
        toast.error(result.error);
        return;
      }
      toast.success("Category saved");
      setDraft(null);
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteCategory(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Category deleted");
      router.refresh();
    });
  }

  function move(id: string, direction: "up" | "down") {
    startTransition(async () => {
      const result = await moveCategory(id, direction);
      if (!result.ok) toast.error(result.error);
      else router.refresh();
    });
  }

  // A category can't move under itself or anything inside it.
  const blocked = draft?.id ? new Set(subtreeIds(categories, draft.id)) : new Set<string>();
  const fieldError = (f: string) => (error?.field === f ? error.message : undefined);

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => open()}>
          <Plus className="size-4" /> Add category
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        {flat.length === 0 ? (
          <EmptyState icon={<FolderTree className="size-9" />} title="No categories yet" action={<Button onClick={() => open()}>Add your first category</Button>}>
            Categories organise the store menu and filters, e.g. Fashion › Women › Dresses.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {flat.map(({ category, depth }) => {
              const count = productCounts[category.id] ?? 0;
              const pos = siblingIndex.get(category.id) ?? { index: 0, size: 1 };
              const hasChildren = categories.some((c) => c.parent_id === category.id);
              return (
                <li key={category.id} className={cn("flex items-center gap-3 py-2.5 pr-4 hover:bg-mist/50", !category.is_active && "opacity-60")}>
                  <div className="flex flex-1 items-center gap-3" style={{ paddingLeft: 20 + depth * 28 }}>
                    {depth > 0 && <span className="-ml-4 h-px w-3 bg-line-strong" aria-hidden />}
                    <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-[#f3f5f4]">
                      {category.image_url && <ProductImage src={category.image_url} alt="" sizes="40px" className="p-1" />}
                    </span>
                    <div className="min-w-0">
                      <p className={cn("truncate text-ink", depth === 0 ? "font-bold" : "font-semibold")}>{category.name}</p>
                      <p className="truncate text-[12.5px] text-muted">
                        /c/{category.slug} ·{" "}
                        <Link href={`/admin/products?category=${category.id}`} className="hover:text-canopy hover:underline">
                          {count} {count === 1 ? "product" : "products"}
                        </Link>
                      </p>
                    </div>
                    <div className="hidden flex-wrap gap-1.5 sm:flex">
                      {!category.is_active && <Pill>Hidden</Pill>}
                      {category.is_featured && <Pill tone="warn">On homepage</Pill>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <IconBtn label={`Move ${category.name} up`} onClick={() => move(category.id, "up")} disabled={pending || pos.index === 0}>
                      <ArrowUp className="size-4" />
                    </IconBtn>
                    <IconBtn
                      label={`Move ${category.name} down`}
                      onClick={() => move(category.id, "down")}
                      disabled={pending || pos.index === pos.size - 1}
                    >
                      <ArrowDown className="size-4" />
                    </IconBtn>
                    <IconBtn label={`Add a sub-category to ${category.name}`} onClick={() => open(undefined, category.id)}>
                      <Plus className="size-4" />
                    </IconBtn>
                    <IconBtn label={`Edit ${category.name}`} onClick={() => open(category)}>
                      <Pencil className="size-4" />
                    </IconBtn>
                    {hasChildren ? (
                      <span title="Move or delete its sub-categories first" className="inline-flex size-9 items-center justify-center text-line-strong">
                        <Trash2 className="size-4" />
                      </span>
                    ) : (
                      <ConfirmButton
                        variant="ghost"
                        size="sm"
                        confirmLabel={count > 0 ? `Delete? ${count} products become uncategorised` : "Click again to delete"}
                        onConfirm={() => remove(category.id)}
                        disabled={pending}
                        className="text-muted"
                      >
                        <Trash2 className="size-4" />
                        <span className="sr-only">Delete {category.name}</span>
                      </ConfirmButton>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Sheet
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Edit category" : "Add category"}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={pending || !draft?.name.trim()}>
              {pending ? "Saving…" : "Save category"}
            </Button>
          </div>
        }
      >
        {draft && (
          <form
            className="space-y-4 px-5 py-5"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            {error && !error.field && <p className="rounded-lg bg-flag-50 px-3 py-2 text-sm text-flag-600">{error.message}</p>}
            <Field label="Name" htmlFor="category-name" error={fieldError("name")}>
              <Input
                id="category-name"
                autoFocus
                value={draft.name}
                maxLength={80}
                onChange={(e) =>
                  setDraft((d) => d && { ...d, name: e.target.value, slug: d.slugTouched ? d.slug : slugify(e.target.value) })
                }
              />
            </Field>
            <Field label="Web address" htmlFor="category-slug" hint={`Shown as /c/${draft.slug || "…"}`} error={fieldError("slug")}>
              <Input
                id="category-slug"
                value={draft.slug}
                maxLength={100}
                className="font-mono text-[14px]"
                onChange={(e) => setDraft((d) => d && { ...d, slug: e.target.value, slugTouched: true })}
                onBlur={() => setDraft((d) => d && { ...d, slug: slugify(d.slug) })}
              />
            </Field>
            <Field label="Inside" htmlFor="category-parent" hint="Leave as top level for a main department." error={fieldError("parentId")}>
              <Select
                id="category-parent"
                value={draft.parentId}
                onChange={(e) => setDraft((d) => d && { ...d, parentId: e.target.value })}
              >
                <option value="">Top level</option>
                {flat
                  .filter(({ category }) => !blocked.has(category.id))
                  .map(({ category, path }) => (
                    <option key={category.id} value={category.id}>
                      {path}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label="Description" htmlFor="category-description" hint="Optional. Shown under the title on the category page and used by search engines.">
              <Textarea
                id="category-description"
                rows={3}
                maxLength={500}
                value={draft.description}
                onChange={(e) => setDraft((d) => d && { ...d, description: e.target.value })}
              />
            </Field>
            <SingleImageField
              value={draft.imageUrl}
              onChange={(url) => setDraft((d) => d && { ...d, imageUrl: url })}
              bucket="site-assets"
              folder="categories"
              label="Photo"
              hint="Optional. Shown in the round category shortcuts. Without one, a product photo is used."
            />
            <div className="space-y-4 rounded-xl border border-line p-4">
              <Toggle
                checked={draft.isActive}
                onChange={(on) => setDraft((d) => d && { ...d, isActive: on })}
                label="Show in store menu"
                description="When off, the category is hidden from menus and filters. Its products stay searchable."
              />
              <Toggle
                checked={draft.isFeatured}
                onChange={(on) => setDraft((d) => d && { ...d, isFeatured: on })}
                label="Show on homepage"
                description="Adds it to the round category shortcuts at the top of the homepage."
              />
            </div>
            <button type="submit" className="hidden" />
          </form>
        )}
      </Sheet>
    </>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="inline-flex size-9 items-center justify-center rounded-lg text-muted transition hover:bg-mist hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
