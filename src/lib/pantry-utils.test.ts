import { describe, expect, it } from "vitest";
import { buildPantryQuantityByItem, getIngredientAvailability } from "./pantry-utils";

describe("getIngredientAvailability", () => {
  it("is missing when nothing is in stock", () => {
    expect(getIngredientAvailability(2, 0)).toBe("missing");
    expect(getIngredientAvailability(null, 0)).toBe("missing");
  });

  it("is short when some stock but less than needed", () => {
    expect(getIngredientAvailability(3, 1)).toBe("short");
    expect(getIngredientAvailability(200, 150)).toBe("short");
  });

  it("is ok when stock meets or exceeds the need", () => {
    expect(getIngredientAvailability(2, 2)).toBe("ok");
    expect(getIngredientAvailability(2, 5)).toBe("ok");
  });

  it("is ok when the recipe asks for no specific amount but stock exists", () => {
    expect(getIngredientAvailability(null, 1)).toBe("ok");
    expect(getIngredientAvailability(undefined, 4)).toBe("ok");
  });
});

describe("buildPantryQuantityByItem", () => {
  it("sums quantity across batches of the same item", () => {
    const totals = buildPantryQuantityByItem([
      { item_id: "a", quantity: 2 },
      { item_id: "a", quantity: 3 },
      { item_id: "b", quantity: 1 },
    ]);
    expect(totals.get("a")).toBe(5);
    expect(totals.get("b")).toBe(1);
  });

  it("coerces string and null quantities safely", () => {
    const totals = buildPantryQuantityByItem([
      { item_id: "a", quantity: "2.50" },
      { item_id: "a", quantity: null },
    ]);
    expect(totals.get("a")).toBe(2.5);
  });

  it("returns no entry for an item that was never seen", () => {
    const totals = buildPantryQuantityByItem([{ item_id: "a", quantity: 1 }]);
    expect(totals.get("z")).toBeUndefined();
  });
});
