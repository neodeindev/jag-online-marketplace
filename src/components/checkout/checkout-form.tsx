"use client";

import { AlertCircle, Banknote, Check, Landmark, Lock, PackageCheck, ShoppingBag, Smartphone, Truck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { placeOrder, type CheckoutInput } from "@/app/(store)/checkout/actions";
import { cart, cartTotals } from "@/lib/cart-store";
import { PAYMENT_METHOD_LABELS, formatPrice } from "@/lib/format";
import { deliveryFeeFor } from "@/lib/pricing";
import type { DeliveryZone, PaymentMethod } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useFreshCart } from "@/components/cart/cart-view";
import { useSession } from "@/components/providers/session-provider";
import { ProductImage } from "@/components/store/product-image";
import { Button, ButtonLink } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";

export interface CheckoutProfile {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  zoneId: string;
}

const METHOD_DETAILS: Record<PaymentMethod, { icon: ReactNode; text: string }> = {
  cash_on_delivery: { icon: <Banknote className="size-5" />, text: "Pay cash when your order arrives." },
  bank_transfer: { icon: <Landmark className="size-5" />, text: "Transfer from any local bank. We'll send the details." },
  mmg: { icon: <Smartphone className="size-5" />, text: "Pay with Mobile Money Guyana." },
};

