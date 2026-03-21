import { useMemo } from "react";
import { useInventory } from "@/hooks/usePantry";
import { usePurchases } from "@/hooks/usePurchases";
import { useConsumptionLogs } from "@/hooks/useConsumption";
import { getExpiryStatus } from "@/lib/pantry-utils";
import { formatCurrencyAlways } from "@/lib/currency";
import {
  parseISO, isThisWeek, isThisMonth, isToday, startOfWeek,
  differenceInDays, format, formatDistanceToNow,
} from "date-fns";

/* ── Types ── */
export type InsightSeverity = "act_now" | "watch" | "good_news";
export interface Insight {
  severity: InsightSeverity;
  title: string;
  body: string;
  tabs: string[];
}

export interface StoreData {
  name: string;
  visits: number;
  total: number;
  avgPerVisit: number;
}

export interface RecentActivity {
  id: string;
  itemName: string;
  quantity: number;
  unit: string;
  timeAgo: string;
  recipeName: string | null;
}

export interface VelocityItem {
  name: string;
  count: number;
  speed: "fast" | "medium" | "slow";
}

export interface ValueItem {
  name: string;
  proteinPerAed: number;
  calPerAed: number;
  totalSpent: number;
}

/* ── Hook ── */
export const useAnalytics = () => {
  const { data: inventory } = useInventory();
  const { data: purchases } = usePurchases();
  const { data: logs } = useConsumptionLogs();

  /* ── Spending ── */
  const spending = useMemo(() => {
    if (!purchases) return {
      monthTotal: 0, weekTotal: 0, monthTrips: 0,
      stores: [] as StoreData[], uniqueStores: 0,
      avgPerTrip: 0, lastStore: "", lastDate: "",
      mostVisited: "",
    };

    let monthTotal = 0, weekTotal = 0, monthTrips = 0;
    const storeMap = new Map<string, { total: number; visits: number }>();
    let lastStore = "", lastDate = "";

    for (const p of purchases) {
      const d = parseISO(p.purchased_at);
      const cost = Number(p.total_cost ?? 0);

      if (!lastStore && p.store_name) {
        lastStore = p.store_name;
        lastDate = format(d, "MMM d, yyyy");
      }

      if (isThisMonth(d)) {
        monthTotal += cost;
        monthTrips++;
        const store = p.store_name || "Unknown";
        const ex = storeMap.get(store) ?? { total: 0, visits: 0 };
        ex.total += cost; ex.visits++;
        storeMap.set(store, ex);
      }
      if (isThisWeek(d, { weekStartsOn: 1 })) weekTotal += cost;
    }

    const stores: StoreData[] = Array.from(storeMap.entries())
      .map(([name, d]) => ({ name, ...d, avgPerVisit: d.visits > 0 ? d.total / d.visits : 0 }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    const mostVisited = stores.length > 0
      ? [...stores].sort((a, b) => b.visits - a.visits)[0].name : "";

    return {
      monthTotal, weekTotal, monthTrips, stores,
      uniqueStores: storeMap.size,
      avgPerTrip: monthTrips > 0 ? monthTotal / monthTrips : 0,
      lastStore, lastDate, mostVisited,
    };
  }, [purchases]);

  /* ── Pantry Health ── */
  const pantry = useMemo(() => {
    if (!inventory) return { total: 0, expiring: 0, expired: 0, noExpiry: 0, expiringItems: [] as string[] };
    let expiring = 0, expired = 0, noExpiry = 0;
    const expiringItems: string[] = [];
    for (const r of inventory) {
      const s = getExpiryStatus(r.expiry_date);
      if (s === "expiring") { expiring++; expiringItems.push(r.items?.name ?? "Unknown"); }
      else if (s === "expired") expired++;
      else if (s === "no-date") noExpiry++;
    }
    return { total: inventory.length, expiring, expired, noExpiry, expiringItems: expiringItems.slice(0, 5) };
  }, [inventory]);

  /* ── Pantry Macros (total available) ── */
  const pantryMacros = useMemo(() => {
    if (!inventory) return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    let calories = 0, protein = 0, carbs = 0, fat = 0, fiber = 0;
    for (const r of inventory) {
      const qty = Number(r.quantity);
      const item = r.items;
      if (!item) continue;
      calories += qty * Number(item.calories_per_unit ?? 0);
      protein += qty * Number(item.protein_g ?? 0);
      carbs += qty * Number(item.carbs_g ?? 0);
      fat += qty * Number(item.fat_g ?? 0);
      fiber += qty * Number((item as any).fiber_g ?? 0);
    }
    return { calories, protein, carbs, fat, fiber };
  }, [inventory]);

  /* ── Today's Nutrition ── */
  const todayNutrition = useMemo(() => {
    if (!logs) return { calories: 0, protein: 0, carbs: 0, fat: 0, logCount: 0, missingCount: 0 };
    let calories = 0, protein = 0, carbs = 0, fat = 0, logCount = 0, missingCount = 0;
    for (const log of logs) {
      if (!isToday(parseISO(log.consumed_at))) continue;
      logCount++;
      const qty = Number(log.quantity);
      const item = log.items;
      if (!item) continue;
      const cal = Number(item.calories_per_unit ?? 0);
      if (cal === 0 && Number(item.protein_g ?? 0) === 0) missingCount++;
      calories += qty * cal;
      protein += qty * Number(item.protein_g ?? 0);
      carbs += qty * Number(item.carbs_g ?? 0);
      fat += qty * Number(item.fat_g ?? 0);
    }
    return { calories, protein, carbs, fat, logCount, missingCount };
  }, [logs]);

  /* ── Weekly Consumption ── */
  const weekConsumption = useMemo(() => {
    if (!logs) return { weekLogs: 0, avgCalories: 0, avgProtein: 0, missingCount: 0 };
    let totalCal = 0, totalProtein = 0, missing = 0, weekLogs = 0;
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const daysInWeek = Math.max(1, differenceInDays(now, weekStart) + 1);

    for (const log of logs) {
      if (!isThisWeek(parseISO(log.consumed_at), { weekStartsOn: 1 })) continue;
      weekLogs++;
      const qty = Number(log.quantity);
      const item = log.items;
      if (!item) continue;
      const cal = Number(item.calories_per_unit ?? 0);
      if (cal === 0 && Number(item.protein_g ?? 0) === 0) missing++;
      totalCal += qty * cal;
      totalProtein += qty * Number(item.protein_g ?? 0);
    }
    return {
      weekLogs,
      avgCalories: weekLogs > 0 ? totalCal / daysInWeek : 0,
      avgProtein: weekLogs > 0 ? totalProtein / daysInWeek : 0,
      missingCount: missing,
    };
  }, [logs]);

  /* ── Recent Activity ── */
  const recentActivity = useMemo((): RecentActivity[] => {
    if (!logs) return [];
    return logs.slice(0, 5).map((log) => ({
      id: log.id,
      itemName: log.items?.name ?? "Unknown",
      quantity: Number(log.quantity),
      unit: (log as any).unit || log.items?.default_unit || "unit",
      timeAgo: formatDistanceToNow(parseISO(log.consumed_at), { addSuffix: true }),
      recipeName: log.recipes?.name ?? null,
    }));
  }, [logs]);

  /* ── Top Consumed ── */
  const topConsumed = useMemo(() => {
    if (!logs) return [];
    const map = new Map<string, { name: string; count: number }>();
    for (const log of logs) {
      const name = log.items?.name ?? "Unknown";
      const ex = map.get(name);
      if (ex) ex.count++; else map.set(name, { name, count: 1 });
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [logs]);

  /* ── Top Purchased ── */
  const topPurchased = useMemo(() => {
    if (!purchases) return [];
    const map = new Map<string, { name: string; count: number }>();
    for (const p of purchases) {
      for (const pi of p.purchase_items ?? []) {
        const name = pi.items?.name ?? "Unknown";
        const ex = map.get(name);
        if (ex) ex.count++; else map.set(name, { name, count: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [purchases]);

  /* ── Consumption Velocity ── */
  const consumptionVelocity = useMemo((): VelocityItem[] => {
    if (!logs || logs.length === 0) return [];
    const map = new Map<string, number>();
    const now = new Date();
    for (const log of logs) {
      if (differenceInDays(now, parseISO(log.consumed_at)) > 30) continue;
      const name = log.items?.name ?? "Unknown";
      map.set(name, (map.get(name) ?? 0) + 1);
    }
    const items = Array.from(map.entries())
      .map(([name, count]) => ({
        name, count,
        speed: (count >= 10 ? "fast" : count >= 4 ? "medium" : "slow") as "fast" | "medium" | "slow",
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
    return items;
  }, [logs]);

  /* ── Best Value (Spend vs Nutrition) ── */
  const bestValue = useMemo((): { items: ValueItem[]; bestProteinItem: string; bestProteinValue: number } => {
    if (!purchases) return { items: [], bestProteinItem: "", bestProteinValue: 0 };
    const map = new Map<string, { name: string; totalSpent: number; totalProtein: number; totalCal: number }>();
    for (const p of purchases) {
      for (const pi of p.purchase_items ?? []) {
        const item = pi.items;
        if (!item) continue;
        const price = Number(pi.unit_price ?? 0);
        if (price <= 0) continue;
        const qty = Number(pi.quantity);
        const name = item.name;
        const ex = map.get(name) ?? { name, totalSpent: 0, totalProtein: 0, totalCal: 0 };
        ex.totalSpent += price;
        ex.totalProtein += qty * Number(item.protein_g ?? 0);
        ex.totalCal += qty * Number(item.calories_per_unit ?? 0);
        map.set(name, ex);
      }
    }
    const items: ValueItem[] = Array.from(map.values())
      .filter((v) => v.totalSpent > 0)
      .map((v) => ({
        name: v.name,
        proteinPerAed: v.totalSpent > 0 ? v.totalProtein / v.totalSpent : 0,
        calPerAed: v.totalSpent > 0 ? v.totalCal / v.totalSpent : 0,
        totalSpent: v.totalSpent,
      }))
      .sort((a, b) => b.proteinPerAed - a.proteinPerAed)
      .slice(0, 8);
    const best = items[0];
    return {
      items,
      bestProteinItem: best?.name ?? "",
      bestProteinValue: best?.proteinPerAed ?? 0,
    };
  }, [purchases]);

  /* ── Insights ── */
  const insights = useMemo((): Insight[] => {
    const list: Insight[] = [];

    // ACT NOW
    if (pantry.expired > 0)
      list.push({ severity: "act_now", title: "Expired items", body: `${pantry.expired} item(s) have passed their expiry date.`, tabs: ["overview", "food_pantry"] });
    if (pantry.expiring > 0)
      list.push({ severity: "act_now", title: "Expiring soon", body: `${pantry.expiringItems.join(", ")} — use within 3 days.`, tabs: ["overview", "food_pantry"] });

    // WATCH
    if (pantry.noExpiry > 0)
      list.push({ severity: "watch", title: "No expiry set", body: `${pantry.noExpiry} pantry item(s) have no expiry date.`, tabs: ["overview", "food_pantry"] });
    if (weekConsumption.missingCount > 0)
      list.push({ severity: "watch", title: "Missing nutrition data", body: `${weekConsumption.missingCount} consumption log(s) this week reference items without nutrition info.`, tabs: ["overview", "consumption"] });
    if (pantryMacros.protein < 100 && pantry.total > 0)
      list.push({ severity: "watch", title: "Low protein supply", body: `Pantry protein availability is low at ${pantryMacros.protein.toFixed(0)}g total.`, tabs: ["overview", "food_pantry"] });

    // GOOD NEWS
    if (todayNutrition.calories > 0)
      list.push({ severity: "good_news", title: "Tracking today", body: `${todayNutrition.logCount} log(s) recorded today — ${todayNutrition.calories.toFixed(0)} cal so far.`, tabs: ["overview", "consumption"] });
    if (spending.monthTotal > 0 && spending.weekTotal < spending.avgPerTrip)
      list.push({ severity: "good_news", title: "Spending on track", body: `This week's spend (${formatCurrencyAlways(spending.weekTotal)}) is below your average trip cost.`, tabs: ["overview", "spend_value"] });
    if (bestValue.bestProteinItem)
      list.push({ severity: "good_news", title: "Best protein value", body: `${bestValue.bestProteinItem} gives you ${bestValue.bestProteinValue.toFixed(1)}g protein/AED — your best value source.`, tabs: ["spend_value"] });

    return list;
  }, [pantry, pantryMacros, weekConsumption, todayNutrition, spending, bestValue]);

  return {
    spending, pantry, pantryMacros, todayNutrition, weekConsumption,
    recentActivity, topConsumed, topPurchased,
    consumptionVelocity, bestValue, insights,
    // Raw data pass-through for tabs that need it
    logs, inventory, purchases,
  };
};
