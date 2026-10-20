"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveOrderNotes, setPaymentStatus, updateOrderStatus } from "@/app/admin/orders/actions";
import type { ActionResult } from "@/lib/action-result";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/format";
import type { OrderStatus, PaymentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";

function report(result: ActionResult) {
  if (result.ok) toast.success(result.message ?? "Saved");
  else toast.error(result.error);
}

export function OrderStatusForm({
  orderId,
  status,
  isPickup,
  hasEmail,
}: {
  orderId: string;
  status: OrderStatus;
  isPickup: boolean;
  hasEmail: boolean;
}) {
  const [next, setNext] = useState<OrderStatus>(status);
  const [note, setNote] = useState("");
  const [notify, setNotify] = useState(hasEmail);
  const [pending, startTransition] = useTransition();

  if (status === "cancelled") {
    return (
      <p className="rounded-xl bg-flag-50 p-4 text-[14px] text-flag-600">
        This order was cancelled and its items went back into stock. Cancelled orders can&apos;t be reopened — ask the
        customer to order again.
      </p>
    );
  }

  const options: OrderStatus[] = [
    "pending",
    "confirmed",
    "processing",
    isPickup ? "ready_for_pickup" : "out_for_delivery",
    "delivered",
    "cancelled",
  ];
  if (!options.includes(status)) options.splice(3, 0, status);

  const changed = next !== status;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await updateOrderStatus({ orderId, status: next, note, notify: hasEmail && notify });
          report(result);
          if (result.ok) setNote("");
        });
      }}
    >
      <Field label="Status" htmlFor="order-status">
        <Select id="order-status" value={next} onChange={(e) => setNext(e.target.value as OrderStatus)}>
          {options.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABELS[s]}
              {s === status ? " (current)" : ""}
            </option>
          ))}
        </Select>
      </Field>
      {next === "cancelled" && changed && (
        <p className="rounded-lg bg-flag-50 px-3 py-2 text-[13px] text-flag-600">
          Cancelling returns every item to stock and can&apos;t be undone.
        </p>
      )}
      <Field
        label="Note"
        htmlFor="order-note"
        hint={notify && hasEmail ? "Included in the email to the customer." : "Saved to the order history."}
      >
        <Textarea
          id="order-note"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={1000}
          placeholder={changed ? "Optional — e.g. driver will call before arriving" : "Add a note to the history"}
        />
      </Field>
      {hasEmail ? (
        <label className="flex items-center gap-2.5 text-[14px]">
          <Checkbox checked={notify} onChange={(e) => setNotify(e.target.checked)} />
          Email the customer about this update
        </label>
      ) : (
        <p className="text-[13px] text-muted">No email on this order — contact the customer by phone or WhatsApp.</p>
      )}
      <Button
        type="submit"
        variant={next === "cancelled" ? "danger" : "dark"}
        className="w-full"
        disabled={pending || (!changed && !note.trim())}
      >
        {pending
          ? "Saving…"
          : changed
            ? next === "cancelled"
              ? "Cancel order"
              : `Mark as ${ORDER_STATUS_LABELS[next].toLowerCase()}`
            : "Add note"}
      </Button>
    </form>
  );
}

export function PaymentStatusButtons({ orderId, status }: { orderId: string; status: PaymentStatus }) {
  const [pending, startTransition] = useTransition();
  const choices: PaymentStatus[] = ["unpaid", "paid", "refunded"];
  return (
    <div className="grid grid-cols-3 gap-1 rounded-xl bg-mist p-1" role="group" aria-label="Payment status">
      {choices.map((choice) => (
        <button
          key={choice}
          type="button"
          disabled={pending || choice === status}
          aria-pressed={choice === status}
          onClick={() =>
            startTransition(async () => {
              report(await setPaymentStatus({ orderId, paymentStatus: choice }));
            })
          }
          className={cn(
            "h-9 rounded-lg text-[13px] font-semibold transition",
            choice === status
              ? choice === "paid"
                ? "bg-canopy text-white"
                : choice === "refunded"
                  ? "bg-flag text-white"
                  : "bg-white text-ink shadow-sm"
              : "text-muted hover:bg-white/70 hover:text-ink",
          )}
        >
          {PAYMENT_STATUS_LABELS[choice]}
        </button>
      ))}
    </div>
  );
}

export function OrderNotesForm({
  orderId,
  paymentReference,
  adminNotes,
}: {
  orderId: string;
  paymentReference: string | null;
  adminNotes: string | null;
}) {
  const [reference, setReference] = useState(paymentReference ?? "");
  const [notes, setNotes] = useState(adminNotes ?? "");
  const [pending, startTransition] = useTransition();
  const dirty = reference !== (paymentReference ?? "") || notes !== (adminNotes ?? "");

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => report(await saveOrderNotes({ orderId, paymentReference: reference, adminNotes: notes })));
      }}
    >
      <Field label="Payment reference" htmlFor="order-reference" hint="Bank or MMG transaction ID from the customer's receipt">
        <Input id="order-reference" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={200} />
      </Field>
      <Field label="Internal notes" htmlFor="order-admin-notes" hint="Only staff can see these.">
        <Textarea id="order-admin-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={4000} />
      </Field>
      <Button type="submit" variant="outline" disabled={pending || !dirty}>
        {pending ? "Saving…" : "Save notes"}
      </Button>
    </form>
  );
}
