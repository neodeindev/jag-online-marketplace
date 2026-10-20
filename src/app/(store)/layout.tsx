import { Suspense } from "react";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { MobileTabBar } from "@/components/store/mobile-tab-bar";
import { SiteFooter } from "@/components/store/site-footer";
import { SiteHeader } from "@/components/store/site-header";
import { WhatsAppFloat } from "@/components/store/whatsapp-float";

export default function StoreLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="min-h-[60vh]">
        {children}
      </main>
      <SiteFooter />
      {/* Both read the pathname, which isn't known while prerendering pages with dynamic params. */}
      <Suspense fallback={null}>
        <WhatsAppFloat />
      </Suspense>
      <Suspense fallback={null}>
        <MobileTabBar />
      </Suspense>
      <CartDrawer />
    </>
  );
}
