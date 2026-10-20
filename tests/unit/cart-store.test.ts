import { describe, expect, it } from "vitest";
import { cartTotals, lineKey, type CartLine } from "@/lib/cart-store";

const line = (over: Partial<CartLine>): CartLine => ({
  key: "k",
  productId: "p",
  slug: "s",
  title: "t",
  image: null,
  price: 1000,
  compareAt: 1000,
  quantity: 1,
  options: {},
  maxStock: 10,
  ...over,
});

describe("lineKey", () => {
  it("is the same regardless of option order", () => {
    expect(lineKey("p1", { Size: "M", Colour: "Red" })).toBe(lineKey("p1", { Colour: "Red", Size: "M" }));
  });

  it("separates different choices of the same product", () => {
    expect(lineKey("p1", { Size: "M" })).not.toBe(lineKey("p1", { Size: "L" }));
  });
});

describe("cartTotals", () => {
  it("adds up items, subtotal and savings", () => {
    const totals = cartTotals([
      line({ price: 800, compareAt: 1000, quantity: 2 }),
      line({ price: 500, compareAt: 500, quantity: 1 }),
    ]);
    expect(totals).toEqual({ count: 3, subtotal: 2100, savings: 400 });
  });
});
