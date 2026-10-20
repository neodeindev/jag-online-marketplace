"use client";

import { useSyncExternalStore } from "react";
import type { ProductCardData } from "./types";

const KEY = "jag-recently-viewed";
const LIMIT = 16;
const EMPTY: ProductCardData[] = [];

let cachedRaw: string | null = null;
let cached: ProductCardData[] = EMPTY;
const listeners = new Set<() => void>();

function parse(raw: string | null): ProductCardData[] {
  try {
    const value: unknown = JSON.parse(raw ?? "[]");
    return Array.isArray(value)
      ? value.filter((v): v is ProductCardData => Boolean(v && typeof v === "object" && "slug" in v && "id" in v))
      : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function readRecentlyViewed(): ProductCardData[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parse(raw);
  }
  return cached;
}

export function rememberViewed(product: ProductCardData) {
  try {
    const next = [product, ...readRecentlyViewed().filter((p) => p.id !== product.id)].slice(0, LIMIT);
    window.localStorage.setItem(KEY, JSON.stringify(next));
    for (const l of listeners) l();
  } catch {
    // Storage unavailable: nothing to remember.
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** This device's recently viewed products (empty during server rendering). */
export function useRecentlyViewed(): ProductCardData[] {
  return useSyncExternalStore(subscribe, readRecentlyViewed, () => EMPTY);
}
