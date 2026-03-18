import { useMemo } from "react";
import { useInventory } from "@/hooks/usePantry";
import { usePurchases } from "@/hooks/usePurchases";
import { useConsumptionLogs } from "@/hooks/useConsumption";
import { formatCurrency } from "@/lib/currency";
import { getExpiryStatus } from "@/lib/pantry-utils";
import {
  Package, AlertTriangle, ShoppingBag, Flame, Beef, TrendingUp,
  Store, Utensils, Info, BarChart3, Clock,
} from "lucide-react";
import { parseISO, isThisWeek, isThisMonth, startOfWeek, differenceInDays } from "date-fns";

/* ── Stat Card ── */
const StatCard = ({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string | number; sub?: string }) => (
  <div className="rounded-xl border bg-card p-4 shadow-sm">
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="h-4 w-4" />
      <p className="text-xs font-medium">{label}</p>
    </div>
    <p className="mt-1 text-xl font-display font-bold text-foreground tabular-nums">{value}</p>
    {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
  </div>
);

/* ── Section Header ── */
const SectionHeader = ({ title }: { title: string }) => (
  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">{title}</p>
);

/* ── Ranked List ── */
const RankedList = ({ items, emptyMsg }: { items: { name: string; count: number }[]; emptyMsg: string }) => (
  items.length === 0 ? (
    <p className="text-sm text-muted-foreground">{emptyMsg}</p>
  ) : (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={item.name} className="flex items-center justify-between text-sm">
          <span className="text-foreground truncate">
            <span className="text-muted-foreground mr-2">{i + 1}.</span>
            {item.name}
          </span>
          <span className="shrink-0 text-muted-foreground tabular-nums">{item.count}×</span>
        </div>
      ))}
    </div>
  )
);

