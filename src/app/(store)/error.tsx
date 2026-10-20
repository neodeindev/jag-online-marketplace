"use client";

import { RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";

export default function StoreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container-page flex flex-col items-center py-20 text-center">
      <h1 className="display text-[28px] font-black text-ink">This page didn&apos;t load</h1>
      <p className="mt-2 max-w-md text-muted">
        It&apos;s usually a brief connection problem. Try again — your cart is saved on this device.
      </p>
      <div className="mt-6 flex gap-2">
        <Button onClick={reset}>
          <RefreshCw className="size-4" /> Try again
        </Button>
        <ButtonLink href="/" variant="outline">
          Go to homepage
        </ButtonLink>
      </div>
      {error.digest && <p className="mt-6 font-mono text-[12px] text-subtle">Reference: {error.digest}</p>}
    </div>
  );
}
