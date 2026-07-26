import { describe, expect, it } from "vitest";
import {
  getStockAdvice,
  normalizePrice,
  summarizeStores,
  type PriceRecord,
} from "./price-passport";

const record = (overrides: Partial<PriceRecord> = {}): PriceRecord => ({
  id: "one",
  storeName: "Waterfront Market",
  totalPrice: 24,
  currency: "AED",
  quantity: 1,
  unit: "kg",
  observedAt: "2026-07-26T10:00:00Z",
  source: "observed",
  ...overrides,
});

describe("price passport normalization", () => {
  it("normalizes grams to a kilogram price", () => {
    const normalized = normalizePrice(record({ totalPrice: 12, quantity: 500, unit: "g" }));
    expect(normalized?.basis).toBe("kg");
    expect(normalized?.normalizedPrice).toBe(24);
  });

  it("ranks stores using each store's latest comparable price", () => {
    const normalized = [
      record({ id: "a-old", totalPrice: 20, observedAt: "2026-06-01T10:00:00Z" }),
      record({ id: "a-new", totalPrice: 25, observedAt: "2026-07-01T10:00:00Z" }),
      record({ id: "b", storeName: "Union Coop", totalPrice: 23 }),
    ]
      .map(normalizePrice)
      .filter((value): value is NonNullable<typeof value> => Boolean(value));

    const stores = summarizeStores(normalized, "kg");
    expect(stores.map((store) => store.storeName)).toEqual(["Union Coop", "Waterfront Market"]);
    expect(stores[1].differenceFromBest).toBe(2);
  });
});

describe("stock-based buy advice", () => {
  it("uses serving size to estimate portions", () => {
    const advice = getStockAdvice([{ quantity: 750, unit: "g" }], "250 g");
    expect(advice.portions).toBe(3);
    expect(advice.label).toBe("Plan your next buy");
  });

  it("does not infer portions when serving size is unavailable", () => {
    const advice = getStockAdvice([{ quantity: 2, unit: "kg" }]);
    expect(advice.portions).toBeNull();
    expect(advice.detail).toContain("2 kg");
  });
});
