import { TrendingUp, ShoppingBag, Store, BarChart3, Sparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrencyAlways } from "@/lib/currency";
import AnalyticsLayout from "./AnalyticsLayout";
import HeroStatCard from "./HeroStatCard";
import AnalyticsModule from "./AnalyticsModule";
import InsightsRail from "./InsightsRail";
import type { useAnalytics } from "@/hooks/useAnalytics";

type Analytics = ReturnType<typeof useAnalytics>;

const SpendValueTab = ({ data }: { data: Analytics }) => {
  const { spending, storeChartData, bestValue, topPurchased, insights } = data;

  return (
    <AnalyticsLayout rail={<InsightsRail insights={insights} tab="spend_value" />}>
      {/* Dominant: Best Value Insight */}
      <div className="rounded-2xl bg-card shadow-[0_2px_16px_-4px_hsl(var(--foreground)/0.06)] p-8">
        <div className="flex items-center gap-2 text-muted-foreground mb-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold font-analytics tracking-wide">Your Best Value This Month</p>
        </div>
        {bestValue.bestProteinItem ? (
          <div>
            <p className="text-3xl font-analytics font-semibold text-foreground tracking-tight">{bestValue.bestProteinItem}</p>
            <p className="text-base text-muted-foreground font-analytics mt-1">
              delivers <span className="font-bold text-foreground">{bestValue.bestProteinValue.toFixed(1)}g protein</span> per AED — your most cost-efficient protein source.
            </p>
          </div>
        ) : (
          <p className="text-base text-muted-foreground font-analytics">Add purchases with item prices to see value insights.</p>
        )}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <HeroStatCard icon={ShoppingBag} label="This Month" value={spending.monthTotal > 0 ? formatCurrencyAlways(spending.monthTotal) : "—"} sub={`${spending.monthTrips} trip(s)`} cta={{ label: "View Purchases", to: "/purchases" }} />
        <HeroStatCard icon={TrendingUp} label="This Week" value={spending.weekTotal > 0 ? formatCurrencyAlways(spending.weekTotal) : "—"} />
        <HeroStatCard icon={ShoppingBag} label="Avg per Trip" value={spending.avgPerTrip > 0 ? formatCurrencyAlways(spending.avgPerTrip) : "—"} />
      </div>

      {/* Store Spend Chart */}
      {storeChartData.length > 0 && (
        <AnalyticsModule title="Spend by Store" icon={Store} cta={{ label: "View Purchases", to: "/purchases" }}>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={storeChartData} layout="vertical" margin={{ left: 0, right: 8 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11, fill: "hsl(220,10%,46%)", fontFamily: "Outfit" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(40,20%,100%)", border: "none", borderRadius: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", fontSize: 12, fontFamily: "Outfit" }}
                  formatter={(v: number) => [`AED ${v.toFixed(2)}`, "Spend"]}
                />
                <Bar dataKey="spend" fill="hsl(142,50%,38%)" radius={[0, 6, 6, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AnalyticsModule>
      )}

      {/* Store Breakdown — Receipt Style */}
      <AnalyticsModule title="Store Breakdown (This Month)" icon={Store} variant="receipt" cta={{ label: "View Purchases", to: "/purchases" }}>
        {spending.stores.length === 0 ? (
          <p className="text-sm text-muted-foreground font-analytics">No purchase data this month.</p>
        ) : (
          <div className="font-analytics">
            <div className="flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground pb-2 border-b border-dashed border-border font-bold">
              <span>Store</span>
              <div className="flex gap-6">
                <span className="w-12 text-right">Visits</span>
                <span className="w-20 text-right">Total</span>
                <span className="w-20 text-right">Avg/Visit</span>
              </div>
            </div>
            {spending.stores.map((s, i) => (
              <div
                key={s.name}
                className={`flex justify-between py-2.5 text-sm ${
                  i < spending.stores.length - 1 ? "border-b border-dotted border-border" : ""
                }`}
              >
                <span className="text-foreground font-semibold truncate">{s.name}</span>
                <div className="flex gap-6 shrink-0">
                  <span className="w-12 text-right text-muted-foreground tabular-nums font-medium">{s.visits}</span>
                  <span className="w-20 text-right text-foreground font-bold tabular-nums">{formatCurrencyAlways(s.total)}</span>
                  <span className="w-20 text-right text-muted-foreground tabular-nums font-medium">{formatCurrencyAlways(s.avgPerVisit)}</span>
                </div>
              </div>
            ))}
            <div className="flex justify-between pt-3 mt-1 border-t-2 border-dashed border-border text-sm">
              <span className="font-bold text-foreground">Total</span>
              <span className="font-bold text-foreground tabular-nums">{formatCurrencyAlways(spending.monthTotal)}</span>
            </div>
          </div>
        )}
      </AnalyticsModule>

      {/* Supporting: Efficiency + Top Items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AnalyticsModule title="Protein Efficiency" icon={BarChart3} cta={{ label: "View Purchases", to: "/purchases" }}>
          {bestValue.items.length === 0 ? (
            <p className="text-sm text-muted-foreground font-analytics">Add item prices and nutrition data to see efficiency rankings.</p>
          ) : (
            <div className="space-y-2.5 font-analytics">
              {bestValue.items.slice(0, 5).map((item, i) => (
                <div key={item.name} className="flex items-center gap-3 text-sm">
                  <span className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">{i + 1}</span>
                  <span className="text-foreground font-medium truncate flex-1">{item.name}</span>
                  <span className="shrink-0 text-muted-foreground tabular-nums font-bold">{item.proteinPerAed.toFixed(1)}g/AED</span>
                </div>
              ))}
            </div>
          )}
        </AnalyticsModule>

        <AnalyticsModule title="Most Purchased (All Time)" icon={ShoppingBag} cta={{ label: "View Purchases", to: "/purchases" }}>
          {topPurchased.length === 0 ? (
            <p className="text-sm text-muted-foreground font-analytics">No purchase data yet.</p>
          ) : (
            <div className="space-y-2.5 font-analytics">
              {topPurchased.map((item, i) => (
                <div key={item.name} className="flex items-center gap-3 text-sm">
                  <span className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">{i + 1}</span>
                  <span className="text-foreground font-medium truncate flex-1">{item.name}</span>
                  <span className="shrink-0 text-muted-foreground tabular-nums font-semibold">{item.count}×</span>
                </div>
              ))}
            </div>
          )}
        </AnalyticsModule>
      </div>
    </AnalyticsLayout>
  );
};

export default SpendValueTab;
