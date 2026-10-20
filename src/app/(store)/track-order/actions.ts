"use server";

import { normalizeOrder } from "@/lib/orders";
import { createPublicClient } from "@/lib/supabase/public";
import type { OrderView } from "@/lib/types";

export type TrackState = { order: OrderView | null; error: string | null; submitted: boolean };

export async function trackOrder(_prev: TrackState, formData: FormData): Promise<TrackState> {
  const number = String(formData.get("order") ?? "").trim().toUpperCase().slice(0, 40);
  const contact = String(formData.get("contact") ?? "").trim().slice(0, 120);
  if (!number || !contact) {
    return { order: null, error: "Enter your order number and the phone or email you used at checkout.", submitted: true };
  }
  const { data, error } = await createPublicClient().rpc("track_order", { p_order_number: number, p_contact: contact });
  if (error || !data) {
    return {
      order: null,
      error: "We couldn't find an order with those details. Check the order number (e.g. JAG-100045) and try again.",
      submitted: true,
    };
  }
  return { order: normalizeOrder(data), error: null, submitted: true };
}