const Analytics = () => {
  const { data: inventory } = useInventory();
  const { data: purchases } = usePurchases();
  const { data: logs } = useConsumptionLogs();

  /* ── A. Spending ── */
  const spending = useMemo(() => {
    if (!purchases) return { monthTotal: 0, weekTotal: 0, monthTrips: 0, byStore: [] as { name: string; total: number }[] };

    let monthTotal = 0;
    let weekTotal = 0;
    let monthTrips = 0;
    const storeMap = new Map<string, number>();

    for (const p of purchases) {
      const d = parseISO(p.purchased_at);
      const cost = Number(p.total_cost ?? 0);
      if (isThisMonth(d)) {
        monthTotal += cost;
        monthTrips++;
        const store = p.store_name || "Unknown";
        storeMap.set(store, (storeMap.get(store) ?? 0) + cost);
      }
      if (isThisWeek(d, { weekStartsOn: 1 })) {
        weekTotal += cost;
      }
    }

    const byStore = Array.from(storeMap.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return { monthTotal, weekTotal, monthTrips, byStore };
  }, [purchases]);

  /* ── B. Pantry Health ── */
  const pantry = useMemo(() => {
    if (!inventory) return { total: 0, expiring: 0, expired: 0, noExpiry: 0 };
    let expiring = 0, expired = 0, noExpiry = 0;
    for (const r of inventory) {
      const s = getExpiryStatus(r.expiry_date);
      if (s === "expiring") expiring++;
      else if (s === "expired") expired++;
      else if (s === "no-date") noExpiry++;
    }
    return { total: inventory.length, expiring, expired, noExpiry };
  }, [inventory]);

  /* ── C. Consumption ── */
  const consumption = useMemo(() => {
    if (!logs) return { weekLogs: 0, avgCalories: 0, avgProtein: 0, missingCount: 0, weekLogCount: 0 };

    let totalCal = 0, totalProtein = 0, missing = 0, weekLogs = 0;
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const daysInWeek = Math.max(1, differenceInDays(now, weekStart) + 1);

    for (const log of logs) {
      if (!isThisWeek(parseISO(log.consumed_at), { weekStartsOn: 1 })) continue;
      weekLogs++;
      const qty = Number(log.quantity);
      const item = log.items;
      if (!item) continue;
      const cal = Number(item.calories_per_unit ?? 0);
      if (cal === 0 && Number(item.protein_g ?? 0) === 0) missing++;
      totalCal += qty * cal;
      totalProtein += qty * Number(item.protein_g ?? 0);
    }

    return {
      weekLogs,
      avgCalories: weekLogs > 0 ? totalCal / daysInWeek : 0,
      avgProtein: weekLogs > 0 ? totalProtein / daysInWeek : 0,
      missingCount: missing,
      weekLogCount: weekLogs,
    };
  }, [logs]);

  /* ── D. Top Items ── */
  const topConsumed = useMemo(() => {
    if (!logs) return [];
    const map = new Map<string, { name: string; count: number }>();
    for (const log of logs) {
      const name = log.items?.name ?? "Unknown";
      const existing = map.get(name);
      if (existing) existing.count++;
      else map.set(name, { name, count: 1 });
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [logs]);

  const topPurchased = useMemo(() => {
    if (!purchases) return [];
    const map = new Map<string, { name: string; count: number }>();
    for (const p of purchases) {
      for (const pi of p.purchase_items ?? []) {
        const name = pi.items?.name ?? "Unknown";
        const existing = map.get(name);
        if (existing) existing.count++;
        else map.set(name, { name, count: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [purchases]);

  return (
    <div>
      <h1 className="text-3xl font-display font-bold text-foreground">Analytics</h1>
      <p className="mt-1 text-muted-foreground">Spending, pantry, and nutrition insights.</p>

      {/* ── A. Spending ── */}
      <div className="mt-6">
        <SectionHeader title="Spending" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard
            icon={ShoppingBag}
            label="This Month"
            value={spending.monthTotal > 0 ? formatCurrency(spending.monthTotal) : "—"}
            sub={`${spending.monthTrips} trip(s)`}
          />
          <StatCard
            icon={TrendingUp}
            label="This Week"
            value={spending.weekTotal > 0 ? formatCurrency(spending.weekTotal) : "—"}
          />
          <StatCard
            icon={Store}
            label="Trips This Month"
            value={spending.monthTrips}
          />
        </div>
        {spending.byStore.length > 0 && (
          <div className="mt-3 rounded-xl border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Spend by Store (this month)</p>
            <div className="space-y-1.5">
              {spending.byStore.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-sm">
                  <span className="text-foreground truncate">{s.name}</span>
                  <span className="shrink-0 text-foreground font-medium tabular-nums">{formatCurrency(s.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── B. Pantry Health ── */}
      <div className="mt-6">
        <SectionHeader title="Pantry Health" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={Package} label="Total Entries" value={pantry.total} />
          <StatCard icon={AlertTriangle} label="Expiring Soon" value={pantry.expiring} sub="≤ 3 days" />
          <StatCard icon={AlertTriangle} label="Expired" value={pantry.expired} />
          <StatCard icon={Clock} label="No Expiry Set" value={pantry.noExpiry} />
        </div>
      </div>

      {/* ── C. Consumption ── */}
      <div className="mt-6">
        <SectionHeader title="Consumption (this week)" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard icon={Utensils} label="Logs This Week" value={consumption.weekLogs} />
          <StatCard
            icon={Flame}
            label="Avg Daily Calories"
            value={consumption.avgCalories > 0 ? `${consumption.avgCalories.toFixed(0)}` : "—"}
            sub="cal / day"
          />
          <StatCard
            icon={Beef}
            label="Avg Daily Protein"
            value={consumption.avgProtein > 0 ? `${consumption.avgProtein.toFixed(0)}g` : "—"}
            sub="per day"
          />
        </div>
        {consumption.missingCount > 0 && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-accent bg-accent/10 p-3 text-sm text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent-foreground" />
            <span>
              {consumption.missingCount} of {consumption.weekLogCount} log(s) this week reference items with no nutrition data.
              Averages may be underreported.
            </span>
          </div>
        )}
      </div>

      {/* ── D. Top Items ── */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Most Consumed (all time)</p>
          </div>
          <RankedList items={topConsumed} emptyMsg="No consumption data yet." />
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Most Purchased (all time)</p>
          </div>
          <RankedList items={topPurchased} emptyMsg="No purchase data yet." />
        </div>
      </div>
    </div>
  );
};

export default Analytics;
