import {
  ShoppingBag, Package, AlertTriangle, Flame, Clock, MapPin,
  Activity, Trash2,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { formatCurrencyAlways } from "@/lib/currency";
import AnalyticsLayout from "./AnalyticsLayout";
import HeroStatCard from "./HeroStatCard";
import AnalyticsModule from "./AnalyticsModule";
import InsightsRail from "./InsightsRail";
import type { useAnalytics } from "@/hooks/useAnalytics";

type Analytics = ReturnType<typeof useAnalytics>;

const MACRO_COLORS = ["hsl(142,50%,38%)", "hsl(30,80%,56%)", "hsl(38,92%,50%)"];

const OverviewTab = ({ data }: { data: Analytics }) => {
  const { spending, spendingTrend, pantry, pantryMacros, macroDistribution, todayNutrition, recentActivity, insights } = data;

  return (
    <AnalyticsLayout rail={<InsightsRail insights={insights} tab="overview" />}>
      {/* Dominant Hero */}
      <HeroStatCard
        icon={ShoppingBag}
        label="This Month's Spend"
        value={spending.monthTotal > 0 ? formatCurrencyAlways(spending.monthTotal) : "—"}
        sub={`${spending.monthTrips} trip(s) · avg ${formatCurrencyAlways(spending.avgPerTrip)} per trip`}
        variant="dominant"
      />

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <HeroStatCard icon={Package} label="Items in Stock" value={pantry.total} />
        <HeroStatCard icon={AlertTriangle} label="Expiring Soon" value={pantry.expiring} sub="≤ 3 days" />
        <HeroStatCard icon={Flame} label="Calories Today" value={todayNutrition.calories > 0 ? todayNutrition.calories.toFixed(0) : "—"} />
      </div>

      {/* Spending Trend + Macro Donut */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AnalyticsModule title="Spending Trend (7 days)" icon={ShoppingBag}>
          {spendingTrend.every((d) => d.value === 0) ? (
            <p className="text-sm text-muted-foreground font-analytics">No spending data this week.</p>
          ) : (
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={spendingTrend}>
                  <defs>
                    <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(142,50%,38%)" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="hsl(142,50%,38%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(220,10%,46%)" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: "hsl(40,20%,100%)", border: "none", borderRadius: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", fontSize: 12, fontFamily: "Outfit" }}
                    formatter={(v: number) => [`AED ${v.toFixed(2)}`, "Spend"]}
                  />
                  <Area type="monotone" dataKey="value" stroke="hsl(142,50%,38%)" strokeWidth={2} fill="url(#spendGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </AnalyticsModule>

        <AnalyticsModule title="Pantry Macro Split" icon={Package}>
          {macroDistribution.length === 0 ? (
            <p className="text-sm text-muted-foreground font-analytics">No inventory data yet.</p>
          ) : (
            <div className="flex items-center gap-4">
              <div className="h-36 w-36 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={macroDistribution}
                      cx="50%" cy="50%"
                      innerRadius={36} outerRadius={56}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {macroDistribution.map((_, i) => (
                        <Cell key={i} fill={MACRO_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "hsl(40,20%,100%)", border: "none", borderRadius: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", fontSize: 12, fontFamily: "Outfit" }}
                      formatter={(v: number) => [`${v}g`, ""]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 font-analytics text-sm">
                {macroDistribution.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: MACRO_COLORS[i] }} />
                    <span className="text-muted-foreground">{d.name}</span>
                    <span className="font-medium text-foreground tabular-nums">{d.value}g</span>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground mt-1">{pantryMacros.calories.toFixed(0)} cal total</p>
              </div>
            </div>
          )}
        </AnalyticsModule>
      </div>

      {/* Supporting Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Shopping Footprint */}
        <AnalyticsModule title="Shopping Footprint" icon={MapPin}>
          <div className="space-y-2.5 text-sm font-analytics">
            <div className="flex justify-between"><span className="text-muted-foreground">Trips this month</span><span className="font-medium tabular-nums">{spending.monthTrips}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Stores visited</span><span className="font-medium tabular-nums">{spending.uniqueStores}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Most visited</span><span className="font-medium truncate ml-2">{spending.mostVisited || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Last shopped</span><span className="font-medium truncate ml-2">{spending.lastStore ? `${spending.lastStore} · ${spending.lastDate}` : "—"}</span></div>
          </div>
        </AnalyticsModule>

        {/* Expiry Risk */}
        <AnalyticsModule title="Expiry Risk" icon={AlertTriangle} accentColor="border-l-warning">
          <div className="space-y-2.5 text-sm font-analytics">
            <div className="flex justify-between"><span className="text-muted-foreground">Expiring soon</span><span className="font-semibold text-warning tabular-nums">{pantry.expiring}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Already expired</span><span className="font-semibold text-destructive tabular-nums">{pantry.expired}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">No expiry set</span><span className="font-medium tabular-nums">{pantry.noExpiry}</span></div>
          </div>
        </AnalyticsModule>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Waste Summary */}
        <AnalyticsModule title="Waste Summary" icon={Trash2} accentColor="border-l-destructive">
          <p className="text-sm text-muted-foreground font-analytics">No waste data yet. Discard items from Pantry to start tracking waste.</p>
        </AnalyticsModule>

        {/* Recent Activity */}
        <AnalyticsModule title="Recent Food Activity" icon={Activity}>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground font-analytics">No recent consumption logged.</p>
          ) : (
            <div className="space-y-2.5">
              {recentActivity.map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm font-analytics">
                  <div className="truncate">
                    <span className="text-foreground font-medium">{a.itemName}</span>
                    <span className="text-muted-foreground ml-1.5">{a.quantity} {a.unit}</span>
                    {a.recipeName && <span className="ml-1.5 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">{a.recipeName}</span>}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">{a.timeAgo}</span>
                </div>
              ))}
            </div>
          )}
        </AnalyticsModule>
      </div>
    </AnalyticsLayout>
  );
};

export default OverviewTab;
