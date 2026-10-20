"use client";

import { createContext, use, type ReactNode } from "react";

/** The few store settings client components need (delivery threshold, WhatsApp). */
export interface StoreConfig {
  storeName: string;
  whatsappNumber: string | null;
  freeDeliveryThreshold: number | null;
  contactPhone: string | null;
}

const StoreConfigContext = createContext<StoreConfig | null>(null);

export function StoreConfigProvider({ value, children }: { value: StoreConfig; children: ReactNode }) {
  return <StoreConfigContext value={value}>{children}</StoreConfigContext>;
}

export function useStoreConfig(): StoreConfig {
  const value = use(StoreConfigContext);
  if (!value) throw new Error("useStoreConfig must be used inside <StoreConfigProvider>");
  return value;
}
