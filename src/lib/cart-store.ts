"use client";

import { useSyncExternalStore } from "react";

/**
 * Shopping cart kept in localStorage so it survives refreshes without an
 * account. Prices here are for display only; checkout re-prices everything
 * on the server.
 */

export interface CartLine {
  key: string;
  productId: string;
  slug: string;
  title: string;
  image: string | null;
  price: number;
  compareAt: number;
  quantity: number;
  options: Record<string, string>;
  maxStock: number;
}

export type NewCartLine = Omit<CartLine, "key" | "quantity">;

export type CartRefresh = Pick<CartLine, "price" | "compareAt" | "maxStock" | "title" | "image" | "slug">;

const STORAGE_KEY = "jag-cart-v1";
export const MAX_LINE_QUANTITY = 99;
const EMPTY: CartLine[] = [];

let lines: CartLine[] = EMPTY;
let loaded = false;
let drawerOpen = false;
const listeners = new Set<() => void>();

export function lineKey(productId: string, options: Record<string, string>) {
  const sorted = Object.keys(options)
    .sort()
    .map((k) => `${k}=${options[k]}`)
    .join("&");
  return `${productId}::${sorted}`;
}

function isCartLine(value: unknown): value is CartLine {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.key === "string" && typeof v.productId === "string" && typeof v.quantity === "number";
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    lines = Array.isArray(parsed) ? parsed.filter(isCartLine) : EMPTY;
  } catch {
    lines = EMPTY;
  }
}

function emit() {
  for (const listener of listeners) listener();
}

function commit(next: CartLine[]) {
  lines = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private mode or storage full: the cart still works for this visit.
  }
  emit();
}

function onStorage(event: StorageEvent) {
  if (event.key !== STORAGE_KEY) return;
  loaded = false;
  load();
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

function clampQuantity(quantity: number, maxStock: number) {
  const ceiling = Math.max(0, Math.min(MAX_LINE_QUANTITY, maxStock));
  return Math.max(0, Math.min(Math.floor(quantity), ceiling));
}

export const cart = {
  /** Adds to the cart; returns the quantity actually added (stock may limit it). */
  add(item: NewCartLine, quantity = 1): number {
    load();
    const key = lineKey(item.productId, item.options);
    const existing = lines.find((l) => l.key === key);
    const before = existing?.quantity ?? 0;
    const after = clampQuantity(before + quantity, item.maxStock);
    if (after === before) return 0;
    const next = existing
      ? lines.map((l) => (l.key === key ? { ...l, ...item, key, quantity: after } : l))
      : [...lines, { ...item, key, quantity: after }];
    commit(next);
    return after - before;
  },
  setQuantity(key: string, quantity: number) {
    load();
    const next = lines
      .map((l) => (l.key === key ? { ...l, quantity: clampQuantity(quantity, l.maxStock) } : l))
      .filter((l) => l.quantity > 0);
    commit(next);
  },
  remove(key: string) {
    load();
    commit(lines.filter((l) => l.key !== key));
  },
  /** Current lines, for code outside React render (effects, handlers). */
  lines(): CartLine[] {
    load();
    return lines;
  },
  /** Applies fresh prices/stock from the server; `null` drops products that are no longer for sale. */
  refresh(updates: Map<string, CartRefresh | null>) {
    load();
    let changed = false;
    const next: CartLine[] = [];
    for (const line of lines) {
      const update = updates.get(line.productId);
      if (update === undefined) {
        next.push(line);
        continue;
      }
      if (update === null) {
        changed = true;
        continue;
      }
      const merged = { ...line, ...update };
      if (JSON.stringify(merged) !== JSON.stringify(line)) changed = true;
      next.push(merged);
    }
    if (changed) commit(next);
  },
  clear() {
    commit(EMPTY);
  },
  openDrawer() {
    drawerOpen = true;
    emit();
  },
  closeDrawer() {
    drawerOpen = false;
    emit();
  },
};

export function useCart(): CartLine[] {
  return useSyncExternalStore(
    subscribe,
    () => {
      load();
      return lines;
    },
    () => EMPTY,
  );
}

export function useCartDrawerOpen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => drawerOpen,
    () => false,
  );
}

export function cartTotals(items: CartLine[]) {
  let count = 0;
  let subtotal = 0;
  let savings = 0;
  for (const l of items) {
    count += l.quantity;
    subtotal += l.price * l.quantity;
    savings += Math.max(0, l.compareAt - l.price) * l.quantity;
  }
  return { count, subtotal, savings };
}
