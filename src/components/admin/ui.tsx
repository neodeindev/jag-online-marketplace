import { Lock } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/format";
import type { OrderStatus, PaymentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Shared building blocks for dashboard pages. */

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6">
      {back && (
        <Link href={back.href} className="mb-2 inline-block text-[13px] font-semibold text-canopy hover:underline">
          ← {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="display-tight text-[26px] font-extrabold leading-tight text-ink">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-[14px] text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-line bg-white", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            {title && <h2 className="text-[15px] font-bold text-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full border-collapse text-left text-[14px]", className)} {...props} />
    </div>
  );
}

export function Th({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "whitespace-nowrap border-b border-line bg-mist/60 px-4 py-2.5 text-[12px] font-bold uppercase tracking-wide text-muted first:pl-5 last:pr-5",
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("border-b border-line px-4 py-3 align-middle first:pl-5 last:pr-5", className)} {...props} />;
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {icon && <span className="mb-3 text-subtle">{icon}</span>}
      <p className="font-bold text-ink">{title}</p>
      {children && <div className="mt-1 max-w-md text-sm text-muted">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function NoAccess({ section }: { section: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white">
      <EmptyState icon={<Lock className="size-9" />} title={`You don't have access to ${section}`}>
        Ask the store owner to add this section to your staff permissions.
      </EmptyState>
    </div>
  );
}

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-gold-100 text-ink",
  confirmed: "bg-[#dbeafe] text-[#1e3a8a]",
  processing: "bg-[#ede9fe] text-[#4c1d95]",
  ready_for_pickup: "bg-canopy-100 text-canopy-700",
  out_for_delivery: "bg-canopy-100 text-canopy-700",
  delivered: "bg-canopy text-white",
  cancelled: "bg-flag-50 text-flag-600",
};

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span className={cn("inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-[12px] font-bold", STATUS_STYLES[status], className)}>
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

const PAYMENT_STYLES: Record<PaymentStatus, string> = {
  unpaid: "border-line-strong text-muted",
  paid: "border-canopy/40 bg-canopy-50 text-canopy-700",
  refunded: "border-flag/30 text-flag-600",
};

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={cn("inline-flex h-6 items-center whitespace-nowrap rounded-full border px-2.5 text-[12px] font-semibold", PAYMENT_STYLES[status])}>
      {PAYMENT_STATUS_LABELS[status]}
    </span>
  );
}

export function Pill({ tone = "neutral", children }: { tone?: "neutral" | "good" | "warn" | "bad"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-[12px] font-semibold",
        tone === "neutral" && "bg-mist text-muted",
        tone === "good" && "bg-canopy-50 text-canopy-700",
        tone === "warn" && "bg-gold-100 text-ink",
        tone === "bad" && "bg-flag-50 text-flag-600",
      )}
    >
      {children}
    </span>
  );
}

/** Link-based tabs, e.g. order status filters. */
export function FilterTabs({ tabs }: { tabs: { href: string; label: string; count?: number; active: boolean }[] }) {
  return (
    <nav className="scrollbar-none -mx-1 mb-4 flex gap-1 overflow-x-auto px-1">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.active ? "page" : undefined}
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-[13.5px] font-semibold transition",
            t.active ? "bg-ink text-white" : "bg-white text-muted ring-1 ring-line hover:text-ink",
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span className={cn("rounded-full px-1.5 text-[11px] tabular-nums", t.active ? "bg-white/20" : "bg-mist")}>{t.count}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}

export function SimplePagination({ page, pages, href }: { page: number; pages: number; href: (page: number) => string }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3 text-[13px] text-muted">
      <span>
        Page {page} of {pages}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className="rounded-lg border border-line-strong bg-white px-3 py-1.5 font-semibold text-ink hover:border-ink">
            Previous
          </Link>
        ) : null}
        {page < pages ? (
          <Link href={href(page + 1)} className="rounded-lg border border-line-strong bg-white px-3 py-1.5 font-semibold text-ink hover:border-ink">
            Next
          </Link>
        ) : null}
      </div>
    </div>
  );
}
