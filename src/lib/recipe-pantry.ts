import type { InventoryRow } from "@/hooks/usePantry";
import type { Ingredient } from "@/data/cookbookMockData";
import { ingredientMatchesItem, normalizeName } from "@/lib/ingredient-match";
import { UNITS, getIngredientAvailability, type IngredientAvailability } from "@/lib/pantry-utils";

/**
 * The arithmetic behind "what does this recipe need, and what's actually in my
 * kitchen". Kept pure and dependency-light so the numbers on the ingredient
 * badge, in the pantry sheet, and on the shopping list can never disagree —
 * they are all derived here.
 */

export interface IngredientNeed {
  ingredient: Ingredient;
  /** What the recipe needs at the CURRENT servings scale (the displayed value). */
  scaledQty: number | null;
  /** Total pantry quantity across every matching batch. */
  available: number;
  /** null when the ingredient has no catalogue link — keeps the badge gated. */
  status: IngredientAvailability | null;
  /** How much more is needed than the pantry holds; 0 when covered. */
  shortfall: number;
  /** Matching pantry batches, oldest first — the order cooking draws them down. */
  batches: InventoryRow[];
}

/** Units that count whole things, so a shopping quantity is meaningful. */
const COUNT_UNITS = new Set([
  "piece", "item", "unit", "slice", "portion", "serving",
  "pack", "packet", "sachet", "stick",
]);

/** servings / baseServings, guarded. Never 0, Infinity or NaN. */
export const safeScale = (servings: number, baseServings: number): number => {
  const s = Number(servings);
  const base = Number(baseServings);
  if (!Number.isFinite(s) || s <= 0) return 1;
  if (!Number.isFinite(base) || base <= 0) return 1;
  return s / base;
};

export const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Map a recipe's free-text unit onto the app's canonical unit list so a unit
 * picker can actually show it ("pieces" -> "Piece"). Unrecognised units are
 * returned untouched rather than discarded.
 */
export const canonicalUnit = (unit: string | null | undefined): string => {
  const raw = (unit ?? "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  const singular = lower.length > 3 && lower.endsWith("s") ? lower.slice(0, -1) : lower;
  const match = UNITS.find((u) => {
    const canonical = u.toLowerCase();
    return canonical === lower || canonical === singular;
  });
  return match ?? raw;
};

/**
 * Batches whose catalogue item matches this ingredient by name, oldest first.
 * Uses the identical predicate as the availability badge and the cookbook
 * deduction, so "what you see" and "what gets used" are the same set.
 */
export const pantryBatchesForIngredient = (
  ingredientName: string,
  rows: InventoryRow[] | undefined,
): InventoryRow[] =>
  (rows ?? [])
    .filter((r) => ingredientMatchesItem(ingredientName, r.items?.name ?? ""))
    .slice()
    .sort((a, b) => String(a.added_at ?? "").localeCompare(String(b.added_at ?? "")));

export const batchesTotal = (batches: InventoryRow[]): number =>
  batches.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);

/** Distinct units present across batches, lowercased, first-seen order. */
export const batchUnits = (batches: InventoryRow[]): string[] => {
  const seen: string[] = [];
  for (const r of batches) {
    const u = (r.unit ?? "").trim().toLowerCase();
    if (u && !seen.includes(u)) seen.push(u);
  }
  return seen;
};

export const computeIngredientNeeds = (
  ingredients: Ingredient[],
  inventory: InventoryRow[] | undefined,
  scale: number,
): IngredientNeed[] =>
  ingredients.map((ingredient) => {
    const batches = pantryBatchesForIngredient(ingredient.name, inventory);
    const available = batchesTotal(batches);
    const scaledQty =
      ingredient.quantity != null ? round2(ingredient.quantity * scale) : null;
    const status =
      ingredient.item_id != null ? getIngredientAvailability(scaledQty, available) : null;
    const shortfall = scaledQty != null ? Math.max(0, round2(scaledQty - available)) : 0;
    return { ingredient, scaledQty, available, status, shortfall, batches };
  });

/**
 * Convert an amount the user typed at the current servings scale back to the
 * recipe's base amount, which is what gets stored. Returns null when the result
 * would not be a usable positive number.
 */
export const toBaseQuantity = (displayQty: number, scale: number): number | null => {
  const qty = Number(displayQty);
  if (!Number.isFinite(qty) || qty <= 0) return null;
  const s = Number(scale);
  if (!Number.isFinite(s) || s <= 0) return null;
  const base = round2(qty / s);
  return base > 0 ? base : null;
};

/**
 * shopping_list has no unit column, so a measured amount has to live in the
 * name. Countable units keep a real quantity; measured ones are folded into the
 * label with quantity 1 — the list multiplies cost by quantity, so "200 ml"
 * must never become quantity 200.
 */
export const toShoppingLine = (
  name: string,
  amount: number,
  unit: string,
): { name: string; quantity: number } => {
  const clean = (unit ?? "").trim().toLowerCase();
  // Recipes say "pieces" where the unit list says "Piece".
  const singular = clean.length > 3 && clean.endsWith("s") ? clean.slice(0, -1) : clean;
  const qty = Number(amount);
  const usable = Number.isFinite(qty) && qty > 0 ? qty : 1;

  if (!clean || COUNT_UNITS.has(clean) || COUNT_UNITS.has(singular)) {
    return { name, quantity: Math.max(1, Math.ceil(usable)) };
  }
  return { name: `${name} (${round2(usable)} ${unit.trim()})`, quantity: 1 };
};

/** Symmetric food-name equality — both sides must reduce to the same tokens. */
export const sameFoodName = (a: string, b: string): boolean => {
  const left = normalizeName(a).slice().sort();
  const right = normalizeName(b).slice().sort();
  if (left.length === 0 || left.length !== right.length) return false;
  return left.every((token, i) => token === right[i]);
};

/** True when an equivalent line is already waiting on the shopping list. */
export const shoppingListHasIngredient = (
  openRows: { name: string; item_id: string | null }[],
  draft: { name: string; item_id: string | null },
): boolean =>
  openRows.some((row) => {
    if (draft.item_id && row.item_id && row.item_id === draft.item_id) return true;
    return sameFoodName(row.name, draft.name);
  });
