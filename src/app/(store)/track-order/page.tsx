import type { Metadata } from "next";
import { TrackOrderForm } from "@/components/orders/track-order-form";

export const metadata: Metadata = {
  title: "Track your order",
  description: "Check the status of your order with your order number and phone or email.",
};

export default function TrackOrderPage() {
  return (
    <div className="container-page max-w-4xl pt-8">
      <h1 className="display text-[30px] font-black text-ink">Track your order</h1>
      <p className="mt-1 text-muted">
        Enter the order number from your confirmation, plus the phone number or email you used at checkout.
      </p>
      <TrackOrderForm />
    </div>
  );
}
