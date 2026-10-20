"use client";

import { AlertTriangle, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getCartProducts } from "@/app/(store)/cart/actions";
import { cart, cartTotals, useCart, type CartRefresh } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button";
import { ProductImage } from "@/components/store/product-image";
import { FreeDeliveryMeter } from "./free-delivery-meter";
import { QuantityStepper } from "./quantity-stepper";

/** Re-checks prices and stock with the server, then applies any changes to the cart. */
export function useFreshCart() {
  const items = useCart();
  const [checkedFor, setCheckedFor] = useState<string | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const ids = useMemo(() => [...new Set(items.map((i) => i.productId))].sort().join(","), [items]);
  const checked = !ids || checkedFor === ids;

  useEffect(() => {
    if (!ids) return;
    let cancelled = false;
    getCartProducts(ids.split(","))
      .then((products) => {
        if (cancelled) return;
        const byId = new Map(products.map((p) => [p.id, p]));
        const changes: string[] = [];
        const updates = new Map<string, CartRefresh | null>();
        for (const line of cart.lines()) {
          const fresh = byId.get(line.productId);
          if (!fresh) {
            changes.push(`“${line.title}” is no longer available and was removed.`);
            updates.set(line.productId, null);
            continue;
          }
          if (fresh.price !== line.price) {
            changes.push(`The price of “${fresh.title}” changed to ${formatPrice(fresh.price)}.`);
          }
          if (line.quantity > fresh.stock) {
            changes.push(
              fresh.stock === 0
                ? `“${fresh.title}” just sold out.`
                : `Only ${fresh.stock} of “${fresh.title}” left — we lowered the quantity.`,
            );
          }
          updates.set(line.productId, {
            price: fresh.price,
            compareAt: fresh.compareAt,
            maxStock: fresh.stock,
            title: fresh.title,
            image: fresh.image,
            slug: fresh.slug,
          });
        }
        cart.refresh(updates);
        // Clamp quantities to the new stock levels.
        for (const line of cart.lines()) {
          if (line.quantity > line.maxStock) cart.setQuantity(line.key, line.maxStock);
        }
        setNotes([...new Set(changes)]);
        setCheckedFor(ids);
      })
      .catch(() => setCheckedFor(ids));
    return () => {
      cancelled = true;
    };
    // Only re-check when the set of products changes, not on quantity edits.
  }, [ids]);

  return { items, checked, notes };
}

export function CartView() {
  const { items, checked, notes } = useFreshCart();
  const { count, subtotal, savings } = cartTotals(items);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-[20px] bg-white px-6 py-16 text-center shadow-card">
        <span className="mb-4 inline-flex size-16 items-center justify-center rounded-full bg-mist text-muted">
          <ShoppingBag className="size-7" />
        </span>
        <h1 className="display text-2xl font-black text-ink">Your cart is empty</h1>
        <p className="mt-1 text-muted">Browse today&apos;s deals or search for something you need.</p>
        {notes.length > 0 && (
          <ul className="mt-4 space-y-1 text-sm text-flag">
            {notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        )}
        <div className="mt-6 flex gap-2">
          <ButtonLink href="/deals">See deals</ButtonLink>
          <ButtonLink href="/search" variant="outline">
            Browse products
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="rounded-[20px] bg-white p-4 shadow-card sm:p-6">
        <div className="mb-2 flex items-baseline justify-between border-b border-line pb-4">
          <h1 className="display text-[26px] font-black text-ink">Shopping cart</h1>
          <span className="text-sm text-muted">
            {count} {count === 1 ? "item" : "items"}
          </span>
        </div>

        {notes.length > 0 && (
          <div className="my-4 flex gap-3 rounded-xl bg-gold-50 p-4 text-[14px] text-ink">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-gold-600" />
            <ul className="space-y-1">
              {notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </div>
        )}

        <ul className="divide-y divide-line">
          {items.map((item) => (
            <li key={item.key} className="flex gap-4 py-5">
              <Link href={`/p/${item.slug}`} className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-[#f3f5f4] sm:size-32">
                <ProductImage src={item.image} alt={item.title} sizes="128px" className="p-2" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex justify-between gap-4">
                  <div className="min-w-0">
                    <Link href={`/p/${item.slug}`} className="line-clamp-2 font-semibold leading-snug text-ink hover:underline">
                      {item.title}
                    </Link>
                    {Object.keys(item.options).length > 0 && (
                      <p className="mt-1 text-[13px] text-muted">
                        {Object.entries(item.options)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(" · ")}
                      </p>
                    )}
                    {item.maxStock > 0 && item.maxStock <= 5 && (
                      <p className="mt-1 text-[13px] font-semibold text-flag">Only {item.maxStock} left</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold tabular-nums text-ink">{formatPrice(item.price * item.quantity)}</p>
                    {item.quantity > 1 && <p className="text-[12px] text-muted">{formatPrice(item.price)} each</p>}
                    {item.compareAt > item.price && (
                      <p className="text-[12px] text-muted line-through">{formatPrice(item.compareAt * item.quantity)}</p>
                    )}
                  </div>
                </div>
                <div className="mt-auto flex items-center gap-4 pt-3">
                  <QuantityStepper
                    size="sm"
                    value={item.quantity}
                    max={Math.min(99, item.maxStock)}
                    label={`Quantity of ${item.title}`}
                    onChange={(q) => cart.setQuantity(item.key, Math.max(1, q))}
                  />
                  <button
                    type="button"
                    onClick={() => cart.remove(item.key)}
                    className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-flag"
                  >
                    <Trash2 className="size-4" /> Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-[140px] lg:self-start">
        <div className="rounded-[20px] bg-white p-5 shadow-card">
          <FreeDeliveryMeter subtotal={subtotal} />
          <dl className="mt-4 space-y-2 text-[15px]">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal ({count} items)</dt>
              <dd className="font-semibold tabular-nums">{formatPrice(subtotal)}</dd>
            </div>
            {savings > 0 && (
              <div className="flex justify-between text-canopy">
                <dt>You save</dt>
                <dd className="font-semibold tabular-nums">−{formatPrice(savings)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted">Delivery</dt>
              <dd className="text-muted">Calculated at checkout</dd>
            </div>
          </dl>
          <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
            <span className="font-bold text-ink">Total</span>
            <span className="display text-2xl font-black tabular-nums text-ink">{formatPrice(subtotal)}</span>
          </div>
          <ButtonLink href="/checkout" size="lg" className="mt-4 w-full" aria-disabled={!checked}>
            Proceed to checkout
          </ButtonLink>
          <p className="mt-3 text-center text-[12.5px] text-muted">Pay on delivery, by bank transfer or MMG</p>
        </div>
      </aside>
    </div>
  );
}
