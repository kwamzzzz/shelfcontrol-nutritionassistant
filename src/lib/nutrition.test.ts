import { describe, expect, it } from "vitest";
import { calculateNutrition, normalizeNutritionUnit, nutritionMultiplier } from "@/lib/nutrition";

const tomato = {
  calories_per_unit: 18,
  protein_g: 0.88,
  carbs_g: 3.89,
  fat_g: 0.2,
  fiber_g: 1.2,
  sugar_g: 2.63,
  sodium_mg: 5,
  nutrition_basis: "per_100g",
  nutrition_grams_per_unit: 123,
  default_unit: "kg",
};

describe("nutrition quantity conversion", () => {
  it("converts kilograms to a per-100g basis", () => {
    expect(nutritionMultiplier(tomato, 1, "kg")).toBe(10);
    expect(calculateNutrition(tomato, 1, "kg").calories).toBe(180);
  });

  it("uses an estimated piece weight for unit quantities", () => {
    expect(nutritionMultiplier(tomato, 2, "pieces")).toBeCloseTo(2.46);
    expect(calculateNutrition(tomato, 2, "pieces").calories).toBeCloseTo(44.28);
  });

  it("does not invent a conversion for an unknown pack size", () => {
    expect(nutritionMultiplier({ ...tomato, nutrition_grams_per_unit: null }, 1, "pack")).toBe(0);
  });

  it("converts household volume units to per-100ml", () => {
    const milk = {
      calories_per_unit: 61,
      nutrition_basis: "per_100ml",
      default_unit: "L",
    };
    expect(calculateNutrition(milk, 0.25, "L").calories).toBeCloseTo(152.5);
    expect(calculateNutrition(milk, 1, "cup").calories).toBeCloseTo(146.4);
  });

  it("normalizes common pantry unit spelling variants", () => {
    expect(normalizeNutritionUnit("Peices")).toBe("unit");
    expect(normalizeNutritionUnit("Packet")).toBe("unit");
    expect(normalizeNutritionUnit("Litres")).toBe("l");
  });
});
