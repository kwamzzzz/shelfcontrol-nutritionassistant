import { useState } from "react";
import { useNutritionGoals, useUpsertGoals, type NutritionGoals } from "@/hooks/useNutritionGoals";
import { useNutritionData } from "@/hooks/useNutrition";
import { useWeeklyWater } from "@/hooks/useWaterTracking";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Target, Save, TrendingUp, Award, Flame, Beef, GlassWater, Wheat, Droplets } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Area, AreaChart, CartesianGrid } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const GoalsProgress = () => {
  const { data: goals, isLoading } = useNutritionGoals();
  const { weeklyTotals, weeklyConsistency } = useNutritionData();
  const { data: weeklyWater } = useWeeklyWater();
  const upsert = useUpsertGoals();
  const { toast } = useToast();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<NutritionGoals>({
    calorie_goal: 2000, protein_goal: 50, carbs_goal: 250, fat_goal: 65, water_goal_ml: 2000,
  });

  const startEdit = () => {
    if (goals) {
      setForm({
        calorie_goal: goals.calorie_goal ?? 2000,
        protein_goal: goals.protein_goal ?? 50,
        carbs_goal: goals.carbs_goal ?? 250,
        fat_goal: goals.fat_goal ?? 65,
        water_goal_ml: goals.water_goal_ml ?? 2000,
      });
    }
    setEditing(true);
  };

  const handleSave = async () => {
    try {
      await upsert.mutateAsync(form);
      toast({ title: "Saved", description: "Nutrition goals updated." });
      setEditing(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const calGoal = goals?.calorie_goal ?? 2000;
  const protGoal = goals?.protein_goal ?? 50;
  const waterGoal = goals?.water_goal_ml ?? 2000;
  const daysLogged = weeklyConsistency.filter((d) => d.count > 0).length;
  const daysOnCalTarget = weeklyTotals.filter((d) => d.calories >= calGoal * 0.8 && d.calories <= calGoal * 1.2).length;
  const daysOnProtTarget = weeklyTotals.filter((d) => d.protein >= protGoal).length;
  const daysOnWater = (weeklyWater ?? []).filter((d) => d.total >= waterGoal).length;

  // Avg calories
  const activeDays = weeklyTotals.filter(d => d.calories > 0);
  const avgCal = activeDays.length > 0 ? activeDays.reduce((s, d) => s + d.calories, 0) / activeDays.length : 0;
  const calTrend = avgCal > calGoal ? "above" : avgCal >= calGoal * 0.8 ? "on" : "below";

  if (isLoading) return <div className="py-20 text-center text-muted-foreground">Loading goals...</div>;

  return (
    <div className="space-y-5">
      {/* Goals Setup Card */}
      <Card className="rounded-2xl border-none shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Daily Goals</span>
            </div>
            {!editing && (
              <Button variant="outline" size="sm" onClick={startEdit} className="rounded-xl text-xs h-7">Edit Goals</Button>
            )}
          </div>

          {editing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "calorie_goal", label: "Calories", unit: "kcal" },
                  { key: "protein_goal", label: "Protein", unit: "g" },
                  { key: "carbs_goal", label: "Carbs", unit: "g" },
                  { key: "fat_goal", label: "Fat", unit: "g" },
                ].map(({ key, label, unit }) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">{label} ({unit})</Label>
                    <Input type="number" value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })} className="h-9 rounded-xl" />
                  </div>
                ))}
                <div className="space-y-1 col-span-2">
                  <Label className="text-[10px] text-muted-foreground">Water (ml)</Label>
                  <Input type="number" value={form.water_goal_ml} onChange={(e) => setForm({ ...form, water_goal_ml: Number(e.target.value) })} className="h-9 rounded-xl" />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)} className="text-xs">Cancel</Button>
                <Button size="sm" onClick={handleSave} disabled={upsert.isPending} className="rounded-xl">
                  <Save className="mr-1.5 h-3.5 w-3.5" /> Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-2">
              {[
                { label: "Calories", value: calGoal, unit: "kcal", icon: Flame, color: "text-primary" },
                { label: "Protein", value: protGoal, unit: "g", icon: Beef, color: "text-emerald-500" },
                { label: "Carbs", value: goals?.carbs_goal ?? 250, unit: "g", icon: Wheat, color: "text-amber-500" },
                { label: "Fat", value: goals?.fat_goal ?? 65, unit: "g", icon: Droplets, color: "text-rose-500" },
                { label: "Water", value: `${(waterGoal / 1000).toFixed(1)}`, unit: "L", icon: GlassWater, color: "text-blue-500" },
              ].map((g) => (
                <div key={g.label} className="text-center p-2.5 rounded-xl bg-muted/30">
                  <g.icon className={cn("h-3.5 w-3.5 mx-auto mb-1", g.color)} />
                  <p className="text-base font-bold tabular-nums text-foreground">{g.value}</p>
                  <p className="text-[9px] text-muted-foreground">{g.unit}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Avg Calories Insight */}
      <Card className="rounded-2xl border-none shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-foreground">Avg Calories</span>
            <span className={cn(
              "text-[10px] font-medium px-2 py-0.5 rounded-full",
              calTrend === "on" ? "bg-emerald-500/10 text-emerald-600" : calTrend === "above" ? "bg-amber-500/10 text-amber-600" : "bg-rose-500/10 text-rose-600"
            )}>
              {calTrend === "on" ? "⚡ Steady progress" : calTrend === "above" ? "↑ Above target" : "↓ Below target"}
            </span>
          </div>
          <p className="text-2xl font-display font-bold tabular-nums text-foreground mb-1">
            {avgCal.toFixed(0)} <span className="text-sm font-normal text-muted-foreground">kcal/day</span>
          </p>
          <p className="text-[10px] text-muted-foreground mb-3">
            {calTrend === "on" ? "Right on track with your target" : calTrend === "above" ? "Slightly above your target" : "Below your daily target"}
          </p>
          {weeklyTotals.length > 0 && (
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyTotals}>
                  <defs>
                    <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis hide />
                  <Tooltip
                    formatter={(v: number) => [`${v.toFixed(0)} kcal`, "Calories"]}
                    contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="calories" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#calGrad)" dot={{ r: 3, fill: "hsl(var(--primary))" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Streak Cards */}
      <div className="grid grid-cols-3 gap-3">
        <StreakCard icon={Flame} label="Calorie target" value={daysOnCalTarget} color="text-primary" bg="from-primary/8 to-primary/3" />
        <StreakCard icon={Beef} label="Protein goal" value={daysOnProtTarget} color="text-emerald-500" bg="from-emerald-500/8 to-emerald-500/3" />
        <StreakCard icon={GlassWater} label="Hydration goal" value={daysOnWater} color="text-blue-500" bg="from-blue-500/8 to-blue-500/3" />
      </div>

      {/* Journey */}
      <Card className="rounded-2xl border-none shadow-sm bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Award className="h-5 w-5 text-primary" />
            <span className="font-display font-semibold text-foreground">Your Journey</span>
          </div>
          <div className="space-y-2 text-sm text-foreground">
            <p>• Protein goal met <strong>{daysOnProtTarget}</strong>/7 days</p>
            <p>• Calorie adherence: <strong>{daysOnCalTarget}</strong>/7 days</p>
            <p>• Logging consistency: <strong>{daysLogged}</strong>/7 days</p>
            {daysOnProtTarget >= 5 && <p className="text-primary font-medium">🎯 Great protein consistency!</p>}
            {daysLogged >= 6 && <p className="text-primary font-medium">🔥 Amazing logging streak!</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const StreakCard = ({ icon: Icon, label, value, color, bg }: {
  icon: any; label: string; value: number; color: string; bg: string;
}) => (
  <Card className="rounded-2xl border-none shadow-sm overflow-hidden">
    <CardContent className={cn("p-4 text-center bg-gradient-to-br", bg)}>
      <Icon className={cn("mx-auto h-5 w-5 mb-1.5", color)} />
      <p className="text-2xl font-bold tabular-nums text-foreground">{value}<span className="text-sm font-normal text-muted-foreground">/7</span></p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
      <Progress value={(value / 7) * 100} className="mt-2 h-1" />
    </CardContent>
  </Card>
);

export default GoalsProgress;
