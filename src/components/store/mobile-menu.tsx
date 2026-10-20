"use client";

import { ChevronDown, Menu, Package, Percent, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore, type MouseEvent } from "react";
import type { CategoryNode, PageSummary } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Sheet } from "@/components/ui/sheet";
import { useSession } from "@/components/providers/session-provider";

// Shared open state so the bottom tab bar's "Categories" can open the same menu.
let menuOpen = false;
const listeners = new Set<() => void>();
const menuStore = {
  set(value: boolean) {
    menuOpen = value;
    for (const l of listeners) l();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function openCategoryMenu() {
  menuStore.set(true);
}

export function MobileMenuButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={openCategoryMenu}
      className={cn("inline-flex size-10 items-center justify-center rounded-xl text-white hover:bg-white/10", className)}
      aria-label="Browse categories"
    >
      <Menu className="size-6" />
    </button>
  );
}

export function CategoryMenu({ tree, pages }: { tree: CategoryNode[]; pages: PageSummary[] }) {
  const open = useSyncExternalStore(menuStore.subscribe, () => menuOpen, () => false);
  const { userId, name } = useSession();

  // Following any link in the menu closes it.
  const closeOnLink = (event: MouseEvent) => {
    if ((event.target as Element).closest("a")) menuStore.set(false);
  };

  return (
    <Sheet open={open} onClose={() => menuStore.set(false)} side="left" title="Shop by category">
      <div onClick={closeOnLink}>
        <div className="bg-ink px-5 py-4 text-white">
          <Link href={userId ? "/account" : "/login"} className="flex items-center gap-3 font-semibold">
            <span className="inline-flex size-9 items-center justify-center rounded-full bg-white/10">
              <User className="size-5" />
            </span>
            {userId ? `Hello, ${name ?? "there"}` : "Sign in or create an account"}
          </Link>
        </div>
        <nav aria-label="Categories" className="px-2 py-3">
          <MenuRow href="/deals" icon={<Percent className="size-4 text-flag" />} label="Today's deals" />
          <MenuRow href="/search?sort=newest" icon={<Sparkles className="size-4 text-gold-600" />} label="New arrivals" />
          <div className="my-2 border-t border-line" />
          {tree.map((node) => (
            <CategoryRow key={node.id} node={node} depth={0} />
          ))}
          <div className="my-2 border-t border-line" />
          <MenuRow href="/track-order" icon={<Package className="size-4 text-muted" />} label="Track your order" />
          {pages.map((p) => (
            <MenuRow key={p.slug} href={`/pages/${p.slug}`} label={p.title} muted />
          ))}
        </nav>
      </div>
    </Sheet>
  );
}

function MenuRow({ href, icon, label, muted }: { href: string; icon?: React.ReactNode; label: string; muted?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-mist",
        muted ? "text-sm text-muted" : "font-semibold text-ink",
      )}
    >
      {icon}
      {label}
    </Link>
  );
}

function CategoryRow({ node, depth }: { node: CategoryNode; depth: number }) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = node.children.length > 0;
  return (
    <div>
      <div className="flex items-center">
        <Link
          href={`/c/${node.slug}`}
          className={cn(
            "flex-1 rounded-lg px-3 py-2.5 hover:bg-mist",
            depth === 0 ? "font-semibold text-ink" : "text-[14px] text-text",
          )}
          style={{ paddingLeft: 12 + depth * 14 }}
        >
          {node.name}
        </Link>
        {hasChildren && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={`${expanded ? "Hide" : "Show"} ${node.name} sub-categories`}
            className="inline-flex size-10 items-center justify-center rounded-lg text-muted hover:bg-mist"
          >
            <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} />
          </button>
        )}
      </div>
      {hasChildren && expanded && (
        <div className="border-l-2 border-gold/60 ml-4">
          {node.children.map((child) => (
            <CategoryRow key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
