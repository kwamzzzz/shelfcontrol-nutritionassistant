import { useMemo } from "react";
import { useInventory } from "@/hooks/usePantry";
import { usePurchases } from "@/hooks/usePurchases";
import { useConsumptionLogs } from "@/hooks/useConsumption";
import { useRecipes } from "@/hooks/useRecipes";
import { formatCurrency } from "@/lib/currency";
import { getExpiryStatus } from "@/lib/pantry-utils";
import { Badge } from "@/components/ui/badge";
import {
  Package, AlertTriangle, Flame, Beef, Wheat, Droplets,
  ShoppingBag, UtensilsCrossed, Info,
} from "lucide-react";
import { isToday, isThisWeek, parseISO, format } from "date-fns";

/* ── Stat Card ──────────────────────────────────────── */
const StatCard = ({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: any;
  label: string;
  value: string | number;
  sub?: string;
  accent?: "warning" | "destructive";
}) => (
  <div className="rounded-xl border bg-card p-5 shadow-sm">
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon
        className={`h-4 w-4 ${
          accent === "warning"
            ? "text-accent-foreground"
            : accent === "destructive"
            ? "text-destructive"
            : ""
        }`}
      />
      <p className="text-xs font-medium">{label}</p>
    </div>
    <p className="mt-1 text-xl font-display font-bold text-foreground tabular-nums">
      {value}
    </p>
    {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
  </div>
);

/* ── Dashboard ──────────────────────────────────────── */
const Dashboard = () => {
  const { data: inventory } = useInventory();
  const { data: purchases } = usePurchases();
  const { data: logs } = useConsumptionLogs();
  const { data: recipes } = useRecipes();

  /* Pantry stats */
  const pantryCount = inventory?.length ?? 0;
  const expiringSoon = useMemo(
    () =>
      inventory?.filter((r) => {
        const s = getExpiryStatus(r.expiry_date);
        return s === "expiring" || s === "expired";
      }) ?? [],
    [inventory]
  );

  /* Spending this week */
  const weekSpend = useMemo(() => {
    if (!purchases) return 0;
    return purchases
      .filter((p) => isThisWeek(parseISO(p.purchased_at), { weekStartsOn: 1 }))
      .reduce((sum, p) => sum + Number(p.total_cost ?? 0), 0);
  }, [purchases]);

  /* Today's nutrition */
  const todayNutrition = useMemo(() => {
    const t = { calories: 0, protein: 0, carbs: 0, fat: 0, missing: 0, total: 0 };
    if (!logs) return t;
    for (const log of logs) {
      if (!isToday(parseISO(log.consumed_at))) continue;
      t.total++;
      const item = log.items;
      if (!item) continue;
      const cal = Number(item.calories_per_unit ?? 0);
      if (cal === 0 && Number(item.protein_g ?? 0) === 0) t.missing++;
      const qty = Number(log.quantity);
      t.calories += qty * cal;
      t.protein += qty * Number(item.protein_g ?? 0);
      t.carbs += qty * Number(item.carbs_g ?? 0);
      t.fat += qty * Number(item.fat_g ?? 0);
    }
    return t;
  }, [logs]);

  /* Recent activity */
  const recentPurchases = purchases?.slice(0, 3) ?? [];
  const recentLogs = logs?.slice(0, 5) ?? [];

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
      <p className="mt-1 text-muted-foreground">Overview of your kitchen at a glance.</p>

      {/* ── Pantry & Spending cards ── */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          icon={Package}
          label="Items in Stock"
          value={pantryCount}
          sub={`${inventory?.reduce((s, r) => s + (r.expiry_date ? 0 : 1), 0) ?? 0} without expiry`}
        />
        <StatCard
          icon={AlertTriangle}
          label="Expiring Soon"
          value={expiringSoon.length}
          sub={expiringSoon.length > 0 ? expiringSoon.map((r) => r.items?.name).slice(0, 2).join(", ") : "All good"}
          accent={expiringSoon.length > 0 ? "warning" : undefined}
        />
        <StatCard
          icon={ShoppingBag}
          label="This Week's Spend"
          value={weekSpend > 0 ? formatCurrency(weekSpend) : "—"}
          sub={`${purchases?.filter((p) => isThisWeek(parseISO(p.purchased_at), { weekStartsOn: 1 })).length ?? 0} trip(s)`}
        />
      </div>

      {/* ── Today's nutrition cards ── */}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={Flame}
          label="Calories Today"
          value={todayNutrition.calories > 0 ? `${todayNutrition.calories.toFixed(0)}` : "—"}
          sub={todayNutrition.total > 0 ? `${todayNutrition.total} log(s)` : "No logs yet"}
        />
        <StatCard
          icon={Beef}
          label="Protein Today"
          value={todayNutrition.protein > 0 ? `${todayNutrition.protein.toFixed(0)}g` : "—"}
        />
        <StatCard
          icon={Wheat}
          label="Carbs Today"
          value={todayNutrition.carbs > 0 ? `${todayNutrition.carbs.toFixed(0)}g` : "—"}
        />
        <StatCard
          icon={Droplets}
          label="Fat Today"
          value={todayNutrition.fat > 0 ? `${todayNutrition.fat.toFixed(0)}g` : "—"}
        />
      </div>

      {/* ── Nutrition data warning ── */}
      {todayNutrition.missing > 0 && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-accent bg-accent/10 p-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent-foreground" />
          <span>
            {todayNutrition.missing} of today's {todayNutrition.total} consumed item(s) have no nutrition data.
            Update them in the Pantry catalog for accurate totals.
          </span>
        </div>
      )}

      {/* ── Two-column activity section ── */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Recent purchases */}
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">Recent Purchases</p>
          {recentPurchases.length === 0 ? (
            <p className="text-sm text-muted-foreground">No purchases yet.</p>
          ) : (
            <div className="space-y-2">
              {recentPurchases.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <span className="font-medium text-foreground">{p.store_name || "Purchase"}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {format(parseISO(p.purchased_at), "MMM d")}
                    </span>
                  </div>
                  {p.total_cost != null && Number(p.total_cost) > 0 && (
                    <span className="shrink-0 text-foreground font-medium tabular-nums">
                      {formatCurrency(Number(p.total_cost))}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent consumption */}
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">Recent Activity</p>
          {recentLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No consumption logged yet.</p>
          ) : (
            <div className="space-y-2">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium text-foreground truncate">{log.items?.name ?? "Unknown"}</span>
                    {log.recipes && (
                      <Badge variant="secondary" className="text-xs font-normal shrink-0">
                        {log.recipes.name}
                      </Badge>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {format(parseISO(log.consumed_at), "MMM d, h:mm a")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
