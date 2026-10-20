"use client";

import {
  BadgePercent,
  ExternalLink,
  FileText,
  FolderTree,
  Gauge,
  Image as ImageIcon,
  LogOut,
  Menu,
  Package,
  Palette,
  Receipt,
  Settings,
  ShieldCheck,
  Star,
  Truck,
  Upload,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { StaffPermission, UserRole } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ArrowheadMark } from "@/components/brand/arrowhead-mark";
import { useSession } from "@/components/providers/session-provider";
import { ADMIN_NAV, type AdminNavItem } from "./admin-nav";

const ICONS: Record<AdminNavItem["icon"], ReactNode> = {
  overview: <Gauge className="size-[18px]" />,
  orders: <Receipt className="size-[18px]" />,
  products: <Package className="size-[18px]" />,
  categories: <FolderTree className="size-[18px]" />,
  brands: <BadgePercent className="size-[18px]" />,
  attributes: <Palette className="size-[18px]" />,
  import: <Upload className="size-[18px]" />,
  reviews: <Star className="size-[18px]" />,
  banners: <ImageIcon className="size-[18px]" />,
  pages: <FileText className="size-[18px]" />,
  customers: <Users className="size-[18px]" />,
  delivery: <Truck className="size-[18px]" />,
  staff: <ShieldCheck className="size-[18px]" />,
  settings: <Settings className="size-[18px]" />,
};

export function AdminShell({
  storeName,
  user,
  pendingOrders,
  children,
}: {
  storeName: string;
  user: { name: string; email: string | null; role: UserRole; permissions: StaffPermission[] };
  pendingOrders: number;
  children: ReactNode;
}) {
  const pathname = usePathname();
  // The menu belongs to the page it was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (value: boolean) => setOpenOn(value ? pathname : null);
  const { signOut } = useSession();

  const allowed = (item: AdminNavItem) =>
    item.permission === null ||
    user.role === "owner" ||
    (item.permission !== "owner" && user.permissions.includes(item.permission));

  const isActive = (href: string) =>
    href === "/admin"
      ? pathname === "/admin"
      : pathname === href || (pathname.startsWith(`${href}/`) && !(href === "/admin/products" && pathname.startsWith("/admin/products/import")));

  const nav = (
    <nav aria-label="Dashboard" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {ADMIN_NAV.map((group) => {
        const items = group.items.filter(allowed);
        if (items.length === 0) return null;
        return (
          <div key={group.title ?? "main"}>
            {group.title && (
              <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">{group.title}</p>
            )}
            <ul className="space-y-0.5">
              {items.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium transition",
                        active ? "bg-white/12 text-white" : "text-white/70 hover:bg-white/6 hover:text-white",
                      )}
                    >
                      <span className={cn(active ? "text-gold" : "text-white/50")}>{ICONS[item.icon]}</span>
                      <span className="flex-1">{item.label}</span>
                      {item.icon === "orders" && pendingOrders > 0 && (
                        <span className="rounded-full bg-gold px-2 py-0.5 text-[11px] font-extrabold text-ink">{pendingOrders}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  const sidebar = (
    <div className="flex h-full flex-col bg-ink">
      <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
        <ArrowheadMark className="text-[18px]" />
        <div className="min-w-0 leading-tight">
          <p className="display line-clamp-2 text-[14px] font-black uppercase leading-tight text-white">{storeName}</p>
          <p className="text-[11px] text-white/50">Dashboard</p>
        </div>
      </div>
      {nav}
      <div className="border-t border-white/10 p-3">
        <div className="mb-2 px-3 text-[13px]">
          <p className="truncate font-semibold text-white">{user.name}</p>
          <p className="truncate text-white/50">
            {user.role === "owner" ? "Owner" : "Staff"} · {user.email}
          </p>
        </div>
        <Link href="/" target="_blank" className="flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] text-white/70 hover:bg-white/6 hover:text-white">
          <ExternalLink className="size-[18px] text-white/50" /> View store
        </Link>
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[14px] text-white/70 hover:bg-white/6 hover:text-white"
        >
          <LogOut className="size-[18px] text-white/50" /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-mist">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-ink/50" aria-label="Close menu" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 animate-slide-in-left shadow-pop">{sidebar}</aside>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute left-[296px] top-3 inline-flex size-10 items-center justify-center rounded-full bg-white text-ink"
            aria-label="Close menu"
          >
            <X className="size-5" />
          </button>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex size-10 items-center justify-center rounded-lg text-ink hover:bg-mist"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          <span className="display text-[15px] font-black uppercase text-ink">{storeName}</span>
        </header>
        <main className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
