"use client";

import { Printer } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/** Prints the page; opens the print dialog automatically once when `auto` is set. */
export function PrintButton({ auto = false }: { auto?: boolean }) {
  useEffect(() => {
    if (!auto) return;
    const id = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(id);
  }, [auto]);

  return (
    <Button variant="dark" onClick={() => window.print()} className="no-print">
      <Printer className="size-4" /> Print
    </Button>
  );
}
