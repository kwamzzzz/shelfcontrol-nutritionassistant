import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useInventory } from "@/hooks/usePantry";
import { usePurchases } from "@/hooks/usePurchases";
import { useConsumptionLogs } from "@/hooks/useConsumption";
import { useShoppingList } from "@/hooks/useShoppingList";
import { useRecipes } from "@/hooks/useRecipes";
import { useNutritionGoals } from "@/hooks/useNutritionGoals";
import { useWaterLogs } from "@/hooks/useWaterTracking";
import { useNutritionData } from "@/hooks/useNutrition";
import { formatCurrency } from "@/lib/currency";
import { getExpiryStatus, getExpiryLabel } from "@/lib/pantry-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import IntelligenceWidget from "@/components/dashboard/IntelligenceWidget";
import {
  Package, AlertTriangle, Flame, Beef, Wheat, Droplets,
  ShoppingBag, ShoppingCart, UtensilsCrossed, ChefHat, GlassWater,
  ArrowRight, TrendingUp, Apple, Receipt, Trash2, Clock, Plus,
} from "lucide-react";
import { isToday, isThisWeek, parseISO, format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";

/* ── helpers ──────────────────────────────────────── */
function getCategoryEmoji(category?: string | null): string {
  if (!category) return "🍽";
  const c = category.toLowerCase();
  if (c.includes("dairy") || c.includes("milk")) return "🥛";
  if (c.includes("meat") || c.includes("chicken") || c.includes("beef")) return "🥩";
  if (c.includes("fish") || c.includes("seafood")) return "🐟";
  if (c.includes("vegetable") || c.includes("veg")) return "🥬";
  if (c.includes("fruit")) return "🍎";
  if (c.includes("grain") || c.includes("bread")) return "🍞";
  if (c.includes("snack")) return "🍿";
  if (c.includes("beverage") || c.includes("drink")) return "🧃";
  return "🍽";
}

/* ── Dashboard ──────────────────────────────────────── */
const Dashboard = () => {
  const navigate = useNavigate();
  const { data: inventory } = useInventory();
  const { data: purchases } = usePurchases();
  const { data: logs } = useConsumptionLogs();
  const { data: recipes } = useRecipes();
  const { data: shoppingList } = useShoppingList();
  const { data: goals } = useNutritionGoals();
  const { data: waterLogs } = useWaterLogs();
  const { totals, meals } = useNutritionData();

  const calGoal = goals?.calorie_goal ?? 2000;
  const protGoal = goals?.protein_goal ?? 50;
  const carbsGoal = goals?.carbs_goal ?? 250;
  const fatGoal = goals?.fat_goal ?? 65;
  const waterGoal = goals?.water_goal_ml ?? 2000;

  const calPct = Math.min((totals.calories / calGoal) * 100, 100);

  /* pantry */
  const pantryCount = inventory?.length ?? 0;
  const expiringSoon = useMemo(
    () => inventory?.filter(r => { const s = getExpiryStatus(r.expiry_date); return s === "expiring" || s === "expired"; }) ?? [],
    [inventory]
  );

  /* spending */
  const weekSpend = useMemo(() => {
    if (!purchases) return 0;
    return purchases.filter(p => isThisWeek(parseISO(p.purchased_at), { weekStartsOn: 1 })).reduce((sum, p) => sum + Number(p.total_cost ?? 0), 0);
  }, [purchases]);
  const tripCount = useMemo(() => purchases?.filter(p => isThisWeek(parseISO(p.purchased_at), { weekStartsOn: 1 })).length ?? 0, [purchases]);

  /* shopping */
  const openItems = useMemo(() => shoppingList?.filter(i => !i.is_purchased).length ?? 0, [shoppingList]);

  /* water */
  const waterTotal = useMemo(() => waterLogs?.reduce((s, l) => s + l.amount_ml, 0) ?? 0, [waterLogs]);
  const waterPct = Math.min((waterTotal / waterGoal) * 100, 100);

  /* recent activity */
  const recentLogs = logs?.slice(0, 4) ?? [];
  const recentPurchases = purchases?.slice(0, 3) ?? [];

  /* greeting */
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold text-foreground">{greeting} 👋</h1>
        <p className="mt-1 text-muted-foreground">Here's what's happening in your kitchen today</p>
      </div>

      {/* ═══ TOP ROW: Nutrition Ring + Quick Stats ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* Calorie Ring Card */}
        <Card className="rounded-2xl border-none shadow-sm lg:col-span-1">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Today's Calories</p>
              </div>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1 h-7 px-2" onClick={() => navigate("/nutrition")}>
                Details <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex items-center gap-5">
              <div className="relative w-28 h-28 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="75%" outerRadius="100%" startAngle={90} endAngle={-270} data={[{ value: calPct, fill: "hsl(var(--primary))" }]}>
                    <RadialBar background={{ fill: "hsl(var(--muted))" }} dataKey="value" cornerRadius={10} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-display font-bold tabular-nums text-foreground">{totals.calories.toFixed(0)}</span>
                  <span className="text-[10px] text-muted-foreground">/ {calGoal}</span>
                </div>
              </div>
              <div className="flex-1 space-y-2.5">
                <MacroRow icon={Beef} label="Protein" value={totals.protein} goal={protGoal} color="text-emerald-500" bg="bg-emerald-500" />
                <MacroRow icon={Wheat} label="Carbs" value={totals.carbs} goal={carbsGoal} color="text-amber-500" bg="bg-amber-500" />
                <MacroRow icon={Droplets} label="Fats" value={totals.fat} goal={fatGoal} color="text-rose-500" bg="bg-rose-500" />
              </div>
            </div>
            {/* Meal status chips */}
            <div className="flex gap-2 mt-4">
              {meals.map(m => {
                const logged = m.logs.length > 0;
                return (
                  <div key={m.key} className={cn("flex-1 rounded-lg p-2 text-center text-[10px] font-medium transition-colors", logged ? "bg-primary/10 text-primary" : "bg-muted/50 text-muted-foreground")}>
                    {m.label}
                    {logged && <span className="block text-[9px] mt-0.5">{m.logs.length} item(s)</span>}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats Grid */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <QuickStat
            icon={Package} label="Pantry Items" value={pantryCount}
            sub={expiringSoon.length > 0 ? `${expiringSoon.length} expiring` : "All fresh"}
            accent={expiringSoon.length > 0 ? "warning" : undefined}
            onClick={() => navigate("/pantry")}
          />
          <QuickStat
            icon={AlertTriangle} label="Expiring Soon" value={expiringSoon.length}
            sub={expiringSoon.length > 0 ? expiringSoon.slice(0, 2).map(r => r.items?.name).join(", ") : "Nothing urgent"}
            accent={expiringSoon.length > 0 ? "destructive" : undefined}
            onClick={() => navigate("/pantry?filter=expiring")}
          />
          <QuickStat
            icon={ShoppingBag} label="Weekly Spend" value={weekSpend > 0 ? formatCurrency(weekSpend) : "—"}
            sub={`${tripCount} trip(s)`}
            onClick={() => navigate("/purchases")}
          />
          <QuickStat
            icon={ShoppingCart} label="Shopping List" value={openItems}
            sub={openItems === 0 ? "All done" : `${openItems} to buy`}
            onClick={() => navigate("/shopping-list")}
          />
          <QuickStat
            icon={ChefHat} label="Recipes" value={recipes?.length ?? 0}
            sub="In your collection"
            onClick={() => navigate("/recipes")}
          />
          {/* Water mini card */}
          <div
            className="rounded-2xl bg-card p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow flex flex-col justify-between"
            onClick={() => navigate("/nutrition")}
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <GlassWater className="h-4 w-4 text-blue-500" />
              <p className="text-xs font-medium">Hydration</p>
            </div>
            <div className="mt-2">
              <p className="text-xl font-display font-bold tabular-nums text-foreground">
                {(waterTotal / 1000).toFixed(1)}<span className="text-xs font-normal text-muted-foreground">L</span>
              </p>
              <Progress value={waterPct} className="h-1.5 mt-2 [&>div]:bg-blue-500" />
              <p className="text-[10px] text-muted-foreground mt-1">{waterPct.toFixed(0)}% of {(waterGoal / 1000).toFixed(1)}L goal</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ MIDDLE ROW: Intelligence + Expiring Items ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-5">
        <div className="lg:col-span-3">
          <IntelligenceWidget />
        </div>
        <Card className="rounded-2xl border-none shadow-sm lg:col-span-2">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">⚠️ Expiring Items</p>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1 h-7 px-2" onClick={() => navigate("/pantry?filter=expiring")}>
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
            {expiringSoon.length === 0 ? (
              <div className="py-8 text-center">
                <span className="text-2xl">✅</span>
                <p className="text-sm text-muted-foreground mt-2">Nothing expiring soon!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {expiringSoon.slice(0, 5).map(item => {
                  const status = getExpiryStatus(item.expiry_date);
                  return (
                    <div key={item.id} className="flex items-center gap-3 rounded-xl bg-muted/30 p-3">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-base">{getCategoryEmoji(item.items?.category)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{item.items?.name ?? "Unknown"}</p>
                        <p className="text-[10px] text-muted-foreground">{item.quantity} {item.unit} · {item.storage_location ?? "Pantry"}</p>
                      </div>
                      <Badge variant="secondary" className={cn("text-[9px] rounded-full shrink-0", status === "expired" ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-600")}>
                        {getExpiryLabel(item.expiry_date)}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══ BOTTOM ROW: Recent Activity + Recent Purchases ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Consumption */}
        <Card className="rounded-2xl border-none shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">🍽 Today's Food Log</p>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1 h-7 px-2" onClick={() => navigate("/nutrition")}>
                Open diary <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
            {recentLogs.length === 0 ? (
              <div className="py-8 text-center">
                <Apple className="h-6 w-6 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No food logged today</p>
                <Button variant="outline" size="sm" className="mt-3 text-xs" onClick={() => navigate("/consumption")}>
                  <Plus className="h-3 w-3 mr-1" /> Log food
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentLogs.map(log => {
                  const item = log.items;
                  const cal = Number(item?.calories_per_unit ?? 0) * Number(log.quantity);
                  return (
                    <div key={log.id} className="flex items-center gap-3 rounded-xl bg-muted/30 p-3">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-base">{getCategoryEmoji(item?.category)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{item?.name ?? "Unknown"}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {log.quantity} {item?.serving_size ?? item?.default_unit ?? "serving"} · {format(parseISO(log.consumed_at), "h:mm a")}
                        </p>
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-foreground flex items-center gap-1 shrink-0">
                        <Flame className="h-3 w-3 text-primary" /> {cal.toFixed(0)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Purchases */}
        <Card className="rounded-2xl border-none shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">🧾 Recent Purchases</p>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1 h-7 px-2" onClick={() => navigate("/purchases")}>
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
            {recentPurchases.length === 0 ? (
              <div className="py-8 text-center">
                <Receipt className="h-6 w-6 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No purchases yet</p>
                <Button variant="outline" size="sm" className="mt-3 text-xs" onClick={() => navigate("/purchases")}>
                  <Plus className="h-3 w-3 mr-1" /> Add purchase
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentPurchases.map(p => (
                  <div key={p.id} className="flex items-center gap-3 rounded-xl bg-muted/30 p-3 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate("/purchases")}>
                    <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                      <ShoppingBag className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{p.store_name || "Purchase"}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {format(parseISO(p.purchased_at), "MMM d, yyyy")} · {formatDistanceToNow(parseISO(p.purchased_at), { addSuffix: true })}
                      </p>
                    </div>
                    {p.total_cost != null && Number(p.total_cost) > 0 && (
                      <span className="text-sm font-bold tabular-nums text-foreground shrink-0">
                        {formatCurrency(Number(p.total_cost))}
                      </span>
                    )}
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

/* ── Sub-components ─────────────────────────────── */

const QuickStat = ({
  icon: Icon, label, value, sub, accent, onClick,
}: {
  icon: any; label: string; value: string | number; sub?: string;
  accent?: "warning" | "destructive"; onClick?: () => void;
}) => (
  <div
    className="rounded-2xl bg-card p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
    onClick={onClick}
  >
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className={cn("h-4 w-4", accent === "warning" ? "text-amber-500" : accent === "destructive" ? "text-destructive" : "")} />
      <p className="text-xs font-medium">{label}</p>
    </div>
    <p className="mt-2 text-xl font-display font-bold text-foreground tabular-nums">{value}</p>
    {sub && <p className="mt-0.5 text-[10px] text-muted-foreground truncate">{sub}</p>}
  </div>
);

const MacroRow = ({
  icon: Icon, label, value, goal, color, bg,
}: {
  icon: any; label: string; value: number; goal: number; color: string; bg: string;
}) => {
  const pct = Math.min((value / goal) * 100, 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <Icon className={cn("h-3 w-3", color)} />
          <span className={cn("text-[10px] font-medium", color)}>{label}</span>
        </div>
        <span className="text-[10px] font-medium tabular-nums text-foreground">{value.toFixed(0)}g <span className="text-muted-foreground">/ {goal}g</span></span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", bg)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

export default Dashboard;
