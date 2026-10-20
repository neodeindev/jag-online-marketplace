"use client";

import { BadgePercent, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteBrand, saveBrand } from "@/app/admin/brands/actions";
import type { AdminBrand } from "@/lib/admin/catalog-admin";
import { slugify } from "@/lib/utils";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { EmptyState, Table, Td, Th } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { FieldError, Input } from "@/components/ui/field";

export function BrandManager({ brands, productCounts }: { brands: AdminBrand[]; productCounts: Record<string, number> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [newName, setNewName] = useState("");
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visible = brands.filter((b) => b.name.toLowerCase().includes(filter.trim().toLowerCase()));

  function add() {
    const name = newName.trim();
    if (!name) return;
    startTransition(async () => {
      const result = await saveBrand({ name, slug: slugify(name) });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Brand added");
      setNewName("");
      router.refresh();
    });
  }

  function saveEdit() {
    if (!editing) return;
    setError(null);
    startTransition(async () => {
      const result = await saveBrand(editing);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Brand saved");
      setEditing(null);
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteBrand(id);
      if (!result.ok) toast.error(result.error);
      else {
        toast.success("Brand deleted");
        router.refresh();
      }
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-4">
        <form
          className="flex flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={80}
            placeholder="New brand name"
            aria-label="New brand name"
            className="h-10 max-w-xs"
          />
          <Button type="submit" disabled={pending || !newName.trim()}>
            <Plus className="size-4" /> Add brand
          </Button>
        </form>
        {brands.length > 8 && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
            <Input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Find a brand"
              aria-label="Find a brand"
              className="h-10 w-56 pl-9"
            />
          </div>
        )}
      </div>

      {brands.length === 0 ? (
        <EmptyState icon={<BadgePercent className="size-9" />} title="No brands yet">
          Brands appear on product pages and as a filter in search. Add them here or while editing a product.
        </EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Brand</Th>
              <Th>Web address</Th>
              <Th className="text-right">Products</Th>
              <Th className="w-40 text-right">
                <span className="sr-only">Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {visible.map((brand) => {
              const count = productCounts[brand.id] ?? 0;
              const isEditing = editing?.id === brand.id;
              return (
                <tr key={brand.id} className="hover:bg-mist/50">
                  {isEditing ? (
                    <>
                      <Td>
                        <Input
                          autoFocus
                          value={editing.name}
                          maxLength={80}
                          aria-label="Brand name"
                          onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit();
                            if (e.key === "Escape") setEditing(null);
                          }}
                          className="h-9"
                        />
                        {error && <FieldError>{error}</FieldError>}
                      </Td>
                      <Td>
                        <Input
                          value={editing.slug}
                          maxLength={100}
                          aria-label="Web address"
                          onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                          onBlur={() => setEditing({ ...editing, slug: slugify(editing.slug) })}
                          className="h-9 font-mono text-[13px]"
                        />
                      </Td>
                      <Td className="text-right tabular-nums">{count}</Td>
                      <Td className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="dark" onClick={saveEdit} disabled={pending || !editing.name.trim()}>
                            Save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                            Cancel
                          </Button>
                        </div>
                      </Td>
                    </>
                  ) : (
                    <>
                      <Td className="font-semibold text-ink">{brand.name}</Td>
                      <Td className="font-mono text-[12.5px] text-muted">/search?brand={brand.slug}</Td>
                      <Td className="text-right tabular-nums">{count}</Td>
                      <Td className="text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setError(null);
                              setEditing({ id: brand.id, name: brand.name, slug: brand.slug });
                            }}
                            aria-label={`Rename ${brand.name}`}
                            className="inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-mist hover:text-ink"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <ConfirmButton
                            variant="ghost"
                            confirmLabel={count > 0 ? `Delete? ${count} products lose this brand` : "Click again to delete"}
                            onConfirm={() => remove(brand.id)}
                            disabled={pending}
                            className="text-muted"
                          >
                            <Trash2 className="size-4" />
                            <span className="sr-only">Delete {brand.name}</span>
                          </ConfirmButton>
                        </div>
                      </Td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
