import {
  ShoppingBag, Package, AlertTriangle, Flame, Clock, MapPin,
  Activity, Trash2,
} from "lucide-react";
import { formatCurrencyAlways } from "@/lib/currency";
import AnalyticsLayout from "./AnalyticsLayout";
import HeroStatCard from "./HeroStatCard";
import AnalyticsModule from "./AnalyticsModule";
import InsightsRail from "./InsightsRail";
import type { useAnalytics } from "@/hooks/useAnalytics";

type Analytics = ReturnType<typeof useAnalytics>;

const MacroBar = ({ label, value, max, color }: { label: string; value: number; max: number; color: string }) => (
  <div>
    <div className="flex justify-between text-xs mb-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground tabular-nums">{value.toFixed(0)}g</span>
    </div>
    <div className="h-2 rounded-full bg-secondary overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${Math.min(100, max > 0 ? (value / max) * 100 : 0)}%` }} />
    </div>
  </div>
);

const OverviewTab = ({ data }: { data: Analytics }) => {
  const { spending, pantry, pantryMacros, todayNutrition, recentActivity, insights } = data;

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

      {/* Pantry Nutrient Availability */}
      <AnalyticsModule title="Pantry Nutrient Availability" icon={Package}>
        {pantry.total === 0 ? (
          <p className="text-sm text-muted-foreground">No inventory data yet.</p>
        ) : (
          <div className="space-y-3">
            <MacroBar label="Protein" value={pantryMacros.protein} max={Math.max(pantryMacros.protein, pantryMacros.carbs, pantryMacros.fat, 1)} color="bg-primary" />
            <MacroBar label="Carbs" value={pantryMacros.carbs} max={Math.max(pantryMacros.protein, pantryMacros.carbs, pantryMacros.fat, 1)} color="bg-accent" />
            <MacroBar label="Fat" value={pantryMacros.fat} max={Math.max(pantryMacros.protein, pantryMacros.carbs, pantryMacros.fat, 1)} color="bg-warning" />
            <MacroBar label="Fiber" value={pantryMacros.fiber} max={Math.max(pantryMacros.protein, pantryMacros.carbs, pantryMacros.fat, 1)} color="bg-success" />
            <p className="text-xs text-muted-foreground mt-2">{pantryMacros.calories.toFixed(0)} total calories available in pantry</p>
          </div>
        )}
      </AnalyticsModule>

      {/* Supporting Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Shopping Footprint */}
        <AnalyticsModule title="Shopping Footprint" icon={MapPin}>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Trips this month</span><span className="font-medium">{spending.monthTrips}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Stores visited</span><span className="font-medium">{spending.uniqueStores}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Most visited</span><span className="font-medium truncate ml-2">{spending.mostVisited || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Last shopped</span><span className="font-medium truncate ml-2">{spending.lastStore ? `${spending.lastStore} · ${spending.lastDate}` : "—"}</span></div>
          </div>
        </AnalyticsModule>

        {/* Expiry Risk */}
        <AnalyticsModule title="Expiry Risk" icon={AlertTriangle} accentColor="border-l-warning">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Expiring soon</span><span className="font-medium text-warning">{pantry.expiring}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Already expired</span><span className="font-medium text-destructive">{pantry.expired}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">No expiry set</span><span className="font-medium">{pantry.noExpiry}</span></div>
          </div>
        </AnalyticsModule>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Waste Summary */}
        <AnalyticsModule title="Waste Summary" icon={Trash2} accentColor="border-l-destructive">
          <p className="text-sm text-muted-foreground">No waste data yet. Discard items from Pantry to start tracking waste.</p>
        </AnalyticsModule>

        {/* Recent Activity */}
        <AnalyticsModule title="Recent Food Activity" icon={Activity}>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent consumption logged.</p>
          ) : (
            <div className="space-y-2">
              {recentActivity.map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm">
                  <div className="truncate">
                    <span className="text-foreground font-medium">{a.itemName}</span>
                    <span className="text-muted-foreground ml-1.5">{a.quantity} {a.unit}</span>
                    {a.recipeName && <span className="ml-1.5 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">{a.recipeName}</span>}
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
