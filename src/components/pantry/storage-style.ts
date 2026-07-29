import type { LucideIcon } from "lucide-react";
import { ChefHat, Droplets, LayoutGrid, Leaf, Package, Snowflake } from "lucide-react";

export type StorageStyleKey = "All" | "Fridge" | "Freezer" | "Pantry" | "Counter" | "Other";

interface StorageStyle {
  icon: LucideIcon;
  activeChip: string;
  inactiveChip: string;
  panel: string;
  card: string;
  accent: string;
  detail: string;
}

export const STORAGE_STYLES: Record<StorageStyleKey, StorageStyle> = {
  All: {
    icon: LayoutGrid,
    activeChip: "border-primary/25 bg-primary text-primary-foreground shadow-md shadow-primary/15",
    inactiveChip: "border-border bg-card text-secondary-foreground hover:bg-secondary/65",
    panel: "border-border/70 bg-card/35",
    card: "",
    accent: "text-primary",
    detail: "Everything in one calm view",
  },
  Fridge: {
    icon: Droplets,
    activeChip: "border-cyan-300/70 bg-gradient-to-br from-cyan-500 to-sky-600 text-white shadow-md shadow-cyan-500/20",
    inactiveChip: "border-cyan-200/60 bg-cyan-50/80 text-cyan-900 hover:bg-cyan-100 dark:border-cyan-800/60 dark:bg-cyan-950/35 dark:text-cyan-100",
    panel: "storage-zone storage-zone-fridge border-cyan-300/75 shadow-[0_18px_50px_-38px_rgba(8,145,178,0.65)] dark:border-cyan-700/55",
    card: "border-cyan-200/85 shadow-[0_12px_34px_-28px_rgba(8,145,178,0.7)] dark:border-cyan-800/60",
    accent: "text-cyan-600 dark:text-cyan-300",
    detail: "Cool, crisp and ready",
  },
  Freezer: {
    icon: Snowflake,
    activeChip: "border-blue-300/70 bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25",
    inactiveChip: "border-blue-200/70 bg-blue-50/85 text-blue-900 hover:bg-blue-100 dark:border-blue-800/60 dark:bg-blue-950/35 dark:text-blue-100",
    panel: "storage-zone storage-zone-freezer border-blue-300/75 shadow-[0_18px_55px_-38px_rgba(37,99,235,0.7)] dark:border-blue-700/55",
    card: "border-blue-200/90 shadow-[0_12px_36px_-28px_rgba(37,99,235,0.75)] dark:border-blue-800/60",
    accent: "text-blue-600 dark:text-blue-300",
    detail: "Frost-kept for later",
  },
  Pantry: {
    icon: Package,
    activeChip: "border-amber-300/70 bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/20",
    inactiveChip: "border-amber-200/70 bg-amber-50/85 text-amber-950 hover:bg-amber-100 dark:border-amber-900/65 dark:bg-amber-950/30 dark:text-amber-100",
    panel: "storage-zone storage-zone-pantry border-amber-300/75 shadow-[0_18px_52px_-38px_rgba(180,83,9,0.62)] dark:border-amber-800/60",
    card: "border-amber-200/90 shadow-[0_12px_34px_-28px_rgba(180,83,9,0.7)] dark:border-amber-800/60",
    accent: "text-amber-700 dark:text-amber-300",
    detail: "Shelf-stable staples",
  },
  Counter: {
    icon: ChefHat,
    activeChip: "border-orange-300/70 bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-md shadow-orange-500/20",
    inactiveChip: "border-orange-200/70 bg-orange-50/85 text-orange-950 hover:bg-orange-100 dark:border-orange-900/65 dark:bg-orange-950/30 dark:text-orange-100",
    panel: "storage-zone storage-zone-counter border-stone-300/80 shadow-[0_18px_50px_-38px_rgba(120,53,15,0.58)] dark:border-stone-700/65",
    card: "border-stone-300/80 shadow-[0_12px_34px_-28px_rgba(120,53,15,0.6)] dark:border-stone-700/65",
    accent: "text-orange-700 dark:text-orange-300",
    detail: "Ready on the kitchen worktop",
  },
  Other: {
    icon: Leaf,
    activeChip: "border-emerald-300/70 bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-md shadow-emerald-500/20",
    inactiveChip: "border-emerald-200/70 bg-emerald-50/85 text-emerald-950 hover:bg-emerald-100 dark:border-emerald-900/65 dark:bg-emerald-950/30 dark:text-emerald-100",
    panel: "storage-zone storage-zone-other border-emerald-300/75 shadow-[0_18px_52px_-38px_rgba(5,150,105,0.65)] dark:border-emerald-800/60",
    card: "border-emerald-200/90 shadow-[0_12px_34px_-28px_rgba(5,150,105,0.7)] dark:border-emerald-800/60",
    accent: "text-emerald-600 dark:text-emerald-300",
    detail: "A fresh flexible space",
  },
};

export const getStorageStyle = (location: string | null | undefined) =>
  STORAGE_STYLES[(location && location in STORAGE_STYLES ? location : "Other") as StorageStyleKey];
