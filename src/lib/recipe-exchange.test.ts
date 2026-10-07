import { describe, expect, it } from "vitest";
import { toRecipeExchange } from "./recipe-exchange";

const item = (over: Record<string, unknown>) => ({
  id: "i", name: "Item", calories_per_unit: null, protein_g: null, carbs_g: null, fat_g: null, fiber_g: null, sugar_g: null, sodium_mg: null,
  nutrition_basis: "per_unit", nutrition_grams_per_unit: null, nutrition_ml_per_unit: null, default_unit: "unit", ...over,
});

const recipe = {
  id: "r1", name: "Jollof rice", servings: 6, instructions: "Fry the base, add rice.", tags: ["Ghanaian"], source_url: null,
  calories_per_serving: 380, protein_g_per_serving: 8, carbs_g_per_serving: 62, fat_g_per_serving: 11, fiber_g_per_serving: 2, sugar_g_per_serving: 4, sodium_mg_per_serving: 520,
  recipe_ingredients: [
    { quantity: 500, unit: "g", items: item({ name: "Rice, white", nutrition_basis: "per_100g", calories_per_unit: 360, protein_g: 7, carbs_g: 79, fat_g: 0.6, fiber_g: 1.3, sugar_g: 0.1, sodium_mg: 5 }) },
    { quantity: 2, unit: "unit", items: item({ name: "Onion", nutrition_basis: "per_100g", calories_per_unit: 40, nutrition_grams_per_unit: 110 }) },
    { quantity: 1, unit: "tin", items: item({ name: "Tomato paste", nutrition_basis: "per_unit", calories_per_unit: 120 }) },
  ],
};

describe("Recipe exchange (for Medfolio)", () => {
  it("writes the shared format with per-serving nutrition", () => {
    const file = toRecipeExchange([recipe as never], new Date("2026-10-08T00:00:00Z"));
    expect(file).toMatchObject({ format: "recipe-exchange", version: 1, app: "shelfcontrol", exportedAt: "2026-10-08T00:00:00.000Z" });
    expect(file.recipes[0]).toMatchObject({
      name: "Jollof rice", servings: 6, instructions: "Fry the base, add rice.", tags: ["Ghanaian"], source_url: null,
      nutrition_per_serving: { calories: 380, protein_g: 8, carbs_g: 62, fat_g: 11, fiber_g: 2, sugar_g: 4, sodium_mg: 520 },
    });
  });

  it("gives grams and per-100 g values only where the item's basis allows", () => {
    const [rice, onion, paste] = toRecipeExchange([recipe as never]).recipes[0].ingredients;
    expect(rice).toEqual({ name: "Rice, white", quantity: 500, unit: "g", grams: 500, nutrition_per_100g: { calories: 360, protein_g: 7, carbs_g: 79, fat_g: 0.6, fiber_g: 1.3, sugar_g: 0.1, sodium_mg: 5 } });
    expect(onion).toEqual({ name: "Onion", quantity: 2, unit: "unit", grams: 220, nutrition_per_100g: { calories: 40 } });
    expect(paste).toEqual({ name: "Tomato paste", quantity: 1, unit: "tin" });
  });

  it("leaves out per-serving nutrition that was never worked out", () => {
    const bare = { ...recipe, calories_per_serving: null, servings: null };
    const out = toRecipeExchange([bare as never]).recipes[0];
    expect(out.nutrition_per_serving).toBeUndefined();
    expect(out.servings).toBe(1);
  });
});
