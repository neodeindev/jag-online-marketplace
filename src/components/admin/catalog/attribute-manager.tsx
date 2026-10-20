"use client";

import { ArrowDown, ArrowUp, Palette, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  deleteAttribute,
  deleteAttributeValue,
  moveAttribute,
  moveAttributeValue,
  saveAttribute,
  saveAttributeValue,
} from "@/app/admin/attributes/actions";
import type { ActionResult } from "@/lib/action-result";
import type { AdminAttribute, AdminAttributeValue } from "@/lib/admin/catalog-admin";
import { cn } from "@/lib/utils";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Toggle } from "@/components/admin/toggle";
import { EmptyState, Pill } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Field, FieldError, Input, Select } from "@/components/ui/field";

type Kind = "select" | "color";

interface AttributeDraft {
  id?: string;
  name: string;
  kind: Kind;
  isFilterable: boolean;
  isOption: boolean;
}

function useRunner() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<ActionResult>, onDone?: () => void) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.message) toast.success(result.message);
      onDone?.();
      router.refresh();
    });
  return { pending, run };
}

export function AttributeManager({
  attributes,
  usage,
}: {
  attributes: AdminAttribute[];
  /** Products using each attribute value. */
  usage: Record<string, number>;
}) {
  const { pending, run } = useRunner();
  const [draft, setDraft] = useState<AttributeDraft | null>(null);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-line bg-white p-5 text-[13.5px] leading-relaxed text-muted">
        <p>
          Attributes describe products, like <strong className="text-ink">Size</strong> or{" "}
          <strong className="text-ink">Colour</strong>. Each one has two switches:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong className="text-ink">Show in filters</strong> — shoppers can narrow search results by it (e.g. only
            size M).
          </li>
          <li>
            <strong className="text-ink">Shopper picks one</strong> — on the product page, shoppers must choose one value
            before adding to cart (e.g. pick a size). The choice appears on the order.
          </li>
        </ul>
      </div>

      {attributes.length === 0 && !draft && (
        <div className="rounded-2xl border border-line bg-white">
          <EmptyState
            icon={<Palette className="size-9" />}
            title="No attributes yet"
            action={
              <Button onClick={() => setDraft({ name: "", kind: "select", isFilterable: true, isOption: false })}>
                Add attribute
              </Button>
            }
          >
            Add Size, Colour, Material or anything shoppers filter or choose by.
          </EmptyState>
        </div>
      )}

      {attributes.map((attribute, index) =>
        draft?.id === attribute.id ? (
          <AttributeForm
            key={attribute.id}
            draft={draft}
            setDraft={setDraft}
            pending={pending}
            onSave={() => run(() => saveAttribute(draft), () => setDraft(null))}
          />
        ) : (
          <section key={attribute.id} className="overflow-hidden rounded-2xl border border-line bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[16px] font-bold text-ink">{attribute.name}</h2>
                <Pill>{attribute.kind === "color" ? "Colour swatches" : "List"}</Pill>
                {attribute.is_filterable && <Pill tone="good">Show in filters</Pill>}
                {attribute.is_option && <Pill tone="warn">Shopper picks one</Pill>}
              </div>
              <div className="flex items-center gap-1">
                <IconBtn label="Move up" disabled={pending || index === 0} onClick={() => run(() => moveAttribute(attribute.id, "up"))}>
                  <ArrowUp className="size-4" />
                </IconBtn>
                <IconBtn
                  label="Move down"
                  disabled={pending || index === attributes.length - 1}
                  onClick={() => run(() => moveAttribute(attribute.id, "down"))}
                >
                  <ArrowDown className="size-4" />
                </IconBtn>
                <IconBtn
                  label={`Edit ${attribute.name}`}
                  onClick={() =>
                    setDraft({
                      id: attribute.id,
                      name: attribute.name,
                      kind: attribute.kind,
                      isFilterable: attribute.is_filterable,
                      isOption: attribute.is_option,
                    })
                  }
                >
                  <Pencil className="size-4" />
                </IconBtn>
                <ConfirmButton
                  variant="ghost"
                  confirmLabel="Delete it and its values?"
                  onConfirm={() => run(() => deleteAttribute(attribute.id))}
                  disabled={pending}
                  className="text-muted"
                >
                  <Trash2 className="size-4" />
                  <span className="sr-only">Delete {attribute.name}</span>
                </ConfirmButton>
              </div>
            </div>
            <ValuesEditor attribute={attribute} usage={usage} pending={pending} run={run} />
          </section>
        ),
      )}

      {draft && !draft.id ? (
        <AttributeForm
          draft={draft}
          setDraft={setDraft}
          pending={pending}
          onSave={() => run(() => saveAttribute(draft), () => setDraft(null))}
        />
      ) : (
        attributes.length > 0 && (
          <Button variant="outline" onClick={() => setDraft({ name: "", kind: "select", isFilterable: true, isOption: false })}>
            <Plus className="size-4" /> Add attribute
          </Button>
        )
      )}
    </div>
  );
}

