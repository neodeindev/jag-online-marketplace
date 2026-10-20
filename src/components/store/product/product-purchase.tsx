"use client";

import { Check, Heart, ShoppingCart, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { cart } from "@/lib/cart-store";
import { formatPrice, whatsappLink } from "@/lib/format";
import type { ProductDetail } from "@/lib/types";
import { cn, siteUrl } from "@/lib/utils";
import { WhatsAppIcon } from "@/components/brand/whatsapp-icon";
import { QuantityStepper } from "@/components/cart/quantity-stepper";
import { useSession } from "@/components/providers/session-provider";
import { useStoreConfig } from "@/components/providers/store-config";
import { Button } from "@/components/ui/button";

/**
 * Options, quantity and the buy buttons. On phones the buttons also appear
 * in a bar pinned to the bottom of the screen.
 */
export function ProductPurchase({ product }: { product: ProductDetail }) {
  const router = useRouter();
  const { whatsappNumber, storeName } = useStoreConfig();
  const { wishlist, toggleWishlist } = useSession();
  const [quantity, setQuantity] = useState(1);
  const [selected, setSelected] = useState<Record<string, string>>(() =>
    Object.fromEntries(product.options.filter((o) => o.values.length === 1).map((o) => [o.name, o.values[0].value])),
  );
  const [missing, setMissing] = useState<string[]>([]);

  const soldOut = product.stock <= 0;
  const saved = wishlist.has(product.id);
  const maxQty = Math.min(99, Math.max(1, product.stock));

  function addToCart(): boolean {
    const unpicked = product.options.filter((o) => !selected[o.name]).map((o) => o.name);
    if (unpicked.length > 0) {
      setMissing(unpicked);
      toast.error(`Choose a ${unpicked[0].toLowerCase()} first.`);
      document.getElementById(`option-${unpicked[0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
    const added = cart.add(
      {
        productId: product.id,
        slug: product.slug,
        title: product.title,
        image: product.images[0]?.url ?? null,
        price: product.current_price,
        compareAt: product.price,
        options: selected,
        maxStock: product.stock,
      },
      quantity,
    );
    if (added === 0) {
      toast.info(`You already have all ${product.stock} in your cart.`);
      return true;
    }
    if (added < quantity) toast.info(`Only ${added} more could be added — that's all we have.`);
    return true;
  }

  const ask = whatsappLink(
    whatsappNumber,
    `Hi ${storeName}, I'm interested in "${product.title}" (${product.sku}). ${siteUrl(`/p/${product.slug}`)}`,
  );

  const buttons = (compact: boolean) =>
    soldOut ? (
      <Button size="lg" variant="outline" disabled className="w-full">
        Sold out
      </Button>
    ) : (
      <div className={cn("grid gap-2", compact ? "grid-cols-[1fr_1fr]" : "grid-cols-1 sm:grid-cols-2")}>
        <Button
          size="lg"
          onClick={() => {
            if (addToCart()) cart.openDrawer();
          }}
        >
          <ShoppingCart className="size-5" /> Add to cart
        </Button>
        <Button
          size="lg"
          variant="dark"
          onClick={() => {
            if (addToCart()) router.push("/checkout");
          }}
        >
          <Zap className="size-5" /> Buy now
        </Button>
      </div>
    );

  return (
    <div className="space-y-5">
      {product.options.map((group) => (
        <fieldset key={group.slug} id={`option-${group.name}`}>
          <legend className="mb-2 text-[14px] text-muted">
            <span className="font-bold text-ink">{group.name}:</span>{" "}
            {selected[group.name] ?? (
              <span className={cn(missing.includes(group.name) && "font-semibold text-flag")}>Choose one</span>
            )}
          </legend>
          <div className="flex flex-wrap gap-2">
            {group.values.map((v) => {
              const active = selected[group.name] === v.value;
              const choose = () => {
                setSelected((s) => ({ ...s, [group.name]: v.value }));
                setMissing((m) => m.filter((n) => n !== group.name));
              };
              return group.kind === "color" ? (
                <button
                  key={v.value}
                  type="button"
                  onClick={choose}
                  aria-pressed={active}
                  title={v.value}
                  className={cn(
                    "relative inline-flex size-10 items-center justify-center rounded-full ring-1 ring-black/15 transition",
                    active ? "ring-2 ring-ink ring-offset-2" : "hover:ring-ink/40",
                  )}
                  style={{ background: v.hex ?? "#ddd" }}
                >
                  <span className="sr-only">{v.value}</span>
                  {active && <Check className="size-4 text-white mix-blend-difference" strokeWidth={3} />}
                </button>
              ) : (
                <button
                  key={v.value}
                  type="button"
                  onClick={choose}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex h-11 min-w-12 items-center justify-center rounded-xl border px-3.5 text-[14px] font-semibold transition",
                    active ? "border-ink bg-ink text-white" : "border-line-strong bg-white text-ink hover:border-ink",
                    missing.includes(group.name) && !active && "border-flag/60",
                  )}
                >
                  {v.value}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      {!soldOut && (
        <div className="flex items-center gap-4">
          <span className="text-[14px] font-bold text-ink">Quantity</span>
          <QuantityStepper value={quantity} max={maxQty} onChange={(q) => setQuantity(Math.max(1, Math.min(maxQty, q)))} label="Quantity" />
        </div>
      )}

      {buttons(false)}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => toggleWishlist(product.id, product.title)}
          aria-pressed={saved}
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition",
            saved ? "border-flag/40 bg-flag-50 text-flag" : "border-line-strong bg-white text-ink hover:border-ink",
          )}
        >
          <Heart className={cn("size-4", saved && "fill-current")} />
          {saved ? "Saved" : "Save for later"}
        </button>
        {ask && (
          <a
            href={ask}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#25D366]/50 bg-[#25D366]/10 px-4 text-sm font-semibold text-[#128C4B] transition hover:bg-[#25D366]/20"
          >
            <WhatsAppIcon className="size-4" /> Ask on WhatsApp
          </a>
        )}
      </div>

      {/* Phone: price and buttons pinned to the bottom of the screen */}
      <div className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2.5 backdrop-blur md:hidden">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="line-clamp-1 pr-3 text-[13px] text-muted">{product.title}</span>
          <span className={cn("display shrink-0 text-lg font-extrabold tabular-nums", product.current_price < product.price ? "text-flag" : "text-ink")}>
            {formatPrice(product.current_price)}
          </span>
        </div>
        {buttons(true)}
      </div>
    </div>
  );
}
