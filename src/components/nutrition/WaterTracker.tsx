import { useMemo } from "react";
import { useWaterLogs, useAddWater, useDeleteWaterLog, useWeeklyWater } from "@/hooks/useWaterTracking";
import { useNutritionGoals } from "@/hooks/useNutritionGoals";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GlassWater, Plus, Trash2, Droplets } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const QUICK_AMOUNTS = [
  { label: "+250ml", value: 250, icon: "💧" },
  { label: "+500ml", value: 500, icon: "🥤" },
  { label: "+1L", value: 1000, icon: "🫗" },
];

const WaterTracker = () => {
  const { data: waterLogs, isLoading } = useWaterLogs();
  const { data: goals } = useNutritionGoals();
  const { data: weeklyData } = useWeeklyWater();
  const addWater = useAddWater();
  const deleteWater = useDeleteWaterLog();
  const { toast } = useToast();

  const waterGoal = goals?.water_goal_ml ?? 2000;
  const totalToday = useMemo(() => (waterLogs ?? []).reduce((sum, w: any) => sum + w.amount_ml, 0), [waterLogs]);
  const pct = Math.min((totalToday / waterGoal) * 100, 100);
  const remaining = Math.max(waterGoal - totalToday, 0);

  const handleAdd = async (amount: number) => {
    try {
      await addWater.mutateAsync(amount);
      toast({ title: "Logged", description: `+${amount}ml water added` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteWater.mutateAsync(id);
      toast({ title: "Removed", description: "Water log removed." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Max weekly value for bar scaling
  const maxWeekly = Math.max(...(weeklyData ?? []).map(d => d.total), waterGoal);

  return (
    <div className="space-y-5">
      {/* Hero */}
      <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-gradient-to-br from-blue-500/10 via-sky-500/5 to-transparent p-8 text-center">
            {/* Circular progress */}
            <div className="relative h-44 w-44 mx-auto mb-4">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r="70" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
                <circle
                  cx="80" cy="80" r="70" fill="none"
                  stroke="hsl(200 80% 55%)" strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={`${pct * 4.4} ${440 - pct * 4.4}`}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-display font-bold tabular-nums text-foreground">{(totalToday / 1000).toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">/ {(waterGoal / 1000).toFixed(1)}L</span>
              </div>
            </div>

            <p className="text-sm font-medium text-foreground">
              {pct >= 100 ? "🎉 Goal reached! Great hydration." : `${(remaining / 1000).toFixed(1)}L remaining`}
            </p>
          </div>

          {/* Quick add */}
          <div className="p-5">
            <div className="grid grid-cols-3 gap-3">
              {QUICK_AMOUNTS.map((a) => (
                <Button
                  key={a.value}
                  variant="outline"
                  className="rounded-2xl h-14 flex flex-col items-center gap-0.5 hover:bg-blue-500/5 hover:border-blue-500/30"
                  onClick={() => handleAdd(a.value)}
                  disabled={addWater.isPending}
                >
                  <span className="text-base">{a.icon}</span>
                  <span className="text-xs font-medium">{a.label}</span>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Bars */}
      <Card className="rounded-2xl border-none shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Droplets className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-semibold text-foreground">Weekly Hydration</span>
          </div>
          <div className="flex items-end gap-2 h-28">
            {(weeklyData ?? []).map((day, i) => {
              const barH = maxWeekly > 0 ? (day.total / maxWeekly) * 100 : 0;
              const isGoal = day.total >= waterGoal;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full relative" style={{ height: "100%" }}>
                    <div
                      className={cn(
                        "absolute bottom-0 w-full rounded-md transition-all",
                        isGoal ? "bg-blue-500" : day.total > 0 ? "bg-blue-400/50" : "bg-muted"
                      )}
                      style={{ height: `${Math.max(barH, 8)}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground font-medium">{day.date}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Today's Logs */}
      <Card className="rounded-2xl border-none shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <GlassWater className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-semibold text-foreground">Today's Logs</span>
          </div>
          {isLoading ? (
            <p className="py-4 text-center text-xs text-muted-foreground">Loading...</p>
          ) : !waterLogs?.length ? (
            <p className="py-6 text-center text-xs text-muted-foreground">No water logged today. Tap above to start!</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {waterLogs.map((log: any) => (
                <div key={log.id} className="flex items-center justify-between rounded-xl bg-muted/30 p-3 group">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <GlassWater className="h-3.5 w-3.5 text-blue-500" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-foreground">{log.amount_ml}ml</span>
                      <span className="text-[10px] text-muted-foreground ml-2">{format(new Date(log.logged_at), "h:mm a")}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(log.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WaterTracker;
