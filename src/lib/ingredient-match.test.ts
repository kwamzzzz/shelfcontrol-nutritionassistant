import { describe, expect, it } from "vitest";
import {
  ingredientMatchesItem,
  normalizeName,
  pantryStockForIngredient,
} from "./ingredient-match";

describe("normalizeName", () => {
  it("strips size qualifiers and singularises", () => {
    expect(normalizeName("medium eggplants")).toEqual(["eggplant"]);
    expect(normalizeName("large ripe tomatoes")).toEqual(["tomato"]);
  });

  it("drops parentheticals and prep words", () => {
    expect(normalizeName("vegetable oil (for frying)")).toEqual(["vegetable", "oil"]);
    expect(normalizeName("garlic cloves (sliced thinly)")).toEqual(["garlic", "clove"]);
  });

  it("keeps brand and core words", () => {
    expect(normalizeName("Al Ain Tomato Paste")).toEqual(["al", "ain", "tomato", "paste"]);
  });
});

describe("ingredientMatchesItem", () => {
  it("matches through size qualifiers", () => {
    expect(ingredientMatchesItem("medium eggplants", "Eggplant")).toBe(true);
  });

  it("matches a plain ingredient to a branded pantry item", () => {
    expect(ingredientMatchesItem("tomato paste", "Al Ain Tomato Paste")).toBe(true);
    expect(ingredientMatchesItem("Salt", "Nezo Refined Salt Blue Pack")).toBe(true);
  });

  it("requires ALL ingredient words to be present", () => {
    expect(ingredientMatchesItem("tomato paste", "Chopped Tomatoes")).toBe(false);
    expect(ingredientMatchesItem("olive oil", "Vegetable Oil")).toBe(false);
  });

  it("does not match when nothing lines up", () => {
    expect(ingredientMatchesItem("ground cumin", "Sweet Potatoes")).toBe(false);
  });

  it("documents the known limit: a bare word matches a more specific item", () => {
    // 'pepper' is contained in 'bell pepper'; token matching can't tell the
    // black-pepper spice from the vegetable. Accepted limitation.
    expect(ingredientMatchesItem("pepper", "bell pepper")).toBe(true);
  });

  it("keeps colour distinctions (conservative): specific ingredient needs a specific item", () => {
    // 'red' distinguishes red vs green — don't assume a generic item is red.
    expect(ingredientMatchesItem("red bell pepper", "Bell Pepper")).toBe(false);
    expect(ingredientMatchesItem("red bell pepper", "Red Bell Pepper")).toBe(true);
  });

  it("is empty-safe", () => {
    expect(ingredientMatchesItem("", "Eggplant")).toBe(false);
    expect(ingredientMatchesItem("(optional)", "Eggplant")).toBe(false);
  });
});

describe("pantryStockForIngredient", () => {
  const stock = [
    { name: "Al Ain Tomato Paste", quantity: 2 },
    { name: "Tomato Paste (Store Brand)", quantity: 3 },
    { name: "Chopped Tomatoes", quantity: 5 },
    { name: "Eggplant", quantity: 4 },
  ];

  it("sums across every name-matched item", () => {
    expect(pantryStockForIngredient("tomato paste", stock)).toBe(5); // 2 + 3, not the chopped tomatoes
  });

  it("returns 0 when nothing matches", () => {
    expect(pantryStockForIngredient("ground cumin", stock)).toBe(0);
  });

  it("matches a qualified ingredient", () => {
    expect(pantryStockForIngredient("2 medium eggplants", stock)).toBe(4);
  });
});
