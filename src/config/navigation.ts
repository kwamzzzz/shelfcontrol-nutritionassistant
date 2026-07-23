import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, Package, Receipt, Heart, ShoppingCart, UtensilsCrossed,
  BarChart3, Lightbulb, Newspaper, Apple, Sparkles, Users, Mail, Trophy,
  UserCircle, Settings,
} from "lucide-react";

/**
 * Single source of truth for app navigation. The desktop sidebar, the phone
 * bottom navigation, and the "More" sheet all derive from NAV_ITEMS so the two
 * shells never drift apart (mobile-optimization brief → Navigation contract).
 */

export type NavSection = "primary" | "activity" | "intelligence" | "community" | "account";
export type MobileSlot = "home" | "pantry" | "shopping" | "more";
export type DesktopGroup = "MAIN" | "INTELLIGENCE" | "GROUP" | "SYSTEM";

export interface AppNavItem {
  path: string;
  /** Full label — used in the desktop sidebar and the More sheet. */
  label: string;
  /** Compact label for the bottom navigation, when it differs from `label`. */
  shortLabel?: string;
  icon: LucideIcon;
  section: NavSection;
  desktopGroup: DesktopGroup;
  /** Set when this item occupies a fixed bottom-navigation slot. */
  mobileSlot?: Exclude<MobileSlot, "more">;
  /** Extra path prefixes that also mark this item active (e.g. detail routes). */
  activeFor?: string[];
  /** Shows the pending-invitations badge. */
  hasBadge?: boolean;
}

// Order matches the current desktop sidebar exactly, so grouping by `desktopGroup`
// reproduces the existing MAIN / INTELLIGENCE / GROUP / SYSTEM sections and order.
export const NAV_ITEMS: AppNavItem[] = [
  { path: "/",                  label: "Dashboard",           shortLabel: "Home",     icon: LayoutDashboard,  section: "primary",      desktopGroup: "MAIN",         mobileSlot: "home" },
  { path: "/pantry",            label: "Pantry",                                      icon: Package,          section: "primary",      desktopGroup: "MAIN",         mobileSlot: "pantry" },
  { path: "/purchases",         label: "Purchases",           icon: Receipt,          section: "activity",     desktopGroup: "MAIN",         activeFor: ["/purchases"] },
  { path: "/consumption",       label: "Consumption",         icon: Heart,            section: "activity",     desktopGroup: "MAIN" },
  { path: "/shopping",          label: "Shopping List",       shortLabel: "Shopping", icon: ShoppingCart,     section: "primary",      desktopGroup: "MAIN",         mobileSlot: "shopping" },
  { path: "/recipes",           label: "My Cook Book",        shortLabel: "Recipes",  icon: UtensilsCrossed,  section: "activity",     desktopGroup: "MAIN",         activeFor: ["/recipes"] },
  { path: "/analytics",         label: "Analytics",           icon: BarChart3,        section: "intelligence", desktopGroup: "INTELLIGENCE" },
  { path: "/intelligence",      label: "Pantry Intelligence", icon: Lightbulb,        section: "intelligence", desktopGroup: "INTELLIGENCE" },
  { path: "/food-intelligence", label: "Food Intelligence",   icon: Newspaper,        section: "intelligence", desktopGroup: "INTELLIGENCE" },
  { path: "/nutrition",         label: "Nutrition",           icon: Apple,            section: "intelligence", desktopGroup: "INTELLIGENCE" },
  { path: "/coach",             label: "Shelf Coach",         icon: Sparkles,         section: "intelligence", desktopGroup: "INTELLIGENCE" },
  { path: "/groups",            label: "Groups",              icon: Users,            section: "community",    desktopGroup: "GROUP",        activeFor: ["/groups"] },
  { path: "/invitations",       label: "Invitations",         icon: Mail,             section: "community",    desktopGroup: "GROUP",        hasBadge: true },
  { path: "/challenges",        label: "Challenges",          icon: Trophy,           section: "community",    desktopGroup: "GROUP" },
  { path: "/profile",           label: "Profile",             icon: UserCircle,       section: "account",      desktopGroup: "SYSTEM" },
  { path: "/settings",          label: "Settings",            icon: Settings,         section: "account",      desktopGroup: "SYSTEM" },
];

// Desktop sidebar groups, in display order.
export const DESKTOP_GROUPS: { key: DesktopGroup; label: string }[] = [
  { key: "MAIN", label: "MAIN" },
  { key: "INTELLIGENCE", label: "INTELLIGENCE" },
  { key: "GROUP", label: "GROUP" },
  { key: "SYSTEM", label: "SYSTEM" },
];

// More-sheet sections (everything not pinned to a bottom-nav slot), in display order.
export const MORE_SECTIONS: { key: NavSection; label: string }[] = [
  { key: "activity", label: "Activity" },
  { key: "intelligence", label: "Intelligence" },
  { key: "community", label: "Community" },
  { key: "account", label: "Account" },
];

export const moreItems = NAV_ITEMS.filter((i) => !i.mobileSlot);

export function navItemBySlot(slot: Exclude<MobileSlot, "more">): AppNavItem | undefined {
  return NAV_ITEMS.find((i) => i.mobileSlot === slot);
}

/** True when `pathname` should mark this nav item active (handles detail routes). */
export function isNavItemActive(item: AppNavItem, pathname: string): boolean {
  if (item.path === "/") return pathname === "/";
  if (pathname === item.path) return true;
  return (item.activeFor ?? [item.path]).some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

/** Which bottom-nav slot is selected for a path. Non-slot routes select "more". */
export function activeSlotForPath(pathname: string): MobileSlot {
  for (const slot of ["home", "pantry", "shopping"] as const) {
    const item = navItemBySlot(slot);
    if (item && isNavItemActive(item, pathname)) return slot;
  }
  return "more";
}
