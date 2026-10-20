import type { Metadata } from "next";
import { Suspense } from "react";
import { getDeliveryZones, getStoreSettings } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/server";
import { CheckoutForm, type CheckoutProfile } from "@/components/checkout/checkout-form";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <div className="container-page pt-6">
      <Suspense fallback={<CheckoutSkeleton />}>
        <Checkout />
      </Suspense>
    </div>
  );
}

async function Checkout() {
  const [settings, zones, profile] = await Promise.all([getStoreSettings(), getDeliveryZones(), getProfile()]);
  const methods = [
    settings.cash_on_delivery_enabled && "cash_on_delivery",
    settings.bank_transfer_enabled && "bank_transfer",
    settings.mmg_enabled && "mmg",
  ].filter((m): m is "cash_on_delivery" | "bank_transfer" | "mmg" => Boolean(m));

  return (
    <CheckoutForm
      zones={zones}
      methods={methods}
      freeDeliveryThreshold={settings.free_delivery_threshold}
      bankInstructions={settings.bank_transfer_instructions}
      mmgInstructions={settings.mmg_instructions}
      profile={profile}
    />
  );
}

async function getProfile(): Promise<CheckoutProfile | null> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return null;
  const { data } = await supabase
    .from("profiles")
    .select("full_name, phone, email, address_line, city, delivery_zone_id")
    .eq("id", userId)
    .maybeSingle();
  return data
    ? {
        name: data.full_name ?? "",
        phone: data.phone ?? "",
        email: data.email ?? "",
        address: data.address_line ?? "",
        city: data.city ?? "",
        zoneId: data.delivery_zone_id ?? "",
      }
    : null;
}

function CheckoutSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="skeleton h-56 w-full rounded-[20px]" />
        ))}
      </div>
      <div className="skeleton h-80 w-full rounded-[20px]" />
    </div>
  );
}
