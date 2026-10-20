"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, Suspense, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/types";

/**
 * Who is signed in (for display: header greeting, wishlist hearts).
 * Anything that needs to be secure re-checks the session on the server.
 */
interface SessionValue {
  ready: boolean;
  userId: string | null;
  name: string | null;
  role: UserRole | null;
  wishlist: Set<string>;
  toggleWishlist: (productId: string, title?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const loadRef = useRef<(id: string | null, email: string | null) => Promise<void>>(async () => {});
  const userIdRef = useRef<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [wishlist, setWishlist] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function load(id: string | null, email: string | null) {
      userIdRef.current = id;
      if (!id) {
        if (!cancelled) {
          setUserId(null);
          setName(null);
          setRole(null);
          setWishlist(new Set());
          setReady(true);
        }
        return;
      }
      const [profile, saved] = await Promise.all([
        supabase.from("profiles").select("full_name, role").eq("id", id).maybeSingle(),
        supabase.from("wishlist_items").select("product_id"),
      ]);
      if (cancelled) return;
      setUserId(id);
      setName(profile.data?.full_name?.split(" ")[0] ?? email?.split("@")[0] ?? null);
      setRole((profile.data?.role as UserRole | undefined) ?? "customer");
      setWishlist(new Set((saved.data ?? []).map((w) => w.product_id)));
      setReady(true);
    }

    loadRef.current = load;
    supabase.auth.getSession().then(({ data }) => {
      load(data.session?.user.id ?? null, data.session?.user.email ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        load(session?.user.id ?? null, session?.user.email ?? null);
      }
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  // Sign-in and sign-out happen in Server Actions, which change the cookies
  // without a browser auth event, so re-check the session after navigating.
  const recheck = useCallback(() => {
    if (!ready) return;
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        const id = data.session?.user.id ?? null;
        if (id !== userIdRef.current) void loadRef.current(id, data.session?.user.email ?? null);
      });
  }, [ready]);

  const toggleWishlist = useCallback(
    async (productId: string, title?: string) => {
      if (!userId) {
        const next = `${window.location.pathname}${window.location.search}`;
        toast("Sign in to save items to your wishlist.", {
          action: { label: "Sign in", onClick: () => router.push(`/login?next=${encodeURIComponent(next)}`) },
        });
        return;
      }
      const supabase = createClient();
      const saved = wishlist.has(productId);
      setWishlist((prev) => {
        const next = new Set(prev);
        if (saved) next.delete(productId);
        else next.add(productId);
        return next;
      });
      const { error } = saved
        ? await supabase.from("wishlist_items").delete().eq("product_id", productId).eq("user_id", userId)
        : await supabase.from("wishlist_items").insert({ product_id: productId, user_id: userId });
      if (error) {
        setWishlist((prev) => {
          const next = new Set(prev);
          if (saved) next.add(productId);
          else next.delete(productId);
          return next;
        });
        toast.error("Couldn't update your wishlist. Try again.");
        return;
      }
      toast.success(saved ? "Removed from your wishlist" : "Saved to your wishlist", {
        description: title,
      });
    },
    [router, userId, wishlist],
  );

  const signOut = useCallback(async () => {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }, [router]);

  const value = useMemo(
    () => ({ ready, userId, name, role, wishlist, toggleWishlist, signOut }),
    [ready, userId, name, role, wishlist, toggleWishlist, signOut],
  );

  return (
    <SessionContext value={value}>
      {children}
      {/* The pathname isn't known while prerendering pages with dynamic params, so listen from a separate boundary. */}
      <Suspense fallback={null}>
        <OnNavigate callback={recheck} />
      </Suspense>
    </SessionContext>
  );
}

function OnNavigate({ callback }: { callback: () => void }) {
  const pathname = usePathname();
  useEffect(() => {
    callback();
  }, [pathname, callback]);
  return null;
}

export function useSession(): SessionValue {
  const value = use(SessionContext);
  if (!value) throw new Error("useSession must be used inside <SessionProvider>");
  return value;
}
