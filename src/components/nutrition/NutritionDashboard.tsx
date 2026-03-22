import { useMemo } from "react";
import { useNutritionData } from "@/hooks/useNutrition";
import { useNutritionGoals } from "@/hooks/useNutritionGoals";
import { useWaterLogs } from "@/hooks/useWaterTracking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Flame, Beef, Wheat, Droplets, Plus, BookOpen, GlassWater, Lightbulb, TrendingUp } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { isToday } from "date-fns";

interface Props {
  onNavigate: (tab: string) => void;
}

const NutritionDashboard = ({ onNavigate }: Props) => {
  const { totals, weeklyConsistency, highlights, isLoading, logs } = useNutritionData();
  const { data: goals } = useNutritionGoals();
  const { data: waterLogs } = useWaterLogs();

  const waterToday = useMemo(() => {
    return (waterLogs ?? []).reduce((sum, w: any) => sum + w.amount_ml, 0);
  }, [waterLogs]);

  const calGoal = goals?.calorie_goal ?? 2000;
  const protGoal = goals?.protein_goal ?? 50;
  const waterGoal = goals?.water_goal_ml ?? 2000;

  const macroData = useMemo(() => {
    const p = totals.protein * 4;
    const c = totals.carbs * 4;
    const f = totals.fat * 9;
    const total = p + c + f;
    if (total === 0) return [];
    return [
      { name: "Protein", value: p, grams: totals.protein, color: "hsl(var(--success))" },
      { name: "Carbs", value: c, grams: totals.carbs, color: "hsl(var(--warning))" },
      { name: "Fat", value: f, grams: totals.fat, color: "hsl(var(--destructive))" },
    ];
  }, [totals]);

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading nutrition data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Hero: Daily Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border-none bg-gradient-to-br from-primary/10 to-primary/5 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Flame className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">Calories</span>
            </div>
            <p className="text-3xl font-display font-bold text-foreground tabular-nums">{totals.calories.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground mt-1">of {calGoal} goal</p>
            <Progress value={Math.min((totals.calories / calGoal) * 100, 100)} className="mt-3 h-2" />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Beef className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-medium">Protein</span>
            </div>
            <p className="text-3xl font-display font-bold text-foreground tabular-nums">{totals.protein.toFixed(0)}g</p>
            <p className="text-xs text-muted-foreground mt-1">of {protGoal}g goal</p>
            <Progress value={Math.min((totals.protein / protGoal) * 100, 100)} className="mt-3 h-2" />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none bg-gradient-to-br from-amber-500/10 to-amber-500/5 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Wheat className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-medium">Carbs</span>
            </div>
            <p className="text-3xl font-display font-bold text-foreground tabular-nums">{totals.carbs.toFixed(0)}g</p>
            <p className="text-xs text-muted-foreground mt-1">of {goals?.carbs_goal ?? 250}g goal</p>
            <Progress value={Math.min((totals.carbs / (goals?.carbs_goal ?? 250)) * 100, 100)} className="mt-3 h-2" />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none bg-gradient-to-br from-blue-500/10 to-blue-500/5 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <GlassWater className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium">Water</span>
            </div>
            <p className="text-3xl font-display font-bold text-foreground tabular-nums">{(waterToday / 1000).toFixed(1)}L</p>
            <p className="text-xs text-muted-foreground mt-1">of {(waterGoal / 1000).toFixed(1)}L goal</p>
            <Progress value={Math.min((waterToday / waterGoal) * 100, 100)} className="mt-3 h-2" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Macro Breakdown */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">Macro Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {macroData.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">No food logged yet today</div>
            ) : (
              <div className="flex items-center gap-6">
                <div className="h-36 w-36 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={macroData} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={60} strokeWidth={2} stroke="hsl(var(--card))">
                        {macroData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3 flex-1">
                  {macroData.map((m) => {
                    const totalCal = macroData.reduce((s, e) => s + e.value, 0);
                    const pct = totalCal > 0 ? ((m.value / totalCal) * 100).toFixed(0) : 0;
                    return (
                      <div key={m.name} className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: m.color }} />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{m.name}</p>
                          <p className="text-xs text-muted-foreground">{m.grams.toFixed(0)}g · {pct}%</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weekly Consistency */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">Weekly Consistency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-2 py-4">
              {weeklyConsistency.map((day) => {
                const active = day.count > 0;
                const isCurrent = isToday(day.date);
                const intensity = Math.min(day.count, 5);
                return (
                  <div key={day.label} className="flex flex-col items-center gap-2">
                    <div
                      className={cn(
                        "flex items-center justify-center rounded-full transition-all",
                        isCurrent ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : "",
                        active ? "bg-primary" : "bg-muted",
                      )}
                      style={{
                        width: active ? 28 + intensity * 4 : 28,
                        height: active ? 28 + intensity * 4 : 28,
                        opacity: active ? 0.5 + intensity * 0.1 : 0.3,
                      }}
                    >
                      {active && <span className="text-[10px] font-bold text-primary-foreground">{day.count}</span>}
                    </div>
                    <span className={cn("text-[10px] font-medium", isCurrent ? "text-primary" : "text-muted-foreground")}>
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-center text-xs text-muted-foreground mt-2">
              {weeklyConsistency.filter((d) => d.count > 0).length}/7 days logged this week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Highlights */}
      {highlights.length > 0 && (
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-warning" />
              Today's Highlights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <TrendingUp className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                  <span className="text-foreground">{h}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button size="sm" onClick={() => onNavigate("diary")} className="rounded-xl">
          <Plus className="mr-1.5 h-4 w-4" /> Add Food
        </Button>
        <Button size="sm" variant="outline" onClick={() => onNavigate("water")} className="rounded-xl">
          <GlassWater className="mr-1.5 h-4 w-4" /> Log Water
        </Button>
        <Button size="sm" variant="outline" onClick={() => onNavigate("diary")} className="rounded-xl">
          <BookOpen className="mr-1.5 h-4 w-4" /> View Diary
        </Button>
      </div>
    </div>
  );
};

export default NutritionDashboard;
