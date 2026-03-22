// Intelligence feed — rules-based insights from pantry, purchases, consumption & waste
import { useMemo } from "react";
import { useInventory } from "@/hooks/usePantry";
import { usePurchases } from "@/hooks/usePurchases";
import { useConsumptionLogs } from "@/hooks/useConsumption";
import { useWasteLogs } from "@/hooks/useWasteLogs";
import { getExpiryStatus } from "@/lib/pantry-utils";
import { formatCurrency } from "@/lib/currency";
import { differenceInDays, parseISO, isThisMonth, isThisWeek } from "date-fns";

export type FeedSeverity = "high" | "medium" | "low";
export type FeedCategory = "alerts" | "nutrition" | "spending" | "patterns" | "seasonality";

export interface FeedItem {
  id: string;
  title: string;
  description: string;
  reason: string;
  source: string;
  severity: FeedSeverity;
  category: FeedCategory;
  tags: string[];
  dismissed?: boolean;
}

export const useIntelligenceFeed = () => {
  const { data: inventory } = useInventory();
  const { data: purchases } = usePurchases();
  const { data: logs } = useConsumptionLogs();
  const { data: wasteLogs } = useWasteLogs();

  const feedItems = useMemo((): FeedItem[] => {
    const items: FeedItem[] = [];

    // ── ALERTS: Expired items ──
    const expired = inventory?.filter((r) => getExpiryStatus(r.expiry_date) === "expired") ?? [];
    if (expired.length > 0) {
      items.push({
        id: "alert-expired",
        title: `${expired.length} item(s) have expired`,
        description: `${expired.slice(0, 3).map((r) => r.items?.name).join(", ")}${expired.length > 3 ? ` and ${expired.length - 3} more` : ""} are past their expiry date. Consider discarding or using immediately.`,
        reason: "Based on expiry dates in your pantry",
        source: "Based on your pantry",
        severity: "high",
        category: "alerts",
        tags: ["Pantry", "Waste"],
      });
    }

    // ── ALERTS: Expiring soon ──
    const expiring = inventory?.filter((r) => getExpiryStatus(r.expiry_date) === "expiring") ?? [];
    if (expiring.length > 0) {
      items.push({
        id: "alert-expiring",
        title: `${expiring.length} item(s) expiring within 3 days`,
        description: `Use ${expiring.slice(0, 3).map((r) => r.items?.name).join(", ")} soon to avoid waste.`,
        reason: "Items expiring in the next 72 hours",
        source: "Based on your pantry",
        severity: "high",
        category: "alerts",
        tags: ["Pantry", "Urgency"],
      });
    }

    // ── NUTRITION: Low protein pantry ──
    if (inventory && inventory.length > 0) {
      let totalProtein = 0;
      for (const r of inventory) {
        totalProtein += Number(r.quantity) * Number(r.items?.protein_g ?? 0);
      }
      if (totalProtein < 100) {
        items.push({
          id: "nutrition-low-protein",
          title: "Low protein supply in your pantry",
          description: `Your pantry has only ${totalProtein.toFixed(0)}g of protein available. Consider stocking up on protein-rich foods.`,
          reason: "Total protein across all pantry items is below 100g",
          source: "Based on your pantry",
          severity: "medium",
          category: "nutrition",
          tags: ["Protein", "Pantry"],
        });
      }
    }

    // ── NUTRITION: Missing nutrition data ──
    const missingNutrition = inventory?.filter(
      (r) => r.items && Number(r.items.calories_per_unit ?? 0) === 0 && Number(r.items.protein_g ?? 0) === 0
    ) ?? [];
    if (missingNutrition.length > 3) {
      items.push({
        id: "nutrition-missing-data",
        title: `${missingNutrition.length} items missing nutrition data`,
        description: `Items like ${missingNutrition.slice(0, 2).map((r) => r.items?.name).join(", ")} have no calorie or macro info. Update them in the Pantry catalog for accurate tracking.`,
        reason: "Items without nutrition data reduce accuracy of analytics",
        source: "Based on your pantry",
        severity: "low",
        category: "nutrition",
        tags: ["Data Quality", "Nutrition"],
      });
    }

    // ── NUTRITION: Low food diversity ──
    if (inventory && inventory.length >= 5) {
      const categories = new Set(inventory.map((r) => r.items?.category).filter(Boolean));
      if (categories.size <= 2) {
        items.push({
          id: "nutrition-low-diversity",
          title: "Low food category diversity",
          description: `Your pantry only spans ${categories.size} food categor${categories.size === 1 ? "y" : "ies"}. A diverse diet supports better health outcomes.`,
          reason: "Fewer than 3 distinct food categories detected",
          source: "Based on your pantry",
          severity: "medium",
          category: "nutrition",
          tags: ["Diversity", "Health"],
        });
      }
    }

    // ── SPENDING: High spend at one store ──
    if (purchases && purchases.length >= 3) {
      const storeSpend = new Map<string, number>();
      let totalSpend = 0;
      for (const p of purchases) {
        if (!isThisMonth(parseISO(p.purchased_at))) continue;
        const cost = Number(p.total_cost ?? 0);
        totalSpend += cost;
        const store = p.store_name || "Unknown";
        storeSpend.set(store, (storeSpend.get(store) ?? 0) + cost);
      }
      for (const [store, spend] of storeSpend) {
        if (totalSpend > 0 && spend / totalSpend > 0.7 && storeSpend.size > 1) {
          items.push({
            id: `spending-concentration-${store}`,
            title: `${Math.round((spend / totalSpend) * 100)}% of spend at ${store}`,
            description: `You've spent ${formatCurrency(spend)} at ${store} this month out of ${formatCurrency(totalSpend)} total. Comparing prices across stores could save money.`,
            reason: "High spending concentration at a single retailer",
            source: "Based on your purchases",
            severity: "medium",
            category: "spending",
            tags: [store, "Budget"],
          });
          break;
        }
      }
    }

    // ── SPENDING: Weekly spend spike ──
    if (purchases) {
      let weekSpend = 0;
      let monthSpend = 0;
      let monthTrips = 0;
      for (const p of purchases) {
        const d = parseISO(p.purchased_at);
        const cost = Number(p.total_cost ?? 0);
        if (isThisMonth(d)) { monthSpend += cost; monthTrips++; }
        if (isThisWeek(d, { weekStartsOn: 1 })) weekSpend += cost;
      }
      const avgWeekly = monthTrips > 0 ? monthSpend / 4 : 0;
      if (avgWeekly > 0 && weekSpend > avgWeekly * 1.5) {
        items.push({
          id: "spending-week-spike",
          title: "This week's spending is above average",
          description: `You've spent ${formatCurrency(weekSpend)} this week compared to your monthly average of ~${formatCurrency(avgWeekly)}/week.`,
          reason: "Weekly spend exceeds 150% of monthly weekly average",
          source: "Based on your purchases",
          severity: "medium",
          category: "spending",
          tags: ["Budget", "Weekly"],
        });
      }
    }

    // ── PATTERNS: Heavily consumed items running low ──
    if (logs && inventory) {
      const consumedCounts = new Map<string, number>();
      for (const log of logs) {
        if (differenceInDays(new Date(), parseISO(log.consumed_at)) > 14) continue;
        const name = log.items?.name ?? "";
        if (name) consumedCounts.set(name, (consumedCounts.get(name) ?? 0) + 1);
      }
      const topConsumed = Array.from(consumedCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      for (const [name, count] of topConsumed) {
        const inStock = inventory.find(
          (r) => r.items?.name === name && Number(r.quantity) <= 1
        );
        if (inStock && count >= 3) {
          items.push({
            id: `pattern-running-low-${name}`,
            title: `${name} is running low`,
            description: `You've consumed ${name} ${count} times in the last 2 weeks but only have ${inStock.quantity} ${inStock.unit} left. Consider restocking.`,
            reason: "High consumption rate vs low remaining stock",
            source: "Based on your consumption",
            severity: "high",
            category: "patterns",
            tags: [name, "Restock"],
          });
          break;
        }
      }
    }

    // ── PATTERNS: No expiry date set ──
    const noExpiry = inventory?.filter((r) => !r.expiry_date) ?? [];
    if (noExpiry.length > 5) {
      items.push({
        id: "pattern-no-expiry",
        title: `${noExpiry.length} items have no expiry date`,
        description: "Setting expiry dates helps you track freshness and reduces waste. Update them in the Pantry.",
        reason: "Many items are missing expiry information",
        source: "Based on your pantry",
        severity: "low",
        category: "patterns",
        tags: ["Data Quality", "Pantry"],
      });
    }

    // ── WASTE: Patterns from waste_logs ──
    if (wasteLogs && wasteLogs.length > 0) {
      // Most wasted item (by count of discard events)
      const itemWasteCounts = new Map<string, { count: number; qty: number; category: string | null }>();
      const categoryWasteCounts = new Map<string, number>();
      let weekWaste = 0;
      let monthWaste = 0;

      for (const w of wasteLogs) {
        const name = (w as any).items?.name ?? "Unknown";
        const cat = (w as any).items?.category ?? null;
        const prev = itemWasteCounts.get(name) ?? { count: 0, qty: 0, category: cat };
        prev.count += 1;
        prev.qty += Number(w.quantity);
        itemWasteCounts.set(name, prev);
        if (cat) categoryWasteCounts.set(cat, (categoryWasteCounts.get(cat) ?? 0) + 1);

        const d = parseISO(w.discarded_at);
        if (isThisWeek(d, { weekStartsOn: 1 })) weekWaste++;
        if (isThisMonth(d)) monthWaste++;
      }

      // Repeated waste of same item (≥3 times)
      const sorted = Array.from(itemWasteCounts.entries()).sort((a, b) => b[1].count - a[1].count);
      const [topItem, topData] = sorted[0] ?? [];
      if (topItem && topData && topData.count >= 3) {
        items.push({
          id: `waste-repeated-${topItem}`,
          title: `You've discarded ${topItem} ${topData.count} times`,
          description: `Consider buying smaller quantities of ${topItem} or finding recipes to use it before it goes to waste.`,
          reason: "Same item discarded multiple times",
          source: "Based on your waste pattern",
          severity: "high",
          category: "patterns",
          tags: [topItem, "Waste", "Recurring"],
        });
      } else if (topItem && topData && topData.count >= 2) {
        items.push({
          id: `waste-most-${topItem}`,
          title: `${topItem} is your most wasted item`,
          description: `You've discarded ${topItem} ${topData.count} times. Review your purchasing and storage habits for this item.`,
          reason: "Highest discard frequency",
          source: "Based on your waste pattern",
          severity: "medium",
          category: "patterns",
          tags: [topItem, "Waste"],
        });
      }

      // Most wasted category
      const sortedCats = Array.from(categoryWasteCounts.entries()).sort((a, b) => b[1] - a[1]);
      const [topCat, topCatCount] = sortedCats[0] ?? [];
      if (topCat && topCatCount && topCatCount >= 3) {
        items.push({
          id: `waste-category-${topCat}`,
          title: `${topCat} is your most wasted food category`,
          description: `You've discarded ${topCatCount} ${topCat} items. Consider adjusting what you buy in this category.`,
          reason: "High waste concentration in one food category",
          source: "Based on your waste pattern",
          severity: "medium",
          category: "patterns",
          tags: [topCat, "Waste", "Category"],
        });
      }

      // Week waste spike
      if (weekWaste >= 4) {
        items.push({
          id: "waste-week-spike",
          title: "Waste spike this week",
          description: `You've discarded ${weekWaste} items this week. Check your pantry for items at risk and plan meals to use them.`,
          reason: "Unusually high discard count this week",
          source: "Based on your waste pattern",
          severity: "high",
          category: "alerts",
          tags: ["Waste", "Weekly"],
        });
      }

      // Items discarded with expired reason
      const expiredDiscards = wasteLogs.filter((w) => w.reason === "expired");
      if (expiredDiscards.length >= 3) {
        items.push({
          id: "waste-expired-pattern",
          title: `${expiredDiscards.length} items discarded due to expiry`,
          description: "Multiple items are expiring before you can use them. Try buying smaller quantities or setting reminders.",
          reason: "Recurring expiry-based waste",
          source: "Based on your waste pattern",
          severity: "medium",
          category: "patterns",
          tags: ["Expiry", "Waste", "Overbuying"],
        });
      }
    }

    // ── SEASONALITY ──
    const month = new Date().getMonth();
    const seasonal: Record<number, string[]> = {
      0: ["citrus fruits", "root vegetables"],
      1: ["citrus fruits", "leafy greens"],
      2: ["asparagus", "spring onions"],
      3: ["peas", "artichokes"],
      4: ["berries", "stone fruits"],
      5: ["tomatoes", "corn"],
      6: ["watermelon", "peppers"],
      7: ["peaches", "eggplant"],
      8: ["apples", "squash"],
      9: ["pumpkin", "sweet potatoes"],
      10: ["cranberries", "Brussels sprouts"],
      11: ["pomegranates", "winter squash"],
    };
    items.push({
      id: "seasonal-tip",
      title: "Seasonal picks this month",
      description: `Consider adding ${seasonal[month]?.join(" and ")} to your shopping list — they're in season and at their best right now.`,
      reason: "Seasonal produce is fresher, cheaper, and more nutritious",
      source: "Seasonal recommendation",
      severity: "low",
      category: "seasonality",
      tags: ["Seasonal", "Shopping"],
    });

    // Sort: high first
    const order: Record<FeedSeverity, number> = { high: 0, medium: 1, low: 2 };
    items.sort((a, b) => order[a.severity] - order[b.severity]);

    return items;
  }, [inventory, purchases, logs, wasteLogs]);

  return { feedItems };
};
