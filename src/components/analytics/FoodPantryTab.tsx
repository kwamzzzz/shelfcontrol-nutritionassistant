import { Package, AlertTriangle, Clock, Zap, Lock } from "lucide-react";
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

const SpeedBadge = ({ speed }: { speed: "fast" | "medium" | "slow" }) => {
  const cls = speed === "fast" ? "bg-destructive/10 text-destructive" : speed === "medium" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground";
  return <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${cls}`}>{speed}</span>;
};

const FoodPantryTab = ({ data }: { data: Analytics }) => {
  const { pantry, pantryMacros, consumptionVelocity, insights } = data;
  const maxMacro = Math.max(pantryMacros.protein, pantryMacros.carbs, pantryMacros.fat, 1);

  return (
    <AnalyticsLayout rail={<InsightsRail insights={insights} tab="food_pantry" />}>
      {/* Dominant: Pantry Nutrient Availability */}
      <AnalyticsModule title="Pantry Nutrient Availability" icon={Package} className="!p-8">
        {pantry.total === 0 ? (
          <p className="text-sm text-muted-foreground">No inventory data yet.</p>
        ) : (
          <div className="space-y-4">
            <p className="text-3xl font-display font-bold text-foreground tabular-nums">{pantryMacros.calories.toFixed(0)} <span className="text-base font-normal text-muted-foreground">total calories available</span></p>
            <div className="space-y-3 mt-4">
              <MacroBar label="Protein" value={pantryMacros.protein} max={maxMacro} color="bg-primary" />
              <MacroBar label="Carbs" value={pantryMacros.carbs} max={maxMacro} color="bg-accent" />
              <MacroBar label="Fat" value={pantryMacros.fat} max={maxMacro} color="bg-warning" />
              <MacroBar label="Fiber" value={pantryMacros.fiber} max={maxMacro} color="bg-success" />
            </div>
          </div>
        )}
      </AnalyticsModule>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <HeroStatCard icon={Package} label="Total Entries" value={pantry.total} />
        <HeroStatCard icon={AlertTriangle} label="Expiring" value={pantry.expiring} />
        <HeroStatCard icon={AlertTriangle} label="Expired" value={pantry.expired} />
        <HeroStatCard icon={Clock} label="No Expiry" value={pantry.noExpiry} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Expiry Risk List */}
        <AnalyticsModule title="Expiry Risk" icon={AlertTriangle} accentColor="border-l-warning">
          {pantry.expiringItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No items expiring within 3 days.</p>
          ) : (
            <div className="space-y-1.5">
              {pantry.expiringItems.map((name, i) => (
                <div key={i} className="text-sm text-foreground">
                  <span className="text-muted-foreground mr-2">{i + 1}.</span>{name}
                </div>
              ))}
            </div>
          )}
        </AnalyticsModule>

        {/* Consumption Velocity */}
        <AnalyticsModule title="Consumption Velocity" icon={Zap}>
          {consumptionVelocity.length === 0 ? (
            <p className="text-sm text-muted-foreground">Not enough consumption data yet.</p>
          ) : (
            <div className="space-y-1.5">
              {consumptionVelocity.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <span className="text-foreground truncate">{item.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-muted-foreground tabular-nums">{item.count}×</span>
                    <SpeedBadge speed={item.speed} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </AnalyticsModule>
      </div>

      {/* Phase 2 Placeholder */}
      <AnalyticsModule title="Opened-State Risk" icon={Lock}>
        <p className="text-sm text-muted-foreground">Coming in Phase 2 — track opened items and spoilage risk.</p>
      </AnalyticsModule>
    </AnalyticsLayout>
  );
};

export default FoodPantryTab;
