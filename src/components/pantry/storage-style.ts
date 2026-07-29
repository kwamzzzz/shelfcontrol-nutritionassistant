import type { LucideIcon } from "lucide-react";
import { ChefHat, Droplets, LayoutGrid, Leaf, Package, Snowflake } from "lucide-react";

export type StorageStyleKey = "All" | "Fridge" | "Freezer" | "Pantry" | "Counter" | "Other";

interface StorageStyle {
  icon: LucideIcon;
  activeChip: string;
  inactiveChip: string;
  panel: string;
  accent: string;
  detail: string;
}

export const STORAGE_STYLES: Record<StorageStyleKey, StorageStyle> = {
  All: {
    icon: LayoutGrid,
    activeChip: "border-primary/25 bg-primary text-primary-foreground shadow-md shadow-primary/15",
    inactiveChip: "border-border bg-card text-secondary-foreground hover:bg-secondary/65",
    panel: "border-border/70 bg-card/35",
    accent: "text-primary",
    detail: "Everything in one calm view",
  },
  Fridge: {
    icon: Droplets,
    activeChip: "border-cyan-300/70 bg-gradient-to-br from-cyan-500 to-sky-600 text-white shadow-md shadow-cyan-500/20",
    inactiveChip: "border-cyan-200/60 bg-cyan-50/80 text-cyan-900 hover:bg-cyan-100 dark:border-cyan-800/60 dark:bg-cyan-950/35 dark:text-cyan-100",
    panel: "border-cyan-200/65 bg-[radial-gradient(circle_at_12%_8%,hsl(188_86%_70%/0.18),transparent_22%),linear-gradient(145deg,hsl(var(--card)),hsl(190_65%_96%/0.72))] dark:border-cyan-900/60 dark:bg-[radial-gradient(circle_at_12%_8%,hsl(188_86%_55%/0.12),transparent_24%),linear-gradient(145deg,hsl(var(--card)),hsl(190_30%_12%))]",
    accent: "text-cyan-600 dark:text-cyan-300",
    detail: "Cool, crisp and ready",
  },
  Freezer: {
    icon: Snowflake,
    activeChip: "border-blue-300/70 bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25",
    inactiveChip: "border-blue-200/70 bg-blue-50/85 text-blue-900 hover:bg-blue-100 dark:border-blue-800/60 dark:bg-blue-950/35 dark:text-blue-100",
    panel: "border-blue-200/70 bg-[radial-gradient(circle_at_90%_0%,hsl(215_95%_76%/0.28),transparent_24%),radial-gradient(circle_at_10%_90%,hsl(190_90%_82%/0.22),transparent_24%),linear-gradient(145deg,hsl(var(--card)),hsl(215_70%_96%/0.78))] dark:border-blue-900/65 dark:bg-[radial-gradient(circle_at_90%_0%,hsl(215_95%_58%/0.15),transparent_25%),linear-gradient(145deg,hsl(var(--card)),hsl(220_34%_12%))]",
    accent: "text-blue-600 dark:text-blue-300",
    detail: "Frost-kept for later",
  },
  Pantry: {
    icon: Package,
    activeChip: "border-amber-300/70 bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/20",
    inactiveChip: "border-amber-200/70 bg-amber-50/85 text-amber-950 hover:bg-amber-100 dark:border-amber-900/65 dark:bg-amber-950/30 dark:text-amber-100",
    panel: "border-amber-200/70 bg-[radial-gradient(circle_at_94%_8%,hsl(36_90%_62%/0.18),transparent_26%),linear-gradient(145deg,hsl(var(--card)),hsl(40_72%_95%/0.82))] dark:border-amber-900/65 dark:bg-[radial-gradient(circle_at_94%_8%,hsl(36_90%_55%/0.12),transparent_28%),linear-gradient(145deg,hsl(var(--card)),hsl(34_28%_13%))]",
    accent: "text-amber-700 dark:text-amber-300",
    detail: "Shelf-stable staples",
  },
  Counter: {
    icon: ChefHat,
    activeChip: "border-orange-300/70 bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-md shadow-orange-500/20",
    inactiveChip: "border-orange-200/70 bg-orange-50/85 text-orange-950 hover:bg-orange-100 dark:border-orange-900/65 dark:bg-orange-950/30 dark:text-orange-100",
    panel: "border-orange-200/70 bg-[linear-gradient(115deg,hsl(28_75%_97%/0.68),transparent_44%),repeating-linear-gradient(90deg,hsl(var(--card)),hsl(var(--card))_36px,hsl(28_45%_94%/0.55)_37px,hsl(28_45%_94%/0.55)_38px)] dark:border-orange-900/60 dark:bg-[linear-gradient(145deg,hsl(var(--card)),hsl(24_26%_13%))]",
    accent: "text-orange-600 dark:text-orange-300",
    detail: "Within easy reach",
  },
  Other: {
    icon: Leaf,
    activeChip: "border-emerald-300/70 bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-md shadow-emerald-500/20",
    inactiveChip: "border-emerald-200/70 bg-emerald-50/85 text-emerald-950 hover:bg-emerald-100 dark:border-emerald-900/65 dark:bg-emerald-950/30 dark:text-emerald-100",
    panel: "border-emerald-200/70 bg-[radial-gradient(circle_at_88%_8%,hsl(145_70%_58%/0.18),transparent_28%),linear-gradient(145deg,hsl(var(--card)),hsl(145_58%_96%/0.76))] dark:border-emerald-900/65 dark:bg-[radial-gradient(circle_at_88%_8%,hsl(145_70%_48%/0.12),transparent_30%),linear-gradient(145deg,hsl(var(--card)),hsl(148_26%_12%))]",
    accent: "text-emerald-600 dark:text-emerald-300",
    detail: "A fresh flexible space",
  },
};

export const getStorageStyle = (location: string | null | undefined) =>
  STORAGE_STYLES[(location && location in STORAGE_STYLES ? location : "Other") as StorageStyleKey];