export function CheckoutForm({
  zones,
  methods,
  freeDeliveryThreshold,
  bankInstructions,
  mmgInstructions,
  profile,
}: {
  zones: DeliveryZone[];
  methods: PaymentMethod[];
  freeDeliveryThreshold: number | null;
  bankInstructions: string | null;
  mmgInstructions: string | null;
  profile: CheckoutProfile | null;
}) {
  const router = useRouter();
  const { userId } = useSession();
  const { items, checked } = useFreshCart();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);

  // Bring a new error into view once it has rendered; on phones the button is far below the message.
  useEffect(() => {
    if (!error) return;
    document
      .getElementById(error.field ? `checkout-${error.field}` : "checkout-error")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [error]);
  const [placed, setPlaced] = useState(false);

  const [form, setForm] = useState({
    name: profile?.name ?? "",
    phone: profile?.phone ?? "",
    email: profile?.email ?? "",
    zoneId: profile?.zoneId && zones.some((z) => z.id === profile.zoneId) ? profile.zoneId : "",
    address: profile?.address ?? "",
    city: profile?.city ?? "",
    notes: "",
    paymentMethod: (methods[0] ?? "") as PaymentMethod | "",
    saveDetails: true,
    website: "",
  });
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (error?.field === key) setError(null);
  };

  const zone = zones.find((z) => z.id === form.zoneId) ?? null;
  const { count, subtotal } = cartTotals(items);
  const fee = deliveryFeeFor(zone, subtotal, freeDeliveryThreshold);
  const total = subtotal + fee;

  if (items.length === 0 && !placed) {
    return (
      <div className="flex flex-col items-center rounded-[20px] bg-white px-6 py-16 text-center shadow-card">
        <ShoppingBag className="mb-3 size-10 text-subtle" />
        <h1 className="display text-2xl font-black text-ink">Your cart is empty</h1>
        <p className="mt-1 text-muted">Add something to your cart, then come back here to check out.</p>
        <ButtonLink href="/search" className="mt-6">
          Browse products
        </ButtonLink>
      </div>
    );
  }

  function submit() {
    setError(null);
    if (!form.zoneId) return setError({ message: "Choose a delivery area.", field: "zoneId" });
    if (!form.paymentMethod) return setError({ message: "Choose how you'd like to pay.", field: "paymentMethod" });

    const payload: CheckoutInput = {
      name: form.name,
      phone: form.phone,
      email: form.email.trim(),
      zoneId: form.zoneId,
      address: zone?.is_pickup ? "" : form.address,
      city: zone?.is_pickup ? "" : form.city,
      notes: form.notes,
      paymentMethod: form.paymentMethod,
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, options: i.options })),
      saveDetails: Boolean(userId) && form.saveDetails,
      website: form.website || undefined,
    };

    startTransition(async () => {
      const result = await placeOrder(payload);
      if (!result.ok) {
        setError({ message: result.error, field: result.field });
        toast.error(result.error);
        return;
      }
      setPlaced(true);
      cart.clear();
      router.replace(`/order/${encodeURIComponent(result.orderNumber)}?token=${result.token}&new=1`);
    });
  }

  const fieldError = (name: string) => (error?.field === name ? error.message : undefined);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      noValidate
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]"
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="display text-[28px] font-black text-ink">Checkout</h1>
          {!userId && (
            <p className="text-sm text-muted">
              Have an account?{" "}
              <Link href="/login?next=/checkout" className="font-semibold text-canopy hover:underline">
                Sign in
              </Link>
            </p>
          )}
        </div>

        {error && !error.field && (
          <div id="checkout-error" role="alert" className="flex gap-3 rounded-xl bg-flag-50 p-4 text-[14px] text-flag-600">
            <AlertCircle className="mt-0.5 size-5 shrink-0" />
            <p className="font-medium">{error.message}</p>
          </div>
        )}

        <Step number={1} title="Your details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="checkout-name" error={fieldError("name")} className="sm:col-span-2">
              <Input
                id="checkout-name"
                autoComplete="name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                aria-invalid={Boolean(fieldError("name"))}
                required
              />
            </Field>
            <Field label="Phone / WhatsApp" htmlFor="checkout-phone" hint="We'll call to confirm your order." error={fieldError("phone")}>
              <Input
                id="checkout-phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                placeholder="+592 600 0000"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                aria-invalid={Boolean(fieldError("phone"))}
                required
              />
            </Field>
            <Field label="Email" htmlFor="checkout-email" hint="Optional — for your receipt." error={fieldError("email")}>
              <Input
                id="checkout-email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                aria-invalid={Boolean(fieldError("email"))}
              />
            </Field>
          </div>
          {/* Spam trap, hidden from people */}
          <div className="absolute -left-[9999px]" aria-hidden>
            <label>
              Website
              <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set("website", e.target.value)} />
            </label>
          </div>
        </Step>

        <Step number={2} title="Delivery">
          <fieldset id="checkout-zoneId">
            <legend className="mb-2 text-sm font-semibold text-ink">Where should we deliver?</legend>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {zones.map((z) => {
                const zoneFee = deliveryFeeFor(z, subtotal, freeDeliveryThreshold);
                return (
                  <OptionCard
                    key={z.id}
                    name="zone"
                    checked={form.zoneId === z.id}
                    onChange={() => set("zoneId", z.id)}
                    icon={z.is_pickup ? <PackageCheck className="size-5" /> : <Truck className="size-5" />}
                    title={z.name}
                    aside={zoneFee === 0 ? "Free" : formatPrice(zoneFee)}
                    description={[z.estimated_days, z.description].filter(Boolean).join(" · ")}
                  />
                );
              })}
            </div>
            {fieldError("zoneId") && <p className="mt-2 text-[13px] font-medium text-flag">{fieldError("zoneId")}</p>}
          </fieldset>

          {zone && !zone.is_pickup && (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field
                label="Street address"
                htmlFor="checkout-address"
                hint="House/lot number, street and any landmark"
                error={fieldError("address")}
                className="sm:col-span-2"
              >
                <Input
                  id="checkout-address"
                  autoComplete="street-address"
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  aria-invalid={Boolean(fieldError("address"))}
                  required
                />
              </Field>
              <Field label="Village / town" htmlFor="checkout-city" error={fieldError("city")}>
                <Input id="checkout-city" autoComplete="address-level2" value={form.city} onChange={(e) => set("city", e.target.value)} />
              </Field>
            </div>
          )}

          <Field label="Delivery notes" htmlFor="checkout-notes" hint="Optional — e.g. best time to call, gate colour" className="mt-4">
            <Textarea id="checkout-notes" rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} maxLength={500} />
          </Field>
        </Step>

        <Step number={3} title="Payment">
          <fieldset id="checkout-paymentMethod">
            <legend className="sr-only">Payment method</legend>
            <div className="grid gap-2.5">
              {methods.map((m) => (
                <OptionCard
                  key={m}
                  name="payment"
                  checked={form.paymentMethod === m}
                  onChange={() => set("paymentMethod", m)}
                  icon={METHOD_DETAILS[m].icon}
                  title={PAYMENT_METHOD_LABELS[m]}
                  description={METHOD_DETAILS[m].text}
                >
                  {form.paymentMethod === m && m !== "cash_on_delivery" && (m === "bank_transfer" ? bankInstructions : mmgInstructions) && (
                    <p className="mt-3 whitespace-pre-line rounded-lg bg-gold-50 p-3 text-[13px] leading-relaxed text-ink">
                      {m === "bank_transfer" ? bankInstructions : mmgInstructions}
                    </p>
                  )}
                </OptionCard>
              ))}
            </div>
            {fieldError("paymentMethod") && (
              <p className="mt-2 text-[13px] font-medium text-flag">{fieldError("paymentMethod")}</p>
            )}
          </fieldset>
          {userId && (
            <label className="mt-5 flex items-center gap-2.5 text-sm">
              <Checkbox checked={form.saveDetails} onChange={(e) => set("saveDetails", e.target.checked)} />
              Save these details for next time
            </label>
          )}
        </Step>
      </div>

      <aside className="lg:sticky lg:top-[140px] lg:self-start">
        <div className="rounded-[20px] bg-white p-5 shadow-card">
          <h2 className="display-tight mb-4 text-lg font-extrabold text-ink">
            Order summary <span className="text-sm font-medium text-muted">({count} items)</span>
          </h2>
          <ul className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
            {items.map((item) => (
              <li key={item.key} className="flex gap-3">
                <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-[#f3f5f4]">
                  <ProductImage src={item.image} alt="" sizes="56px" className="p-1" />
                  <span className="absolute -right-1 -top-1 inline-flex size-5 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-white">
                    {item.quantity}
                  </span>
                </span>
                <div className="min-w-0 flex-1 text-[13px]">
                  <p className="line-clamp-2 font-medium leading-snug">{item.title}</p>
                  {Object.keys(item.options).length > 0 && (
                    <p className="text-muted">{Object.entries(item.options).map(([k, v]) => `${k}: ${v}`).join(" · ")}</p>
                  )}
                </div>
                <span className="text-[13px] font-semibold tabular-nums">{formatPrice(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-[14px]">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">{zone?.is_pickup ? "Pickup" : "Delivery"}</dt>
              <dd className="tabular-nums">{!zone ? "Choose an area" : fee === 0 ? "Free" : formatPrice(fee)}</dd>
            </div>
          </dl>
          <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
            <span className="font-bold text-ink">Total</span>
            <span className="display text-[26px] font-black tabular-nums text-ink">{formatPrice(total)}</span>
          </div>
          <Button type="submit" size="lg" className="mt-4 w-full" disabled={pending || !checked || placed}>
            <Lock className="size-4" />
            {pending ? "Placing your order…" : `Place order · ${formatPrice(total)}`}
          </Button>
          <p className="mt-3 text-center text-[12px] leading-relaxed text-muted">
            By placing your order you agree to our{" "}
            <Link href="/pages/terms" className="underline">
              terms
            </Link>{" "}
            and{" "}
            <Link href="/pages/returns" className="underline">
              returns policy
            </Link>
            .
          </p>
        </div>
      </aside>
    </form>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <section className="relative rounded-[20px] bg-white p-5 shadow-card sm:p-6">
      <h2 className="mb-4 flex items-center gap-3 text-lg font-bold text-ink">
        <span className="display inline-flex size-8 items-center justify-center rounded-full bg-ink text-sm font-black text-gold">
          {number}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function OptionCard({
  name,
  checked,
  onChange,
  icon,
  title,
  aside,
  description,
  children,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  icon: ReactNode;
  title: string;
  aside?: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <label
      className={cn(
        "block cursor-pointer rounded-xl border-2 p-3.5 transition",
        checked ? "border-canopy bg-canopy-50/60" : "border-line hover:border-line-strong",
      )}
    >
      <span className="flex items-start gap-3">
        <input type="radio" name={name} checked={checked} onChange={onChange} className="sr-only" />
        <span
          className={cn(
            "mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full",
            checked ? "bg-canopy text-white" : "bg-mist text-muted",
          )}
        >
          {checked ? <Check className="size-5" strokeWidth={3} /> : icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="font-bold text-ink">{title}</span>
            {aside && <span className="shrink-0 text-sm font-bold tabular-nums text-ink">{aside}</span>}
          </span>
          {description && <span className="mt-0.5 block text-[13px] text-muted">{description}</span>}
        </span>
      </span>
      {children}
    </label>
  );
}
