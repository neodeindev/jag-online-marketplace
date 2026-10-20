"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { fail, type ActionResult } from "@/lib/action-result";
import { authorize } from "@/lib/auth";
import { CACHE_TAGS } from "@/lib/catalog";
import { ORDER_STATUS_LABELS } from "@/lib/format";
import { normalizeOrder, sendStatusEmail } from "@/lib/orders";
import { inputFailure, parseInput } from "@/lib/admin/validate";

const statusSchema = z.object({
  orderId: z.uuid(),
  status: z.enum(["pending", "confirmed", "processing", "ready_for_pickup", "out_for_delivery", "delivered", "cancelled"]),
  note: z.string().trim().max(1000),
  notify: z.boolean(),
});

/** Moves an order to a new status, logs it, and optionally emails the customer. */
export async function updateOrderStatus(input: z.input<typeof statusSchema>): Promise<ActionResult> {
  try {
    const data = parseInput(statusSchema, input);
    const { supabase } = await authorize("orders");

    const { data: before, error: readError } = await supabase
      .from("orders")
      .select("status")
      .eq("id", data.orderId)
      .single();
    if (readError) throw readError;
    const previous = (before as { status: string }).status;

    if (previous === data.status && !data.note) {
      return { ok: false, error: "Choose a different status or add a note." };
    }

    const { data: updated, error } = await supabase.rpc("admin_update_order", {
      p_order_id: data.orderId,
      p_status: data.status,
      p_note: data.note || undefined,
      p_customer_notified: data.notify,
    });
    if (error) throw error;

    // Cancelling puts the items back in stock, so storefront stock counts change.
    if (previous !== data.status && (data.status === "cancelled" || previous === "cancelled")) {
      updateTag(CACHE_TAGS.catalog);
    }

    let message = previous !== data.status ? `Order marked ${ORDER_STATUS_LABELS[data.status].toLowerCase()}` : "Note added";
    if (data.notify) {
      const order = normalizeOrder(updated);
      const sent = await sendStatusEmail(order, data.status, data.note || null);
      message += sent.sent ? " · Customer emailed" : ` · Email not sent (${sent.reason.toLowerCase()})`;
    }

    refresh();
    return { ok: true, message };
  } catch (error) {
    return inputFailure(error, fail);
  }
}

const paymentSchema = z.object({
  orderId: z.uuid(),
  paymentStatus: z.enum(["unpaid", "paid", "refunded"]),
});

export async function setPaymentStatus(input: z.input<typeof paymentSchema>): Promise<ActionResult> {
  try {
    const data = parseInput(paymentSchema, input);
    const { supabase } = await authorize("orders");
    const { error } = await supabase.rpc("admin_update_order", {
      p_order_id: data.orderId,
      p_payment_status: data.paymentStatus,
    });
    if (error) throw error;
    refresh();
    return { ok: true, message: `Payment marked ${data.paymentStatus}` };
  } catch (error) {
    return inputFailure(error, fail);
  }
}

const notesSchema = z.object({
  orderId: z.uuid(),
  paymentReference: z.string().trim().max(200),
  adminNotes: z.string().trim().max(4000),
});

/** Internal fields that customers never see. */
export async function saveOrderNotes(input: z.input<typeof notesSchema>): Promise<ActionResult> {
  try {
    const data = parseInput(notesSchema, input);
    const { supabase } = await authorize("orders");
    const { error } = await supabase
      .from("orders")
      .update({ payment_reference: data.paymentReference || null, admin_notes: data.adminNotes || null })
      .eq("id", data.orderId);
    if (error) throw error;
    refresh();
    return { ok: true, message: "Notes saved" };
  } catch (error) {
    return inputFailure(error, fail);
  }
}
