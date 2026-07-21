/**
 * Shelf-life & storage intelligence.
 *
 * Estimates how long a food item lasts based on its type, storage location and
 * whether it's sealed or opened, and recommends where to store it. Everything
 * here is derived (nothing new is persisted) — the app writes the resulting
 * expiry_date onto the existing inventory row.
 *
 * Day figures are conservative food-safety guidance (USDA/FSA style), not exact.
 */
import { addDays, parseISO, differenceInCalendarDays, format } from "date-fns";
import { STORAGE_LOCATIONS } from "./pantry-utils";

export type StorageLocation = (typeof STORAGE_LOCATIONS)[number]; // Fridge|Freezer|Pantry|Counter|Other
export type Confidence = "high" | "medium" | "low";
export type SealedStatus = "sealed" | "opened";

// Storage environments we actually have shelf-life data for. "Other" = unknown.
type Env = "Fridge" | "Freezer" | "Pantry" | "Counter";

export interface FoodDef {
  label: string;
  keywords: string[];
  categories?: string[]; // items.category fallbacks
  shelf: Partial<Record<Env, number>>; // days by environment
  recommend: { location: StorageLocation | null; confidence: Confidence };
  openedFactor?: number; // multiplier applied once opened (default 0.6; dry goods ~1)
  openedShelf?: number;  // fixed days once opened, overriding the multiplier (e.g. opened cans)
}

// Ordered most-specific → most-general so keyword matching resolves correctly.
export const FOOD_TYPE_ORDER = [
  "frozen", "ice_cream", "raw_meat", "poultry", "fish_seafood", "cooked_meat",
  "eggs", "milk", "cheese", "yogurt", "butter",
  "leafy_greens", "herbs", "berries", "fruit", "root_vegetables", "vegetables",
  "bread", "rice_grains", "pasta", "flour_baking", "dry_goods",
  "canned", "condiments", "oils", "beverages", "snacks", "spices", "other",
] as const;

export type FoodType = (typeof FOOD_TYPE_ORDER)[number];

