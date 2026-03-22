import { useMemo } from "react";
import { useNutritionData } from "@/hooks/useNutrition";
import { useDeleteConsumptionLog } from "@/hooks/useConsumption";
import AddConsumptionDialog from "@/components/consumption/AddConsumptionDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useNutritionGoals } from "@/hooks/useNutritionGoals";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Flame, Beef, Wheat, Droplets, Trash2, Coffee, Sun, Moon, Cookie, Info, Plus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const MEAL_META: Record<string, { icon: any; color: string; bg: string; target: number }> = {
  breakfast: { icon: Coffee, color: "text-amber-500", bg: "bg-amber-500/10", target: 300 },
  lunch: { icon: Sun, color: "text-orange-500", bg: "bg-orange-500/10", target: 550 },
  dinner: { icon: Moon, color: "text-indigo-500", bg: "bg-indigo-500/10", target: 700 },
  snacks: { icon: Cookie, color: "text-pink-500", bg: "bg-pink-500/10", target: 250 },
};

const FoodDiary = () => {
  const { totals, meals, missingCount, isLoading } = useNutritionData();
  const { data: goals } = useNutritionGoals();
  const deleteLog = useDeleteConsumptionLog();
  const { toast } = useToast();

  const calGoal = goals?.calorie_goal ?? 2000;
  const protGoal = goals?.protein_goal ?? 50;
  const carbsGoal = goals?.carbs_goal ?? 250;
  const fatGoal = goals?.fat_goal ?? 65;

  const handleDelete = async (id: string) => {
    try {
      await deleteLog.mutateAsync(id);
      toast({ title: "Deleted", description: "Food log removed." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="py-20 text-center text-muted-foreground">Loading diary...</div>;
  }

  return (
    <div className="space-y-5">
      {/* Summary Bar */}
      <Card className="rounded-2xl border-none shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Daily Total</p>
              <p className="text-2xl font-display font-bold tabular-nums text-foreground">
                {totals.calories.toFixed(0)} <span className="text-sm font-normal text-muted-foreground">/ {calGoal} kcal</span>
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Flame className="h-5 w-5 text-primary" />
            </div>
          </div>
          <Progress value={Math.min((totals.calories / calGoal) * 100, 100)} className="h-2 mb-4" />
          <div className="grid grid-cols-3 gap-3">
            <MacroChip icon={Beef} label="Protein" value={totals.protein} goal={protGoal} color="text-emerald-500" bg="bg-emerald-500/10" />
            <MacroChip icon={Wheat} label="Carbs" value={totals.carbs} goal={carbsGoal} color="text-amber-500" bg="bg-amber-500/10" />
            <MacroChip icon={Droplets} label="Fats" value={totals.fat} goal={fatGoal} color="text-rose-500" bg="bg-rose-500/10" />
          </div>
        </CardContent>
      </Card>

      {missingCount > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-accent/30 bg-accent/5 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
          <span>{missingCount} item(s) missing nutrition data — update catalog for accuracy.</span>
        </div>
      )}

      {/* Meal Sections */}
      {meals.map((meal) => {
        const meta = MEAL_META[meal.key] ?? MEAL_META.snacks;
        const MealIcon = meta.icon;
        const mealCal = meal.logs.reduce((sum, log) => {
          const item = log.items;
          const basis = item?.nutrition_basis ?? "per_unit";
          let mult = Number(log.quantity);
          if (basis === "per_100g") mult = Number(log.quantity) / 100;
          return sum + (Number(item?.calories_per_unit ?? 0) * mult);
        }, 0);
        const isComplete = mealCal >= meta.target * 0.8 && meal.logs.length > 0;

        return (
          <Card key={meal.key} className="rounded-2xl border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center", meta.bg)}>
                    <MealIcon className={cn("h-4 w-4", meta.color)} />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-foreground">{meal.label}</span>
                    {meal.logs.length > 0 && (
                      <Badge variant="secondary" className={cn("ml-2 text-[9px] rounded-full", isComplete ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600")}>
                        {isComplete ? "Completed" : "On Progress"}
                      </Badge>
                    )}
                  </div>
                </div>
                <span className="text-sm font-bold tabular-nums text-foreground">
                  {mealCal.toFixed(0)} <span className="text-xs font-normal text-muted-foreground">/ {meta.target} kcal</span>
                </span>
              </div>

              {meal.logs.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">Nothing logged yet</p>
              ) : (
                <div className="space-y-1.5">
                  {meal.logs.map((log: any) => {
                    const item = log.items;
                    const basis = item?.nutrition_basis ?? "per_unit";
                    let mult = Number(log.quantity);
                    if (basis === "per_100g") mult = Number(log.quantity) / 100;
                    const itemCal = Number(item?.calories_per_unit ?? 0) * mult;

                    return (
                      <div key={log.id} className="flex items-center gap-3 rounded-xl bg-muted/30 p-3 group">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{item?.name ?? "Unknown"}</p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                            <span>{log.quantity} {item?.serving_size ?? item?.default_unit ?? "serving"}</span>
                            <span>·</span>
                            <span>{format(parseISO(log.consumed_at), "h:mm a")}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold tabular-nums text-foreground flex items-center gap-1">
                            <Flame className="h-3 w-3 text-primary" /> {itemCal.toFixed(0)} kcal
                          </span>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove this log?</AlertDialogTitle>
                                <AlertDialogDescription>This will delete the consumption record.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(log.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      <div className="flex justify-center pt-2">
        <AddConsumptionDialog />
      </div>
    </div>
  );
};

const MacroChip = ({ icon: Icon, label, value, goal, color, bg }: {
  icon: any; label: string; value: number; goal: number; color: string; bg: string;
}) => (
  <div className={cn("rounded-xl p-2.5 text-center", bg)}>
    <div className="flex items-center justify-center gap-1 mb-0.5">
      <Icon className={cn("h-3 w-3", color)} />
      <span className={cn("text-[10px] font-medium", color)}>{label}</span>
    </div>
    <p className="text-sm font-bold tabular-nums text-foreground">
      {value.toFixed(0)} <span className="text-[10px] font-normal text-muted-foreground">/ {goal} g</span>
    </p>
  </div>
);

export default FoodDiary;
