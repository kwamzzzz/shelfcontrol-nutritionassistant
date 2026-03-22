import { useMemo, useState } from "react";
import { useNutritionData } from "@/hooks/useNutrition";
import { useDeleteConsumptionLog } from "@/hooks/useConsumption";
import AddConsumptionDialog from "@/components/consumption/AddConsumptionDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useNutritionGoals } from "@/hooks/useNutritionGoals";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Flame, Beef, Wheat, Droplets, Trash2, UtensilsCrossed, Coffee, Sun, Moon, Cookie, Info } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const MEAL_ICONS: Record<string, any> = { breakfast: Coffee, lunch: Sun, dinner: Moon, snacks: Cookie };

const FoodDiary = () => {
  const { totals, meals, missingCount, logs, isLoading } = useNutritionData();
  const { data: goals } = useNutritionGoals();
  const deleteLog = useDeleteConsumptionLog();
  const { toast } = useToast();

  const calGoal = goals?.calorie_goal ?? 2000;

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
    <div className="space-y-6">
      {/* Daily totals bar */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-foreground">Today's Total</p>
            <span className="text-2xl font-display font-bold tabular-nums text-foreground">
              {totals.calories.toFixed(0)} <span className="text-sm font-normal text-muted-foreground">/ {calGoal} cal</span>
            </span>
          </div>
          <Progress value={Math.min((totals.calories / calGoal) * 100, 100)} className="h-2.5 mb-4" />
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-bold tabular-nums text-foreground">{totals.protein.toFixed(0)}g</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Protein</p>
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums text-foreground">{totals.carbs.toFixed(0)}g</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Carbs</p>
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums text-foreground">{totals.fat.toFixed(0)}g</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Fat</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {missingCount > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-accent bg-accent/10 p-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent-foreground" />
          <span>{missingCount} item(s) have no nutrition data. Update the catalog for accurate tracking.</span>
        </div>
      )}

      {/* Meal sections */}
      {meals.map((meal) => {
        const MealIcon = MEAL_ICONS[meal.key] ?? UtensilsCrossed;
        const mealCal = meal.logs.reduce((sum, log) => {
          const item = log.items;
          return sum + (Number(item?.calories_per_unit ?? 0) * Number(log.quantity));
        }, 0);

        return (
          <Card key={meal.key} className="rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-display flex items-center gap-2">
                  <MealIcon className="h-4 w-4 text-muted-foreground" />
                  {meal.label}
                  {meal.logs.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] ml-1">{meal.logs.length}</Badge>
                  )}
                </CardTitle>
                {mealCal > 0 && (
                  <span className="text-xs font-medium text-muted-foreground tabular-nums">{mealCal.toFixed(0)} cal</span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {meal.logs.length === 0 ? (
                <p className="py-3 text-center text-xs text-muted-foreground">Nothing logged</p>
              ) : (
                meal.logs.map((log: any) => {
                  const itemCal = Number(log.items?.calories_per_unit ?? 0) * Number(log.quantity);
                  return (
                    <div key={log.id} className="flex items-center gap-3 rounded-lg bg-muted/30 p-2.5 group">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{log.items?.name ?? "Unknown"}</p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                          <span>{log.quantity} {log.items?.default_unit ?? "unit"}</span>
                          {itemCal > 0 && <><span>·</span><span className="font-medium">{itemCal.toFixed(0)} cal</span></>}
                          <span>·</span>
                          <span>{format(parseISO(log.consumed_at), "h:mm a")}</span>
                        </div>
                      </div>
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
                  );
                })
              )}
            </CardContent>
          </Card>
        );
      })}

      <div className="flex justify-center">
        <AddConsumptionDialog />
      </div>
    </div>
  );
};

export default FoodDiary;
