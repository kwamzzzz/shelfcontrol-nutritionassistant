import { TrendingUp, ShoppingBag, Store, BarChart3, Sparkles } from "lucide-react";
import { formatCurrencyAlways } from "@/lib/currency";
import AnalyticsLayout from "./AnalyticsLayout";
import HeroStatCard from "./HeroStatCard";
import AnalyticsModule from "./AnalyticsModule";
import InsightsRail from "./InsightsRail";
import type { useAnalytics } from "@/hooks/useAnalytics";

type Analytics = ReturnType<typeof useAnalytics>;

const SpendValueTab = ({ data }: { data: Analytics }) => {
  const { spending, bestValue, topPurchased, topConsumed, insights } = data;

  return (
    <AnalyticsLayout rail={<InsightsRail insights={insights} tab="spend_value" />}>
      {/* Dominant: Best Value Insight */}
      <div className="rounded-2xl bg-card shadow-sm p-8">
        <div className="flex items-center gap-3 text-muted-foreground mb-2">
          <Sparkles className="h-5 w-5" />
          <p className="text-sm font-medium">Your Best Value This Month</p>
        </div>
        {bestValue.bestProteinItem ? (
          <p className="text-2xl font-display font-bold text-foreground">
            {bestValue.bestProteinItem} <span className="text-lg font-normal text-muted-foreground">gives you {bestValue.bestProteinValue.toFixed(1)}g protein per AED — your most cost-efficient protein source.</span>
          </p>
        ) : (
          <p className="text-lg text-muted-foreground">Add purchases with item prices to see value insights.</p>
        )}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <HeroStatCard icon={ShoppingBag} label="This Month" value={spending.monthTotal > 0 ? formatCurrencyAlways(spending.monthTotal) : "—"} sub={`${spending.monthTrips} trip(s)`} />
        <HeroStatCard icon={TrendingUp} label="This Week" value={spending.weekTotal > 0 ? formatCurrencyAlways(spending.weekTotal) : "—"} />
        <HeroStatCard icon={ShoppingBag} label="Avg per Trip" value={spending.avgPerTrip > 0 ? formatCurrencyAlways(spending.avgPerTrip) : "—"} />
      </div>

      {/* Store Breakdown */}
      <AnalyticsModule title="Store Breakdown (This Month)" icon={Store}>
        {spending.stores.length === 0 ? (
          <p className="text-sm text-muted-foreground">No purchase data this month.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <th className="text-left py-2 font-medium">Store</th>
                  <th className="text-right py-2 font-medium">Visits</th>
                  <th className="text-right py-2 font-medium">Total Spend</th>
                  <th className="text-right py-2 font-medium">Avg/Visit</th>
                </tr>
              </thead>
              <tbody>
                {spending.stores.map((s) => (
                  <tr key={s.name} className="border-t border-border/30">
                    <td className="py-2 text-foreground">{s.name}</td>
                    <td className="py-2 text-right text-muted-foreground tabular-nums">{s.visits}</td>
                    <td className="py-2 text-right text-foreground font-medium tabular-nums">{formatCurrencyAlways(s.total)}</td>
                    <td className="py-2 text-right text-muted-foreground tabular-nums">{formatCurrencyAlways(s.avgPerVisit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AnalyticsModule>

      {/* Supporting: Efficiency + Top Items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AnalyticsModule title="Spend vs Nutrition Efficiency" icon={BarChart3}>
          {bestValue.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Add item prices and nutrition data to see efficiency rankings.</p>
          ) : (
            <div className="space-y-1.5">
              {bestValue.items.slice(0, 5).map((item, i) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <span className="text-foreground truncate">
                    <span className="text-muted-foreground mr-2">{i + 1}.</span>{item.name}
                  </span>
                  <span className="shrink-0 text-muted-foreground tabular-nums">{item.proteinPerAed.toFixed(1)}g/AED</span>
                </div>
              ))}
            </div>
          )}
        </AnalyticsModule>

        <AnalyticsModule title="Most Purchased (All Time)" icon={ShoppingBag}>
          {topPurchased.length === 0 ? (
            <p className="text-sm text-muted-foreground">No purchase data yet.</p>
          ) : (
            <div className="space-y-1.5">
              {topPurchased.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <span className="text-foreground truncate">
                    <span className="text-muted-foreground mr-2">{i + 1}.</span>{item.name}
                  </span>
                  <span className="shrink-0 text-muted-foreground tabular-nums">{item.count}×</span>
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