export const FOOD_TYPES: Record<FoodType, FoodDef> = {
  frozen: {
    label: "Frozen food", keywords: ["frozen", "freezer"],
    categories: ["Frozen"], shelf: { Freezer: 300, Fridge: 2, Counter: 0 },
    recommend: { location: "Freezer", confidence: "high" }, openedFactor: 0.7,
  },
  ice_cream: {
    label: "Ice cream", keywords: ["ice cream", "gelato", "sorbet"],
    shelf: { Freezer: 90, Fridge: 0 }, recommend: { location: "Freezer", confidence: "high" }, openedFactor: 0.8,
  },
  raw_meat: {
    label: "Raw meat", keywords: ["beef", "pork", "lamb", "veal", "veil", "mince", "minced", "steak", "chop", "ribs", "cube", "brisket", "tail", "chest", "mutton", "goat"],
    categories: ["Meat & Seafood"], shelf: { Counter: 0, Fridge: 2, Freezer: 180 },
    recommend: { location: "Fridge", confidence: "high" }, openedFactor: 0.5,
  },
  poultry: {
    label: "Poultry", keywords: ["chicken", "turkey", "duck", "poultry", "wing", "drumstick", "thigh"],
    shelf: { Counter: 0, Fridge: 2, Freezer: 270 }, recommend: { location: "Fridge", confidence: "high" }, openedFactor: 0.5,
  },
  fish_seafood: {
    label: "Fish & seafood", keywords: ["fish", "salmon", "tuna", "cod", "prawn", "shrimp", "seafood", "crab", "lobster", "squid", "sardine", "mackerel", "tilapia"],
    shelf: { Counter: 0, Fridge: 2, Freezer: 120 }, recommend: { location: "Fridge", confidence: "high" }, openedFactor: 0.5,
  },
  cooked_meat: {
    label: "Cooked / deli meat", keywords: ["ham", "bacon", "sausage", "salami", "deli", "cold cut", "hot dog", "pepperoni", "cooked meat", "pastrami"],
    shelf: { Counter: 0, Fridge: 5, Freezer: 60 }, recommend: { location: "Fridge", confidence: "high" }, openedFactor: 0.5,
  },
  eggs: {
    label: "Eggs", keywords: ["egg"], shelf: { Counter: 7, Fridge: 35 },
    recommend: { location: "Fridge", confidence: "high" }, openedFactor: 0.7,
  },
  milk: {
    label: "Milk & cream", keywords: ["milk", "cream", "buttermilk"],
    categories: ["Dairy"], shelf: { Counter: 1, Fridge: 7, Freezer: 90 },
    recommend: { location: "Fridge", confidence: "high" }, openedFactor: 0.6,
  },
  cheese: {
    label: "Cheese", keywords: ["cheese", "cheddar", "mozzarella", "feta", "brie", "parmesan", "gouda", "halloumi"],
    shelf: { Counter: 2, Fridge: 21, Freezer: 120 }, recommend: { location: "Fridge", confidence: "high" }, openedFactor: 0.6,
  },
  yogurt: {
    label: "Yogurt", keywords: ["yogurt", "yoghurt", "labneh", "kefir"],
    shelf: { Counter: 1, Fridge: 14, Freezer: 60 }, recommend: { location: "Fridge", confidence: "high" }, openedFactor: 0.6,
  },
  butter: {
    label: "Butter", keywords: ["butter", "margarine", "ghee"],
    shelf: { Counter: 7, Fridge: 60, Freezer: 270 }, recommend: { location: "Fridge", confidence: "high" }, openedFactor: 0.8,
  },
  leafy_greens: {
    label: "Leafy greens", keywords: ["lettuce", "spinach", "kale", "arugula", "rocket", "salad", "cabbage", "chard", "greens", "coriander leaf"],
    shelf: { Counter: 2, Fridge: 7, Freezer: 240 }, recommend: { location: "Fridge", confidence: "high" }, openedFactor: 0.6,
  },
  herbs: {
    label: "Fresh herbs", keywords: ["basil", "mint", "coriander", "cilantro", "parsley", "dill", "thyme", "rosemary", "herb", "spring onion", "chive"],
    shelf: { Counter: 2, Fridge: 7, Freezer: 120 }, recommend: { location: "Fridge", confidence: "high" }, openedFactor: 0.6,
  },
  berries: {
    label: "Berries", keywords: ["strawberry", "blueberry", "raspberry", "blackberry", "cherry", "berry", "cranberry"],
    shelf: { Counter: 1, Fridge: 5, Freezer: 300 }, recommend: { location: "Fridge", confidence: "high" }, openedFactor: 0.6,
  },
  fruit: {
    label: "Fruit", keywords: ["apple", "banana", "orange", "mango", "pear", "grape", "melon", "pineapple", "peach", "plum", "kiwi", "avocado", "lemon", "lime", "pomegranate", "fruit", "fig", "apricot", "guava", "rambutan", "rhumbutan", "rhumbtan", "papaya", "lychee", "dragonfruit"],
    shelf: { Counter: 5, Fridge: 14, Freezer: 240, Pantry: 7 }, recommend: { location: "Fridge", confidence: "medium" }, openedFactor: 0.6,
  },
  root_vegetables: {
    label: "Root vegetables", keywords: ["potato", "onion", "garlic", "ginger", "carrot", "beet", "beetroot", "radish", "raddish", "turnip", "sweet potato", "yam", "squash", "pumpkin", "cassava"],
    shelf: { Counter: 14, Fridge: 30, Freezer: 240, Pantry: 30 }, recommend: { location: "Pantry", confidence: "medium" }, openedFactor: 0.8,
  },
  vegetables: {
    label: "Vegetables", keywords: ["tomato", "pepper", "cucumber", "courgette", "zucchini", "eggplant", "aubergine", "broccoli", "cauliflower", "bean", "pea", "corn", "mushroom", "celery", "okra", "leek", "asparagus", "brussel", "vegetable"],
    categories: ["Produce"], shelf: { Counter: 4, Fridge: 10, Freezer: 240 }, recommend: { location: "Fridge", confidence: "medium" }, openedFactor: 0.7,
  },
  bread: {
    label: "Bread & bakery", keywords: ["bread", "loaf", "bun", "bagel", "roll", "pita", "tortilla", "croissant", "cake", "pastry", "muffin", "baguette"],
    shelf: { Counter: 4, Fridge: 14, Freezer: 90, Pantry: 5 }, recommend: { location: "Pantry", confidence: "medium" }, openedFactor: 0.7,
  },
  rice_grains: {
    label: "Rice & grains", keywords: ["rice", "quinoa", "oat", "barley", "couscous", "bulgur", "cereal", "grain", "millet"],
    categories: ["Grains & Bread"], shelf: { Pantry: 720, Counter: 365 }, recommend: { location: "Pantry", confidence: "high" }, openedFactor: 0.9,
  },
  pasta: {
    label: "Pasta & noodles", keywords: ["pasta", "noodle", "spaghetti", "macaroni", "penne", "vermicelli"],
    shelf: { Pantry: 720, Counter: 365 }, recommend: { location: "Pantry", confidence: "high" }, openedFactor: 0.9,
  },
  flour_baking: {
    label: "Flour & baking", keywords: ["flour", "sugar", "baking powder", "baking soda", "yeast", "cocoa", "cornstarch"],
    categories: ["Baking"], shelf: { Pantry: 365, Counter: 180 }, recommend: { location: "Pantry", confidence: "high" }, openedFactor: 0.9,
  },
  dry_goods: {
    label: "Dry goods", keywords: ["lentil", "chickpea", "dried", "nut", "seed", "raisin", "date", "almond", "cashew", "walnut", "peanut", "bean dry"],
    shelf: { Pantry: 365, Counter: 240 }, recommend: { location: "Pantry", confidence: "high" }, openedFactor: 0.9,
  },
  canned: {
    label: "Canned & jarred", keywords: ["can", "canned", "tin", "tinned", "jar", "preserve"],
    categories: ["Canned Goods"], shelf: { Pantry: 730, Counter: 365 }, recommend: { location: "Pantry", confidence: "high" }, openedShelf: 4,
  },
  condiments: {
    label: "Condiments", keywords: ["ketchup", "mustard", "mayo", "mayonnaise", "sauce", "dressing", "jam", "honey", "vinegar", "syrup", "paste", "chutney", "pickle"],
    categories: ["Condiments"], shelf: { Pantry: 365, Fridge: 180, Counter: 180 }, recommend: { location: "Pantry", confidence: "medium" }, openedFactor: 0.7,
  },
  oils: {
    label: "Oils", keywords: ["oil", "olive oil"], shelf: { Pantry: 365, Counter: 180 },
    recommend: { location: "Pantry", confidence: "high" }, openedFactor: 0.9,
  },
  beverages: {
    label: "Beverages", keywords: ["juice", "soda", "water", "drink", "cola", "tea", "coffee"],
    categories: ["Beverages"], shelf: { Fridge: 14, Pantry: 180, Counter: 90 }, recommend: { location: "Pantry", confidence: "medium" }, openedFactor: 0.5,
  },
  snacks: {
    label: "Snacks", keywords: ["chip", "crisp", "biscuit", "cookie", "cracker", "chocolate", "candy", "snack", "popcorn"],
    categories: ["Snacks"], shelf: { Pantry: 120, Counter: 90 }, recommend: { location: "Pantry", confidence: "medium" }, openedFactor: 0.6,
  },
  spices: {
    label: "Spices", keywords: ["spice", "salt", "cumin", "paprika", "turmeric", "cinnamon", "masala", "seasoning"],
    categories: ["Spices"], shelf: { Pantry: 730, Counter: 365 }, recommend: { location: "Pantry", confidence: "high" }, openedFactor: 1,
  },
  other: {
    label: "Other", keywords: [], shelf: {}, recommend: { location: null, confidence: "low" },
  },
};

