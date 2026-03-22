// Intelligence feed — rules-based insights from pantry, purchases, consumption & waste
import { useMemo } from "react";
import { useInventory } from "@/hooks/usePantry";
import { usePurchases } from "@/hooks/usePurchases";
import { useConsumptionLogs } from "@/hooks/useConsumption";
import { useWasteLogs } from "@/hooks/useWasteLogs";
import { useInsightStates } from "@/hooks/useInsightState";
import { getExpiryStatus } from "@/lib/pantry-utils";
import { formatCurrency } from "@/lib/currency";
import { differenceInDays, parseISO, isThisMonth, isThisWeek } from "date-fns";

export type FeedSeverity = "high" | "medium" | "low";
export type FeedCategory = "alerts" | "nutrition" | "spending" | "patterns" | "seasonality";
export type UrgencyTier = "act_now" | "watch" | "opportunities";

export interface FeedAction {
  label: string;
  path: string;
}

export interface FeedItem {
  id: string;
  title: string;
  description: string;
  reason: string;
  source: string;
  severity: FeedSeverity;
  category: FeedCategory;
  tags: string[];
  actions: FeedAction[];
  priorityScore: number;
  urgency: UrgencyTier;
  /** @deprecated Use actions array instead */
  actionPath?: string;
  actionLabel?: string;
}

const SEVERITY_WEIGHT: Record<FeedSeverity, number> = { high: 30, medium: 15, low: 5 };

function computePriority(severity: FeedSeverity, extras: { frequency?: number; financial?: boolean; health?: boolean; recencyDays?: number }): number {
  let score = SEVERITY_WEIGHT[severity];
  if (extras.frequency && extras.frequency > 1) score += Math.min(extras.frequency * 3, 15);
  if (extras.financial) score += 10;
  if (extras.health) score += 8;
  const recency = extras.recencyDays ?? 0;
  if (recency <= 1) score += 10;
  else if (recency <= 7) score += 5;
  return score;
}

function toUrgency(score: number): UrgencyTier {
  if (score >= 30) return "act_now";
  if (score >= 15) return "watch";
  return "opportunities";
}

