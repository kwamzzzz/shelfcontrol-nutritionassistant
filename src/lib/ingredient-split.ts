/**
 * Split combined ingredient lines into separate ingredients.
 *
 * Imported recipes often list "salt and pepper" as one line; the pantry tracks
 * them separately, so recognition and deduction need them apart. Done
 * conservatively — only a clean "A and B" (or "A & B") where each side is a
 * short, plausible ingredient — so "macaroni and cheese" style compounds and
 * quantified phrases ("2 cups flour and…") are left intact.
 */

export interface SplittableIngredient {
  name: string;
  quantity: number | null;
  unit: string | null;
}

const MAX_WORDS_PER_SIDE = 2;

const looksLikeIngredient = (part: string): boolean => {
  const trimmed = part.trim();
  if (!trimmed) return false;
  const words = trimmed.split(/\s+/);
  if (words.length > MAX_WORDS_PER_SIDE) return false;
  // Reject if it starts with a number — that's a quantified phrase, not a pair.
  return !/^\d/.test(trimmed);
};

/** Split one name into parts on " and " / " & ", or return [name] unchanged. */
export const splitCombinedName = (name: string): string[] => {
  const parts = name.split(/\s+(?:and|&)\s+/i).map((p) => p.trim());
  if (parts.length !== 2) return [name.trim()];
  if (!parts.every(looksLikeIngredient)) return [name.trim()];
  return parts;
};

/**
 * Expand a list of imported ingredients, splitting combined lines. A split
 * drops the shared quantity/unit — a combined pair rarely carries a clean
 * per-item amount (usually "to taste").
 */
export const splitCombinedIngredients = <T extends SplittableIngredient>(
  ingredients: T[],
): T[] => {
  const out: T[] = [];
  for (const ing of ingredients) {
    const parts = splitCombinedName(ing.name);
    if (parts.length === 1) {
      out.push(ing);
    } else {
      for (const name of parts) {
        out.push({ ...ing, name, quantity: null, unit: null });
      }
    }
  }
  return out;
};
