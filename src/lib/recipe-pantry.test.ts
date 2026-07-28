import { describe, expect, it } from "vitest";
import type { InventoryRow } from "@/hooks/usePantry";
import {
  batchUnits,
  canonicalUnit,
  batchesTotal,
  computeIngredientNeeds,
  pantryBatchesForIngredient,
  round2,
  safeScale,
  sameFoodName,
  shoppingListHasIngredient,
  toBaseQuantity,
  toShoppingLine,
} from "./recipe-pantry";

const batch = (
  name: string,
  quantity: number,
  opts: { unit?: string; added_at?: string; items?: unknown } = {},
) =>
  ({
    id: `${name}-${quantity}-${opts.added_at ?? ""}`,
    item_id: `item-${name}`,
    quantity,
    unit: opts.unit ?? "g",
    added_at: opts.added_at ?? "2026-01-01T00:00:00Z",
    expiry_date: null,
    storage_location: null,
    status: "active",
    items: "items" in opts ? opts.items : { name },
  }) as unknown as InventoryRow;

describe("safeScale", () => {
  it("scales normally", () => {
    expect(safeScale(4, 2)).toBe(2);
  });

  it("never divides by zero servings", () => {
    expect(safeScale(4, 0)).toBe(1);
    expect(safeScale(0, 4)).toBe(1);
  });

  it("survives NaN and negatives", () => {
    expect(safeScale(Number.NaN, 2)).toBe(1);
    expect(safeScale(4, -2)).toBe(1);
  });
});

describe("pantryBatchesForIngredient", () => {
  const rows = [
    batch("Eggplant", 2, { added_at: "2026-03-01T00:00:00Z" }),
    batch("Eggplant", 5, { added_at: "2026-01-05T00:00:00Z" }),
    batch("Sweet Potato", 9),
  ];

  it("returns only name-matched batches", () => {
    expect(pantryBatchesForIngredient("medium eggplants", rows)).toHaveLength(2);
  });

  it("orders oldest first, matching how cooking draws them down", () => {
    const found = pantryBatchesForIngredient("eggplant", rows);
    expect(found.map((r) => r.quantity)).toEqual([5, 2]);
  });

  it("does not mutate the caller's array order", () => {
    const original = rows.map((r) => r.quantity);
    pantryBatchesForIngredient("eggplant", rows);
    expect(rows.map((r) => r.quantity)).toEqual(original);
  });

  it("tolerates a missing items relation instead of throwing", () => {
    const rowsWithNull = [batch("Eggplant", 1, { items: null })];
    expect(() => pantryBatchesForIngredient("eggplant", rowsWithNull)).not.toThrow();
    expect(pantryBatchesForIngredient("eggplant", rowsWithNull)).toHaveLength(0);
  });

  it("handles undefined inventory", () => {
    expect(pantryBatchesForIngredient("eggplant", undefined)).toEqual([]);
  });
});

describe("batchesTotal / batchUnits", () => {
  it("sums quantities across batches", () => {
    expect(batchesTotal([batch("Rice", 2), batch("Rice", 3.5)])).toBe(5.5);
  });

  it("collects distinct lowercased units", () => {
    const units = batchUnits([
      batch("Rice", 1, { unit: "kg" }),
      batch("Rice", 1, { unit: "KG" }),
      batch("Rice", 1, { unit: "g" }),
    ]);
    expect(units).toEqual(["kg", "g"]);
  });
});

describe("computeIngredientNeeds", () => {
  const inventory = [batch("Eggplant", 1), batch("Tomato Paste", 750)];

  const ingredients = [
    { id: "a", name: "medium eggplants", quantity: 2.5, unit: "pieces", item_id: "i-egg" },
    { id: "b", name: "tomato paste", quantity: 1, unit: "Tbsp", item_id: "i-paste" },
    { id: "c", name: "olive oil", quantity: 3, unit: "Tbsp", item_id: "i-oil" },
    { id: "d", name: "sample only", quantity: 1, unit: "unit" },
  ];

  it("flags short, ok and missing correctly", () => {
    const needs = computeIngredientNeeds(ingredients, inventory, 1);
    expect(needs[0].status).toBe("short");
    expect(needs[1].status).toBe("ok");
    expect(needs[2].status).toBe("missing");
  });

  it("leaves status null when the ingredient has no catalogue link", () => {
    const needs = computeIngredientNeeds(ingredients, inventory, 1);
    expect(needs[3].status).toBeNull();
  });

  it("computes shortfall against the scaled requirement", () => {
    const needs = computeIngredientNeeds(ingredients, inventory, 2);
    expect(needs[0].scaledQty).toBe(5);
    expect(needs[0].shortfall).toBe(4); // needs 5, has 1
  });

  it("reports no shortfall when covered", () => {
    const needs = computeIngredientNeeds(ingredients, inventory, 1);
    expect(needs[1].shortfall).toBe(0);
  });

  it("keeps available consistent with the batches it returns", () => {
    const needs = computeIngredientNeeds(ingredients, inventory, 1);
    for (const need of needs) {
      expect(need.available).toBe(batchesTotal(need.batches));
    }
  });
});