export const useIntelligenceFeed = () => {
  const { data: inventory } = useInventory();
  const { data: purchases } = usePurchases();
  const { data: logs } = useConsumptionLogs();
  const { data: wasteLogs } = useWasteLogs();
  const { data: insightStates } = useInsightStates();

  const feedItems = useMemo((): FeedItem[] => {
    const items: FeedItem[] = [];

    const push = (
      base: Omit<FeedItem, "priorityScore" | "urgency" | "actions"> & { actions?: FeedAction[] },
      extras: Parameters<typeof computePriority>[1] = {}
    ) => {
      const score = computePriority(base.severity, extras);
      items.push({
        ...base,
        actions: base.actions ?? (base.actionPath && base.actionLabel ? [{ label: base.actionLabel, path: base.actionPath }] : []),
        priorityScore: score,
        urgency: toUrgency(score),
      });
    };

    // ── ALERTS: Expired items ──
    const expired = inventory?.filter((r) => getExpiryStatus(r.expiry_date) === "expired") ?? [];
    if (expired.length > 0) {
      push({
        id: "alert-expired",
        title: `${expired.length} item(s) have expired`,
        description: `${expired.slice(0, 3).map((r) => r.items?.name).join(", ")}${expired.length > 3 ? ` and ${expired.length - 3} more` : ""} are past their expiry date.`,
        reason: "Based on expiry dates in your pantry",
        source: "Based on your pantry",
        severity: "high",
        category: "alerts",
        tags: ["Pantry", "Waste"],
        actions: [
          { label: "Review Expired", path: "/pantry?filter=expired" },
          { label: "Discard Items", path: "/pantry?filter=expired" },
        ],
      }, { frequency: expired.length, health: true });
    }

    // ── ALERTS: Expiring soon ──
    const expiring = inventory?.filter((r) => getExpiryStatus(r.expiry_date) === "expiring") ?? [];
    if (expiring.length > 0) {
      push({
        id: "alert-expiring",
        title: `${expiring.length} item(s) expiring within 3 days`,
        description: `Use ${expiring.slice(0, 3).map((r) => r.items?.name).join(", ")} soon to avoid waste.`,
        reason: "Items expiring in the next 72 hours",
        source: "Based on your pantry",
        severity: "high",
        category: "alerts",
        tags: ["Pantry", "Urgency"],
        actions: [
          { label: "Review Expiring", path: "/pantry?filter=expiring" },
          { label: "Find Recipes", path: "/recipes" },
        ],
      }, { recencyDays: 0, health: true });
    }

    // ── NUTRITION: Low protein pantry ──
    if (inventory && inventory.length > 0) {
      let totalProtein = 0;
      for (const r of inventory) {
        totalProtein += Number(r.quantity) * Number(r.items?.protein_g ?? 0);
      }
      if (totalProtein < 100) {
        push({
          id: "nutrition-low-protein",
          title: "Low protein supply in your pantry",
          description: `Your pantry has only ${totalProtein.toFixed(0)}g of protein available. Consider stocking up on protein-rich foods.`,
          reason: "Total protein across all pantry items is below 100g",
          source: "Based on your pantry",
          severity: "medium",
          category: "nutrition",
          tags: ["Protein", "Pantry"],
          actions: [{ label: "Open Shopping List", path: "/shopping?prefill=protein" }],
        }, { health: true });
      }
    }

    // ── NUTRITION: Missing nutrition data ──
    const missingNutrition = inventory?.filter(
      (r) => r.items && Number(r.items.calories_per_unit ?? 0) === 0 && Number(r.items.protein_g ?? 0) === 0
    ) ?? [];
    if (missingNutrition.length > 3) {
      push({
        id: "nutrition-missing-data",
        title: `${missingNutrition.length} items missing nutrition data`,
        description: `Items like ${missingNutrition.slice(0, 2).map((r) => r.items?.name).join(", ")} have no calorie or macro info.`,
        reason: "Items without nutrition data reduce accuracy of analytics",
        source: "Based on your pantry",
        severity: "low",
        category: "nutrition",
        tags: ["Data Quality", "Nutrition"],
        actions: [{ label: "Fix Catalog", path: "/pantry?filter=missing_nutrition" }],
      }, { frequency: missingNutrition.length });
    }

    // ── NUTRITION: Low food diversity ──
    if (inventory && inventory.length >= 5) {
      const categories = new Set(inventory.map((r) => r.items?.category).filter(Boolean));
      if (categories.size <= 2) {
        push({
          id: "nutrition-low-diversity",
          title: "Low food category diversity",
          description: `Your pantry only spans ${categories.size} food categor${categories.size === 1 ? "y" : "ies"}. A diverse diet supports better health outcomes.`,
          reason: "Fewer than 3 distinct food categories detected",
          source: "Based on your pantry",
          severity: "medium",
          category: "nutrition",
          tags: ["Diversity", "Health"],
          actions: [{ label: "Open Shopping List", path: "/shopping?prefill=variety" }],
        }, { health: true });
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
          push({
            id: `spending-concentration-${store}`,
            title: `${Math.round((spend / totalSpend) * 100)}% of spend at ${store}`,
            description: `You've spent ${formatCurrency(spend)} at ${store} this month. Comparing prices could save money.`,
            reason: "High spending concentration at a single retailer",
            source: "Based on your purchases",
            severity: "medium",
            category: "spending",
            tags: [store, "Budget"],
            actions: [
              { label: `View ${store} Trips`, path: `/purchases?store=${encodeURIComponent(store)}` },
              { label: "Compare Stores", path: "/purchases" },
            ],
          }, { financial: true });
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
        push({
          id: "spending-week-spike",
          title: "This week's spending is above average",
          description: `You've spent ${formatCurrency(weekSpend)} this week vs ~${formatCurrency(avgWeekly)}/week average.`,
          reason: "Weekly spend exceeds 150% of monthly weekly average",
          source: "Based on your purchases",
          severity: "medium",
          category: "spending",
          tags: ["Budget", "Weekly"],
          actions: [{ label: "View This Week", path: "/purchases?period=week" }],
        }, { financial: true, recencyDays: 0 });
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
          push({
            id: `pattern-running-low-${name}`,
            title: `${name} is running low`,
            description: `Consumed ${count} times in 2 weeks but only ${inStock.quantity} ${inStock.unit} left.`,
            reason: "High consumption rate vs low remaining stock",
            source: "Based on your consumption",
            severity: "high",
            category: "patterns",
            tags: [name, "Restock"],
            actions: [
              { label: "Review in Pantry", path: `/pantry?search=${encodeURIComponent(name)}` },
              { label: "Add to Shopping List", path: `/shopping?prefill=${encodeURIComponent(name)}` },
            ],
          }, { frequency: count, recencyDays: 0 });
          break;
        }
      }
    }

    // ── PATTERNS: No expiry date set ──
    const noExpiry = inventory?.filter((r) => !r.expiry_date) ?? [];
    if (noExpiry.length > 5) {
      push({
        id: "pattern-no-expiry",
        title: `${noExpiry.length} items have no expiry date`,
        description: "Setting expiry dates helps you track freshness and reduces waste.",
        reason: "Many items are missing expiry information",
        source: "Based on your pantry",
        severity: "low",
        category: "patterns",
        tags: ["Data Quality", "Pantry"],
        actions: [{ label: "Review Pantry", path: "/pantry?filter=no_expiry" }],
      }, { frequency: noExpiry.length });
    }

    // ── WASTE: Patterns from waste_logs ──
    if (wasteLogs && wasteLogs.length > 0) {
      const itemWasteCounts = new Map<string, { count: number; qty: number; category: string | null }>();
      const categoryWasteCounts = new Map<string, number>();
      let weekWaste = 0;

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
      }

      const sorted = Array.from(itemWasteCounts.entries()).sort((a, b) => b[1].count - a[1].count);
      const [topItem, topData] = sorted[0] ?? [];
      if (topItem && topData && topData.count >= 3) {
        push({
          id: `waste-repeated-${topItem}`,
          title: `You've discarded ${topItem} ${topData.count} times`,
          description: `Consider buying smaller quantities or finding recipes to use it before waste.`,
          reason: "Same item discarded multiple times",
          source: "Based on your waste pattern",
          severity: "high",
          category: "patterns",
          tags: [topItem, "Waste", "Recurring"],
          actions: [
            { label: "Review in Pantry", path: `/pantry?search=${encodeURIComponent(topItem)}` },
            { label: "View Purchases", path: `/purchases?search=${encodeURIComponent(topItem)}` },
          ],
        }, { frequency: topData.count, financial: true });
      } else if (topItem && topData && topData.count >= 2) {
        push({
          id: `waste-most-${topItem}`,
          title: `${topItem} is your most wasted item`,
          description: `Discarded ${topData.count} times. Review purchasing and storage habits.`,
          reason: "Highest discard frequency",
          source: "Based on your waste pattern",
          severity: "medium",
          category: "patterns",
          tags: [topItem, "Waste"],
          actions: [{ label: "Review in Pantry", path: `/pantry?search=${encodeURIComponent(topItem)}` }],
        }, { frequency: topData.count });
      }

      const sortedCats = Array.from(categoryWasteCounts.entries()).sort((a, b) => b[1] - a[1]);
      const [topCat, topCatCount] = sortedCats[0] ?? [];
      if (topCat && topCatCount && topCatCount >= 3) {
        push({
          id: `waste-category-${topCat}`,
          title: `${topCat} is your most wasted food category`,
          description: `Discarded ${topCatCount} ${topCat} items. Consider adjusting what you buy.`,
          reason: "High waste concentration in one food category",
          source: "Based on your waste pattern",
          severity: "medium",
          category: "patterns",
          tags: [topCat, "Waste", "Category"],
          actions: [{ label: "Open Shopping List", path: `/shopping?prefill=${encodeURIComponent(topCat)}` }],
        }, { frequency: topCatCount });
      }

      if (weekWaste >= 4) {
        push({
          id: "waste-week-spike",
          title: "Waste spike this week",
          description: `You've discarded ${weekWaste} items this week. Check your pantry for items at risk.`,
          reason: "Unusually high discard count this week",
          source: "Based on your waste pattern",
          severity: "high",
          category: "alerts",
          tags: ["Waste", "Weekly"],
          actions: [{ label: "Review Pantry", path: "/pantry?filter=expiring" }],
        }, { frequency: weekWaste, recencyDays: 0 });
      }

      const expiredDiscards = wasteLogs.filter((w) => w.reason === "expired");
      if (expiredDiscards.length >= 3) {
        push({
          id: "waste-expired-pattern",
          title: `${expiredDiscards.length} items discarded due to expiry`,
          description: "Multiple items expire before use. Try buying smaller quantities or setting reminders.",
          reason: "Recurring expiry-based waste",
          source: "Based on your waste pattern",
          severity: "medium",
          category: "patterns",
          tags: ["Expiry", "Waste", "Overbuying"],
          actions: [{ label: "View Purchases", path: "/purchases" }],
        }, { frequency: expiredDiscards.length, financial: true });
      }

      // Purchase-to-Waste Mismatch
      if (purchases && purchases.length > 0) {
        const purchasedItemCounts = new Map<string, number>();
        for (const p of purchases) {
          for (const pi of p.purchase_items ?? []) {
            const name = pi.items?.name ?? "";
            if (name) purchasedItemCounts.set(name, (purchasedItemCounts.get(name) ?? 0) + 1);
          }
        }
        for (const [itemName, wasteData] of itemWasteCounts) {
          const purchaseCount = purchasedItemCounts.get(itemName) ?? 0;
          if (purchaseCount >= 2 && wasteData.count >= 2) {
            push({
              id: `waste-purchase-mismatch-${itemName}`,
              title: `You buy ${itemName} often but also waste it`,
              description: `Purchased ${purchaseCount}x and discarded ${wasteData.count}x. May indicate overbuying.`,
              reason: "Recurring buy-and-waste cycle detected",
              source: "Based on your purchases & waste",
              severity: "high",
              category: "spending",
              tags: [itemName, "Overbuying", "Waste"],
              actions: [
                { label: "View Purchases", path: `/purchases?search=${encodeURIComponent(itemName)}` },
                { label: "Review in Pantry", path: `/pantry?search=${encodeURIComponent(itemName)}` },
              ],
            }, { frequency: purchaseCount + wasteData.count, financial: true });
            break;
          }
        }
      }
    }

    // ── Category Over-Reliance ──
    if (inventory && inventory.length >= 5) {
      const catCounts = new Map<string, number>();
      for (const r of inventory) {
        const cat = r.items?.category;
        if (cat) catCounts.set(cat, (catCounts.get(cat) ?? 0) + 1);
      }
      const totalCatItems = Array.from(catCounts.values()).reduce((a, b) => a + b, 0);
      for (const [cat, count] of catCounts) {
        const ratio = count / totalCatItems;
        if (ratio >= 0.5 && catCounts.size > 1) {
          push({
            id: `pattern-overreliance-${cat}`,
            title: `${Math.round(ratio * 100)}% of your pantry is ${cat}`,
            description: `Diversifying categories supports better nutrition and reduces monotony.`,
            reason: "One food category dominates pantry composition",
            source: "Based on your pantry",
            severity: "medium",
            category: "patterns",
            tags: [cat, "Diversity", "Balance"],
            actions: [{ label: "Open Shopping List", path: `/shopping?prefill=${encodeURIComponent(cat === "Snacks" ? "vegetables" : "variety")}` }],
          }, { health: true });
          break;
        }
      }
    }

    // ── SEASONALITY ──
    const month = new Date().getMonth();
    const seasonal: Record<number, string[]> = {
      0: ["citrus fruits", "root vegetables"], 1: ["citrus fruits", "leafy greens"],
      2: ["asparagus", "spring onions"], 3: ["peas", "artichokes"],
      4: ["berries", "stone fruits"], 5: ["tomatoes", "corn"],
      6: ["watermelon", "peppers"], 7: ["peaches", "eggplant"],
      8: ["apples", "squash"], 9: ["pumpkin", "sweet potatoes"],
      10: ["cranberries", "Brussels sprouts"], 11: ["pomegranates", "winter squash"],
    };
    push({
      id: "seasonal-tip",
      title: "Seasonal picks this month",
      description: `Consider adding ${seasonal[month]?.join(" and ")} — they're in season and at their best right now.`,
      reason: "Seasonal produce is fresher, cheaper, and more nutritious",
      source: "Seasonal recommendation",
      severity: "low",
      category: "seasonality",
      tags: ["Seasonal", "Shopping"],
      actions: [{ label: "Add to Shopping List", path: "/shopping" }],
    });

    // Sort by priority score descending
    items.sort((a, b) => b.priorityScore - a.priorityScore);

    // Filter out dismissed/resolved insights
    if (insightStates) {
      return items.filter((item) => {
        const state = insightStates.get(item.id);
        return !state || state.status === "active";
      });
    }

    return items;
  }, [inventory, purchases, logs, wasteLogs, insightStates]);

  return { feedItems };
};
