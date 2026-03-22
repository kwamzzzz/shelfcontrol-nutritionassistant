import { useMemo } from "react";
import { useNutritionData } from "@/hooks/useNutrition";
import { useNutritionGoals } from "@/hooks/useNutritionGoals";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingUp, AlertTriangle, Lightbulb, Utensils, ShoppingCart, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface Insight {
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  category: string;
  icon: any;
}

const SEVERITY_STYLES: Record<string, { icon: string; badge: string; border: string }> = {
  high: { icon: "bg-destructive/10 text-destructive", badge: "bg-destructive text-destructive-foreground", border: "border-l-destructive" },
  medium: { icon: "bg-amber-500/10 text-amber-600", badge: "bg-amber-500/10 text-amber-600", border: "border-l-amber-500" },
  low: { icon: "bg-emerald-500/10 text-emerald-600", badge: "bg-emerald-500/10 text-emerald-600", border: "border-l-emerald-500" },
};

const NutritionInsights = () => {
  const { totals, weeklyTotals, weeklyConsistency, allLogs } = useNutritionData();
  const { data: goals } = useNutritionGoals();

  const insights = useMemo(() => {
    const result: Insight[] = [];
    const calGoal = goals?.calorie_goal ?? 2000;
    const protGoal = goals?.protein_goal ?? 50;

    // Eating pattern
    if (allLogs && allLogs.length > 5) {
      const mealCals: Record<string, number> = { morning: 0, afternoon: 0, evening: 0, night: 0 };
      for (const log of allLogs) {
        const h = new Date(log.consumed_at).getHours();
        const cal = Number(log.items?.calories_per_unit ?? 0) * Number(log.quantity);
        if (h < 11) mealCals.morning += cal;
        else if (h < 15) mealCals.afternoon += cal;
        else if (h < 20) mealCals.evening += cal;
        else mealCals.night += cal;
      }
      const top = Object.entries(mealCals).sort((a, b) => b[1] - a[1])[0];
      if (top[1] > 0) {
        const labels: Record<string, string> = { morning: "breakfast", afternoon: "lunch", evening: "dinner", night: "late-night snacking" };
        result.push({
          title: `Most calories at ${labels[top[0]]}`,
          description: `Your highest calorie consumption comes from ${labels[top[0]]}. ${top[0] === "night" ? "Consider shifting calories earlier." : "This is a common pattern."}`,
          severity: top[0] === "night" ? "medium" : "low",
          category: "Eating Pattern",
          icon: Utensils,
        });
      }
    }

    // Low protein
    const lowProtDays = weeklyTotals.filter((d) => d.protein > 0 && d.protein < protGoal * 0.6).length;
    if (lowProtDays >= 3) {
      result.push({
        title: `Low protein across ${lowProtDays} days`,
        description: "Consistently below your protein target. Add protein-rich items to meals.",
        severity: "high",
        category: "Nutrient Gap",
        icon: AlertTriangle,
      });
    }

    // High carb
    const avgCarbs = weeklyTotals.reduce((s, d) => s + d.carbs, 0) / Math.max(weeklyTotals.filter(d => d.carbs > 0).length, 1);
    const avgProt = weeklyTotals.reduce((s, d) => s + d.protein, 0) / Math.max(weeklyTotals.filter(d => d.protein > 0).length, 1);
    const avgFat = weeklyTotals.reduce((s, d) => s + d.fat, 0) / Math.max(weeklyTotals.filter(d => d.fat > 0).length, 1);
    const totalMacroCal = (avgCarbs * 4) + (avgProt * 4) + (avgFat * 9);
    if (totalMacroCal > 0 && (avgCarbs * 4 / totalMacroCal) > 0.65) {
      result.push({
        title: "High carb reliance detected",
        description: "Over 65% of calories from carbs. Balance with more protein and healthy fats.",
        severity: "medium",
        category: "Nutrient Gap",
        icon: TrendingUp,
      });
    }

    // Weekend drop
    const weekdayLogs = weeklyConsistency.filter((_, i) => i < 5).filter((d) => d.count > 0).length;
    const weekendLogs = weeklyConsistency.filter((_, i) => i >= 5).filter((d) => d.count > 0).length;
    if (weekdayLogs >= 4 && weekendLogs === 0) {
      result.push({
        title: "Weekend logging drops off",
        description: "Great weekday consistency but weekends untracked. Try logging at least one meal.",
        severity: "medium",
        category: "Behaviour",
        icon: Brain,
      });
    }

    // Calorie concentration
    if (allLogs && allLogs.length > 3) {
      const itemCals: Record<string, { name: string; total: number }> = {};
      for (const log of allLogs) {
        const name = log.items?.name ?? "Unknown";
        const cal = Number(log.items?.calories_per_unit ?? 0) * Number(log.quantity);
        if (!itemCals[name]) itemCals[name] = { name, total: 0 };
        itemCals[name].total += cal;
      }
      const sorted = Object.values(itemCals).sort((a, b) => b.total - a.total);
      const totalCal = sorted.reduce((s, e) => s + e.total, 0);
      if (sorted.length >= 3 && totalCal > 0) {
        const top3Share = (sorted.slice(0, 3).reduce((s, e) => s + e.total, 0) / totalCal) * 100;
        if (top3Share > 70) {
          result.push({
            title: "Most calories from 3 items",
            description: `${sorted[0].name}, ${sorted[1].name}, and ${sorted[2].name} make up ${top3Share.toFixed(0)}% of calories.`,
            severity: "medium",
            category: "Eating Pattern",
            icon: Lightbulb,
          });
        }
      }
    }

    // Low variety
    if (allLogs && allLogs.length > 5) {
      const uniqueItems = new Set(allLogs.map((l) => l.items?.name)).size;
      if (uniqueItems <= 3) {
        result.push({
          title: "Low food variety",
          description: `Only ${uniqueItems} different items logged. Diversify for better nutrition.`,
          severity: "medium",
          category: "Pantry Connection",
          icon: ShoppingCart,
        });
      }
    }

    // Good
    const daysLogged = weeklyConsistency.filter((d) => d.count > 0).length;
    if (daysLogged >= 6) {
      result.push({
        title: "Excellent logging consistency! 🎯",
        description: `${daysLogged}/7 days logged this week. Keep it up!`,
        severity: "low",
        category: "Achievement",
        icon: Shield,
      });
    }

    return result;
  }, [allLogs, weeklyTotals, weeklyConsistency, goals]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5 text-primary" />
        <p className="text-sm text-muted-foreground">Pattern analysis based on your nutrition data</p>
      </div>

      {insights.length === 0 ? (
        <Card className="rounded-2xl border-none shadow-sm">
          <CardContent className="p-8 text-center">
            <Brain className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Not enough data for insights. Keep logging!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {insights.map((insight, i) => {
            const Icon = insight.icon;
            const style = SEVERITY_STYLES[insight.severity];
            return (
              <Card key={i} className={cn("rounded-2xl border-none shadow-sm border-l-4", style.border)}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", style.icon)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="secondary" className="text-[9px] rounded-full">{insight.category}</Badge>
                        <Badge className={cn("text-[9px] rounded-full border-none", style.badge)}>{insight.severity}</Badge>
                      </div>
                      <p className="font-semibold text-sm text-foreground">{insight.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{insight.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NutritionInsights;
