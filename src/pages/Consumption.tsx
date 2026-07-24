import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Beef,
  BookOpenCheck,
  ChefHat,
  Droplets,
  Flame,
  Info,
  Link2,
  Package,
  Sparkles,
  Trash2,
  Utensils,
  Users,
  Wheat,
} from "lucide-react";
import {
  differenceInDays,
  format,
  isToday,
  isYesterday,
  parseISO,
} from "date-fns";

import AddConsumptionDialog from "@/components/consumption/AddConsumptionDialog";
import PlatePhotoCapture from "@/components/consumption/PlatePhotoCapture";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useGroupContext } from "@/contexts/GroupContext";
import {
  useConsumptionLogs,
  useDeleteConsumptionLog,
  type ConsumptionLog,
} from "@/hooks/useConsumption";
import { useNutritionGoals } from "@/hooks/useNutritionGoals";
import { useInventory } from "@/hooks/usePantry";
import { useProfileNames } from "@/hooks/useProfileNames";
import { useRecipes } from "@/hooks/useRecipes";
import { useShellMode } from "@/hooks/use-shell-mode";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type SourceFilter = "all" | "recipes" | "items";

interface JournalEntry {
  id: string;
  consumedAt: string;
  logs: ConsumptionLog[];
  recipe: ConsumptionLog["recipes"];
}

interface UsageItem {
  itemId: string;
  name: string;
  category: string | null;
  used: number;
  usedUnit: string;
  stock: number;
  stockUnit: string;
}

const nutritionValue = (
  log: ConsumptionLog,
  field: "calories_per_unit" | "protein_g" | "carbs_g" | "fat_g",
) => {
  const quantity = Number(log.quantity);
  const multiplier = log.items?.nutrition_basis === "per_100g" ? quantity / 100 : quantity;
  return multiplier * Number(log.items?.[field] ?? 0);
};

const hasNutrition = (log: ConsumptionLog) =>
  Number(log.items?.calories_per_unit ?? 0) > 0 ||
  Number(log.items?.protein_g ?? 0) > 0 ||
  Number(log.items?.carbs_g ?? 0) > 0 ||
  Number(log.items?.fat_g ?? 0) > 0;

const formatQuantity = (value: number) =>
  Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1).replace(/\.0$/, "");

function foodEmoji(category?: string | null) {
  const value = category?.toLowerCase() ?? "";
  if (value.includes("dairy") || value.includes("milk")) return "🥛";
  if (value.includes("meat") || value.includes("chicken") || value.includes("beef")) return "🥩";
  if (value.includes("fish") || value.includes("seafood")) return "🐟";
  if (value.includes("vegetable") || value.includes("veg")) return "🥬";
  if (value.includes("fruit")) return "🍎";
  if (value.includes("grain") || value.includes("bread")) return "🍞";
  if (value.includes("snack")) return "🍿";
  if (value.includes("drink") || value.includes("beverage")) return "🧃";
  return "🍽";
}

function buildJournalEntries(logs: ConsumptionLog[]): JournalEntry[] {
  const entries = new Map<string, JournalEntry>();

  logs.forEach((log) => {
    const minute = format(parseISO(log.consumed_at), "yyyy-MM-dd'T'HH:mm");
    const key = log.recipe_id ? `recipe-${log.recipe_id}-${minute}` : `item-${log.id}`;
    const existing = entries.get(key);

    if (existing) {
      existing.logs.push(log);
      return;
    }

    entries.set(key, {
      id: key,
      consumedAt: log.consumed_at,
      logs: [log],
      recipe: log.recipes,
    });
  });

  return Array.from(entries.values()).sort(
    (a, b) => parseISO(b.consumedAt).getTime() - parseISO(a.consumedAt).getTime(),
  );
}

function dayLabel(isoDate: string) {
  const date = parseISO(isoDate);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, MMM d");
}

