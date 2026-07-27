import { describe, expect, it } from "vitest";
import { splitCombinedIngredients, splitCombinedName } from "./ingredient-split";

describe("splitCombinedName", () => {
  it("splits salt and pepper", () => {
    expect(splitCombinedName("salt and pepper")).toEqual(["salt", "pepper"]);
    expect(splitCombinedName("Salt & Pepper")).toEqual(["Salt", "Pepper"]);
  });

  it("splits a two-word-per-side pair", () => {
    expect(splitCombinedName("olive oil and white vinegar")).toEqual([
      "olive oil",
      "white vinegar",
    ]);
  });

  it("leaves a single ingredient untouched", () => {
    expect(splitCombinedName("tomato paste")).toEqual(["tomato paste"]);
  });

  it("does not split long compound names", () => {
    // Right side is 3 words → not a clean pair.
    expect(splitCombinedName("chicken and wild mushroom stock")).toEqual([
      "chicken and wild mushroom stock",
    ]);
  });

  it("does not split a quantified phrase", () => {
    expect(splitCombinedName("2 cups flour and 1 cup sugar")).toEqual([
      "2 cups flour and 1 cup sugar",
    ]);
  });

  it("does not split on more than one connector", () => {
    expect(splitCombinedName("salt and pepper and oil")).toEqual([
      "salt and pepper and oil",
    ]);
  });
});

describe("splitCombinedIngredients", () => {
  it("expands combined lines and drops the shared amount", () => {
    const result = splitCombinedIngredients([
      { name: "salt and pepper", quantity: 1, unit: "tsp" },
      { name: "flour", quantity: 200, unit: "g" },
    ]);
    expect(result).toEqual([
      { name: "salt", quantity: null, unit: null },
      { name: "pepper", quantity: null, unit: null },
      { name: "flour", quantity: 200, unit: "g" },
    ]);
  });

  it("preserves extra fields on non-split ingredients", () => {
    const result = splitCombinedIngredients([
      { name: "flour", quantity: 200, unit: "g", extra: "keep" } as {
        name: string;
        quantity: number | null;
        unit: string | null;
        extra: string;
      },
    ]);
    expect(result[0]).toMatchObject({ name: "flour", extra: "keep" });
  });
});
