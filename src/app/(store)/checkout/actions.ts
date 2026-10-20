"use server";

import { revalidateTag } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { CACHE_TAGS } from "@/lib/catalog";
import { getOrderWithToken, sendNewOrderEmails } from "@/lib/orders";
import { createClient } from "@/lib/supabase/server";

const checkoutSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(120),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine((v) => v.replace(/\D/g, "").length >= 7, "Enter a phone number we can reach you on."),
  email: z.union([z.literal(""), z.email("Check the email address — it doesn't look complete.")]),
  zoneId: z.uuid("Choose a delivery area."),
  address: z.string().trim().max(300),
  city: z.string().trim().max(120),
  notes: z.string().trim().max(500),
  paymentMethod: z.enum(["cash_on_delivery", "bank_transfer", "mmg"], { message: "Choose how you'd like to pay." }),
  items: z
    .array(
      z.object({
        productId: z.uuid(),
        quantity: z.number().int().min(1).max(99),
        options: z.record(z.string(), z.string()),
      }),
    )
    .min(1, "Your cart is empty.")
    .max(50, "Orders can include up to 50 different items."),
  saveDetails: z.boolean(),
  // Spam trap: real shoppers never see or fill this field.
  website: z.string().max(0).optional(),
});

export type CheckoutInput = z.input<typeof checkoutSchema>;

export type CheckoutResult =
  | { ok: true; orderNumber: string; token: string }
  | { ok: false; error: string; field?: string };

export async function placeOrder(input: CheckoutInput): Promise<CheckoutResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Check your details and try again.", field: issue?.path[0]?.toString() };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const { data: result, error } = await supabase.rpc("place_order", {
    p_payload: {
      customer: { name: data.name, email: data.email, phone: data.phone },
      delivery: { zone_id: data.zoneId, address_line: data.address, city: data.city, notes: data.notes },
      payment_method: data.paymentMethod,
      items: data.items.map((i) => ({ product_id: i.productId, quantity: i.quantity, options: i.options })),
    },
  });

  if (error) {
    // Messages raised by place_order() are written for shoppers; anything else isn't.
    const friendly = error.code === "P0001";
    if (!friendly) console.error("[checkout] place_order failed:", error);
    return {
      ok: false,
      error: friendly ? error.message : "We couldn't place your order just now. Please try again in a moment.",
    };
  }

  const placed = result as { order_number: string; access_token: string };

  // Remember checkout details for next time.
  if (data.saveDetails) {
    const { data: claims } = await supabase.auth.getClaims();
    const userId = claims?.claims?.sub;
    if (userId) {
      await supabase
        .from("profiles")
        .update({
          full_name: data.name,
          phone: data.phone,
          address_line: data.address || null,
          city: data.city || null,
          delivery_zone_id: data.zoneId,
        })
        .eq("id", userId);
    }
  }

  // Stock changed: let product pages refresh in the background.
  revalidateTag(CACHE_TAGS.catalog, "max");

  after(async () => {
    const order = await getOrderWithToken(placed.order_number, placed.access_token);
    if (order) await sendNewOrderEmails(order);
  });

  return { ok: true, orderNumber: placed.order_number, token: placed.access_token };
}
