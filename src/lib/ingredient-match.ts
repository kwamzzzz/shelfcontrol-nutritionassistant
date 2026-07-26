/**
 * Smart matching between a recipe ingredient and a pantry catalogue item.
 *
 * Recipes (especially parsed ones) name things loosely — "medium eggplants",
 * "vegetable oil (for frying)", "Al Ain Tomato Paste". Matching by catalogue id
 * misses all of that. Instead we normalise both names and match when every
 * meaningful word of the ingredient is present in the item — so "tomato paste"
 * finds "Al Ain Tomato Paste", and "medium eggplants" finds "Eggplant".
 *
 * Conservative by design (all words must be present), but token matching can't
 * fully disambiguate food names: a bare "pepper" still matches "bell pepper"
 * because the word is contained. That's a known limit, not a bug.
 */

/** Size / preparation / filler words that don't change what the item *is*. */
const QUALIFIER_WORDS = new Set([
  // size
  "small", "medium", "large", "extra", "jumbo", "mini", "big", "tiny", "baby",
  // preparation / state
  "fresh", "ripe", "raw", "cooked", "dried", "frozen", "canned", "chopped",
  "sliced", "diced", "minced", "ground", "grated", "shredded", "crushed",
  "whole", "halved", "peeled", "thinly", "thickly", "finely", "roughly",
  "coarsely", "cut", "boneless", "skinless", "lean", "light",
  // fillers
  "of", "the", "a", "an", "for", "frying", "optional", "plus", "if", "needed",
  "to", "taste", "and", "or", "with", "in", "into", "your", "some", "few",
]);

/** Very small singulariser — enough for grocery nouns, not a linguistics engine. */
const singularize = (word: string): string => {
  if (word.length <= 3) return word;
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.endsWith("oes")) return word.slice(0, -2);
  if (word.endsWith("ss")) return word;
  if (word.endsWith("s")) return word.slice(0, -1);
  return word;
};

/** Normalise a food name to its meaningful, singularised tokens. */
export const normalizeName = (name: string): string[] => {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ") // drop parentheticals like "(for frying)"
    .replace(/[^a-z0-9\s]/g, " ") // punctuation → space
    .split(/\s+/)
    .filter(Boolean)
    .map(singularize)
    .filter((t) => t.length > 1 && !QUALIFIER_WORDS.has(t));
};

/**
 * True when every meaningful word of `ingredientName` is present in
 * `itemName`. Direction matters: the ingredient is the query, the pantry item
 * is the candidate, so a branded/longer item name still matches a plainer
 * ingredient.
 */
export const ingredientMatchesItem = (ingredientName: string, itemName: string): boolean => {
  const ingredientTokens = normalizeName(ingredientName);
  if (ingredientTokens.length === 0) return false;
  const itemTokens = new Set(normalizeName(itemName));
  return ingredientTokens.every((t) => itemTokens.has(t));
};

export interface NamedStock {
  name: string;
  quantity: number;
}

/**
 * Total pantry quantity for everything that name-matches this ingredient,
 * summed across all matching catalogue items and batches.
 */
export const pantryStockForIngredient = (
  ingredientName: string,
  stock: NamedStock[],
): number => {
  let total = 0;
  for (const row of stock) {
    if (ingredientMatchesItem(ingredientName, row.name)) total += row.quantity;
  }
  return total;
};