describe("toBaseQuantity", () => {
  it("converts a displayed amount back to the base amount", () => {
    expect(toBaseQuantity(5, 2)).toBe(2.5);
    expect(toBaseQuantity(3, 1)).toBe(3);
  });

  it("rejects unusable input rather than storing nonsense", () => {
    expect(toBaseQuantity(0, 2)).toBeNull();
    expect(toBaseQuantity(-1, 2)).toBeNull();
    expect(toBaseQuantity(Number.NaN, 2)).toBeNull();
    expect(toBaseQuantity(5, 0)).toBeNull();
  });
});

describe("toShoppingLine", () => {
  it("keeps a real quantity for countable units", () => {
    expect(toShoppingLine("Eggs", 6, "piece")).toEqual({ name: "Eggs", quantity: 6 });
    expect(toShoppingLine("Bread", 2, "Pack")).toEqual({ name: "Bread", quantity: 2 });
  });

  it("rounds a fractional countable amount up", () => {
    expect(toShoppingLine("Eggs", 2.2, "piece")).toEqual({ name: "Eggs", quantity: 3 });
  });

  it("folds measured units into the name with quantity 1", () => {
    // Never quantity: 200 — the list multiplies cost by quantity.
    expect(toShoppingLine("Olive Oil", 200, "ml")).toEqual({
      name: "Olive Oil (200 ml)",
      quantity: 1,
    });
  });

  it("treats a blank unit as countable", () => {
    expect(toShoppingLine("Lemon", 1, "")).toEqual({ name: "Lemon", quantity: 1 });
  });

  it("recognises plural countable units as recipes write them", () => {
    expect(toShoppingLine("Eggplants", 0.5, "pieces")).toEqual({
      name: "Eggplants",
      quantity: 1,
    });
    expect(toShoppingLine("Bread", 2, "packs")).toEqual({ name: "Bread", quantity: 2 });
  });

  it("still folds plural measured units into the name", () => {
    expect(toShoppingLine("Milk", 500, "mls").name).toContain("500");
  });

  it("never emits a zero or negative quantity", () => {
    expect(toShoppingLine("Eggs", 0, "piece").quantity).toBe(1);
    expect(toShoppingLine("Eggs", -3, "piece").quantity).toBe(1);
  });
});

describe("sameFoodName", () => {
  it("matches regardless of word order and qualifiers", () => {
    expect(sameFoodName("tomato paste", "Paste Tomato")).toBe(true);
    expect(sameFoodName("medium eggplants", "Eggplant")).toBe(true);
  });

  it("ignores a parenthetical amount added by the shopping line", () => {
    expect(sameFoodName("Olive Oil (200 ml)", "olive oil")).toBe(true);
  });

  it("is symmetric, unlike the directional ingredient matcher", () => {
    expect(sameFoodName("pepper", "bell pepper")).toBe(false);
    expect(sameFoodName("bell pepper", "pepper")).toBe(false);
  });

  it("is false for empty names", () => {
    expect(sameFoodName("", "eggplant")).toBe(false);
  });
});

describe("shoppingListHasIngredient", () => {
  const open = [
    { name: "Olive Oil (200 ml)", item_id: null },
    { name: "Eggs", item_id: "item-eggs" },
  ];

  it("detects a duplicate by catalogue id", () => {
    expect(shoppingListHasIngredient(open, { name: "Anything", item_id: "item-eggs" })).toBe(true);
  });

  it("detects a duplicate by food name despite the amount suffix", () => {
    expect(shoppingListHasIngredient(open, { name: "olive oil", item_id: null })).toBe(true);
  });

  it("allows a genuinely new ingredient", () => {
    expect(shoppingListHasIngredient(open, { name: "Ground Cumin", item_id: null })).toBe(false);
  });
});

describe("canonicalUnit", () => {
  it("maps a recipe's plural free-text unit onto the canonical list", () => {
    expect(canonicalUnit("pieces")).toBe("Piece");
    expect(canonicalUnit("cloves")).toBe("Clove");
  });

  it("matches case-insensitively", () => {
    expect(canonicalUnit("TBSP")).toBe("tbsp");
  });

  it("keeps an unrecognised unit rather than discarding it", () => {
    expect(canonicalUnit("splash")).toBe("splash");
  });

  it("is empty-safe", () => {
    expect(canonicalUnit(null)).toBe("");
    expect(canonicalUnit("  ")).toBe("");
  });
});

describe("round2", () => {
  it("rounds to two decimals", () => {
    expect(round2(1.005)).toBe(1.0);
    expect(round2(2.346)).toBe(2.35);
  });
});
