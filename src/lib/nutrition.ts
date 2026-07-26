export type NutritionBasis = "per_unit" | "per_serving" | "per_100g" | "per_100ml";

export type NutritionField =
  | "calories_per_unit"
  | "protein_g"
  | "carbs_g"
  | "fat_g"
  | "fiber_g"
  | "sugar_g"
  | "sodium_mg";

export interface NutritionItemLike {
  calories_per_unit?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  fiber_g?: number | null;
  sugar_g?: number | null;
  sodium_mg?: number | null;
  nutrition_basis?: string | null;
  nutrition_grams_per_unit?: number | null;
  nutrition_ml_per_unit?: number | null;
  default_unit?: string | null;
}

export interface NutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

export const EMPTY_NUTRITION_TOTALS: NutritionTotals = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
  sugar: 0,
  sodium: 0,
};

const UNIT_ALIASES: Record<string, string> = {
  gram: "g",
  grams: "g",
  kilogram: "kg",
  kilograms: "kg",
  milligram: "mg",
  milligrams: "mg",
  ounce: "oz",
  ounces: "oz",
  pound: "lb",
  pounds: "lb",
  lbs: "lb",
  milliliter: "ml",
  milliliters: "ml",
  millilitre: "ml",
  millilitres: "ml",
  liter: "l",
  liters: "l",
  litre: "l",
  litres: "l",
  teaspoon: "tsp",
  teaspoons: "tsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  cups: "cup",
  pieces: "unit",
  piece: "unit",
  peices: "unit",
  pcs: "unit",
  pc: "unit",
  units: "unit",
  heads: "unit",
  head: "unit",
  bundles: "unit",
  bundle: "unit",
  packs: "unit",
  pack: "unit",
  packets: "unit",
  packet: "unit",
  bowls: "unit",
  bowl: "unit",
  meals: "unit",
  meal: "unit",
  boxes: "unit",
  box: "unit",
};

export const normalizeNutritionUnit = (unit?: string | null) => {
  const normalized = unit?.trim().toLowerCase() || "unit";
  return UNIT_ALIASES[normalized] ?? normalized;
};

const gramsFor = (quantity: number, unit: string, item: NutritionItemLike) => {
  switch (unit) {
    case "mg":
      return quantity / 1000;
    case "g":
      return quantity;
    case "kg":
      return quantity * 1000;
    case "oz":
      return quantity * 28.3495;
    case "lb":
      return quantity * 453.592;
    case "unit": {
      const grams = Number(item.nutrition_grams_per_unit ?? 0);
      return grams > 0 ? quantity * grams : null;
    }
    default:
      return null;
  }
};

const millilitersFor = (quantity: number, unit: string, item: NutritionItemLike) => {
  switch (unit) {
    case "ml":
      return quantity;
    case "l":
      return quantity * 1000;
    case "tsp":
      return quantity * 4.92892;
    case "tbsp":
      return quantity * 14.7868;
    case "cup":
      return quantity * 240;
    case "unit": {
      const milliliters = Number(item.nutrition_ml_per_unit ?? 0);
      return milliliters > 0 ? quantity * milliliters : null;
    }
    default:
      return null;
  }
};

/**
 * Returns the factor that converts a logged quantity into the item's nutrition
 * reference basis. Unknown pack/piece sizes intentionally return 0 rather than
 * inventing a portion.
 */
export const nutritionMultiplier = (
  item: NutritionItemLike | null | undefined,
  quantity: number,
  unit?: string | null,
) => {
  if (!item || !Number.isFinite(quantity) || quantity <= 0) return 0;

  const basis = (item.nutrition_basis ?? "per_unit") as NutritionBasis;
  const normalizedUnit = normalizeNutritionUnit(unit ?? item.default_unit);

  if (basis === "per_100g") {
    const grams = gramsFor(quantity, normalizedUnit, item);
    return grams == null ? 0 : grams / 100;
  }

  if (basis === "per_100ml") {
    const milliliters = millilitersFor(quantity, normalizedUnit, item);
    return milliliters == null ? 0 : milliliters / 100;
  }

  return quantity;
};

export const nutrientAmount = (
  item: NutritionItemLike | null | undefined,
  field: NutritionField,
  quantity: number,
  unit?: string | null,
) => Number(item?.[field] ?? 0) * nutritionMultiplier(item, quantity, unit);

export const calculateNutrition = (
  item: NutritionItemLike | null | undefined,
  quantity: number,
  unit?: string | null,
): NutritionTotals => {
  const multiplier = nutritionMultiplier(item, quantity, unit);
  if (!item || multiplier === 0) return { ...EMPTY_NUTRITION_TOTALS };

  return {
    calories: Number(item.calories_per_unit ?? 0) * multiplier,
    protein: Number(item.protein_g ?? 0) * multiplier,
    carbs: Number(item.carbs_g ?? 0) * multiplier,
    fat: Number(item.fat_g ?? 0) * multiplier,
    fiber: Number(item.fiber_g ?? 0) * multiplier,
    sugar: Number(item.sugar_g ?? 0) * multiplier,
    sodium: Number(item.sodium_mg ?? 0) * multiplier,
  };
};

export const nutritionBasisLabel = (item: NutritionItemLike & { serving_size?: string | null }) => {
  if (item.serving_size?.trim()) return item.serving_size.trim();
  if (item.nutrition_basis === "per_100g") return "Per 100 g";
  if (item.nutrition_basis === "per_100ml") return "Per 100 ml";
  if (item.nutrition_basis === "per_serving") return "Per serving";
  return "Per unit";
};
