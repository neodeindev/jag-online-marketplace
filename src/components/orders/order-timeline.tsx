import { Check, X } from "lucide-react";
import { ORDER_STATUS_LABELS, formatDateTime } from "@/lib/format";
import type { OrderStatus, OrderView } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Progress from "Order placed" to "Delivered", with the time each step happened. */
export function OrderTimeline({ order }: { order: Pick<OrderView, "status" | "is_pickup" | "timeline"> }) {
  if (order.status === "cancelled") {
    const when = order.timeline.find((t) => t.status === "cancelled")?.created_at;
    return (
      <div className="flex items-center gap-3 rounded-xl bg-flag-50 p-4 text-flag-600">
        <span className="inline-flex size-9 items-center justify-center rounded-full bg-flag text-white">
          <X className="size-5" strokeWidth={3} />
        </span>
        <div>
          <p className="font-bold">This order was cancelled</p>
          {when && <p className="text-sm">{formatDateTime(when)}</p>}
        </div>
      </div>
    );
  }

  const steps: OrderStatus[] = order.is_pickup
    ? ["pending", "confirmed", "processing", "ready_for_pickup", "delivered"]
    : ["pending", "confirmed", "processing", "out_for_delivery", "delivered"];
  const reached = steps.indexOf(order.status);
  const timeFor = (s: OrderStatus) => [...order.timeline].reverse().find((t) => t.status === s)?.created_at;

  return (
    <ol className="grid gap-0 sm:grid-cols-5">
      {steps.map((step, i) => {
        const done = i <= reached;
        const current = i === reached;
        const time = timeFor(step);
        const label = step === "delivered" && order.is_pickup ? "Collected" : ORDER_STATUS_LABELS[step];
        return (
          <li key={step} className="relative flex gap-3 pb-5 sm:flex-col sm:items-center sm:pb-0 sm:text-center">
            {i < steps.length - 1 && (
              <span
                className={cn(
                  "absolute left-[17px] top-9 h-[calc(100%-36px)] w-0.5 sm:left-[calc(50%+18px)] sm:top-[17px] sm:h-0.5 sm:w-[calc(100%-36px)]",
                  i < reached ? "bg-canopy" : "bg-line",
                )}
                aria-hidden
              />
            )}
            <span
              className={cn(
                "relative z-10 inline-flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold",
                done ? "border-canopy bg-canopy text-white" : "border-line bg-white text-subtle",
                current && "ring-4 ring-canopy/20",
              )}
            >
              {done ? <Check className="size-4" strokeWidth={3} /> : i + 1}
            </span>
            <span className="pt-1.5 sm:pt-2">
              <span className={cn("block text-[13.5px] font-semibold", done ? "text-ink" : "text-muted")}>{label}</span>
              {time && done && <span className="block text-[12px] text-muted">{formatDateTime(time)}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
