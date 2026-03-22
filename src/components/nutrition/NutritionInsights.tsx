import { useMemo } from "react";
import { useNutritionData } from "@/hooks/useNutrition";
import { useNutritionGoals } from "@/hooks/useNutritionGoals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingUp, AlertTriangle, Lightbulb, Utensils, ShoppingCart } from "lucide-react";

interface Insight {
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  category: string;
  icon: any;
}

const SEVERITY_COLORS: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-primary/10 text-primary border-primary/20",
};

const NutritionInsights = () => {
  const { totals, weeklyTotals, weeklyConsistency, allLogs } = useNutritionData();
  const { data: goals } = useNutritionGoals();

  const insights = useMemo(() => {
    const result: Insight[] = [];
    const calGoal = goals?.calorie_goal ?? 2000;
    const protGoal = goals?.protein_goal ?? 50;

    // Eating pattern: most calories at which meal
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

    // Low protein days
    const lowProtDays = weeklyTotals.filter((d) => d.protein > 0 && d.protein < protGoal * 0.6).length;
    if (lowProtDays >= 3) {
      result.push({
        title: `Low protein intake across ${lowProtDays} days`,
        description: "You're consistently below your protein target. Add protein-rich items to your pantry and meals.",
        severity: "high",
        category: "Nutrient Gap",
        icon: AlertTriangle,
      });
    }

    // High carb reliance
    const avgCarbs = weeklyTotals.reduce((s, d) => s + d.carbs, 0) / Math.max(weeklyTotals.filter(d => d.carbs > 0).length, 1);
    const avgProt = weeklyTotals.reduce((s, d) => s + d.protein, 0) / Math.max(weeklyTotals.filter(d => d.protein > 0).length, 1);
    if (avgCarbs > 0 && avgProt > 0 && (avgCarbs * 4) / ((avgCarbs * 4) + (avgProt * 4) + (weeklyTotals.reduce((s, d) => s + d.fat, 0) / 7 * 9)) > 0.65) {
      result.push({
        title: "High carbohydrate reliance detected",
        description: "Over 65% of your calories come from carbs. Consider balancing with more protein and healthy fats.",
        severity: "medium",
        category: "Nutrient Gap",
        icon: TrendingUp,
      });
    }

    // Weekend logging drop
    const weekdayLogs = weeklyConsistency.filter((d, i) => i < 5).filter((d) => d.count > 0).length;
    const weekendLogs = weeklyConsistency.filter((d, i) => i >= 5).filter((d) => d.count > 0).length;
    if (weekdayLogs >= 4 && weekendLogs === 0) {
      result.push({
        title: "You log less on weekends",
        description: "Great consistency during the week, but weekends are untracked. Try logging at least one meal each weekend day.",
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
            title: "Most calories come from 3 items",
            description: `${sorted[0].name}, ${sorted[1].name}, and ${sorted[2].name} account for ${top3Share.toFixed(0)}% of your calories. Consider diversifying.`,
            severity: "medium",
            category: "Eating Pattern",
            icon: Lightbulb,
          });
        }
      }
    }

    // Pantry connection: low protein items
    if (allLogs && allLogs.length > 0) {
      const uniqueItems = new Set(allLogs.map((l) => l.items?.name)).size;
      if (uniqueItems <= 3 && allLogs.length > 5) {
        result.push({
          title: "Low food variety",
          description: `You've been eating only ${uniqueItems} different items. Consider adding variety for better nutrition.`,
          severity: "medium",
          category: "Pantry Connection",
          icon: ShoppingCart,
        });
      }
    }

    // Good patterns
    const daysLogged = weeklyConsistency.filter((d) => d.count > 0).length;
    if (daysLogged >= 6) {
      result.push({
        title: "Excellent logging consistency! 🎯",
        description: `You've logged ${daysLogged}/7 days this week. Keep up the great habit.`,
        severity: "low",
        category: "Achievement",
        icon: TrendingUp,
      });
    }

    return result;
  }, [allLogs, weeklyTotals, weeklyConsistency, goals]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Brain className="h-5 w-5 text-primary" />
        <p className="text-sm text-muted-foreground">Pattern analysis based on your nutrition data</p>
      </div>

      {insights.length === 0 ? (
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-8 text-center">
            <Brain className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Not enough data for insights yet. Keep logging to unlock patterns.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {insights.map((insight, i) => {
            const Icon = insight.icon;
            return (
              <Card key={i} className="rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl ${SEVERITY_COLORS[insight.severity]}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-[9px]">{insight.category}</Badge>
                        <Badge
                          className={`text-[9px] ${
                            insight.severity === "high" ? "bg-destructive text-destructive-foreground" :
                            insight.severity === "medium" ? "bg-warning text-warning-foreground" :
                            "bg-primary/10 text-primary"
                          }`}
                        >
                          {insight.severity}
                        </Badge>
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
