import { describe, expect, it } from "vitest";
import { discountPercent, fillTokens, formatPrice, whatsappLink } from "@/lib/format";
import { slugify } from "@/lib/utils";

describe("formatPrice", () => {
  it("formats Guyana dollars with thousands separators", () => {
    expect(formatPrice(12500)).toBe("G$12,500");
    expect(formatPrice("1999")).toBe("G$1,999");
    expect(formatPrice(0)).toBe("G$0");
  });

  it("shows cents only when there are some", () => {
    expect(formatPrice(10.5)).toBe("G$10.50");
  });
});

describe("discountPercent", () => {
  it("rounds to a whole percent", () => {
    expect(discountPercent(16000, 12500)).toBe(22);
    expect(discountPercent(1000, 1000)).toBe(0);
    expect(discountPercent(0, 0)).toBe(0);
  });
});

describe("whatsappLink", () => {
  it("builds a wa.me link from any phone format", () => {
    expect(whatsappLink("+592 600-1234", "Hi there")).toBe("https://wa.me/5926001234?text=Hi%20there");
  });

  it("returns null for missing or too-short numbers", () => {
    expect(whatsappLink(null)).toBeNull();
    expect(whatsappLink("123")).toBeNull();
  });
});

describe("fillTokens", () => {
  it("replaces known tokens and leaves unknown ones", () => {
    expect(
      fillTokens("Call {{ contact_phone }} at {{store_name}} {{unknown}}", { store_name: "JAG", contact_phone: "600" }),
    ).toBe("Call 600 at JAG {{unknown}}");
  });
});

describe("slugify", () => {
  it("matches the database slugify()", () => {
    expect(slugify("Women's Dresses & Skirts")).toBe("womens-dresses-skirts");
    expect(slugify("  Café Crème  ")).toBe("cafe-creme");
    expect(slugify("iPhone 15 Pro (256GB)")).toBe("iphone-15-pro-256gb");
  });
});