function AttributeForm({
  draft,
  setDraft,
  pending,
  onSave,
}: {
  draft: AttributeDraft;
  setDraft: (d: AttributeDraft | null) => void;
  pending: boolean;
  onSave: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
      className="space-y-4 rounded-2xl border-2 border-canopy/40 bg-white p-5"
    >
      <h2 className="text-[16px] font-bold text-ink">{draft.id ? `Edit ${draft.name || "attribute"}` : "New attribute"}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="attribute-name">
          <Input
            id="attribute-name"
            autoFocus
            value={draft.name}
            maxLength={60}
            placeholder="e.g. Size, Colour, Material"
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </Field>
        <Field label="Shown as" htmlFor="attribute-kind">
          <Select id="attribute-kind" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as Kind })}>
            <option value="select">Text buttons (S, M, L…)</option>
            <option value="color">Colour swatches</option>
          </Select>
        </Field>
      </div>
      <div className="space-y-4 rounded-xl bg-mist/60 p-4">
        <Toggle
          checked={draft.isFilterable}
          onChange={(on) => setDraft({ ...draft, isFilterable: on })}
          label="Show in filters"
          description="Shoppers can narrow search and category results by these values."
        />
        <Toggle
          checked={draft.isOption}
          onChange={(on) => setDraft({ ...draft, isOption: on })}
          label="Shopper picks one"
          description="Shoppers must choose a value on the product page before adding to cart."
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending || !draft.name.trim()}>
          {pending ? "Saving…" : draft.id ? "Save attribute" : "Add attribute"}
        </Button>
        <Button variant="ghost" onClick={() => setDraft(null)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function ValuesEditor({
  attribute,
  usage,
  pending,
  run,
}: {
  attribute: AdminAttribute;
  usage: Record<string, number>;
  pending: boolean;
  run: (action: () => Promise<ActionResult>, onDone?: () => void) => void;
}) {
  const isColor = attribute.kind === "color";
  const [value, setValue] = useState("");
  const [hex, setHex] = useState("#1B1B1B");
  const [editing, setEditing] = useState<{ id: string; value: string; hex: string } | null>(null);

  return (
    <div className="p-5">
      {attribute.values.length === 0 ? (
        <p className="mb-4 text-[13.5px] text-muted">No values yet. Add the first one below.</p>
      ) : (
        <ul className="mb-4 divide-y divide-line rounded-xl border border-line">
          {attribute.values.map((v: AdminAttributeValue, index) => {
            const count = usage[v.id] ?? 0;
            const isEditing = editing?.id === v.id;
            return (
              <li key={v.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                {isEditing ? (
                  <form
                    className="flex flex-1 flex-wrap items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      run(
                        () =>
                          saveAttributeValue({
                            id: v.id,
                            attributeId: attribute.id,
                            value: editing.value,
                            colorHex: isColor ? editing.hex : null,
                          }),
                        () => setEditing(null),
                      );
                    }}
                  >
                    {isColor && <ColorInput value={editing.hex} onChange={(h) => setEditing({ ...editing, hex: h })} />}
                    <Input
                      autoFocus
                      value={editing.value}
                      maxLength={60}
                      aria-label="Value"
                      onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                      className="h-9 w-48"
                    />
                    <Button type="submit" size="sm" variant="dark" disabled={pending || !editing.value.trim()}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                      Cancel
                    </Button>
                  </form>
                ) : (
                  <>
                    {isColor && (
                      <span className="size-6 shrink-0 rounded-full ring-1 ring-black/15" style={{ background: v.color_hex ?? "#ddd" }} />
                    )}
                    <span className="font-semibold text-ink">{v.value}</span>
                    {isColor && <span className="font-mono text-[12px] text-muted">{v.color_hex}</span>}
                    <span className="text-[12.5px] text-muted">
                      {count} {count === 1 ? "product" : "products"}
                    </span>
                    <span className="ml-auto flex items-center gap-1">
                      <IconBtn label="Move up" disabled={pending || index === 0} onClick={() => run(() => moveAttributeValue(v.id, "up"))}>
                        <ArrowUp className="size-4" />
                      </IconBtn>
                      <IconBtn
                        label="Move down"
                        disabled={pending || index === attribute.values.length - 1}
                        onClick={() => run(() => moveAttributeValue(v.id, "down"))}
                      >
                        <ArrowDown className="size-4" />
                      </IconBtn>
                      <IconBtn
                        label={`Edit ${v.value}`}
                        onClick={() => setEditing({ id: v.id, value: v.value, hex: v.color_hex ?? "#1B1B1B" })}
                      >
                        <Pencil className="size-4" />
                      </IconBtn>
                      <ConfirmButton
                        variant="ghost"
                        confirmLabel={count > 0 ? `Remove from ${count} products?` : "Click again to delete"}
                        onConfirm={() => run(() => deleteAttributeValue(v.id))}
                        disabled={pending}
                        className="text-muted"
                      >
                        <Trash2 className="size-4" />
                        <span className="sr-only">Delete {v.value}</span>
                      </ConfirmButton>
                    </span>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () => saveAttributeValue({ attributeId: attribute.id, value, colorHex: isColor ? hex : null }),
            () => setValue(""),
          );
        }}
      >
        {isColor && <ColorInput value={hex} onChange={setHex} />}
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={60}
          placeholder={isColor ? "Colour name, e.g. Navy" : "New value, e.g. XL"}
          aria-label={`New ${attribute.name} value`}
          className="h-10 w-56"
        />
        <Button type="submit" variant="outline" disabled={pending || !value.trim()}>
          <Plus className="size-4" /> Add value
        </Button>
      </form>
    </div>
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const valid = /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    <span className="inline-flex items-center gap-1.5">
      <input
        type="color"
        value={valid ? value : "#000000"}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        aria-label="Pick colour"
        className="h-10 w-11 cursor-pointer rounded-lg border border-line-strong bg-white p-1"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`)}
        maxLength={7}
        aria-label="Colour code"
        className={cn(
          "h-10 w-24 rounded-lg border bg-white px-2 font-mono text-[13px] uppercase outline-none focus:border-canopy",
          valid ? "border-line-strong" : "border-flag",
        )}
      />
      {!valid && <FieldError className="mt-0">Use #RRGGBB</FieldError>}
    </span>
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
      className="inline-flex size-8 items-center justify-center rounded-lg text-muted transition hover:bg-mist hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
