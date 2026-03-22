import { useState } from "react";
import { useNutritionGoals, useUpsertGoals, type NutritionGoals } from "@/hooks/useNutritionGoals";
import { useNutritionData } from "@/hooks/useNutrition";
import { useWeeklyWater } from "@/hooks/useWaterTracking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Target, Save, TrendingUp, Award, Flame, Beef, GlassWater } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useToast } from "@/hooks/use-toast";

const GoalsProgress = () => {
  const { data: goals, isLoading } = useNutritionGoals();
  const { weeklyTotals, weeklyConsistency } = useNutritionData();
  const { data: weeklyWater } = useWeeklyWater();
  const upsert = useUpsertGoals();
  const { toast } = useToast();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<NutritionGoals>({
    calorie_goal: 2000,
    protein_goal: 50,
    carbs_goal: 250,
    fat_goal: 65,
    water_goal_ml: 2000,
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

  // Streaks
  const daysLogged = weeklyConsistency.filter((d) => d.count > 0).length;
  const calGoal = goals?.calorie_goal ?? 2000;
  const protGoal = goals?.protein_goal ?? 50;
  const daysOnCalTarget = weeklyTotals.filter((d) => d.calories >= calGoal * 0.8 && d.calories <= calGoal * 1.2).length;
  const daysOnProtTarget = weeklyTotals.filter((d) => d.protein >= protGoal).length;
  const waterGoal = goals?.water_goal_ml ?? 2000;
  const daysOnWater = (weeklyWater ?? []).filter((d) => d.total >= waterGoal).length;

  if (isLoading) return <div className="py-20 text-center text-muted-foreground">Loading goals...</div>;

  return (
    <div className="space-y-6">
      {/* Goals Setup */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Daily Goals
            </CardTitle>
            {!editing && (
              <Button variant="outline" size="sm" onClick={startEdit} className="rounded-xl text-xs">
                Edit Goals
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Calories</Label>
                  <Input type="number" value={form.calorie_goal} onChange={(e) => setForm({ ...form, calorie_goal: Number(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Protein (g)</Label>
                  <Input type="number" value={form.protein_goal} onChange={(e) => setForm({ ...form, protein_goal: Number(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Carbs (g)</Label>
                  <Input type="number" value={form.carbs_goal} onChange={(e) => setForm({ ...form, carbs_goal: Number(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Fat (g)</Label>
                  <Input type="number" value={form.fat_goal} onChange={(e) => setForm({ ...form, fat_goal: Number(e.target.value) })} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">Water (ml)</Label>
                  <Input type="number" value={form.water_goal_ml} onChange={(e) => setForm({ ...form, water_goal_ml: Number(e.target.value) })} />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                <Button size="sm" onClick={handleSave} disabled={upsert.isPending}>
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              {[
                { label: "Calories", value: goals?.calorie_goal ?? 2000, unit: "cal" },
                { label: "Protein", value: goals?.protein_goal ?? 50, unit: "g" },
                { label: "Carbs", value: goals?.carbs_goal ?? 250, unit: "g" },
                { label: "Fat", value: goals?.fat_goal ?? 65, unit: "g" },
                { label: "Water", value: (goals?.water_goal_ml ?? 2000) / 1000, unit: "L" },
              ].map((g) => (
                <div key={g.label} className="text-center p-3 rounded-xl bg-muted/30">
                  <p className="text-xl font-bold tabular-nums text-foreground">{g.value}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{g.label} ({g.unit})</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Journey */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-5 text-center">
            <Flame className="mx-auto h-6 w-6 text-primary mb-2" />
            <p className="text-2xl font-bold tabular-nums text-foreground">{daysOnCalTarget}/7</p>
            <p className="text-xs text-muted-foreground mt-1">Days on calorie target</p>
            <Progress value={(daysOnCalTarget / 7) * 100} className="mt-3 h-1.5" />
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-5 text-center">
            <Beef className="mx-auto h-6 w-6 text-emerald-600 mb-2" />
            <p className="text-2xl font-bold tabular-nums text-foreground">{daysOnProtTarget}/7</p>
            <p className="text-xs text-muted-foreground mt-1">Days protein goal met</p>
            <Progress value={(daysOnProtTarget / 7) * 100} className="mt-3 h-1.5" />
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-5 text-center">
            <GlassWater className="mx-auto h-6 w-6 text-blue-500 mb-2" />
            <p className="text-2xl font-bold tabular-nums text-foreground">{daysOnWater}/7</p>
            <p className="text-xs text-muted-foreground mt-1">Days hydration goal met</p>
            <Progress value={(daysOnWater / 7) * 100} className="mt-3 h-1.5" />
          </CardContent>
        </Card>
      </div>

      {/* Weekly Trends */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            7-Day Calorie Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {weeklyTotals.length > 0 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyTotals}>
                  <XAxis dataKey="date" tickLine={false} axisLine={false} className="text-[10px]" />
                  <YAxis hide />
                  <Tooltip
                    formatter={(v: number) => [`${v.toFixed(0)} cal`, "Calories"]}
                    contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                  />
                  <Line type="monotone" dataKey="calories" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No data yet</p>
          )}
        </CardContent>
      </Card>

      {/* Journey Summary */}
      <Card className="rounded-2xl shadow-sm bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Award className="h-5 w-5 text-primary" />
            <p className="font-display font-semibold text-foreground">Your Journey</p>
          </div>
          <div className="space-y-2 text-sm text-foreground">
            <p>• You hit your protein goal <strong>{daysOnProtTarget}</strong>/7 days this week</p>
            <p>• Calorie adherence: <strong>{daysOnCalTarget}</strong>/7 days within target range</p>
            <p>• Logging consistency: <strong>{daysLogged}</strong>/7 days</p>
            {daysOnProtTarget >= 5 && <p className="text-primary font-medium">🎯 Great protein consistency!</p>}
            {daysLogged >= 6 && <p className="text-primary font-medium">🔥 Amazing logging streak!</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GoalsProgress;
