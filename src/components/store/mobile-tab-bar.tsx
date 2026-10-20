"use client";

import { Home, LayoutGrid, Percent, ShoppingCart, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cart, cartTotals, useCart } from "@/lib/cart-store";
import { cn } from "@/lib/utils";
import { useSession } from "@/components/providers/session-provider";
import { openCategoryMenu } from "./mobile-menu";

/** App-style bottom navigation on phones. */
export function MobileTabBar() {
  const pathname = usePathname();
  const { count } = cartTotals(useCart());
  const { userId } = useSession();

  // Product pages show their own buy bar; checkout keeps the screen clear.
  if (pathname.startsWith("/p/") || pathname.startsWith("/checkout")) return null;

  const tab = "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold";
  const icon = "size-[22px] shrink-0";
  const activeTab = (match: boolean) => (match ? "text-canopy" : "text-muted");

  return (
    // The safe-area padding sits below the 64px row rather than inside it: when Safari
    // collapses its toolbar on scroll, the page extends under the home indicator.
    <nav
      aria-label="Shortcuts"
      className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <div className="flex h-16">
        <Link href="/" className={cn(tab, activeTab(pathname === "/"))}>
          <Home className={icon} />
          Home
        </Link>
        <button type="button" onClick={openCategoryMenu} className={cn(tab, activeTab(pathname.startsWith("/c/")))}>
          <LayoutGrid className={icon} />
          Categories
        </button>
        <Link href="/deals" className={cn(tab, activeTab(pathname === "/deals"))}>
          <Percent className={icon} />
          Deals
        </Link>
        <button type="button" onClick={cart.openDrawer} className={cn(tab, activeTab(pathname === "/cart"))}>
          <span className="relative shrink-0">
            <ShoppingCart className={icon} />
            {count > 0 && (
              <span className="absolute -right-2.5 -top-1.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-gold px-1 text-[10px] font-extrabold text-ink">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </span>
          Cart
        </button>
        <Link href={userId ? "/account" : "/login"} className={cn(tab, activeTab(pathname.startsWith("/account")))}>
          <User className={icon} />
          {userId ? "Account" : "Sign in"}
        </Link>
      </div>
    </nav>
  );
}
