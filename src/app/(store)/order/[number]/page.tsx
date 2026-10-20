import { CheckCircle2, Copy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getStoreSettings } from "@/lib/catalog";
import { paymentInstructions } from "@/lib/email/templates";
import { formatPrice, whatsappLink } from "@/lib/format";
import { getOrderWithToken, normalizeOrder } from "@/lib/orders";
import { createClient } from "@/lib/supabase/server";
import type { OrderView } from "@/lib/types";
import { WhatsAppIcon } from "@/components/brand/whatsapp-icon";
import { OrderDetails } from "@/components/orders/order-details";
import { OrderTimeline } from "@/components/orders/order-timeline";
import { ButtonLink } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };

export default function OrderPage(props: PageProps<"/order/[number]">) {
  return (
    <div className="container-page pt-6">
      <Suspense fallback={<div className="skeleton h-96 w-full rounded-[20px]" />}>
        <Order params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function loadOrder(number: string, token: string | undefined): Promise<OrderView | null> {
  if (token && /^[0-9a-f-]{36}$/i.test(token)) {
    const order = await getOrderWithToken(number, token);
    if (order) return order;
  }
  // Signed-in customers (and staff) can open their orders without the token.
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_order", { p_order_number: number });
  return data ? normalizeOrder(data) : null;
}

async function Order({ params, searchParams }: Pick<PageProps<"/order/[number]">, "params" | "searchParams">) {
  const { number } = await params;
  const query = await searchParams;
  const token = typeof query.token === "string" ? query.token : undefined;
  const isNew = query.new === "1";

  const [order, settings] = await Promise.all([loadOrder(decodeURIComponent(number), token), getStoreSettings()]);
  if (!order) notFound();

  const instructions = paymentInstructions(order, settings);
  const needsPayment = order.payment_status === "unpaid" && order.payment_method !== "cash_on_delivery" && order.status !== "cancelled";
  const proof = whatsappLink(
    settings.whatsapp_number,
    `Hi ${settings.store_name}, here is my payment for order ${order.order_number} (${formatPrice(order.total)}).`,
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[20px] bg-white p-5 shadow-card sm:p-8">
        {isNew ? (
          <div className="mb-6 flex items-start gap-4">
            <CheckCircle2 className="size-11 shrink-0 text-canopy" />
            <div>
              <h1 className="display text-[26px] font-black leading-tight text-ink sm:text-[32px]">
                Thank you, {order.customer_name.split(" ")[0]}!
              </h1>
              <p className="mt-1 text-muted">
                Your order is in. We&apos;ll call or WhatsApp {order.customer_phone ?? "you"} shortly to confirm{" "}
                {order.is_pickup ? "when it's ready for pickup" : "a delivery time"}.
                {order.customer_email && <> A receipt is on its way to {order.customer_email}.</>}
              </p>
            </div>
          </div>
        ) : (
          <h1 className="display mb-6 text-[26px] font-black text-ink">Order details</h1>
        )}

        <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-wider text-muted">Order number</p>
            <p className="flex items-center gap-2 font-mono text-xl font-bold text-ink">
              {order.order_number}
              <CopyButton value={order.order_number} label="Copy order number" icon={<Copy className="size-4" />} />
            </p>
          </div>
          <div>
            <p className="text-[12px] font-bold uppercase tracking-wider text-muted">Total</p>
            <p className="display text-xl font-black tabular-nums text-ink">{formatPrice(order.total)}</p>
          </div>
        </div>

        <OrderTimeline order={order} />
      </section>

      {needsPayment && instructions && (
        <section className="rounded-[20px] border-2 border-gold bg-gold-50 p-5 sm:p-6">
          <h2 className="display-tight text-lg font-extrabold text-ink">Complete your payment</h2>
          <p className="mt-1 text-[14px] text-ink/80">
            Send <strong>{formatPrice(order.total)}</strong> using order number <strong>{order.order_number}</strong> as the
            reference. We&apos;ll start preparing your order once it arrives.
          </p>
          <p className="mt-4 whitespace-pre-line rounded-xl bg-white p-4 text-[14px] leading-relaxed">{instructions}</p>
          {proof && (
            <a
              href={proof}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-[#25D366] px-5 font-bold text-ink transition hover:brightness-105"
            >
              <WhatsAppIcon className="size-5" /> Send proof of payment
            </a>
          )}
        </section>
      )}

      <OrderDetails order={order} />

      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/">Continue shopping</ButtonLink>
        <ButtonLink href="/track-order" variant="outline">
          Track another order
        </ButtonLink>
        <Link href="/pages/contact" className="inline-flex h-10 items-center px-2 text-sm font-semibold text-canopy hover:underline">
          Need help with this order?
        </Link>
      </div>
    </div>
  );
}
