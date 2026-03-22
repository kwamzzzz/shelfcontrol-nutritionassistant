import { useMemo } from "react";
import { useWaterLogs, useAddWater, useDeleteWaterLog, useWeeklyWater } from "@/hooks/useWaterTracking";
import { useNutritionGoals } from "@/hooks/useNutritionGoals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { GlassWater, Plus, Trash2, Droplets, TrendingUp } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

const QUICK_AMOUNTS = [
  { label: "+250ml", value: 250 },
  { label: "+500ml", value: 500 },
  { label: "+1L", value: 1000 },
];

const WaterTracker = () => {
  const { data: waterLogs, isLoading } = useWaterLogs();
  const { data: goals } = useNutritionGoals();
  const { data: weeklyData } = useWeeklyWater();
  const addWater = useAddWater();
  const deleteWater = useDeleteWaterLog();
  const { toast } = useToast();

  const waterGoal = goals?.water_goal_ml ?? 2000;
  const totalToday = useMemo(() => {
    return (waterLogs ?? []).reduce((sum, w: any) => sum + w.amount_ml, 0);
  }, [waterLogs]);

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

  return (
    <div className="space-y-6">
      {/* Hero Progress */}
      <Card className="rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-blue-500/10 to-sky-500/5 p-8 text-center">
          <GlassWater className="mx-auto h-10 w-10 text-blue-500 mb-3" />
          <p className="text-5xl font-display font-bold text-foreground tabular-nums">
            {(totalToday / 1000).toFixed(1)}<span className="text-xl font-normal text-muted-foreground ml-1">L</span>
          </p>
          <p className="text-sm text-muted-foreground mt-1">of {(waterGoal / 1000).toFixed(1)}L daily goal</p>
          <Progress value={pct} className="mt-5 h-3 max-w-xs mx-auto" />
          <p className="text-xs text-muted-foreground mt-2">
            {pct >= 100
              ? "🎉 Goal reached! Great hydration."
              : `${(remaining / 1000).toFixed(1)}L remaining`}
          </p>
        </div>
        <CardContent className="p-5">
          <div className="flex justify-center gap-3">
            {QUICK_AMOUNTS.map((a) => (
              <Button
                key={a.value}
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => handleAdd(a.value)}
                disabled={addWater.isPending}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                {a.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Weekly Chart */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Weekly Hydration
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyData && weeklyData.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData}>
                    <XAxis dataKey="date" tickLine={false} axisLine={false} className="text-[10px]" />
                    <YAxis hide />
                    <Tooltip
                      formatter={(v: number) => [`${v}ml`, "Water"]}
                      contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                    />
                    <Bar dataKey="total" fill="hsl(200 80% 55%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Today's Logs */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Droplets className="h-4 w-4 text-blue-500" />
              Today's Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Loading...</p>
            ) : !waterLogs?.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No water logged today. Start hydrating!</p>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {waterLogs.map((log: any) => (
                  <div key={log.id} className="flex items-center justify-between rounded-lg bg-muted/30 p-2.5 group">
                    <div className="flex items-center gap-2">
                      <GlassWater className="h-3.5 w-3.5 text-blue-500" />
                      <span className="text-sm font-medium text-foreground">{log.amount_ml}ml</span>
                      <span className="text-[11px] text-muted-foreground">{format(new Date(log.logged_at), "h:mm a")}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDelete(log.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WaterTracker;
