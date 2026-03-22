import { useState, useMemo } from "react";
import { useIntelligenceFeed, FeedCategory, FeedSeverity } from "@/hooks/useIntelligenceFeed";
import { useGroupContext } from "@/contexts/GroupContext";
import { useGroups } from "@/hooks/useGroups";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Lightbulb, AlertTriangle, TrendingUp, Salad, Leaf, BarChart3,
  X, Bookmark, Users, Filter,
} from "lucide-react";

const CATEGORY_CONFIG: Record<FeedCategory, { label: string; icon: typeof Lightbulb; color: string }> = {
  alerts: { label: "Alerts", icon: AlertTriangle, color: "text-destructive" },
  nutrition: { label: "Nutrition", icon: Salad, color: "text-primary" },
  spending: { label: "Spending", icon: TrendingUp, color: "text-accent" },
  patterns: { label: "Patterns", icon: BarChart3, color: "text-muted-foreground" },
  seasonality: { label: "Seasonal", icon: Leaf, color: "text-primary" },
};

const SEVERITY_STYLE: Record<FeedSeverity, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-primary/10 text-primary border-primary/20",
};

const SEVERITY_LABEL: Record<FeedSeverity, string> = {
  high: "High Priority",
  medium: "Medium",
  low: "Info",
};

const Intelligence = () => {
  const { feedItems } = useIntelligenceFeed();
  const { activeGroupId, isPersonalMode } = useGroupContext();
  const { groups } = useGroups();
  const activeGroup = groups.find((g) => g.id === activeGroupId);

  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<FeedCategory | "all">("all");

  const visibleItems = useMemo(() => {
    return feedItems
      .filter((item) => !dismissed.has(item.id))
      .filter((item) => activeCategory === "all" || item.category === activeCategory);
  }, [feedItems, dismissed, activeCategory]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    for (const item of feedItems) {
      if (dismissed.has(item.id)) continue;
      counts.all = (counts.all ?? 0) + 1;
      counts[item.category] = (counts[item.category] ?? 0) + 1;
    }
    return counts;
  }, [feedItems, dismissed]);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-display font-bold text-foreground">Pantry Intelligence</h1>
            {!isPersonalMode && (
              <Badge variant="secondary" className="gap-1">
                <Users className="h-3 w-3" />
                {activeGroup?.name ?? "Group"}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-muted-foreground">
            Smart insights based on your pantry, purchases, and consumption patterns.
          </p>
        </div>
        <Lightbulb className="h-8 w-8 text-accent shrink-0 mt-1" />
      </div>

      {/* Category tabs */}
      <div className="mt-6 flex flex-wrap gap-2">
        {(["all", ...Object.keys(CATEGORY_CONFIG)] as (FeedCategory | "all")[]).map((cat) => {
          const count = categoryCounts[cat] ?? 0;
          const isActive = activeCategory === cat;
          const config = cat !== "all" ? CATEGORY_CONFIG[cat] : null;
          const Icon = config?.icon ?? Filter;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
                isActive
                  ? "bg-foreground text-background shadow-sm"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {cat === "all" ? "All" : config!.label}
              {count > 0 && (
                <span className={`text-xs tabular-nums ${isActive ? "opacity-80" : "opacity-60"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Feed */}
      <div className="mt-6 space-y-3">
        {visibleItems.length === 0 ? (
          <div className="rounded-2xl bg-card p-8 text-center shadow-[0_2px_16px_-4px_hsl(var(--foreground)/0.06)]">
            <Lightbulb className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="mt-3 font-semibold text-foreground">All clear</p>
            <p className="mt-1 text-sm text-muted-foreground">
              No insights right now. Keep tracking your food and we'll surface what matters.
            </p>
          </div>
        ) : (
          visibleItems.map((item) => {
            const catConfig = CATEGORY_CONFIG[item.category];
            const CatIcon = catConfig.icon;
            return (
              <div
                key={item.id}
                className="group rounded-2xl bg-card p-5 shadow-[0_2px_16px_-4px_hsl(var(--foreground)/0.06)] hover:shadow-[0_4px_24px_-4px_hsl(var(--foreground)/0.1)] transition-shadow"
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`mt-0.5 rounded-xl p-2 ${item.severity === "high" ? "bg-destructive/10" : item.severity === "medium" ? "bg-warning/10" : "bg-primary/10"}`}>
                    <CatIcon className={`h-4.5 w-4.5 ${catConfig.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground">{item.title}</h3>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 h-4 border ${SEVERITY_STYLE[item.severity]}`}
                      >
                        {SEVERITY_LABEL[item.severity]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                    <p className="mt-1.5 text-xs text-muted-foreground/70 italic">
                      {item.reason}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      {item.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      title="Save"
                    >
                      <Bookmark className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      title="Dismiss"
                      onClick={() => setDismissed((prev) => new Set(prev).add(item.id))}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Intelligence;
