import { gramsFor, normalizeNutritionUnit, type NutritionItemLike } from "@/lib/nutrition";

/**
 * The recipe-exchange file Shelf Control and Medfolio both read: Shelf Control's own
 * recipe fields (name, servings, instructions, tags, source_url, ingredients with
 * quantity and unit, nutrition per serving). Grams and per-100 g values are added for
 * an ingredient only when its item is measured per 100 g and the unit converts to grams;
 * otherwise they are left out rather than guessed.
 */

export interface ExchangeNutrition {
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
}

export interface RecipeExchangeFile {
  format: "recipe-exchange";
  version: 1;
  app: "shelfcontrol";
  exportedAt: string;
  recipes: {
    name: string;
    servings: number;
    instructions: string | null;
    tags: string[];
    source_url: string | null;
    ingredients: { name: string; quantity: number | null; unit: string | null; grams?: number; nutrition_per_100g?: ExchangeNutrition }[];
    nutrition_per_serving?: ExchangeNutrition;
  }[];
}

type ItemLike = NutritionItemLike & { name: string };
type RecipeLike = {
  name: string;
  servings: number | null;
  instructions: string | null;
  tags?: string[] | null;
  source_url?: string | null;
  calories_per_serving?: number | null;
  protein_g_per_serving?: number | null;
  carbs_g_per_serving?: number | null;
  fat_g_per_serving?: number | null;
  fiber_g_per_serving?: number | null;
  sugar_g_per_serving?: number | null;
  sodium_mg_per_serving?: number | null;
  recipe_ingredients: { quantity: number | null; unit: string | null; items: ItemLike | null }[];
};

const n = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : undefined);
const tidy = (x: ExchangeNutrition): ExchangeNutrition =>
  Object.fromEntries(Object.entries(x).filter(([, v]) => v !== undefined)) as ExchangeNutrition;

function per100(item: ItemLike): ExchangeNutrition | undefined {
  const calories = n(item.calories_per_unit);
  if (calories === undefined) return undefined;
  return tidy({ calories, protein_g: n(item.protein_g), carbs_g: n(item.carbs_g), fat_g: n(item.fat_g), fiber_g: n(item.fiber_g), sugar_g: n(item.sugar_g), sodium_mg: n(item.sodium_mg) });
}

export function toRecipeExchange(recipes: RecipeLike[], now = new Date()): RecipeExchangeFile {
  return {
    format: "recipe-exchange",
    version: 1,
    app: "shelfcontrol",
    exportedAt: now.toISOString(),
    recipes: recipes.map((r) => {
      const perServing = n(r.calories_per_serving) !== undefined
        ? tidy({ calories: n(r.calories_per_serving), protein_g: n(r.protein_g_per_serving), carbs_g: n(r.carbs_g_per_serving), fat_g: n(r.fat_g_per_serving), fiber_g: n(r.fiber_g_per_serving), sugar_g: n(r.sugar_g_per_serving), sodium_mg: n(r.sodium_mg_per_serving) })
        : undefined;
      return {
        name: r.name,
        servings: r.servings && r.servings > 0 ? r.servings : 1,
        instructions: r.instructions?.trim() || null,
        tags: r.tags ?? [],
        source_url: r.source_url ?? null,
        ingredients: r.recipe_ingredients.map((ing) => {
          const item = ing.items;
          const base = { name: item?.name ?? "Ingredient", quantity: ing.quantity ?? null, unit: ing.unit ?? null };
          if (!item || item.nutrition_basis !== "per_100g" || !ing.quantity) return base;
          const grams = gramsFor(ing.quantity, normalizeNutritionUnit(ing.unit ?? item.default_unit), item);
          const values = per100(item);
          return grams && values ? { ...base, grams: Math.round(grams * 100) / 100, nutrition_per_100g: values } : base;
        }),
        ...(perServing ? { nutrition_per_serving: perServing } : {}),
      };
    }),
  };
}

/** Downloads the file for opening in Medfolio (Wellness › Recipes › Import). */
export function downloadRecipeExchange(recipes: RecipeLike[]) {
  const blob = new Blob([JSON.stringify(toRecipeExchange(recipes), null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `shelf-control-${new Date().toISOString().slice(0, 10)}.recipes.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