const CATEGORY_FALLBACK: Record<string, FoodType> = {
  "Dairy": "milk", "Produce": "vegetables", "Meat & Seafood": "raw_meat",
  "Grains & Bread": "bread", "Canned Goods": "canned", "Frozen": "frozen",
  "Snacks": "snacks", "Beverages": "beverages", "Condiments": "condiments",
  "Spices": "spices", "Baking": "flour_baking",
};

export interface Classification {
  type: FoodType;
  def: FoodDef;
  matchedBy: "name" | "category" | "none";
}

// Word-level match with light plural handling — avoids substring collisions like
// "can"→candy, "corn"→popcorn, "pea"→peanut, "ham"→graham, "butter"→butternut,
// while still catching plurals ("tomatoes"→tomato, "berries"→berry). Multi-word
// keywords ("ice cream", "olive oil") are matched as a phrase substring.
const wordMatches = (word: string, kw: string): boolean => {
  if (word === kw || word === kw + "s" || word === kw + "es") return true;
  if (kw.endsWith("y") && word === kw.slice(0, -1) + "ies") return true;
  return false;
};

function nameMatchesKeyword(words: string[], full: string, kw: string): boolean {
  if (kw.includes(" ")) return full.includes(kw); // phrase
  return words.some((w) => wordMatches(w, kw));
}

