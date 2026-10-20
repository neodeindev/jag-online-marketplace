import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const inputClasses =
  "w-full rounded-xl border border-line-strong bg-white px-3.5 text-[15px] text-text placeholder:text-subtle " +
  "transition-[border-color,box-shadow] outline-none focus:border-canopy focus:ring-[3px] focus:ring-canopy/15 " +
  "disabled:bg-mist disabled:text-muted aria-[invalid=true]:border-flag aria-[invalid=true]:ring-flag/15";

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("mb-1.5 block text-sm font-semibold text-ink", className)} {...props} />;
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputClasses, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(inputClasses, "min-h-24 py-2.5 leading-relaxed", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        inputClasses,
        "h-11 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%235b6b65%22 stroke-width=%222.5%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:12px] bg-[right_14px_center] bg-no-repeat pr-9",
        className,
      )}
      {...props}
    />
  );
}

export function FieldHint({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("mt-1.5 text-[13px] text-muted", className)} {...props} />;
}

export function FieldError({ children, className }: { children?: ReactNode; className?: string }) {
  if (!children) return null;
  return (
    <p role="alert" className={cn("mt-1.5 text-[13px] font-medium text-flag", className)}>
      {children}
    </p>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  className,
  children,
}: {
  label: ReactNode;
  htmlFor: string;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <FieldError>{error}</FieldError> : hint ? <FieldHint>{hint}</FieldHint> : null}
    </div>
  );
}

export function Checkbox({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      type="checkbox"
      className={cn(
        "size-[18px] shrink-0 rounded-[5px] border-line-strong accent-canopy align-middle",
        className,
      )}
      {...props}
    />
  );
}
