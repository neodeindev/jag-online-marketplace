import { describe, expect, it } from "vitest";
import {
  activeFilterCount,
  listingHref,
  parseListingParams,
  priceBrackets,
  toggleValue,
  withChanges,
} from "@/lib/listing";

describe("parseListingParams", () => {
  it("reads every filter from the URL", () => {
    const state = parseListingParams({
      q: "  phone ",
      category: "electronics",
      brand: "samsung,Apple",
      attr: ["colour:black", "size:m"],
      min: "10000",
      max: "G$50,000",
      stock: "1",
      deals: "1",
      sort: "price_asc",
      page: "3",
    });
    expect(state).toEqual({
      q: "phone",
      category: "electronics",
      brands: ["samsung", "apple"],
      attrs: ["colour:black", "size:m"],
      min: 10000,
      max: 50000,
      inStock: true,
      onSale: true,
      featured: false,
      sort: "price_asc",
      page: 3,
    });
  });

  it("drops invalid values instead of failing", () => {
    const state = parseListingParams({ sort: "cheapest", page: "-2", attr: "colour", min: "abc" });
    expect(state.sort).toBeNull();
    expect(state.page).toBe(1);
    expect(state.attrs).toEqual([]);
    expect(state.min).toBeNull();
  });

  it("uses the path category on category pages", () => {
    expect(parseListingParams({ category: "ignored" }, "phones").category).toBe("phones");
  });

  it("de-duplicates repeated values", () => {
    expect(parseListingParams({ brand: ["nike", "nike,adidas"] }).brands).toEqual(["nike", "adidas"]);
  });
});

describe("listingHref", () => {
  const base = parseListingParams({});

  it("builds clean search URLs", () => {
    expect(listingHref("/search", base)).toBe("/search");
    expect(listingHref("/search", { ...base, q: "red dress", brands: ["zara"], page: 2 })).toBe(
      "/search?q=red+dress&brand=zara&page=2",
    );
  });

  it("keeps the category in the path on category pages", () => {
    expect(listingHref("/c/phones", { ...base, category: "phones", inStock: true })).toBe("/c/phones?stock=1");
    expect(listingHref("/search", { ...base, category: "phones" })).toBe("/search?category=phones");
  });

  it("round-trips through parseListingParams", () => {
    const state = {
      ...base,
      q: "chair",
      attrs: ["colour:red", "colour:blue"],
      min: 1000,
      onSale: true,
      sort: "newest" as const,
    };
    const qs = new URLSearchParams(listingHref("/search", state).split("?")[1]);
    const params: Record<string, string | string[]> = {};
    for (const key of new Set(qs.keys())) {
      const all = qs.getAll(key);
      params[key] = all.length > 1 ? all : all[0];
    }
    expect(parseListingParams(params)).toEqual(state);
  });
});

describe("filter helpers", () => {
  it("resets to page 1 when filters change", () => {
    const state = { ...parseListingParams({}), page: 4 };
    expect(withChanges(state, { inStock: true }).page).toBe(1);
  });

  it("toggles values in and out", () => {
    expect(toggleValue(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleValue(["a", "b"], "a")).toEqual(["b"]);
  });

  it("counts active filters, treating a price range as one", () => {
    const state = parseListingParams({ brand: "a,b", min: "1", max: "2", stock: "1" });
    expect(activeFilterCount(state)).toBe(4);
  });
});

describe("priceBrackets", () => {
  it("offers contiguous ranges across the result prices", () => {
    const brackets = priceBrackets(800, 120000);
    expect(brackets[0]).toEqual({ label: "", min: null, max: 1000 });
    expect(brackets.at(-1)?.max).toBeNull();
    for (let i = 1; i < brackets.length; i++) expect(brackets[i].min).toBe(brackets[i - 1].max);
  });

  it("offers nothing when prices are too close together", () => {
    expect(priceBrackets(1000, 1500)).toEqual([]);
    expect(priceBrackets(null, null)).toEqual([]);
  });
});
