import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Apple,
  ArrowRight,
  CalendarDays,
  ChefHat,
  Flame,
  GlassWater,
  Heart,
  ListChecks,
  Package,
  Plus,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import {
  format,
  formatDistanceToNow,
  isThisMonth,
  isThisWeek,
  isToday,
  parseISO,
} from "date-fns";

import IntelligenceWidget from "@/components/dashboard/IntelligenceWidget";
import { useConsumptionLogs } from "@/hooks/useConsumption";
import { useNutritionData } from "@/hooks/useNutrition";
import { useNutritionGoals } from "@/hooks/useNutritionGoals";
import { useInventory } from "@/hooks/usePantry";
import { usePurchases } from "@/hooks/usePurchases";
import { useRecipes } from "@/hooks/useRecipes";
import { useShoppingList } from "@/hooks/useShoppingList";
import { useWaterLogs } from "@/hooks/useWaterTracking";
import { formatCurrencyAlways } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { nutrientAmount } from "@/lib/nutrition";
import { getExpiryLabel, getExpiryStatus } from "@/lib/pantry-utils";

function getCategoryEmoji(category?: string | null): string {
  if (!category) return "🍽";
  const value = category.toLowerCase();
  if (value.includes("dairy") || value.includes("milk")) return "🥛";
  if (value.includes("meat") || value.includes("chicken") || value.includes("beef")) return "🥩";
  if (value.includes("fish") || value.includes("seafood")) return "🐟";
  if (value.includes("vegetable") || value.includes("veg")) return "🥬";
  if (value.includes("fruit")) return "🍎";
  if (value.includes("grain") || value.includes("bread")) return "🍞";
  if (value.includes("snack")) return "🍿";
  if (value.includes("beverage") || value.includes("drink")) return "🧃";
  return "🍽";
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { data: inventory } = useInventory();
  const { data: purchases } = usePurchases();
  const { data: logs } = useConsumptionLogs();
  const { data: recipes } = useRecipes();
  const { data: shoppingList } = useShoppingList();
  const { data: goals } = useNutritionGoals();
  const { data: waterLogs } = useWaterLogs();
  const { totals } = useNutritionData();

  const pantryCount = inventory?.length ?? 0;
  const openItems = useMemo(
    () => shoppingList?.filter((item) => !item.is_purchased).length ?? 0,
    [shoppingList],
  );

  const attentionItems = useMemo(() => {
    const items =
      inventory?.filter((item) => {
        const status = getExpiryStatus(item.expiry_date);
        return status === "expiring" || status === "expired";
      }) ?? [];

    return [...items].sort((a, b) => {
      const aDate = a.expiry_date ? new Date(a.expiry_date).getTime() : Number.POSITIVE_INFINITY;
      const bDate = b.expiry_date ? new Date(b.expiry_date).getTime() : Number.POSITIVE_INFINITY;
      return aDate - bDate;
    });
  }, [inventory]);

  const attentionCount = attentionItems.length;
  const expiredCount = useMemo(
    () => attentionItems.filter((item) => getExpiryStatus(item.expiry_date) === "expired").length,
    [attentionItems],
  );
  const healthScore =
    pantryCount > 0 ? Math.max(0, Math.round(((pantryCount - attentionCount) / pantryCount) * 100)) : 0;

  const spending = useMemo(() => {
    if (!purchases) return { month: 0, week: 0, monthTrips: 0 };

    return purchases.reduce(
      (summary, purchase) => {
        const purchasedAt = parseISO(purchase.purchased_at);
        const cost = Number(purchase.total_cost ?? 0);
        if (isThisMonth(purchasedAt)) {
          summary.month += cost;
          summary.monthTrips += 1;
        }
        if (isThisWeek(purchasedAt, { weekStartsOn: 1 })) summary.week += cost;
        return summary;
      },
      { month: 0, week: 0, monthTrips: 0 },
    );
  }, [purchases]);

  const waterGoal = goals?.water_goal_ml ?? 2000;
  const calorieGoal = goals?.calorie_goal ?? 2000;
  const waterTotal = useMemo(
    () => waterLogs?.reduce((sum, log) => sum + log.amount_ml, 0) ?? 0,
    [waterLogs],
  );
  const waterPct = waterGoal > 0 ? Math.min((waterTotal / waterGoal) * 100, 100) : 0;
  const caloriePct = calorieGoal > 0 ? Math.min((totals.calories / calorieGoal) * 100, 100) : 0;

  const todayLogs = useMemo(
    () =>
      logs
        ?.filter((log) => isToday(parseISO(log.consumed_at)))
        .slice(0, 4) ?? [],
    [logs],
  );
  const recentPurchases = purchases?.slice(0, 3) ?? [];

  const composition = useMemo(() => {
    if (!inventory || inventory.length === 0) return [];

    const categories: Record<string, number> = {};
    inventory.forEach((item) => {
      const category = item.items?.category ?? "Other";
      categories[category] = (categories[category] || 0) + 1;
    });

    return Object.entries(categories)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / inventory.length) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [inventory]);

  const primaryAction = attentionCount > 0
    ? {
        eyebrow: expiredCount > 0 ? "Use or review first" : "Coming up soon",
        title:
          expiredCount > 0
            ? `${expiredCount} ${expiredCount === 1 ? "item needs" : "items need"} your attention`
            : `${attentionCount} ${attentionCount === 1 ? "item is" : "items are"} nearing expiry`,
        description:
          "A quick review now can protect your food, your budget, and the meals you already planned.",
      }
    : {
        eyebrow: "Everything in its place",
        title: pantryCount > 0 ? "Your pantry is in great shape" : "Build your pantry overview",
        description:
          pantryCount > 0
            ? "Nothing urgent is competing for your attention. Keep the rhythm going."
            : "Add your first items to unlock expiry guidance, restock cues, and smarter planning.",
      };

  return (
    <div className="mx-auto max-w-[1440px] space-y-4 md:space-y-6">
      <section className="hidden items-end justify-between gap-6 md:flex">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Kitchen overview
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.035em] text-foreground lg:text-[2.5rem]">
            Everything that matters, at a glance.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {format(new Date(), "EEEE, d MMMM")} · Your live pantry, spending, and nutrition signals.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/consumption")}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
          >
            <Heart className="h-4 w-4 text-primary" />
            Log food
          </button>
          <button
            type="button"
            onClick={() => navigate("/purchases")}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background shadow-lg shadow-foreground/10 transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            <Plus className="h-4 w-4" />
            Add purchase
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:gap-6">
        <section className="relative overflow-hidden rounded-[2rem] border border-primary/15 bg-[linear-gradient(135deg,hsl(var(--surface-panel))_0%,hsl(var(--accent))_55%,hsl(var(--surface-panel))_100%)] p-5 shadow-[0_24px_70px_-50px_hsl(var(--primary)/0.65)] sm:p-7 xl:col-span-8 xl:min-h-[360px] xl:p-9">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-[38%] h-40 w-40 rounded-full bg-amber-300/10 blur-3xl" />

          <div className="relative z-10 grid h-full gap-8 xl:grid-cols-[minmax(0,1fr)_220px] xl:items-center">
            <div className="min-w-0">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-[hsl(var(--surface-panel))] px-3 py-1.5 text-xs font-semibold text-primary shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                {primaryAction.eyebrow}
              </div>
              <h2 className="max-w-2xl text-3xl font-semibold leading-[1.08] tracking-[-0.04em] text-foreground sm:text-4xl xl:text-[2.8rem]">
                {primaryAction.title}
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
                {primaryAction.description}
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigate(attentionCount > 0 ? "/pantry?filter=expiring" : "/pantry")}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25"
                >
                  {attentionCount > 0 ? "Review priority items" : "Open pantry"}
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/shopping")}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card/70 px-5 text-sm font-semibold text-foreground backdrop-blur transition hover:border-primary/30 hover:bg-card"
                >
                  <ListChecks className="h-4 w-4 text-primary" />
                  Shopping list
                </button>
              </div>

              <div className="mt-8 grid max-w-2xl grid-cols-3 divide-x divide-border/70 rounded-2xl border border-border/70 bg-card/55 py-3 shadow-sm backdrop-blur-sm">
                <HeroMetric label="In stock" value={pantryCount} />
                <HeroMetric label="To review" value={attentionCount} tone={attentionCount > 0 ? "warning" : "default"} />
                <HeroMetric label="To buy" value={openItems} />
              </div>
            </div>

            <div className="hidden xl:flex xl:justify-end">
              <PantryGauge score={healthScore} attentionCount={attentionCount} />
            </div>
          </div>
        </section>

        <section className="surface-panel flex min-h-[320px] flex-col rounded-[2rem] p-5 sm:p-6 xl:col-span-4 xl:min-h-[360px]">
          <PanelHeading
            eyebrow="Spending pulse"
            icon={WalletCards}
            action="Purchases"
            onAction={() => navigate("/purchases")}
          />

          <div className="mt-6">
            <p className="text-sm text-muted-foreground">This month</p>
            <p className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-foreground tabular-nums sm:text-4xl">
              {formatCurrencyAlways(spending.month)}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                {formatCurrencyAlways(spending.week)} this week
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShoppingBag className="h-3.5 w-3.5" />
                {spending.monthTrips} {spending.monthTrips === 1 ? "trip" : "trips"}
              </span>
            </div>
          </div>

          <div className="mt-auto pt-5">
            <SpendBars purchases={purchases} />
          </div>
        </section>
      </div>

      <section aria-label="Quick actions" className="hidden grid-cols-2 gap-3 md:grid xl:grid-cols-4">
        <QuickAction
          icon={Receipt}
          label="Log a purchase"
          detail="Update spend and stock"
          tone="bg-amber-400/15 text-amber-700 dark:text-amber-300"
          onClick={() => navigate("/purchases")}
        />
        <QuickAction
          icon={Package}
          label="Manage pantry"
          detail={`${pantryCount} items in stock`}
          tone="bg-primary/10 text-primary"
          onClick={() => navigate("/pantry")}
        />
        <QuickAction
          icon={ChefHat}
          label="Choose a recipe"
          detail={`${recipes?.length ?? 0} ${(recipes?.length ?? 0) === 1 ? "saved recipe" : "saved recipes"}`}
          tone="bg-orange-400/15 text-orange-700 dark:text-orange-300"
          onClick={() => navigate("/recipes")}
        />
        <QuickAction
          icon={ShoppingCart}
          label="Plan shopping"
          detail={`${openItems} ${openItems === 1 ? "item" : "items"} waiting`}
          tone="bg-sky-400/15 text-sky-700 dark:text-sky-300"
          onClick={() => navigate("/shopping")}
        />
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:gap-6">
        <section className="surface-panel rounded-[2rem] p-5 sm:p-6 xl:col-span-8">
          <PanelHeading
            eyebrow="Priority shelf"
            title="Attention required"
            icon={AlertTriangle}
            action="View all"
            onAction={() => navigate("/pantry?filter=expiring")}
          />

          {attentionItems.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="Nothing needs attention right now"
              description="Your dated items are looking good. We’ll surface the next priority here."
            />
          ) : (
            <div className="mt-5">
              {attentionItems.slice(0, 4).map((item, index) => {
                const status = getExpiryStatus(item.expiry_date);
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => navigate("/pantry?filter=expiring")}
                    className={cn(
                      "group flex w-full items-center justify-between gap-4 rounded-2xl px-2 py-3.5 text-left transition hover:bg-[hsl(var(--surface-subtle))] sm:px-3",
                      index < Math.min(attentionItems.length, 4) - 1 && "border-b border-dotted border-border/80",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-3.5">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-[hsl(var(--surface-subtle))] text-xl shadow-sm">
                        {getCategoryEmoji(item.items?.category)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-foreground sm:text-[15px]">
                          {item.items?.name ?? "Unknown item"}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {item.storage_location ?? "Pantry"} · {item.quantity} {item.unit}
                        </span>
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
                          status === "expired"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-amber-400/15 text-amber-700 dark:text-amber-300",
                        )}
                      >
                        {getExpiryLabel(item.expiry_date)}
                      </span>
                      <ArrowRight className="hidden h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground sm:block" />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="surface-panel rounded-[2rem] p-5 sm:p-6 xl:col-span-4">
          <PanelHeading
            eyebrow="Today"
            title="Daily rhythm"
            icon={CalendarDays}
            action="Nutrition"
            onAction={() => navigate("/nutrition")}
          />
          <div className="mt-6 space-y-6">
            <ProgressMetric
              icon={Flame}
              label="Calories"
              value={`${Math.round(totals.calories).toLocaleString()} cal`}
              detail={`of ${calorieGoal.toLocaleString()} cal`}
              percentage={caloriePct}
              barClass="bg-[linear-gradient(90deg,#f59e0b,#f97316)]"
            />
            <ProgressMetric
              icon={GlassWater}
              label="Water"
              value={`${(waterTotal / 1000).toFixed(1)} L`}
              detail={`of ${(waterGoal / 1000).toFixed(1)} L`}
              percentage={waterPct}
              barClass="bg-[linear-gradient(90deg,#38bdf8,#0ea5e9)]"
            />
          </div>
          <button
            type="button"
            onClick={() => navigate("/consumption")}
            className="mt-6 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[hsl(var(--surface-subtle))] px-4 text-sm font-semibold text-foreground transition hover:bg-[hsl(var(--surface-inset))]"
          >
            <Plus className="h-4 w-4 text-primary" />
            Log food
          </button>
        </section>

        <div className="xl:col-span-8">
          <IntelligenceWidget />
        </div>

        <section className="surface-panel rounded-[2rem] p-5 sm:p-6 xl:col-span-4">
          <PanelHeading
            eyebrow="Stock mix"
            title="Pantry composition"
            icon={Package}
            action="Pantry"
            onAction={() => navigate("/pantry")}
          />
          {composition.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No pantry data yet"
              description="Add items to see the shape of your kitchen here."
              compact
            />
          ) : (
            <div className="mt-6 space-y-4">
              {composition.map((category, index) => (
                <div key={category.name}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-medium text-muted-foreground">{category.name}</span>
                    <span className="shrink-0 font-semibold text-foreground tabular-nums">
                      {category.percentage}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[hsl(var(--surface-inset))]">
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width] duration-500",
                        index === 0 && "bg-primary",
                        index === 1 && "bg-amber-400",
                        index === 2 && "bg-orange-400",
                        index === 3 && "bg-emerald-300 dark:bg-emerald-500",
                      )}
                      style={{ width: `${category.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="surface-panel rounded-[2rem] p-5 sm:p-6 xl:col-span-6">
          <PanelHeading
            eyebrow="Food diary"
            title="Today’s food log"
            icon={Apple}
            action="Open diary"
            onAction={() => navigate("/nutrition")}
          />
          {todayLogs.length === 0 ? (
            <EmptyState
              icon={Apple}
              title="Nothing logged today"
              description="Add a meal or snack to bring today’s nutrition picture to life."
              action="Log food"
              onAction={() => navigate("/consumption")}
              compact
            />
          ) : (
            <div className="mt-5">
              {todayLogs.map((log, index) => {
                const item = log.items;
                const calories = nutrientAmount(item, "calories_per_unit", Number(log.quantity), log.unit);
                return (
                  <div
                    key={log.id}
                    className={cn(
                      "flex items-center justify-between gap-4 py-3",
                      index < todayLogs.length - 1 && "border-b border-dotted border-border/80",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[hsl(var(--surface-subtle))] text-lg">
                        {getCategoryEmoji(item?.category)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {item?.name ?? "Unknown item"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {log.quantity} {item?.serving_size ?? item?.default_unit ?? "serving"} ·{" "}
                          {format(parseISO(log.consumed_at), "h:mm a")}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-foreground tabular-nums">
                      <Flame className="h-3.5 w-3.5 text-orange-500" />
                      {calories.toFixed(0)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="surface-panel rounded-[2rem] p-5 sm:p-6 xl:col-span-6">
          <PanelHeading
            eyebrow="Shopping activity"
            title="Recent purchases"
            icon={Receipt}
            action="View all"
            onAction={() => navigate("/purchases")}
          />
          {recentPurchases.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No purchases yet"
              description="Your latest shops and spending will appear here."
              action="Add purchase"
              onAction={() => navigate("/purchases")}
              compact
            />
          ) : (
            <div className="mt-5">
              {recentPurchases.map((purchase, index) => (
                <button
                  type="button"
                  key={purchase.id}
                  onClick={() => navigate("/purchases")}
                  className={cn(
                    "group flex w-full items-center justify-between gap-4 py-3 text-left",
                    index < recentPurchases.length - 1 && "border-b border-dotted border-border/80",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[hsl(var(--surface-subtle))]">
                      <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {purchase.store_name || "Purchase"}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {format(parseISO(purchase.purchased_at), "MMM d, yyyy")} ·{" "}
                        {formatDistanceToNow(parseISO(purchase.purchased_at), { addSuffix: true })}
                      </span>
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-semibold text-foreground tabular-nums">
                      {formatCurrencyAlways(Number(purchase.total_cost ?? 0))}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

const HeroMetric = ({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "warning";
}) => (
  <div className="min-w-0 px-3 text-center sm:px-5 sm:text-left">
    <p
      className={cn(
        "text-xl font-semibold tracking-tight tabular-nums sm:text-2xl",
        tone === "warning" ? "text-amber-700 dark:text-amber-300" : "text-foreground",
      )}
    >
      {value}
    </p>
    <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      {label}
    </p>
  </div>
);

const PantryGauge = ({ score, attentionCount }: { score: number; attentionCount: number }) => (
  <div className="relative flex h-[210px] w-[210px] items-center justify-center">
    <div className="absolute inset-0 rounded-full border border-primary/10 bg-card/35 shadow-[inset_0_0_50px_hsl(var(--primary)/0.06)] backdrop-blur" />
    <div
      className="relative flex h-40 w-40 items-center justify-center rounded-full p-2 shadow-[0_20px_50px_-30px_hsl(var(--primary)/0.8)]"
      style={{
        background: `conic-gradient(hsl(var(--primary)) ${score * 3.6}deg, hsl(var(--surface-inset)) 0deg)`,
      }}
    >
      <div className="flex h-full w-full flex-col items-center justify-center rounded-full border border-border/70 bg-[hsl(var(--surface-panel))] shadow-inner">
        <ShieldCheck className="mb-1 h-5 w-5 text-primary" />
        <span className="text-4xl font-semibold tracking-[-0.05em] text-foreground tabular-nums">
          {score}%
        </span>
        <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          On track
        </span>
      </div>
    </div>
    <span className="absolute bottom-0 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold text-muted-foreground shadow-sm">
      {attentionCount > 0 ? `${attentionCount} to review` : "All clear"}
    </span>
  </div>
);

const PanelHeading = ({
  eyebrow,
  title,
  icon: Icon,
  action,
  onAction,
}: {
  eyebrow: string;
  title?: string;
  icon: LucideIcon;
  action?: string;
  onAction?: () => void;
}) => (
  <div className="flex items-start justify-between gap-4">
    <div className="flex min-w-0 items-start gap-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
          {eyebrow}
        </p>
        {title && <h2 className="mt-0.5 text-lg font-semibold leading-tight tracking-tight text-foreground sm:text-xl">{title}</h2>}
      </div>
    </div>
    {action && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-semibold text-muted-foreground transition hover:bg-[hsl(var(--surface-subtle))] hover:text-foreground"
      >
        {action}
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    )}
  </div>
);

const QuickAction = ({
  icon: Icon,
  label,
  detail,
  tone,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  detail: string;
  tone: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="surface-panel group flex min-w-0 items-center gap-3 rounded-2xl p-3 text-left transition duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg"
  >
    <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", tone)}>
      <Icon className="h-5 w-5" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-semibold text-foreground">{label}</span>
      <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{detail}</span>
    </span>
    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
  </button>
);

const ProgressMetric = ({
  icon: Icon,
  label,
  value,
  detail,
  percentage,
  barClass,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  percentage: number;
  barClass: string;
}) => (
  <div>
    <div className="mb-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="text-right">
        <span className="text-sm font-semibold text-foreground tabular-nums">{value}</span>
        <span className="ml-1.5 text-[11px] text-muted-foreground">{detail}</span>
      </div>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-[hsl(var(--surface-inset))]">
      <div
        className={cn("h-full rounded-full transition-[width] duration-500", barClass)}
        style={{ width: `${percentage}%` }}
      />
    </div>
    <p className="mt-2 text-right text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
      {Math.round(percentage)}% complete
    </p>
  </div>
);

const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  onAction,
  compact = false,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
  compact?: boolean;
}) => (
  <div className={cn("flex flex-col items-center px-4 text-center", compact ? "py-9" : "py-12")}>
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
      <Icon className="h-5 w-5" />
    </div>
    <h3 className="mt-3 text-sm font-semibold text-foreground">{title}</h3>
    <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">{description}</p>
    {action && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="mt-4 inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary/10 px-4 text-xs font-semibold text-primary transition hover:bg-primary/15"
      >
        <Plus className="h-3.5 w-3.5" />
        {action}
      </button>
    )}
  </div>
);

const SpendBars = ({ purchases }: { purchases: Array<{ purchased_at: string; total_cost: number | null }> | undefined }) => {
  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];
  const today = new Date().getDay();
  const todayIndex = today === 0 ? 6 : today - 1;

  const dailySpend = useMemo(() => {
    const values = Array<number>(7).fill(0);
    if (!purchases) return values;

    purchases.forEach((purchase) => {
      const purchasedAt = parseISO(purchase.purchased_at);
      if (!isThisWeek(purchasedAt, { weekStartsOn: 1 })) return;
      const day = purchasedAt.getDay();
      const index = day === 0 ? 6 : day - 1;
      values[index] += Number(purchase.total_cost ?? 0);
    });
    return values;
  }, [purchases]);

  const maximum = Math.max(...dailySpend, 1);

  return (
    <div aria-label="Spending over the last seven days">
      <div className="flex h-24 items-end gap-2 rounded-2xl bg-[hsl(var(--surface-subtle))] px-3 pb-2 pt-4">
        {dailySpend.map((spend, index) => (
          <div key={`${dayLabels[index]}-${index}`} className="flex h-full flex-1 items-end">
            <div
              className={cn(
                "w-full rounded-full transition-[height] duration-500",
                index === todayIndex
                  ? "bg-[linear-gradient(180deg,hsl(var(--primary)),hsl(var(--primary)/0.55))]"
                  : "bg-[hsl(var(--surface-inset))]",
              )}
              style={{ height: `${Math.max((spend / maximum) * 100, 8)}%` }}
              title={`${dayLabels[index]}: ${formatCurrencyAlways(spend)}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between px-2">
        {dayLabels.map((label, index) => (
          <span
            key={`${label}-label-${index}`}
            className={cn(
              "flex-1 text-center text-[10px] font-semibold",
              index === todayIndex ? "text-primary" : "text-muted-foreground",
            )}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
