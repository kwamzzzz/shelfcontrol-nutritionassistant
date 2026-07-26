import { useMemo } from "react";
import { useConsumptionLogs } from "@/hooks/useConsumption";
import { parseISO, subDays, startOfDay, format, startOfWeek, endOfWeek } from "date-fns";
import { calculateNutrition, EMPTY_NUTRITION_TOTALS, type NutritionTotals } from "@/lib/nutrition";

type DailyTotals = NutritionTotals;

interface MealGroup {
  label: string;
  key: string;
  logs: any[];
}

const EMPTY_TOTALS: DailyTotals = EMPTY_NUTRITION_TOTALS;

export const useNutritionData = (date?: Date) => {
  const { data: logs, isLoading } = useConsumptionLogs();
  const targetDate = date ?? new Date();

  const dayLogs = useMemo(() => {
    if (!logs) return [];
    return logs.filter((l) => {
      const d = parseISO(l.consumed_at);
      return startOfDay(d).getTime() === startOfDay(targetDate).getTime();
    });
  }, [logs, targetDate]);

  const totals = useMemo(() => {
    const t = { ...EMPTY_TOTALS };
    for (const log of dayLogs) {
      const n = calculateNutrition(log.items, Number(log.quantity), log.unit);
      t.calories += n.calories;
      t.protein += n.protein;
      t.carbs += n.carbs;
      t.fat += n.fat;
      t.fiber += n.fiber;
      t.sugar += n.sugar;
      t.sodium += n.sodium;
    }
    return t;
  }, [dayLogs]);

  const meals = useMemo((): MealGroup[] => {
    const groups: Record<string, any[]> = { breakfast: [], lunch: [], dinner: [], snacks: [] };
    for (const log of dayLogs) {
      const hour = parseISO(log.consumed_at).getHours();
      const mt = log.meal_type;
      if (mt && groups[mt]) {
        groups[mt].push(log);
      } else if (hour < 11) {
        groups.breakfast.push(log);
      } else if (hour < 15) {
        groups.lunch.push(log);
      } else if (hour < 20) {
        groups.dinner.push(log);
      } else {
        groups.snacks.push(log);
      }
    }
    return [
      { label: "Breakfast", key: "breakfast", logs: groups.breakfast },
      { label: "Lunch", key: "lunch", logs: groups.lunch },
      { label: "Dinner", key: "dinner", logs: groups.dinner },
      { label: "Snacks", key: "snacks", logs: groups.snacks },
    ];
  }, [dayLogs]);

  const missingCount = useMemo(() => {
    return dayLogs.filter((l) => {
      const item = l.items;
      return !item || (Number(item.calories_per_unit ?? 0) === 0 && Number(item.protein_g ?? 0) === 0);
    }).length;
  }, [dayLogs]);

  // Weekly consistency: last 7 days
  const weeklyConsistency = useMemo(() => {
    if (!logs) return [];
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const days: { date: Date; count: number; label: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = subDays(weekEnd, 6 - i);
      const count = logs.filter((l) => startOfDay(parseISO(l.consumed_at)).getTime() === startOfDay(d).getTime()).length;
      days.push({ date: d, count, label: format(d, "EEE") });
    }
    return days;
  }, [logs]);

  // Daily totals for last 7 days (for charts)
  const weeklyTotals = useMemo(() => {
    if (!logs) return [];
    const result: { date: string; calories: number; protein: number; carbs: number; fat: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const dayStart = startOfDay(d);
      const t = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      for (const log of logs) {
        if (startOfDay(parseISO(log.consumed_at)).getTime() === dayStart.getTime()) {
          const n = calculateNutrition(log.items, Number(log.quantity), log.unit);
          t.calories += n.calories;
          t.protein += n.protein;
          t.carbs += n.carbs;
          t.fat += n.fat;
        }
      }
      result.push({ date: format(d, "EEE"), ...t });
    }
    return result;
  }, [logs]);

  // Highlights
  const highlights = useMemo(() => {
    const items: string[] = [];
    if (dayLogs.length === 0) return items;

    // Top calorie source
    let topCal = { name: "", cal: 0 };
    for (const log of dayLogs) {
      const n = calculateNutrition(log.items, Number(log.quantity), log.unit);
      if (n.calories > topCal.cal) topCal = { name: log.items?.name ?? "Unknown", cal: n.calories };
    }
    if (topCal.cal > 0) items.push(`Top calorie source: ${topCal.name} (${topCal.cal.toFixed(0)} cal)`);

    // Protein source
    let topProt = { name: "", val: 0 };
    for (const log of dayLogs) {
      const n = calculateNutrition(log.items, Number(log.quantity), log.unit);
      if (n.protein > topProt.val) topProt = { name: log.items?.name ?? "Unknown", val: n.protein };
    }
    if (topProt.val > 0) items.push(`Highest protein from ${topProt.name} (${topProt.val.toFixed(0)}g)`);

    // Consistency
    const daysLogged = weeklyConsistency.filter((d) => d.count > 0).length;
    if (daysLogged >= 5) items.push(`Logged consistently ${daysLogged}/7 days this week 🎯`);

    // Low fiber
    if (totals.fiber < 10 && totals.fiber > 0) items.push("Low fiber intake detected today");
    if (totals.protein < 20 && dayLogs.length > 2) items.push("Low protein intake — consider adding protein-rich foods");

    return items;
  }, [dayLogs, totals, weeklyConsistency]);

  return {
    logs: dayLogs,
    allLogs: logs,
    totals,
    meals,
    missingCount,
    weeklyConsistency,
    weeklyTotals,
    highlights,
    isLoading,
    computeNutrients: calculateNutrition,
  };
};
