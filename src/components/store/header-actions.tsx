"use client";

import { ChevronDown, Heart, LayoutDashboard, LogOut, Package, ShoppingCart, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cart, cartTotals, useCart } from "@/lib/cart-store";
import { cn } from "@/lib/utils";
import { useSession } from "@/components/providers/session-provider";

export function CartButton({ className }: { className?: string }) {
  const items = useCart();
  const { count } = cartTotals(items);
  return (
    <button
      type="button"
      onClick={cart.openDrawer}
      className={cn(
        "relative inline-flex h-11 items-center gap-2 rounded-xl px-2.5 text-white transition hover:bg-white/10",
        className,
      )}
      aria-label={`Cart, ${count} ${count === 1 ? "item" : "items"}`}
    >
      <span className="relative">
        <ShoppingCart className="size-6" strokeWidth={2} />
        <span
          className={cn(
            "absolute -right-2 -top-2 inline-flex min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-extrabold tabular-nums",
            count > 0 ? "bg-gold text-ink" : "bg-white/15 text-white/80",
          )}
        >
          {count > 99 ? "99+" : count}
        </span>
      </span>
      <span className="hidden text-sm font-bold xl:inline">Cart</span>
    </button>
  );
}

export function WishlistLink({ className }: { className?: string }) {
  const { wishlist } = useSession();
  return (
    <Link
      href="/account/wishlist"
      className={cn(
        "relative hidden h-11 items-center rounded-xl px-2.5 text-white transition hover:bg-white/10 sm:inline-flex",
        className,
      )}
      aria-label={`Wishlist${wishlist.size ? `, ${wishlist.size} saved` : ""}`}
    >
      <Heart className="size-[22px]" strokeWidth={2} />
      {wishlist.size > 0 && (
        <span className="absolute right-1 top-1.5 size-2 rounded-full bg-flag ring-2 ring-ink" aria-hidden />
      )}
    </Link>
  );
}

export function AccountMenu() {
  const { ready, userId, name, role, signOut } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!ready || !userId) {
    return (
      <Link
        href="/login"
        className="inline-flex h-11 items-center gap-2 rounded-xl px-2.5 text-white transition hover:bg-white/10"
      >
        <User className="size-[22px]" strokeWidth={2} />
        <span className="hidden flex-col text-left leading-tight md:flex">
          <span className="text-[11px] text-white/65">Hello</span>
          <span className="text-sm font-bold">{ready ? "Sign in" : "Account"}</span>
        </span>
      </Link>
    );
  }

  const isStaff = role === "staff" || role === "owner";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex h-11 items-center gap-2 rounded-xl px-2.5 text-white transition hover:bg-white/10"
      >
        <User className="size-[22px]" strokeWidth={2} />
        <span className="hidden flex-col text-left leading-tight md:flex">
          <span className="max-w-28 truncate text-[11px] text-white/65">Hello, {name ?? "there"}</span>
          <span className="flex items-center gap-0.5 text-sm font-bold">
            Account <ChevronDown className="size-3.5" />
          </span>
        </span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-xl border border-line bg-white py-1.5 text-text shadow-pop animate-fade-in"
        >
          {isStaff && (
            <MenuLink href="/admin" icon={<LayoutDashboard className="size-4" />} onSelect={() => setOpen(false)}>
              Store dashboard
            </MenuLink>
          )}
          <MenuLink href="/account" icon={<Package className="size-4" />} onSelect={() => setOpen(false)}>
            Your orders
          </MenuLink>
          <MenuLink href="/account/wishlist" icon={<Heart className="size-4" />} onSelect={() => setOpen(false)}>
            Wishlist
          </MenuLink>
          <MenuLink href="/account/profile" icon={<User className="size-4" />} onSelect={() => setOpen(false)}>
            Profile & address
          </MenuLink>
          <div className="my-1.5 border-t border-line" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void signOut();
            }}
            className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-mist"
          >
            <LogOut className="size-4 text-muted" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  icon,
  children,
  onSelect,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onSelect: () => void;
}) {
  return (
    <Link href={href} role="menuitem" onClick={onSelect} className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-mist">
      <span className="text-muted">{icon}</span>
      {children}
    </Link>
  );
}
