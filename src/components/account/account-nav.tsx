"use client";

import { Heart, LayoutDashboard, LogOut, Package, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSession } from "@/components/providers/session-provider";

const LINKS = [
  { href: "/account", label: "Orders", icon: Package },
  { href: "/account/wishlist", label: "Wishlist", icon: Heart },
  { href: "/account/profile", label: "Profile & address", icon: UserRound },
];

export function AccountNav({ isStaff }: { isStaff: boolean }) {
  const pathname = usePathname();
  const { signOut } = useSession();
  const item = "flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[14px] font-semibold transition";
  return (
    <nav aria-label="Account" className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(item, active ? "bg-ink text-white" : "text-ink hover:bg-white")}
          >
            <Icon className={cn("size-[18px]", active ? "text-gold" : "text-muted")} />
            {label}
          </Link>
        );
      })}
      {isStaff && (
        <Link href="/admin" className={cn(item, "text-ink hover:bg-white")}>
          <LayoutDashboard className="size-[18px] text-muted" /> Store dashboard
        </Link>
      )}
      <button type="button" onClick={() => void signOut()} className={cn(item, "text-muted hover:bg-white hover:text-ink")}>
        <LogOut className="size-[18px]" /> Sign out
      </button>
    </nav>
  );
}