const Consumption = () => {
  const navigate = useNavigate();
  const isPhone = useShellMode() === "phone";
  const { activeGroupId, isPersonalMode } = useGroupContext();
  const { data: logs, isLoading } = useConsumptionLogs();
  const { data: inventory } = useInventory();
  const { data: recipes } = useRecipes();
  const { data: goals } = useNutritionGoals();
  const deleteLog = useDeleteConsumptionLog();
  const { toast } = useToast();
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

  const userIds = useMemo(() => (logs ?? []).map((log) => log.user_id), [logs]);
  const { data: profileMap } = useProfileNames(userIds);

  const entries = useMemo(() => buildJournalEntries(logs ?? []), [logs]);
  const filteredEntries = useMemo(
    () =>
      entries.filter((entry) => {
        if (sourceFilter === "recipes") return Boolean(entry.recipe);
        if (sourceFilter === "items") return !entry.recipe;
        return true;
      }),
    [entries, sourceFilter],
  );

  const groupedEntries = useMemo(() => {
    const groups = new Map<string, JournalEntry[]>();
    filteredEntries.forEach((entry) => {
      const label = dayLabel(entry.consumedAt);
      groups.set(label, [...(groups.get(label) ?? []), entry]);
    });
    return Array.from(groups.entries());
  }, [filteredEntries]);

  const todayLogs = useMemo(
    () => (logs ?? []).filter((log) => isToday(parseISO(log.consumed_at))),
    [logs],
  );
  const todayEntries = useMemo(
    () => entries.filter((entry) => isToday(parseISO(entry.consumedAt))),
    [entries],
  );

  const todayTotals = useMemo(
    () =>
      todayLogs.reduce(
        (totals, log) => ({
          calories: totals.calories + nutritionValue(log, "calories_per_unit"),
          protein: totals.protein + nutritionValue(log, "protein_g"),
          carbs: totals.carbs + nutritionValue(log, "carbs_g"),
          fat: totals.fat + nutritionValue(log, "fat_g"),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      ),
    [todayLogs],
  );

  const missingNutritionCount = useMemo(
    () => (logs ?? []).filter((log) => !hasNutrition(log)).length,
    [logs],
  );

  const recipeMealCount = useMemo(
    () => entries.filter((entry) => Boolean(entry.recipe)).length,
    [entries],
  );

  const { usageItems, usageWindowLabel } = useMemo(() => {
    const allLogs = logs ?? [];
    const lastThirtyDays = allLogs.filter(
      (log) => differenceInDays(new Date(), parseISO(log.consumed_at)) <= 30,
    );
    const basis = lastThirtyDays.length > 0 ? lastThirtyDays : allLogs;
    const stock = new Map<string, { quantity: number; unit: string }>();

    (inventory ?? []).forEach((row) => {
      const current = stock.get(row.item_id) ?? { quantity: 0, unit: row.unit };
      current.quantity += Number(row.quantity);
      stock.set(row.item_id, current);
    });

    const usage = new Map<string, Omit<UsageItem, "stock" | "stockUnit">>();
    basis.forEach((log) => {
      const current = usage.get(log.item_id) ?? {
        itemId: log.item_id,
        name: log.items?.name ?? "Unknown item",
        category: log.items?.category ?? null,
        used: 0,
        usedUnit: log.unit ?? log.items?.default_unit ?? "unit",
      };
      current.used += Number(log.quantity);
      usage.set(log.item_id, current);
    });

    return {
      usageItems: Array.from(usage.values())
        .map((item) => ({
          ...item,
          stock: stock.get(item.itemId)?.quantity ?? 0,
          stockUnit: stock.get(item.itemId)?.unit ?? item.usedUnit,
        }))
        .sort((a, b) => b.used - a.used)
        .slice(0, 4),
      usageWindowLabel: lastThirtyDays.length > 0 ? "Last 30 days" : "Recent history",
    };
  }, [inventory, logs]);

  const calorieGoal = Number(goals?.calorie_goal ?? 2000);
  const calorieProgress =
    calorieGoal > 0 ? Math.min(100, Math.round((todayTotals.calories / calorieGoal) * 100)) : 0;
  const todayRecipeMeals = todayEntries.filter((entry) => Boolean(entry.recipe)).length;

  const handleDelete = async (entry: JournalEntry) => {
    try {
      for (const log of entry.logs) {
        await deleteLog.mutateAsync(log.id);
      }
      toast({
        title: entry.recipe ? "Meal removed" : "Food log removed",
        description: entry.recipe
          ? `${entry.logs.length} linked ingredient log${entry.logs.length === 1 ? "" : "s"} deleted.`
          : "The consumption record was deleted.",
      });
    } catch (error: unknown) {
      toast({
        title: "Couldn't remove this log",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] space-y-4 md:space-y-6">
      {!isPhone && (
        <header className="flex items-end justify-between gap-6">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Kitchen flow
            </div>
            <h1 className="font-display text-4xl font-bold tracking-tight text-foreground">
              Consumption
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              See what you ate, what left your pantry, and which recipes brought it together.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PlatePhotoCapture triggerVariant="outline" triggerLabel="Snap a plate" />
            <AddConsumptionDialog />
          </div>
        </header>
      )}

      <section className="relative overflow-hidden rounded-[2rem] border border-primary/15 bg-[linear-gradient(135deg,hsl(var(--surface-panel))_0%,hsl(var(--accent))_58%,hsl(var(--surface-panel))_100%)] p-5 shadow-[0_24px_70px_-50px_hsl(var(--primary)/0.65)] sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-primary/12 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/4 h-52 w-52 rounded-full bg-amber-400/10 blur-3xl" />

        <div className="relative grid gap-7 lg:grid-cols-[minmax(0,0.92fr)_minmax(480px,1.08fr)] lg:items-center">
          <div>
            <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-primary/15 bg-[hsl(var(--surface-panel)/0.82)] px-3 text-xs font-semibold text-foreground shadow-sm backdrop-blur">
              {isPersonalMode ? (
                <Utensils className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Users className="h-3.5 w-3.5 text-primary" />
              )}
              {isPersonalMode ? "Your food story" : "Shared food story"}
            </span>

            <h2 className="mt-5 max-w-2xl font-display text-3xl font-bold leading-[1.08] tracking-[-0.035em] text-foreground sm:text-4xl">
              {todayEntries.length > 0
                ? `${todayEntries.length} ${todayEntries.length === 1 ? "meal moment" : "meal moments"} remembered today`
                : "Your kitchen is ready for today’s first meal."}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Every entry connects the food on your plate with the pantry items and cookbook
              recipes behind it.
            </p>

            {isPhone && (
              <div className="mt-5 grid grid-cols-2 gap-2">
                <PlatePhotoCapture triggerVariant="outline" triggerLabel="Snap plate" />
                <AddConsumptionDialog />
              </div>
            )}
          </div>

          <NutritionMeter
            calories={todayTotals.calories}
            calorieGoal={calorieGoal}
            progress={calorieProgress}
            protein={todayTotals.protein}
            carbs={todayTotals.carbs}
            fat={todayTotals.fat}
            entryCount={todayEntries.length}
            recipeMeals={todayRecipeMeals}
          />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2 md:hidden">
        <PhoneConnectionCard
          icon={Package}
          label="Pantry"
          value={`${inventory?.length ?? 0} items in stock`}
          tone="pantry"
          onClick={() => navigate("/pantry")}
        />
        <PhoneConnectionCard
          icon={ChefHat}
          label="Cookbook"
          value={`${recipes?.length ?? 0} saved ${recipes?.length === 1 ? "recipe" : "recipes"}`}
          tone="cookbook"
          onClick={() => navigate("/recipes")}
        />
      </section>

      <section className="hidden gap-3 md:grid md:grid-cols-2">
        <ConnectionCard
          icon={Package}
          eyebrow="Pantry connection"
          title="See what remains after the plate"
          copy={`${inventory?.length ?? 0} active pantry ${inventory?.length === 1 ? "entry" : "entries"} ready to plan around.`}
          action="Open Pantry"
          tone="pantry"
          onClick={() => navigate("/pantry")}
        />
        <ConnectionCard
          icon={ChefHat}
          eyebrow="Cookbook connection"
          title="Move from ingredients to complete meals"
          copy={`${recipes?.length ?? 0} saved ${recipes?.length === 1 ? "recipe" : "recipes"} · ${recipeMealCount} cooked ${recipeMealCount === 1 ? "meal" : "meals"} in this journal.`}
          action="Browse Cookbook"
          tone="cookbook"
          onClick={() => navigate("/recipes")}
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(310px,0.72fr)] xl:gap-6">
        <section className="self-start rounded-[2rem] border border-border/70 bg-[hsl(var(--surface-panel))] p-4 shadow-[0_20px_55px_-48px_hsl(var(--foreground)/0.45)] sm:p-6">
          <div className="flex flex-col gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <BookOpenCheck className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="font-display text-xl font-bold text-foreground">Food journal</h2>
                  <p className="text-xs text-muted-foreground">
                    {entries.length} {entries.length === 1 ? "meal or item" : "meals and items"} remembered
                  </p>
                </div>
              </div>
            </div>

            <div
              className="grid grid-cols-3 rounded-xl bg-[hsl(var(--surface-subtle))] p-1"
              role="group"
              aria-label="Food journal source"
            >
              {([
                ["all", "All"],
                ["recipes", "Recipes"],
                ["items", "Items"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSourceFilter(value)}
                  aria-pressed={sourceFilter === value}
                  className={cn(
                    "min-h-9 rounded-lg px-3 text-xs font-semibold transition",
                    sourceFilter === value
                      ? "bg-[hsl(var(--surface-panel))] text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-5">
            {isLoading ? (
              <JournalSkeleton />
            ) : filteredEntries.length === 0 ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-border bg-[hsl(var(--surface-subtle))] p-8 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Utensils className="h-6 w-6" />
                </span>
                <h3 className="mt-4 font-display text-lg font-bold text-foreground">
                  {entries.length === 0 ? "Your food journal starts here" : "Nothing in this view"}
                </h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  {entries.length === 0
                    ? "Log an item, photograph a plate, or cook a recipe to create the first entry."
                    : "Choose another source filter to bring more food entries back."}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {groupedEntries.map(([label, dayEntries]) => (
                  <div key={label}>
                    <div className="mb-2 flex items-center gap-3">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                        {label}
                      </p>
                      <span className="h-px flex-1 bg-border/75" />
                    </div>
                    <div className="space-y-2">
                      {dayEntries.map((entry) => (
                        <JournalEntryCard
                          key={entry.id}
                          entry={entry}
                          loggedBy={activeGroupId ? profileMap?.get(entry.logs[0].user_id) : undefined}
                          onDelete={() => handleDelete(entry)}
                          onOpenPantry={(itemName) =>
                            navigate(
                              itemName
                                ? `/pantry?search=${encodeURIComponent(itemName)}`
                                : "/pantry",
                            )
                          }
                          onOpenRecipe={(recipeId) => navigate(`/recipes/${recipeId}`)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-[2rem] border border-border/70 bg-[hsl(var(--surface-panel))] p-5 shadow-[0_20px_55px_-48px_hsl(var(--foreground)/0.45)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-primary">
                  Pantry impact
                </p>
                <h2 className="mt-1 font-display text-xl font-bold text-foreground">
                  What you’re using
                </h2>
              </div>
              <span className="rounded-full bg-[hsl(var(--surface-subtle))] px-2.5 py-1 text-[0.65rem] font-semibold text-muted-foreground">
                {usageWindowLabel}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Logged usage beside what is currently recorded in your pantry.
            </p>

            {usageItems.length > 0 ? (
              <div className="mt-5 space-y-2">
                {usageItems.map((item) => {
                  return (
                    <button
                      key={item.itemId}
                      type="button"
                      onClick={() =>
                        navigate(`/pantry?search=${encodeURIComponent(item.name)}`)
                      }
                      className="group w-full rounded-2xl border border-border/65 bg-[hsl(var(--surface-subtle))] p-3 text-left transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--surface-panel))] text-xl shadow-sm">
                          {foodEmoji(item.category)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {item.name}
                            </p>
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[0.6rem] font-bold",
                                item.stock > 0
                                  ? "bg-primary/10 text-primary"
                                  : "bg-warning/10 text-warning",
                              )}
                            >
                              {item.stock > 0 ? "In stock" : "Out"}
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-center justify-between gap-2 text-[0.65rem] text-muted-foreground">
                            <span>
                              Used {formatQuantity(item.used)} {item.usedUnit}
                            </span>
                            <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                              {formatQuantity(item.stock)} {item.stockUnit} now
                              <ArrowRight className="h-3 w-3 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                Log food to reveal your most-used pantry items.
              </div>
            )}

            <Button
              variant="outline"
              onClick={() => navigate("/pantry")}
              className="mt-4 min-h-11 w-full rounded-xl"
            >
              <Package className="mr-2 h-4 w-4 text-primary" />
              Review all pantry stock
            </Button>
          </section>

          {missingNutritionCount > 0 && (
            <section className="rounded-[2rem] border border-amber-500/20 bg-[linear-gradient(145deg,hsl(var(--surface-panel)),hsl(var(--warning)/0.08))] p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 text-warning">
                <Info className="h-4 w-4" />
              </span>
              <h2 className="mt-4 font-display text-lg font-bold text-foreground">
                Complete the nutrition picture
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {missingNutritionCount} food {missingNutritionCount === 1 ? "log is" : "logs are"} missing
                calories or macros. Add nutrition in your Pantry catalog for more accurate totals.
              </p>
              <Button
                variant="ghost"
                onClick={() => navigate("/pantry")}
                className="mt-3 min-h-10 rounded-xl px-0 text-primary hover:bg-transparent hover:text-primary/80"
              >
                Complete in Pantry
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
};

interface NutritionMeterProps {
  calories: number;
  calorieGoal: number;
  progress: number;
  protein: number;
  carbs: number;
  fat: number;
  entryCount: number;
  recipeMeals: number;
}

const NutritionMeter = ({
  calories,
  calorieGoal,
  progress,
  protein,
  carbs,
  fat,
  entryCount,
  recipeMeals,
}: NutritionMeterProps) => (
  <div className="rounded-[1.75rem] border border-border/60 bg-[hsl(var(--surface-panel)/0.82)] p-4 shadow-xl shadow-primary/5 backdrop-blur sm:p-5">
    <div className="grid grid-cols-[132px_minmax(0,1fr)] items-center gap-4 sm:grid-cols-[156px_minmax(0,1fr)] sm:gap-5">
      <div
        className="relative mx-auto flex h-32 w-32 items-center justify-center rounded-full p-2 sm:h-36 sm:w-36"
        style={{
          background: `conic-gradient(hsl(var(--primary)) ${progress}%, hsl(var(--surface-border)) ${progress}% 100%)`,
        }}
        role="img"
        aria-label={`${progress}% of daily calorie goal`}
      >
        <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[hsl(var(--surface-panel))] text-center shadow-inner">
          <Flame className="h-4 w-4 text-primary" />
          <p className="mt-1 font-display text-2xl font-bold tabular-nums text-foreground">
            {calories > 0 ? Math.round(calories).toLocaleString() : "—"}
          </p>
          <p className="text-[0.65rem] font-semibold text-muted-foreground">
            of {Math.round(calorieGoal).toLocaleString()} cal
          </p>
        </div>
      </div>

      <div className="min-w-0 space-y-2">
        <MacroLine icon={Beef} label="Protein" value={protein} tone="text-rose-600 dark:text-rose-300" />
        <MacroLine icon={Wheat} label="Carbs" value={carbs} tone="text-amber-600 dark:text-amber-300" />
        <MacroLine icon={Droplets} label="Fat" value={fat} tone="text-sky-600 dark:text-sky-300" />
      </div>
    </div>

    <div className="mt-4 grid grid-cols-2 divide-x divide-border/70 border-t border-border/70 pt-4 text-center">
      <div>
        <p className="font-display text-lg font-bold tabular-nums text-foreground">{entryCount}</p>
        <p className="text-[0.65rem] font-semibold text-muted-foreground">entries today</p>
      </div>
      <div>
        <p className="font-display text-lg font-bold tabular-nums text-foreground">{recipeMeals}</p>
        <p className="text-[0.65rem] font-semibold text-muted-foreground">from recipes</p>
      </div>
    </div>
  </div>
);

const MacroLine = ({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone: string;
}) => (
  <div className="flex min-h-10 items-center gap-2.5 rounded-xl bg-[hsl(var(--surface-subtle))] px-3">
    <Icon className={cn("h-4 w-4 shrink-0", tone)} />
    <span className="min-w-0 flex-1 truncate text-xs font-medium text-muted-foreground">
      {label}
    </span>
    <span className="font-display text-sm font-bold tabular-nums text-foreground">
      {value > 0 ? `${Math.round(value)}g` : "—"}
    </span>
  </div>
);

const ConnectionCard = ({
  icon: Icon,
  eyebrow,
  title,
  copy,
  action,
  tone,
  onClick,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  copy: string;
  action: string;
  tone: "pantry" | "cookbook";
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "group relative overflow-hidden rounded-[1.75rem] border p-5 text-left shadow-[0_18px_50px_-44px_hsl(var(--foreground)/0.5)] transition hover:-translate-y-0.5 hover:shadow-lg sm:p-6",
      tone === "pantry"
        ? "border-emerald-500/15 bg-[linear-gradient(135deg,hsl(var(--surface-panel)),hsl(var(--primary)/0.09))]"
        : "border-violet-500/15 bg-[linear-gradient(135deg,hsl(var(--surface-panel)),hsl(var(--chart-4)/0.10))]",
    )}
  >
    <div
      aria-hidden="true"
      className={cn(
        "absolute -right-10 -top-12 h-36 w-36 rounded-full blur-3xl",
        tone === "pantry" ? "bg-primary/12" : "bg-violet-500/12",
      )}
    />
    <div className="relative flex items-center gap-4">
      <span
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm",
          tone === "pantry"
            ? "bg-primary text-primary-foreground"
            : "bg-violet-600 text-white dark:bg-violet-500",
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-[0.65rem] font-bold uppercase tracking-[0.16em]",
            tone === "pantry" ? "text-primary" : "text-violet-700 dark:text-violet-300",
          )}
        >
          {eyebrow}
        </p>
        <h2 className="mt-1 font-display text-lg font-bold leading-tight text-foreground">
          {title}
        </h2>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{copy}</p>
      </div>
      <span className="hidden min-h-10 shrink-0 items-center gap-1 rounded-full bg-[hsl(var(--surface-panel)/0.82)] px-3 text-xs font-semibold text-foreground shadow-sm sm:inline-flex">
        {action}
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </div>
  </button>
);

const PhoneConnectionCard = ({
  icon: Icon,
  label,
  value,
  tone,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: "pantry" | "cookbook";
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "flex min-h-[84px] items-center gap-3 rounded-2xl border p-3 text-left shadow-sm transition active:scale-[0.98]",
      tone === "pantry"
        ? "border-primary/15 bg-primary/5"
        : "border-violet-500/15 bg-violet-500/5",
    )}
  >
    <span
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white",
        tone === "pantry" ? "bg-primary" : "bg-violet-600 dark:bg-violet-500",
      )}
    >
      <Icon className="h-4 w-4" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="flex items-center gap-1 text-sm font-bold text-foreground">
        {label}
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
      </span>
      <span className="mt-0.5 block text-[0.65rem] leading-tight text-muted-foreground">
        {value}
      </span>
    </span>
  </button>
);

const JournalEntryCard = ({
  entry,
  loggedBy,
  onDelete,
  onOpenPantry,
  onOpenRecipe,
}: {
  entry: JournalEntry;
  loggedBy?: string;
  onDelete: () => void;
  onOpenPantry: (itemName: string) => void;
  onOpenRecipe: (recipeId: string) => void;
}) => {
  const isRecipe = Boolean(entry.recipe);
  const firstLog = entry.logs[0];
  const ingredientNames = entry.logs.map((log) => log.items?.name ?? "Unknown item");
  const title = entry.recipe?.name ?? firstLog.items?.name ?? "Unknown item";
  const calories = entry.logs.reduce(
    (sum, log) => sum + nutritionValue(log, "calories_per_unit"),
    0,
  );
  const ingredientCopy =
    ingredientNames.length > 3
      ? `${ingredientNames.slice(0, 3).join(", ")} +${ingredientNames.length - 3}`
      : ingredientNames.join(", ");
  const quantity = `${formatQuantity(Number(firstLog.quantity))} ${firstLog.unit ?? firstLog.items?.default_unit ?? "unit"}`;

  return (
    <article className="group rounded-2xl border border-border/65 bg-[hsl(var(--surface-subtle)/0.72)] p-3 transition hover:border-primary/25 hover:bg-[hsl(var(--surface-subtle))] sm:p-4">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl shadow-sm",
            isRecipe
              ? "bg-violet-600 text-white dark:bg-violet-500"
              : "bg-[hsl(var(--surface-panel))]",
          )}
        >
          {isRecipe ? <ChefHat className="h-5 w-5" /> : foodEmoji(firstLog.items?.category)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 truncate font-display text-base font-bold text-foreground">
              {title}
            </h3>
            <span
              className={cn(
                "inline-flex min-h-6 items-center gap-1 rounded-full px-2 text-[0.65rem] font-semibold",
                isRecipe
                  ? "bg-violet-500/10 text-violet-700 dark:text-violet-300"
                  : "bg-primary/10 text-primary",
              )}
            >
              {isRecipe ? <ChefHat className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
              {isRecipe ? "Recipe meal" : "Catalog item"}
            </span>
          </div>

          {isRecipe && (
            <p className="mt-1 truncate text-xs text-muted-foreground">{ingredientCopy}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.7rem] text-muted-foreground">
            <span>{format(parseISO(entry.consumedAt), "h:mm a")}</span>
            <span aria-hidden="true">•</span>
            <span>
              {isRecipe
                ? `${entry.logs.length} pantry ingredient${entry.logs.length === 1 ? "" : "s"}`
                : quantity}
            </span>
            {calories > 0 ? (
              <>
                <span aria-hidden="true">•</span>
                <span className="font-semibold text-foreground">
                  {Math.round(calories).toLocaleString()} cal
                </span>
              </>
            ) : (
              <>
                <span aria-hidden="true">•</span>
                <span className="italic">nutrition incomplete</span>
              </>
            )}
            {loggedBy && (
              <>
                <span aria-hidden="true">•</span>
                <span>by {loggedBy}</span>
              </>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {isRecipe && entry.logs[0].recipe_id !== null && (
              <button
                type="button"
                onClick={() => onOpenRecipe(entry.logs[0].recipe_id!)}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-[hsl(var(--surface-panel))] px-2.5 text-[0.7rem] font-semibold text-foreground shadow-sm transition hover:text-primary"
              >
                <BookOpenCheck className="h-3.5 w-3.5 text-violet-600 dark:text-violet-300" />
                View recipe
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenPantry(isRecipe ? "" : firstLog.items?.name ?? "")}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-[hsl(var(--surface-panel))] px-2.5 text-[0.7rem] font-semibold text-foreground shadow-sm transition hover:text-primary"
            >
              <Package className="h-3.5 w-3.5 text-primary" />
              {isRecipe ? "Check Pantry" : "Find in Pantry"}
            </button>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={isRecipe ? `Delete ${title} meal` : `Delete ${title} log`}
              className="h-10 w-10 shrink-0 rounded-xl text-muted-foreground opacity-70 hover:bg-destructive/10 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-[1.75rem]">
            <AlertDialogHeader>
              <AlertDialogTitle>
                Remove this {isRecipe ? "meal" : "food log"}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                {isRecipe
                  ? `This deletes ${entry.logs.length} linked ingredient logs.`
                  : "This deletes the consumption record."}{" "}
                Pantry inventory will not be restored automatically.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </article>
  );
};

const JournalSkeleton = () => (
  <div className="space-y-3">
    {[0, 1, 2].map((index) => (
      <div
        key={index}
        className="h-28 animate-pulse rounded-2xl bg-[hsl(var(--surface-subtle))]"
      />
    ))}
  </div>
);

export default Consumption;