/** Classify a food from its item name (preferred) then its catalog category. */
export function classifyFood(name: string | null | undefined, category?: string | null): Classification {
  const n = (name ?? "").toLowerCase();
  if (n) {
    const words = n.split(/[^a-z]+/).filter(Boolean);
    for (const type of FOOD_TYPE_ORDER) {
      const def = FOOD_TYPES[type];
      if (def.keywords.some((k) => nameMatchesKeyword(words, n, k))) {
        return { type, def, matchedBy: "name" };
      }
    }
  }
  if (category && CATEGORY_FALLBACK[category]) {
    const type = CATEGORY_FALLBACK[category];
    return { type, def: FOOD_TYPES[type], matchedBy: "category" };
  }
  return { type: "other", def: FOOD_TYPES.other, matchedBy: "none" };
}

/**
 * Estimated shelf life in whole days for a given food type + storage location +
 * condition. Returns null when we have no reliable figure (unknown food, or an
 * "Other"/unconfirmed location).
 */
export function estimateShelfLifeDays(
  type: FoodType,
  location: StorageLocation | null,
  sealed: SealedStatus = "sealed",
): number | null {
  if (!location || location === "Other") return null;
  const def = FOOD_TYPES[type];
  let days = def.shelf[location as Env];
  if (days == null) {
    // Fall back across sensible neighbours so a partial table still answers.
    const order: Env[] = ["Pantry", "Counter", "Fridge", "Freezer"];
    for (const e of order) {
      if (def.shelf[e] != null) { days = def.shelf[e]; break; }
    }
  }
  if (days == null) return null;
  if (sealed === "opened") {
    // Some items (e.g. canned) drop to a short fixed life once opened, regardless
    // of their long sealed life — a multiplier can't bridge 730d → a few days.
    if (def.openedShelf != null) return def.openedShelf;
    days = Math.max(1, Math.round(days * (def.openedFactor ?? 0.6)));
  }
  return days;
}

export function recommendStorage(type: FoodType): { location: StorageLocation | null; confidence: Confidence } {
  return FOOD_TYPES[type].recommend;
}

/** Compute an ISO date (yyyy-mm-dd) `days` after the logged/added date. */
export function estimateExpiryDate(addedAtISO: string, days: number): string {
  // Format in local time (not UTC) so the calendar date is right in +GMT zones.
  return format(addDays(parseISO(addedAtISO), days), "yyyy-MM-dd");
}

/** Derive the current shelf-life (days) implied by a stored expiry vs the added date. */
export function daysFromDates(addedAtISO: string, expiryISO: string): number {
  // Calendar-day counting matches estimateExpiryDate (addDays + local yyyy-MM-dd),
  // so the round-trip is exact even though added_at carries a time-of-day.
  return differenceInCalendarDays(parseISO(expiryISO), parseISO(addedAtISO));
}
