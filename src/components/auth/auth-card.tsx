import type { ReactNode } from "react";
import { ArrowheadMark } from "@/components/brand/arrowhead-mark";

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="container-page flex justify-center py-10 sm:py-16">
      <div className="w-full max-w-[440px]">
        <div className="rounded-[20px] bg-white p-6 shadow-card sm:p-8">
          <ArrowheadMark className="mb-4 text-[28px]" />
          <h1 className="display text-[26px] font-black leading-tight text-ink">{title}</h1>
          {subtitle && <p className="mt-1.5 text-[14px] text-muted">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-5 text-center text-[14px] text-muted">{footer}</div>}
      </div>
    </div>
  );
}

export function FormMessage({ state }: { state: { error?: string; message?: string } | null }) {
  if (!state) return null;
  if (state.error) {
    return (
      <p role="alert" className="rounded-xl bg-flag-50 px-4 py-3 text-[14px] font-medium text-flag-600">
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return <p className="rounded-xl bg-canopy-50 px-4 py-3 text-[14px] font-medium text-canopy-700">{state.message}</p>;
  }
  return null;
}
