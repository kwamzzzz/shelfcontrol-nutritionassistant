import { Package, AlertTriangle, Clock, Zap, Lock } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import AnalyticsLayout from "./AnalyticsLayout";
import HeroStatCard from "./HeroStatCard";
import AnalyticsModule from "./AnalyticsModule";
import InsightsRail from "./InsightsRail";
import type { useAnalytics } from "@/hooks/useAnalytics";

type Analytics = ReturnType<typeof useAnalytics>;

const MACRO_COLORS = ["hsl(142,50%,38%)", "hsl(30,80%,56%)", "hsl(38,92%,50%)", "hsl(142,60%,42%)"];

const MacroBar = ({ label, value, max, color }: { label: string; value: number; max: number; color: string }) => (
  <div>
    <div className="flex justify-between text-xs mb-1 font-analytics">
      <span className="text-muted-foreground font-medium">{label}</span>
      <span className="font-bold text-foreground tabular-nums">{value.toFixed(0)}g</span>
    </div>
    <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${Math.min(100, max > 0 ? (value / max) * 100 : 0)}%` }} />
    </div>
  </div>
);

const SpeedBadge = ({ speed }: { speed: "fast" | "medium" | "slow" }) => {
  const cls = speed === "fast" ? "bg-destructive/10 text-destructive" : speed === "medium" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground";
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-analytics ${cls}`}>{speed}</span>;
};

const FoodPantryTab = ({ data }: { data: Analytics }) => {
  const { pantry, pantryMacros, macroDistribution, consumptionVelocity, insights } = data;
  const maxMacro = Math.max(pantryMacros.protein, pantryMacros.carbs, pantryMacros.fat, 1);

  return (
    <AnalyticsLayout rail={<InsightsRail insights={insights} tab="food_pantry" />}>
      {/* Dominant: Pantry Nutrient Availability */}
      <AnalyticsModule title="Pantry Nutrient Availability" icon={Package} className="!p-8" cta={{ label: "Open Pantry", to: "/pantry" }}>
        {pantry.total === 0 ? (
          <p className="text-sm text-muted-foreground font-analytics">No inventory data yet.</p>
        ) : (
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Donut */}
            <div className="shrink-0 flex flex-col items-center">
              <div className="h-32 w-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={macroDistribution} cx="50%" cy="50%" innerRadius={32} outerRadius={50} paddingAngle={3} dataKey="value" stroke="none">
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
              <p className="text-2xl font-analytics font-semibold text-foreground tabular-nums mt-1">{pantryMacros.calories.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground font-analytics font-medium">total cal</p>
            </div>
            {/* Bars */}
            <div className="flex-1 space-y-3.5">
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
        <HeroStatCard icon={Package} label="Total Entries" value={pantry.total} cta={{ label: "Pantry", to: "/pantry" }} />
        <HeroStatCard icon={AlertTriangle} label="Expiring" value={pantry.expiring} cta={{ label: "Review", to: "/pantry" }} />
        <HeroStatCard icon={AlertTriangle} label="Expired" value={pantry.expired} cta={{ label: "Review", to: "/pantry" }} />
        <HeroStatCard icon={Clock} label="No Expiry" value={pantry.noExpiry} cta={{ label: "Fix Dates", to: "/pantry" }} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Expiry Risk List */}
        <AnalyticsModule title="Expiry Risk" icon={AlertTriangle} accentColor="border-l-warning" cta={{ label: "Review Pantry", to: "/pantry" }}>
          {pantry.expiringItems.length === 0 ? (
            <p className="text-sm text-muted-foreground font-analytics">No items expiring within 3 days.</p>
          ) : (
            <div className="space-y-2 font-analytics">
              {pantry.expiringItems.map((name, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm">
                  <span className="h-5 w-5 rounded-full bg-warning/10 flex items-center justify-center text-[10px] font-bold text-warning shrink-0">{i + 1}</span>
                  <span className="text-foreground font-medium">{name}</span>
                </div>
              ))}
            </div>
          )}
        </AnalyticsModule>

        {/* Consumption Velocity */}
        <AnalyticsModule title="Consumption Velocity" icon={Zap} cta={{ label: "Open Consumption", to: "/consumption" }}>
          {consumptionVelocity.length === 0 ? (
            <p className="text-sm text-muted-foreground font-analytics">Not enough consumption data yet.</p>
          ) : (
            <div className="space-y-2.5 font-analytics">
              {consumptionVelocity.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <span className="text-foreground font-medium truncate">{item.name}</span>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="text-muted-foreground tabular-nums font-semibold">{item.count}×</span>
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
        <p className="text-sm text-muted-foreground font-analytics">Coming in Phase 2 — track opened items and spoilage risk.</p>
      </AnalyticsModule>
    </AnalyticsLayout>
  );
};

export default FoodPantryTab;
