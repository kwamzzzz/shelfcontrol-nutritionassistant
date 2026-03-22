import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useInventory } from "@/hooks/usePantry";
import { usePurchases } from "@/hooks/usePurchases";
import { useWasteLogs } from "@/hooks/useWasteLogs";
import { useGroupContext } from "@/contexts/GroupContext";
import { useIntelligenceFeed } from "@/hooks/useIntelligenceFeed";
import { getExpiryStatus } from "@/lib/pantry-utils";
import { formatCurrency } from "@/lib/currency";
import { parseISO, isThisMonth, isThisWeek } from "date-fns";
import { toast } from "sonner";

export interface AISuggestion {
  text: string;
  actionPath: string;
}

export interface AIWeeklyReport {
  waste: string;
  spending: string;
  nutrition: string;
  recommendation: string;
}

export interface AISummaryResult {
  summary: string;
  weeklyReport: AIWeeklyReport;
  suggestions: AISuggestion[];
}

export const useAISummary = () => {
  const [data, setData] = useState<AISummaryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: inventory } = useInventory();
  const { data: purchases } = usePurchases();
  const { data: wasteLogs } = useWasteLogs();
  const { feedItems } = useIntelligenceFeed();
  const { isPersonalMode } = useGroupContext();

  const generate = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const expired = inventory?.filter((r) => getExpiryStatus(r.expiry_date) === "expired") ?? [];
      const expiring = inventory?.filter((r) => getExpiryStatus(r.expiry_date) === "expiring") ?? [];
      const missingNutrition = inventory?.filter(
        (r) => r.items && Number(r.items.calories_per_unit ?? 0) === 0 && Number(r.items.protein_g ?? 0) === 0
      ) ?? [];
      const categories = new Set((inventory ?? []).map((r) => r.items?.category).filter(Boolean));

      let monthlySpend = 0;
      let monthlyPurchaseCount = 0;
      for (const p of purchases ?? []) {
        if (isThisMonth(parseISO(p.purchased_at))) {
          monthlySpend += Number(p.total_cost ?? 0);
          monthlyPurchaseCount++;
        }
      }

      let weekWasteCount = 0;
      const itemWasteCounts = new Map<string, number>();
      for (const w of wasteLogs ?? []) {
        if (isThisWeek(parseISO(w.discarded_at), { weekStartsOn: 1 })) weekWasteCount++;
        const name = (w as any).items?.name ?? "Unknown";
        itemWasteCounts.set(name, (itemWasteCounts.get(name) ?? 0) + 1);
      }
      const topWasted = Array.from(itemWasteCounts.entries()).sort((a, b) => b[1] - a[1])[0];

      const insights = feedItems.slice(0, 10).map((i) => ({
        severity: i.severity,
        title: i.title,
        description: i.description,
      }));

      const stats = {
        pantryCount: inventory?.length ?? 0,
        expiredCount: expired.length,
        expiringCount: expiring.length,
        monthlyPurchaseCount,
        monthlySpend: formatCurrency(monthlySpend),
        weekWasteCount,
        totalWasteCount: wasteLogs?.length ?? 0,
        topWastedItem: topWasted ? `${topWasted[0]} (${topWasted[1]}x)` : null,
        categoryCount: categories.size,
        missingNutritionCount: missingNutrition.length,
      };

      const { data: result, error: fnError } = await supabase.functions.invoke("ai-intelligence", {
        body: {
          insights,
          stats,
          mode: isPersonalMode ? "personal" : "group",
        },
      });

      if (fnError) throw fnError;
      if (result?.error) {
        throw new Error(result.error);
      }

      setData(result as AISummaryResult);
    } catch (err: any) {
      const msg = err?.message ?? "Failed to generate AI summary";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [inventory, purchases, wasteLogs, feedItems, isPersonalMode]);

  return { data, isLoading, error, generate };
};
