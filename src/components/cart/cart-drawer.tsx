"use client";

import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { cart, cartTotals, useCart, useCartDrawerOpen } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { ProductImage } from "@/components/store/product-image";
import { FreeDeliveryMeter } from "./free-delivery-meter";
import { QuantityStepper } from "./quantity-stepper";

export function CartDrawer() {
  const open = useCartDrawerOpen();
  const items = useCart();
  const { count, subtotal } = cartTotals(items);

  return (
    <Sheet
      open={open}
      onClose={cart.closeDrawer}
      title={count > 0 ? `Your cart (${count})` : "Your cart"}
      footer={
        items.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted">Subtotal</span>
              <span className="display text-xl font-extrabold tabular-nums text-ink">{formatPrice(subtotal)}</span>
            </div>
            <p className="text-[12px] text-muted">Delivery is calculated at checkout.</p>
            <div className="grid grid-cols-2 gap-2">
              <ButtonLink href="/cart" variant="outline" onClick={cart.closeDrawer}>
                View cart
              </ButtonLink>
              <ButtonLink href="/checkout" onClick={cart.closeDrawer}>
                Checkout
              </ButtonLink>
            </div>
          </div>
        ) : undefined
      }
    >
      {items.length === 0 ? (
        <div className="flex flex-col items-center px-8 py-16 text-center">
          <span className="mb-4 inline-flex size-16 items-center justify-center rounded-full bg-mist text-muted">
            <ShoppingBag className="size-7" />
          </span>
          <p className="font-semibold text-ink">Your cart is empty</p>
          <p className="mt-1 text-sm text-muted">Find something you like and tap the + to add it here.</p>
          <ButtonLink href="/search" className="mt-6" onClick={cart.closeDrawer}>
            Start shopping
          </ButtonLink>
        </div>
      ) : (
        <div className="space-y-4 px-5 py-4">
          <FreeDeliveryMeter subtotal={subtotal} />
          <ul className="divide-y divide-line">
            {items.map((item) => (
              <li key={item.key} className="flex gap-3 py-4 first:pt-1">
                <Link
                  href={`/p/${item.slug}`}
                  onClick={cart.closeDrawer}
                  className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-[#f3f5f4]"
                >
                  <ProductImage src={item.image} alt={item.title} sizes="80px" className="p-1.5" />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/p/${item.slug}`}
                    onClick={cart.closeDrawer}
                    className="line-clamp-2 text-sm font-medium leading-snug hover:underline"
                  >
                    {item.title}
                  </Link>
                  {Object.keys(item.options).length > 0 && (
                    <p className="mt-0.5 text-[12px] text-muted">
                      {Object.entries(item.options)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(" · ")}
                    </p>
                  )}
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <QuantityStepper
                      size="sm"
                      value={item.quantity}
                      max={Math.min(99, item.maxStock)}
                      allowRemove
                      label={`Quantity of ${item.title}`}
                      onChange={(q) => (q <= 0 ? cart.remove(item.key) : cart.setQuantity(item.key, q))}
                    />
                    <span className="font-semibold tabular-nums">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Sheet>
  );
}
