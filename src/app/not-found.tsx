import { CartDrawer } from "@/components/cart/cart-drawer";
import { SiteFooter } from "@/components/store/site-footer";
import { SiteHeader } from "@/components/store/site-header";
import StoreNotFound from "./(store)/not-found";

/** Unknown URLs get the same page as a missing product, with the full store around it. */
export default function RootNotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <StoreNotFound />
      </main>
      <SiteFooter />
      <CartDrawer />
    </>
  );
}
