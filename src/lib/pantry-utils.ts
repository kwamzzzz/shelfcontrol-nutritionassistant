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

export const UNITS = [
  "unit",
  "g",
  "kg",
  "ml",
  "L",
  "oz",
  "lb",
  "cup",
  "tbsp",
  "tsp",
] as const;
