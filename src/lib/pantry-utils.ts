import { differenceInDays, parseISO } from "date-fns";

export type ExpiryStatus = "fresh" | "expiring" | "expired" | "no-date";

export const getExpiryStatus = (expiryDate: string | null): ExpiryStatus => {
  if (!expiryDate) return "no-date";
  const days = differenceInDays(parseISO(expiryDate), new Date());
  if (days < 0) return "expired";
  if (days <= 3) return "expiring";
  return "fresh";
};

export const getExpiryLabel = (expiryDate: string | null): string => {
  if (!expiryDate) return "No expiry";
  const days = differenceInDays(parseISO(expiryDate), new Date());
  if (days < 0) return `Expired ${Math.abs(days)}d ago`;
  if (days === 0) return "Expires today";
  if (days === 1) return "Expires tomorrow";
  return `${days}d left`;
};

export const CATEGORIES = [
  "Dairy",
  "Produce",
  "Meat & Seafood",
  "Grains & Bread",
  "Canned Goods",
  "Frozen",
  "Snacks",
  "Beverages",
  "Condiments",
  "Spices",
  "Baking",
  "Other",
] as const;

export const STORAGE_LOCATIONS = [
  "Fridge",
  "Freezer",
  "Pantry",
  "Counter",
  "Other",
] as const;

/* ── Grouped Unit System ─────────────────────────── */

export interface UnitGroup {
  label: string;
  units: string[];
}

export const UNIT_GROUPS: UnitGroup[] = [
  {
    label: "Count",
    units: ["Piece", "Item", "Unit", "Slice", "Portion", "Serving", "Pack", "Packet", "Sachet", "Stick"],
  },
  {
    label: "Cooking Measures",
    units: ["Pinch", "Dash", "Drop", "tsp", "tbsp", "Dessert spoon", "Scoop", "Ladle"],
  },
  {
    label: "Volume",
    units: ["ml", "L", "fl oz", "Cup", "Pint", "Quart", "Gallon"],
  },
  {
    label: "Weight",
    units: ["mg", "g", "kg", "oz", "lb", "Tonne"],
  },
  {
    label: "Packaging",
    units: ["Box", "Carton", "Bottle", "Can", "Jar", "Tub", "Tray", "Bag", "Pouch", "Container", "Crate", "Case"],
  },
  {
    label: "Food-Specific",
    units: ["Loaf", "Fillet", "Clove", "Head", "Bunch", "Stalk", "Ear", "Block", "Cube"],
  },
  {
    label: "Bulk / Retail",
    units: ["Bundle", "Dozen", "Half-dozen", "Score", "Pair", "Set", "Lot"],
  },
  {
    label: "Prepared / Serving",
    units: ["Plate", "Bowl", "Glass", "Cup (serving)", "Meal"],
  },
];

/** Flat list of all units for compatibility */
export const UNITS: string[] = UNIT_GROUPS.flatMap((g) => g.units);

export const SEALED_STATUS_OPTIONS = ["sealed", "opened"] as const;
export type SealedStatus = (typeof SEALED_STATUS_OPTIONS)[number];
