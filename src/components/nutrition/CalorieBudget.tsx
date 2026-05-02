import { useMemo } from "react";
import { useNutritionData } from "@/hooks/useNutrition";
import { useNutritionGoals } from "@/hooks/useNutritionGoals";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet, TrendingUp, AlertTriangle, Flame } from "lucide-react";
import { startOfWeek, endOfWeek, addDays, format, isSameDay, parseISO, startOfDay } from "date-fns";

const CalorieBudget = () => {
  const { allLogs, computeNutrients } = useNutritionData();
  const { data: goals } = useNutritionGoals();

  const dailyGoal = goals?.calorie_goal ?? 2000;
  const weeklyTarget = dailyGoal * 7;

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const today = new Date();

  const days = useMemo(() => {
    const result: { date: Date; calories: number; isPast: boolean; isToday: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      let cals = 0;
      for (const log of allLogs ?? []) {
        if (startOfDay(parseISO(log.consumed_at)).getTime() === startOfDay(d).getTime()) {
          cals += computeNutrients(log.items, Number(log.quantity)).calories;
        }
      }
      result.push({
        date: d,
        calories: cals,
        isPast: d < startOfDay(today),
        isToday: isSameDay(d, today),
      });
    }
    return result;
  }, [allLogs, computeNutrients, weekStart, today]);

  const consumedSoFar = days.reduce((s, d) => s + d.calories, 0);
  const daysRemaining = days.filter((d) => !d.isPast).length;
  const remaining = Math.max(0, weeklyTarget - consumedSoFar);
  const perDayRemaining = daysRemaining > 0 ? remaining / daysRemaining : 0;
  const projectedOver = consumedSoFar > weeklyTarget;
  const todayCals = days.find((d) => d.isToday)?.calories ?? 0;
  const todayBudgetRemaining = Math.max(0, dailyGoal - todayCals);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Wallet className="h-5 w-5 text-primary" />
        <p className="text-sm text-muted-foreground">
          Treat the week as a budget. Save on weekdays to spend on weekends — or bank exercise.
        </p>
      </div>

      <Card className="rounded-2xl border-none shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-baseline justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              Week of {format(weekStart, "d MMM")} – {format(weekEnd, "d MMM")}
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              Target: {weeklyTarget.toLocaleString()} cal ({dailyGoal}/day)
            </p>
          </div>

          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-bold tabular-nums">
              {Math.round(consumedSoFar).toLocaleString()}
              <span className="text-sm font-normal text-muted-foreground"> / {weeklyTarget.toLocaleString()} cal</span>
            </p>
            <p className={`text-sm font-medium ${projectedOver ? "text-destructive" : "text-emerald-600"}`}>
              {projectedOver
                ? `+${Math.round(consumedSoFar - weeklyTarget).toLocaleString()} over`
                : `${Math.round(remaining).toLocaleString()} left`}
            </p>
          </div>

          <div className="h-2.5 rounded-full bg-muted/60 overflow-hidden">
            <div
              className={`h-full ${projectedOver ? "bg-destructive" : "bg-primary"}`}
              style={{ width: `${Math.min(100, (consumedSoFar / weeklyTarget) * 100)}%` }}
            />
          </div>

          <div className="grid grid-cols-7 gap-1 pt-1">
            {days.map((d) => {
              const ratio = Math.min(1.5, d.calories / dailyGoal);
              const fill = `${Math.min(100, ratio * 100)}%`;
              const over = d.calories > dailyGoal;
              return (
                <div key={d.date.toISOString()} className="flex flex-col items-center gap-1">
                  <div className="w-full h-12 rounded-md bg-muted/60 overflow-hidden flex items-end">
                    <div
                      className={`w-full ${over ? "bg-amber-500" : d.isToday ? "bg-primary" : "bg-primary/70"}`}
                      style={{ height: fill }}
                    />
                  </div>
                  <p className={`text-[10px] ${d.isToday ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                    {format(d.date, "EEEEE")}
                  </p>
                  <p className="text-[10px] text-muted-foreground tabular-nums">
                    {d.calories > 0 ? Math.round(d.calories) : "—"}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="rounded-2xl border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Flame className="h-4 w-4" />
              <p className="text-xs font-medium">Today</p>
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {Math.round(todayCals)}
              <span className="text-sm font-normal text-muted-foreground"> / {dailyGoal}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {todayBudgetRemaining > 0
                ? `${Math.round(todayBudgetRemaining)} cal left today`
                : `Over by ${Math.round(todayCals - dailyGoal)} cal`}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <p className="text-xs font-medium">Pace per remaining day</p>
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {daysRemaining === 0 ? "—" : Math.round(perDayRemaining)}
              {daysRemaining > 0 && <span className="text-sm font-normal text-muted-foreground"> cal</span>}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {daysRemaining === 0 ? "Week complete" : `${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} remaining`}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-xs font-medium">Status</p>
            </div>
            <p className={`mt-1 text-sm font-semibold ${projectedOver ? "text-destructive" : "text-emerald-600"}`}>
              {projectedOver ? "Over budget" : daysRemaining === 0 ? "On budget ✅" : "On track"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {projectedOver
                ? "You can pull it back by trimming or adding exercise."
                : "Keep banking calories or spend evenly across the week."}
            </p>
          </CardContent>
        </Card>
      </div>

      <p className="text-[11px] text-muted-foreground/80">
        Exercise banking: any extra calories you burn through workouts effectively raise the week's budget. Log activity in
        a future update — for now, mentally add 300–500 cal per gym session and track the rebalanced budget here.
      </p>
    </div>
  );
};

export default CalorieBudget;
