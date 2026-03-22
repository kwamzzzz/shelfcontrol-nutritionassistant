import { useMemo, useState } from "react";
import { useNutritionData } from "@/hooks/useNutrition";
import { useNutritionGoals } from "@/hooks/useNutritionGoals";
import { useWaterLogs } from "@/hooks/useWaterTracking";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, Beef, Wheat, Droplets, Plus, BookOpen, GlassWater, Lightbulb, TrendingUp, ChevronLeft, ChevronRight, Coffee, Sun, Moon, Cookie } from "lucide-react";
import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { isToday, format, subDays, addDays, startOfWeek, endOfWeek, isSameDay } from "date-fns";

interface Props {
  onNavigate: (tab: string) => void;
}

const MEAL_ICONS: Record<string, any> = { breakfast: Coffee, lunch: Sun, dinner: Moon, snacks: Cookie };

const NutritionDashboard = ({ onNavigate }: Props) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { totals, meals, weeklyConsistency, highlights, isLoading, logs } = useNutritionData(selectedDate);
  const { data: goals } = useNutritionGoals();
  const { data: waterLogs } = useWaterLogs(selectedDate);

  const waterToday = useMemo(() => {
    return (waterLogs ?? []).reduce((sum, w: any) => sum + w.amount_ml, 0);
  }, [waterLogs]);

  const calGoal = goals?.calorie_goal ?? 2000;
  const protGoal = goals?.protein_goal ?? 50;
  const carbsGoal = goals?.carbs_goal ?? 250;
  const fatGoal = goals?.fat_goal ?? 65;
  const waterGoal = goals?.water_goal_ml ?? 2000;

  const calLeft = Math.max(calGoal - totals.calories, 0);
  const calPct = Math.min((totals.calories / calGoal) * 100, 100);

  // Week days for selector
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const radialData = [{ value: calPct, fill: "hsl(var(--primary))" }];

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading nutrition data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Date Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">📅</span>
          <span className="text-sm font-medium text-muted-foreground">{format(selectedDate, "MMMM yyyy")}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedDate(subDays(selectedDate, 7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => setSelectedDate(new Date())}>
            Today
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedDate(addDays(selectedDate, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Week Day Selector */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const selected = isSameDay(day, selectedDate);
          const today = isToday(day);
          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDate(day)}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 rounded-2xl transition-all text-center",
                selected ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-muted",
                today && !selected && "ring-2 ring-primary/30"
              )}
            >
              <span className={cn("text-[10px] font-medium uppercase", selected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                {format(day, "EEE").charAt(0)}
              </span>
              <span className={cn("text-sm font-bold tabular-nums", selected ? "text-primary-foreground" : "text-foreground")}>
                {format(day, "dd")}
              </span>
            </button>
          );
        })}
      </div>

      {/* Hero: Calorie Ring + Macros */}
      <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Radial Calorie Chart */}
            <div className="relative h-40 w-40 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" startAngle={90} endAngle={-270} data={radialData} barSize={12}>
                  <RadialBar background={{ fill: "hsl(var(--muted))" }} dataKey="value" cornerRadius={10} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] text-muted-foreground">🍽</span>
                <span className="text-2xl font-display font-bold tabular-nums text-foreground">{calLeft.toFixed(0)}</span>
                <span className="text-[10px] text-muted-foreground">Left</span>
              </div>
            </div>

            {/* Daily Calories */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
                <Flame className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Daily Calories</span>
              </div>
              <p className="text-3xl font-display font-bold tabular-nums text-foreground">
                {totals.calories.toFixed(0)} <span className="text-base font-normal text-muted-foreground">/ {calGoal.toLocaleString()} kcal</span>
              </p>
            </div>
          </div>

          {/* Macro Grid */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            <MacroCard
              icon={Wheat}
              label="Carbs"
              value={totals.carbs}
              goal={carbsGoal}
              unit="g"
              color="text-amber-500"
              bgColor="bg-amber-500/10"
            />
            <MacroCard
              icon={Droplets}
              label="Fats"
              value={totals.fat}
              goal={fatGoal}
              unit="g"
              color="text-rose-500"
              bgColor="bg-rose-500/10"
            />
            <MacroCard
              icon={Beef}
              label="Protein"
              value={totals.protein}
              goal={protGoal}
              unit="g"
              color="text-emerald-500"
              bgColor="bg-emerald-500/10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Today's Meals */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-display font-semibold text-foreground">Today's Meals</h3>
          <Button variant="ghost" size="sm" className="text-xs text-primary h-7 px-2" onClick={() => onNavigate("diary")}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add Meal
          </Button>
        </div>
        <div className="space-y-3">
          {meals.map((meal) => {
            const MealIcon = MEAL_ICONS[meal.key] ?? Flame;
            const mealCal = meal.logs.reduce((sum, log) => {
              const item = log.items;
              const basis = item?.nutrition_basis ?? "per_unit";
              let mult = Number(log.quantity);
              if (basis === "per_100g") mult = Number(log.quantity) / 100;
              return sum + (Number(item?.calories_per_unit ?? 0) * mult);
            }, 0);
            const mealTarget = meal.key === "breakfast" ? 300 : meal.key === "lunch" ? 550 : meal.key === "dinner" ? 700 : 250;
            const isComplete = mealCal >= mealTarget * 0.8;
            const hasLogs = meal.logs.length > 0;

            return (
              <Card key={meal.key} className="rounded-2xl shadow-sm border-none cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate("diary")}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MealIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground">{meal.label}</span>
                    </div>
                    <Badge variant="secondary" className={cn("text-[10px] rounded-full", isComplete && hasLogs ? "bg-emerald-500/10 text-emerald-600" : hasLogs ? "bg-amber-500/10 text-amber-600" : "")}>
                      {hasLogs ? (isComplete ? "Completed" : "On Progress") : "Not started"}
                    </Badge>
                  </div>
                  <p className="text-xl font-bold tabular-nums text-foreground">
                    {mealCal.toFixed(0)} <span className="text-sm font-normal text-muted-foreground">/ {mealTarget} kcal</span>
                  </p>
                  {hasLogs && (
                    <div className="mt-2 space-y-1">
                      {meal.logs.slice(0, 2).map((log: any) => (
                        <div key={log.id} className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{log.items?.name ?? "Unknown"}</span>
                          <span className="tabular-nums flex items-center gap-1">
                            <Flame className="h-3 w-3" />
                            {(Number(log.items?.calories_per_unit ?? 0) * Number(log.quantity)).toFixed(0)} kcal
                          </span>
                        </div>
                      ))}
                      {meal.logs.length > 2 && (
                        <span className="text-[10px] text-muted-foreground">+{meal.logs.length - 2} more</span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Metric Tiles (Health Dashboard style) */}
      <div className="grid grid-cols-2 gap-3">
        <MetricTile
          icon={GlassWater}
          label="Hydration"
          value={`${(waterToday / 1000).toFixed(1)}L`}
          sub={waterToday >= waterGoal ? "Goal Reached ✓" : `${((waterToday / waterGoal) * 100).toFixed(0)}% of goal`}
          color="text-blue-500"
          bgColor="from-blue-500/8 to-blue-400/4"
          onClick={() => onNavigate("water")}
          weekData={weeklyConsistency.map(d => ({ val: d.count > 0 ? 1 : 0 }))}
        />
        <MetricTile
          icon={TrendingUp}
          label="Consistency"
          value={`${weeklyConsistency.filter(d => d.count > 0).length}/7`}
          sub="Days logged"
          color="text-primary"
          bgColor="from-primary/8 to-primary/4"
          onClick={() => onNavigate("goals")}
          weekData={weeklyConsistency.map(d => ({ val: Math.min(d.count, 5) }))}
        />
      </div>

      {/* Highlights */}
      {highlights.length > 0 && (
        <Card className="rounded-2xl border-none shadow-sm bg-gradient-to-br from-primary/8 to-primary/3">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Lightbulb className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">You're on track!</p>
                <p className="text-[10px] text-muted-foreground">Stay focused & keep the momentum going.</p>
              </div>
            </div>
            <div className="space-y-1.5">
              {highlights.slice(0, 3).map((h, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-foreground">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{h}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => onNavigate("diary")} className="rounded-xl flex-1">
          <Plus className="mr-1.5 h-4 w-4" /> Log Food
        </Button>
        <Button size="sm" variant="outline" onClick={() => onNavigate("water")} className="rounded-xl flex-1">
          <GlassWater className="mr-1.5 h-4 w-4" /> Log Water
        </Button>
        <Button size="sm" variant="outline" onClick={() => onNavigate("insights")} className="rounded-xl flex-1">
          <BookOpen className="mr-1.5 h-4 w-4" /> Insights
        </Button>
      </div>
    </div>
  );
};

// --- Sub-components ---

const MacroCard = ({ icon: Icon, label, value, goal, unit, color, bgColor }: {
  icon: any; label: string; value: number; goal: number; unit: string; color: string; bgColor: string;
}) => (
  <div className={cn("rounded-2xl p-3.5 text-center", bgColor)}>
    <Icon className={cn("h-4 w-4 mx-auto mb-1", color)} />
    <p className="text-lg font-bold tabular-nums text-foreground">{value.toFixed(0)}</p>
    <p className="text-[10px] text-muted-foreground">/ {goal} {unit}</p>
    <p className={cn("text-[10px] font-medium mt-0.5", color)}>{label}</p>
  </div>
);

const MetricTile = ({ icon: Icon, label, value, sub, color, bgColor, onClick, weekData }: {
  icon: any; label: string; value: string; sub: string; color: string; bgColor: string;
  onClick: () => void; weekData: { val: number }[];
}) => (
  <Card className="rounded-2xl border-none shadow-sm cursor-pointer hover:shadow-md transition-shadow overflow-hidden" onClick={onClick}>
    <CardContent className={cn("p-4 bg-gradient-to-br", bgColor)}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Icon className={cn("h-4 w-4", color)} />
          <span className="text-xs font-semibold text-foreground">{label}</span>
        </div>
        <span className="text-[10px] text-muted-foreground">Today ›</span>
      </div>
      <p className="text-2xl font-display font-bold tabular-nums text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
      {/* Mini week bars */}
      <div className="flex items-end gap-1 mt-3 h-5">
        {weekData.map((d, i) => (
          <div
            key={i}
            className={cn("flex-1 rounded-sm transition-all", d.val > 0 ? "bg-current opacity-60" : "bg-muted")}
            style={{ height: d.val > 0 ? `${Math.max(d.val * 20, 30)}%` : "20%", color: `var(--${color.includes("blue") ? "blue" : "primary"})` }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i} className="text-[8px] text-muted-foreground flex-1 text-center">{d}</span>
        ))}
      </div>
    </CardContent>
  </Card>
);

export default NutritionDashboard;
