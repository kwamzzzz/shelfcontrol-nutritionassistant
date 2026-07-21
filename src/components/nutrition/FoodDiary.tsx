import { useState, useMemo } from "react";
import { useNutritionData } from "@/hooks/useNutrition";
import { useDeleteConsumptionLog } from "@/hooks/useConsumption";
import { useItems } from "@/hooks/usePantry";
import { useRecipes } from "@/hooks/useRecipes";
import AddConsumptionDialog from "@/components/consumption/AddConsumptionDialog";
import NutritionDetailModal from "@/components/nutrition/NutritionDetailModal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useNutritionGoals } from "@/hooks/useNutritionGoals";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Flame, Beef, Wheat, Droplets, Trash2, Coffee, Sun, Moon, Cookie, Info, Plus, Search, ChefHat, UtensilsCrossed, BookOpen, ChevronRight } from "lucide-react";
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
  const { data: allItems } = useItems();
  const { data: recipes } = useRecipes();
  const deleteLog = useDeleteConsumptionLog();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [browseTab, setBrowseTab] = useState("logged");
  const [detailItem, setDetailItem] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);

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

  const handleItemClick = (item: any) => {
    setDetailItem(item);
    setDetailOpen(true);
  };

  // Filtered catalog items for browse
  const filteredItems = useMemo(() => {
    if (!allItems) return [];
    const q = searchQuery.toLowerCase();
    return allItems.filter(i => !q || i.name.toLowerCase().includes(q) || (i.brand?.toLowerCase().includes(q)) || (i.category?.toLowerCase().includes(q)));
  }, [allItems, searchQuery]);

  // Group items alphabetically
  const groupedItems = useMemo(() => {
    const groups: Record<string, typeof filteredItems> = {};
    for (const item of filteredItems) {
      const letter = item.name[0]?.toUpperCase() ?? "#";
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(item);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredItems]);

  // Filtered recipes
  const filteredRecipes = useMemo(() => {
    if (!recipes) return [];
    const q = searchQuery.toLowerCase();
    return recipes.filter(r => !q || r.name.toLowerCase().includes(q));
  }, [recipes, searchQuery]);

  const groupedRecipes = useMemo(() => {
    const groups: Record<string, typeof filteredRecipes> = {};
    for (const r of filteredRecipes) {
      const letter = r.name[0]?.toUpperCase() ?? "#";
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(r);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredRecipes]);

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

      {/* Tabs: Logged Today / My Foods / My Cook Book */}
      <Tabs value={browseTab} onValueChange={setBrowseTab}>
        <div className="flex items-center gap-3 mb-4">
          <TabsList className="bg-muted/50 rounded-xl p-1 h-auto flex-1">
            <TabsTrigger value="logged" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs gap-1.5 flex-1">
              <BookOpen className="h-3.5 w-3.5" /> Today's Log
            </TabsTrigger>
            <TabsTrigger value="foods" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs gap-1.5 flex-1">
              <UtensilsCrossed className="h-3.5 w-3.5" /> My Foods
            </TabsTrigger>
            <TabsTrigger value="recipes" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs gap-1.5 flex-1">
              <ChefHat className="h-3.5 w-3.5" /> My Cook Book
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Search - visible on foods/recipes tabs */}
        {browseTab !== "logged" && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-xl bg-muted/30 border-none h-10"
            />
          </div>
        )}

        {/* TODAY'S LOG */}
        <TabsContent value="logged" className="space-y-4 mt-0">
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
                          <div
                            key={log.id}
                            className="flex items-center gap-3 rounded-xl bg-muted/30 p-3 group cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => item && handleItemClick(item)}
                          >
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-lg">{getCategoryEmoji(item?.category)}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground truncate">{item?.name ?? "Unknown"}</p>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                {item?.brand && <span>{item.brand}</span>}
                                {item?.brand && <span>·</span>}
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
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => e.stopPropagation()}
                                  >
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
        </TabsContent>

        {/* MY FOODS CATALOG */}
        <TabsContent value="foods" className="mt-0">
          <div className="space-y-1">
            {groupedItems.length === 0 ? (
              <div className="py-12 text-center">
                <UtensilsCrossed className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No foods found</p>
                <p className="text-xs text-muted-foreground mt-1">Add items to your catalog to see them here</p>
              </div>
            ) : (
              groupedItems.map(([letter, items]) => (
                <div key={letter}>
                  <p className="text-xs font-bold text-primary px-1 pt-4 pb-2">{letter}</p>
                  <div className="space-y-1.5">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-xl bg-card p-3.5 cursor-pointer hover:bg-muted/40 transition-colors group shadow-sm"
                        onClick={() => handleItemClick(item)}
                      >
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-lg">{getCategoryEmoji(item.category)}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                            {item.brand && <><span>{item.brand}</span><span>·</span></>}
                            <span>{Number(item.calories_per_unit ?? 0)} cals per {item.serving_size ?? item.default_unit ?? "unit"}</span>
                            {item.created_at && (
                              <>
                                <span>·</span>
                                <span>📅 {format(parseISO(item.created_at), "M/d/yy")}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* RECIPES */}
        <TabsContent value="recipes" className="mt-0">
          <div className="space-y-1">
            {groupedRecipes.length === 0 ? (
              <div className="py-12 text-center">
                <ChefHat className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No recipes found</p>
                <p className="text-xs text-muted-foreground mt-1">Create recipes to see them here</p>
              </div>
            ) : (
              groupedRecipes.map(([letter, recs]) => (
                <div key={letter}>
                  <p className="text-xs font-bold text-primary px-1 pt-4 pb-2">{letter}</p>
                  <div className="space-y-1.5">
                    {recs.map((recipe) => {
                      const totalCals = recipe.recipe_ingredients?.reduce((sum, ri) => {
                        const cals = Number(ri.items?.calories_per_unit ?? 0);
                        const basis = ri.items?.nutrition_basis ?? "per_unit";
                        let mult = Number(ri.quantity);
                        if (basis === "per_100g") mult = ri.quantity / 100;
                        return sum + cals * mult;
                      }, 0) ?? 0;
                      const perServing = recipe.servings ? totalCals / recipe.servings : totalCals;

                      return (
                        <div
                          key={recipe.id}
                          className="flex items-center gap-3 rounded-xl bg-card p-3.5 cursor-pointer hover:bg-muted/40 transition-colors group shadow-sm"
                        >
                          <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                            <BookOpen className="h-4 w-4 text-amber-500" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">{recipe.name}</p>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                              <span>{perServing.toFixed(0)} cals per Serving</span>
                              <span>·</span>
                              <span>📅 {format(parseISO(recipe.created_at), "M/d/yy")}</span>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <NutritionDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        item={detailItem}
      />
    </div>
  );
};

function getCategoryEmoji(category?: string | null): string {
  if (!category) return "🍽";
  const c = category.toLowerCase();
  if (c.includes("dairy") || c.includes("milk")) return "🥛";
  if (c.includes("meat") || c.includes("chicken") || c.includes("beef")) return "🥩";
  if (c.includes("fish") || c.includes("seafood")) return "🐟";
  if (c.includes("vegetable") || c.includes("veg")) return "🥬";
  if (c.includes("fruit")) return "🍎";
  if (c.includes("grain") || c.includes("bread") || c.includes("cereal")) return "🍞";
  if (c.includes("snack") || c.includes("chips")) return "🍿";
  if (c.includes("beverage") || c.includes("drink") || c.includes("juice")) return "🧃";
  if (c.includes("spice") || c.includes("condiment") || c.includes("sauce")) return "🧂";
  if (c.includes("oil") || c.includes("fat")) return "🫒";
  if (c.includes("egg")) return "🥚";
  if (c.includes("cheese")) return "🧀";
  if (c.includes("frozen")) return "🧊";
  return "🍽";
}

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
