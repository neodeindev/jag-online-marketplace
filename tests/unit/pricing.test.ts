import { describe, expect, it } from "vitest";
import { currentPriceFor, deliveryFeeFor } from "@/lib/pricing";

describe("currentPriceFor", () => {
  const now = Date.parse("2026-10-19T12:00:00Z");

  it("uses the sale price while a sale is running", () => {
    expect(currentPriceFor(10000, 8000, null, now)).toBe(8000);
    expect(currentPriceFor(10000, 8000, "2026-10-20T00:00:00Z", now)).toBe(8000);
  });

  it("ignores a sale that has ended", () => {
    expect(currentPriceFor(10000, 8000, "2026-10-19T11:59:59Z", now)).toBe(10000);
  });

  it("ignores a sale price that is not lower", () => {
    expect(currentPriceFor(10000, 10000, null, now)).toBe(10000);
    expect(currentPriceFor(10000, 12000, null, now)).toBe(10000);
    expect(currentPriceFor(10000, null, null, now)).toBe(10000);
  });
});

describe("deliveryFeeFor", () => {
  const georgetown = { fee: 1000, is_pickup: false };
  const pickup = { fee: 500, is_pickup: true };

  it("charges the zone fee below the free-delivery threshold", () => {
    expect(deliveryFeeFor(georgetown, 5000, 20000)).toBe(1000);
  });

  it("is free at or above the threshold", () => {
    expect(deliveryFeeFor(georgetown, 20000, 20000)).toBe(0);
    expect(deliveryFeeFor(georgetown, 25000, 20000)).toBe(0);
  });

  it("is always free for store pickup", () => {
    expect(deliveryFeeFor(pickup, 100, null)).toBe(0);
  });

  it("charges the fee when there is no threshold, and nothing without a zone", () => {
    expect(deliveryFeeFor(georgetown, 999999, null)).toBe(1000);
    expect(deliveryFeeFor(null, 5000, 20000)).toBe(0);
  });
});
