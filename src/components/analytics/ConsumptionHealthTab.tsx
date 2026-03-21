import { Utensils, Flame, Beef, Zap, BarChart3, FileText } from "lucide-react";
import { parseISO, isToday, isYesterday, format } from "date-fns";
import AnalyticsLayout from "./AnalyticsLayout";
import HeroStatCard from "./HeroStatCard";
import AnalyticsModule from "./AnalyticsModule";
import InsightsRail from "./InsightsRail";
import type { useAnalytics } from "@/hooks/useAnalytics";

type Analytics = ReturnType<typeof useAnalytics>;

const SpeedBadge = ({ speed }: { speed: "fast" | "medium" | "slow" }) => {
  const cls = speed === "fast" ? "bg-destructive/10 text-destructive" : speed === "medium" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground";
  return <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${cls}`}>{speed}</span>;
};

const ConsumptionHealthTab = ({ data }: { data: Analytics }) => {
  const { weekConsumption, consumptionVelocity, insights, logs } = data;

  // Group logs by day
  const grouped = (() => {
    if (!logs) return [];
    const groups: { label: string; items: typeof logs }[] = [];
    const todayLogs = logs.filter((l) => isToday(parseISO(l.consumed_at)));
    const yesterdayLogs = logs.filter((l) => isYesterday(parseISO(l.consumed_at)));
    const earlierLogs = logs.filter((l) => !isToday(parseISO(l.consumed_at)) && !isYesterday(parseISO(l.consumed_at)));
    if (todayLogs.length > 0) groups.push({ label: "Today", items: todayLogs });
    if (yesterdayLogs.length > 0) groups.push({ label: "Yesterday", items: yesterdayLogs });
    if (earlierLogs.length > 0) groups.push({ label: "Earlier", items: earlierLogs.slice(0, 15) });
    return groups;
  })();

  return (
    <AnalyticsLayout rail={<InsightsRail insights={insights} tab="consumption" />}>
      {/* Dominant: Consumption Timeline */}
      <AnalyticsModule title="Consumption Timeline" icon={Utensils} className="!p-8">
        {(!logs || logs.length === 0) ? (
          <p className="text-sm text-muted-foreground">No consumption data yet. Log meals from the Consumption page.</p>
        ) : (
          <div className="space-y-5">
            {grouped.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{group.label}</p>
                <div className="space-y-2">
                  {group.items.map((log) => {
                    const item = log.items;
                    const cal = item ? Number(item.calories_per_unit ?? 0) * Number(log.quantity) : 0;
                    return (
                      <div key={log.id} className="flex items-center justify-between text-sm py-1 border-b border-border/30 last:border-0">
                        <div className="truncate">
                          <span className="font-medium text-foreground">{item?.name ?? "Unknown"}</span>
                          <span className="text-muted-foreground ml-1.5">{Number(log.quantity)} {(log as any).unit || item?.default_unit || "unit"}</span>
                          {log.recipes && <span className="ml-1.5 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">{log.recipes.name}</span>}
                          {!log.recipe_id && <span className="ml-1.5 text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">manual</span>}
                        </div>
                        <div className="shrink-0 text-xs text-muted-foreground ml-2 flex items-center gap-2">
                          {cal > 0 && <span className="tabular-nums">{cal.toFixed(0)} cal</span>}
                          <span>{format(parseISO(log.consumed_at), "h:mm a")}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </AnalyticsModule>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <HeroStatCard icon={Utensils} label="Logs This Week" value={weekConsumption.weekLogs} />
        <HeroStatCard icon={Flame} label="Avg Daily Cal" value={weekConsumption.avgCalories > 0 ? weekConsumption.avgCalories.toFixed(0) : "—"} sub="cal/day" />
        <HeroStatCard icon={Beef} label="Avg Daily Protein" value={weekConsumption.avgProtein > 0 ? `${weekConsumption.avgProtein.toFixed(0)}g` : "—"} sub="per day" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Velocity */}
        <AnalyticsModule title="Consumption Velocity" icon={Zap}>
          {consumptionVelocity.length === 0 ? (
            <p className="text-sm text-muted-foreground">Not enough data yet.</p>
          ) : (
            <div className="space-y-1.5">
              {consumptionVelocity.slice(0, 5).map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <span className="text-foreground truncate">{item.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-muted-foreground tabular-nums">{item.count}×/mo</span>
                    <SpeedBadge speed={item.speed} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </AnalyticsModule>

        {/* Phase 2 placeholders */}
        <AnalyticsModule title="Nutrient Diversity" icon={BarChart3}>
          <p className="text-sm text-muted-foreground">Coming in Phase 2 — diversity scoring across food categories.</p>
        </AnalyticsModule>
      </div>

      <AnalyticsModule title="Recall Export" icon={FileText}>
        <p className="text-sm text-muted-foreground">Coming in Phase 2 — export consumption history for doctor visits or personal review.</p>
      </AnalyticsModule>
    </AnalyticsLayout>
  );
};

export default ConsumptionHealthTab;
