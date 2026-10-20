"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";

/**
 * A button that asks for a second click instead of a browser confirm() box.
 * First click arms it ("Click again to delete"); it disarms after 4 seconds.
 */
export function ConfirmButton({
  onConfirm,
  children,
  confirmLabel,
  variant = "danger-outline",
  size = "sm",
  disabled,
  className,
}: {
  onConfirm: () => void;
  children: ReactNode;
  confirmLabel: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const id = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(id);
  }, [armed]);

  return (
    <Button
      variant={armed ? "danger" : variant}
      size={size}
      disabled={disabled}
      className={className}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else {
          setArmed(true);
        }
      }}
    >
      {armed ? confirmLabel : children}
    </Button>
  );
}
