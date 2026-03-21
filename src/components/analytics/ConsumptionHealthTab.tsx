import { Utensils, Flame, Beef, Zap, BarChart3, FileText } from "lucide-react";
import { parseISO, isToday, isYesterday, format } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import AnalyticsLayout from "./AnalyticsLayout";
import HeroStatCard from "./HeroStatCard";
import AnalyticsModule from "./AnalyticsModule";
import InsightsRail from "./InsightsRail";
import type { useAnalytics } from "@/hooks/useAnalytics";

type Analytics = ReturnType<typeof useAnalytics>;

const SpeedBadge = ({ speed }: { speed: "fast" | "medium" | "slow" }) => {
  const cls = speed === "fast"
    ? "bg-destructive/10 text-destructive"
    : speed === "medium"
    ? "bg-warning/10 text-warning"
    : "bg-muted text-muted-foreground";
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold font-analytics ${cls}`}>{speed}</span>;
};

const ConsumptionHealthTab = ({ data }: { data: Analytics }) => {
  const { weekConsumption, consumptionVelocity, consumptionTrend, insights, logs } = data;

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
      {/* Calorie Trend Chart */}
      <AnalyticsModule title="Calorie Intake (7 days)" icon={Flame} className="!p-8">
        {consumptionTrend.every((d) => d.value === 0) ? (
          <p className="text-sm text-muted-foreground font-analytics">No consumption data this week.</p>
        ) : (
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={consumptionTrend}>
                <defs>
                  <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(30,80%,56%)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="hsl(30,80%,56%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(220,10%,46%)" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: "hsl(40,20%,100%)", border: "none", borderRadius: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", fontSize: 12, fontFamily: "Outfit" }}
                  formatter={(v: number) => [`${v} cal`, "Calories"]}
                />
                <Area type="monotone" dataKey="value" stroke="hsl(30,80%,56%)" strokeWidth={2} fill="url(#calGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </AnalyticsModule>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <HeroStatCard icon={Utensils} label="Logs This Week" value={weekConsumption.weekLogs} />
        <HeroStatCard icon={Flame} label="Avg Daily Cal" value={weekConsumption.avgCalories > 0 ? weekConsumption.avgCalories.toFixed(0) : "—"} sub="cal/day" />
        <HeroStatCard icon={Beef} label="Avg Daily Protein" value={weekConsumption.avgProtein > 0 ? `${weekConsumption.avgProtein.toFixed(0)}g` : "—"} sub="per day" />
      </div>

      {/* Consumption Timeline — Journal Style */}
      <AnalyticsModule title="Consumption Journal" icon={Utensils} className="!p-8">
        {(!logs || logs.length === 0) ? (
          <p className="text-sm text-muted-foreground font-analytics">No consumption data yet. Log meals from the Consumption page.</p>
        ) : (
          <div className="space-y-6 font-analytics">
            {grouped.map((group) => (
              <div key={group.label}>
                <div className="flex items-center gap-3 mb-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{group.label}</p>
                  <div className="flex-1 h-px bg-border/60" />
                </div>
                <div className="space-y-1">
                  {group.items.map((log) => {
                    const item = log.items;
                    const cal = item ? Number(item.calories_per_unit ?? 0) * Number(log.quantity) : 0;
                    return (
                      <div key={log.id} className="flex items-center justify-between text-sm py-2 px-3 rounded-lg hover:bg-muted/40 transition-colors">
                        <div className="flex items-center gap-2.5 truncate">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                          <span className="font-medium text-foreground">{item?.name ?? "Unknown"}</span>
                          <span className="text-muted-foreground">{Number(log.quantity)} {(log as any).unit || item?.default_unit || "unit"}</span>
                          {log.recipes && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">{log.recipes.name}</span>}
                          {!log.recipe_id && <span className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full font-medium">manual</span>}
                        </div>
                        <div className="shrink-0 text-xs text-muted-foreground ml-2 flex items-center gap-3">
                          {cal > 0 && <span className="tabular-nums font-medium text-foreground/70">{cal.toFixed(0)} cal</span>}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Velocity */}
        <AnalyticsModule title="Consumption Velocity" icon={Zap}>
          {consumptionVelocity.length === 0 ? (
            <p className="text-sm text-muted-foreground font-analytics">Not enough data yet.</p>
          ) : (
            <div className="space-y-2.5 font-analytics">
              {consumptionVelocity.slice(0, 5).map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <span className="text-foreground truncate">{item.name}</span>
                  <div className="flex items-center gap-2.5 shrink-0">
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
          <p className="text-sm text-muted-foreground font-analytics">Coming in Phase 2 — diversity scoring across food categories.</p>
        </AnalyticsModule>
      </div>

      <AnalyticsModule title="Recall Export" icon={FileText}>
        <p className="text-sm text-muted-foreground font-analytics">Coming in Phase 2 — export consumption history for doctor visits or personal review.</p>
      </AnalyticsModule>
    </AnalyticsLayout>
  );
};

export default ConsumptionHealthTab;
