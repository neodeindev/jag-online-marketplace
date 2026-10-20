"use client";

import type { ComponentProps } from "react";
import { Select } from "@/components/ui/field";

/** A select that submits its form as soon as the choice changes (for GET filter forms). */
export function AutoSubmitSelect(props: ComponentProps<"select">) {
  return <Select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />;
}
