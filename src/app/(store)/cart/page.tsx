import type { Metadata } from "next";
import { getProductRail } from "@/lib/catalog";
import { CartView } from "@/components/cart/cart-view";
import { ProductRail } from "@/components/store/product-rail";
import { SectionHeading } from "@/components/store/section-heading";

export const metadata: Metadata = { title: "Your cart", robots: { index: false } };

export default async function CartPage() {
  const popular = await getProductRail("best_selling", 12);
  return (
    <div className="container-page pt-6">
      <CartView />
      {popular.length > 0 && (
        <section className="mt-14">
          <SectionHeading title="Customers also bought" />
          <ProductRail products={popular} />
        </section>
      )}
    </div>
  );
}
