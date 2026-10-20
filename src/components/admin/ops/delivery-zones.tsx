"use client";

import { PackageCheck, Plus, Truck } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteZone, saveZone } from "@/app/admin/delivery/actions";
import { formatPrice } from "@/lib/format";
import type { DeliveryZone } from "@/lib/types";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Toggle } from "@/components/admin/toggle";
import { EmptyState, Pill, Table, Td, Th } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";

interface ZoneForm {
  id?: string;
  name: string;
  description: string;
  fee: string;
  estimatedDays: string;
  isPickup: boolean;
  isActive: boolean;
  sortOrder: string;
}

const blank = (sortOrder: number): ZoneForm => ({
  name: "",
  description: "",
  fee: "",
  estimatedDays: "",
  isPickup: false,
  isActive: true,
  sortOrder: String(sortOrder),
});

export function DeliveryZonesManager({ zones, freeThreshold }: { zones: DeliveryZone[]; freeThreshold: number | null }) {
  const [editing, setEditing] = useState<ZoneForm | null>(null);
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const open = (zone?: DeliveryZone) => {
    setError(null);
    setEditing(
      zone
        ? {
            id: zone.id,
            name: zone.name,
            description: zone.description ?? "",
            fee: String(zone.fee),
            estimatedDays: zone.estimated_days ?? "",
            isPickup: zone.is_pickup,
            isActive: zone.is_active,
            sortOrder: String(zone.sort_order),
          }
        : blank(zones.length ? Math.max(...zones.map((z) => z.sort_order)) + 1 : 0),
    );
  };

  const set = <K extends keyof ZoneForm>(key: K, value: ZoneForm[K]) =>
    setEditing((f) => (f ? { ...f, [key]: value } : f));
  const fieldError = (key: string) => (error?.field === key ? error.message : undefined);

  function submit() {
    if (!editing) return;
    const fee = editing.isPickup ? 0 : Number(editing.fee.replace(/[^\d.]/g, ""));
    if (!editing.isPickup && (editing.fee.trim() === "" || !Number.isFinite(fee))) {
      setError({ message: "Enter the delivery fee in GYD (use 0 for free).", field: "fee" });
      return;
    }
    startTransition(async () => {
      const result = await saveZone({
        id: editing.id,
        name: editing.name,
        description: editing.description,
        fee,
        estimatedDays: editing.estimatedDays,
        isPickup: editing.isPickup,
        isActive: editing.isActive,
        sortOrder: Math.max(0, Math.min(999, Math.round(Number(editing.sortOrder) || 0))),
      });
      if (!result.ok) {
        setError({ message: result.error, field: result.field });
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Saved");
      setEditing(null);
    });
  }

  return (
    <>
      <div className="flex justify-end border-b border-line px-5 py-3">
        <Button onClick={() => open()}>
          <Plus className="size-4" /> Add delivery area
        </Button>
      </div>

      {zones.length === 0 ? (
        <EmptyState icon={<Truck className="size-9" />} title="No delivery areas">
          Customers can&apos;t check out until you add at least one area or store pickup.
        </EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Area</Th>
              <Th className="text-right">Fee</Th>
              <Th>Delivery time</Th>
              <Th>Status</Th>
              <Th>
                <span className="sr-only">Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {zones.map((z) => (
              <tr key={z.id} className={z.is_active ? "" : "opacity-60"}>
                <Td>
                  <p className="flex items-center gap-2 font-semibold text-ink">
                    {z.is_pickup ? <PackageCheck className="size-4 text-canopy" /> : <Truck className="size-4 text-muted" />}
                    {z.name}
                  </p>
                  {z.description && <p className="text-[12.5px] text-muted">{z.description}</p>}
                </Td>
                <Td className="text-right font-semibold tabular-nums">{z.fee > 0 ? formatPrice(z.fee) : "Free"}</Td>
                <Td className="text-muted">{z.estimated_days ?? "—"}</Td>
                <Td>
                  <Pill tone={z.is_active ? "good" : "neutral"}>{z.is_active ? "Offered" : "Turned off"}</Pill>
                </Td>
                <Td className="text-right">
                  <Button variant="outline" size="sm" onClick={() => open(z)}>
                    Edit
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {freeThreshold !== null && (
        <p className="px-5 py-3 text-[13px] text-muted">
          Orders over {formatPrice(freeThreshold)} get free delivery to every area. Change this in Settings.
        </p>
      )}

      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id ? "Edit delivery area" : "New delivery area"}
        footer={
          <div className="flex items-center gap-2">
            <Button onClick={submit} disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            {editing?.id && (
              <span className="ml-auto">
                <ConfirmButton
                  confirmLabel="Click again to delete"
                  disabled={pending}
                  onConfirm={() =>
                    startTransition(async () => {
                      const result = await deleteZone(editing.id!);
                      if (!result.ok) {
                        toast.error(result.error);
                        return;
                      }
                      toast.success(result.message ?? "Deleted");
                      setEditing(null);
                    })
                  }
                >
                  Delete
                </ConfirmButton>
              </span>
            )}
          </div>
        }
      >
        {editing && (
          <form
            className="space-y-4 px-5 py-5"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            {error && !error.field && <p className="rounded-lg bg-flag-50 px-3 py-2 text-[13px] text-flag-600">{error.message}</p>}
            <Field label="Name" htmlFor="zone-name" hint="What customers see at checkout, e.g. East Coast Demerara" error={fieldError("name")}>
              <Input id="zone-name" value={editing.name} onChange={(e) => set("name", e.target.value)} maxLength={80} />
            </Field>
            <Field label="Areas covered" htmlFor="zone-description" hint="Optional, e.g. Better Hope to Mahaica" error={fieldError("description")}>
              <Input id="zone-description" value={editing.description} onChange={(e) => set("description", e.target.value)} maxLength={240} />
            </Field>
            <Toggle
              label="This is store pickup"
              description="Customers collect the order themselves. No address is asked for and there's no fee."
              checked={editing.isPickup}
              onChange={(v) => set("isPickup", v)}
            />
            {!editing.isPickup && (
              <Field label="Delivery fee (GYD)" htmlFor="zone-fee" error={fieldError("fee")}>
                <Input
                  id="zone-fee"
                  inputMode="numeric"
                  value={editing.fee}
                  onChange={(e) => set("fee", e.target.value)}
                  placeholder="1500"
                  aria-invalid={Boolean(fieldError("fee"))}
                />
              </Field>
            )}
            <Field label="Delivery time" htmlFor="zone-days" hint="Shown at checkout, e.g. 1–2 business days" error={fieldError("estimatedDays")}>
              <Input id="zone-days" value={editing.estimatedDays} onChange={(e) => set("estimatedDays", e.target.value)} maxLength={60} />
            </Field>
            <Field label="Order in list" htmlFor="zone-order" hint="Lower numbers are listed first.">
              <Input
                id="zone-order"
                type="number"
                min={0}
                max={999}
                value={editing.sortOrder}
                onChange={(e) => set("sortOrder", e.target.value)}
                className="w-28"
              />
            </Field>
            <Toggle
              label="Offer this area at checkout"
              checked={editing.isActive}
              onChange={(v) => set("isActive", v)}
            />
            <button type="submit" className="hidden" />
          </form>
        )}
      </Sheet>
    </>
  );
}
