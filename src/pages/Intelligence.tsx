import { useState, useMemo } from "react";
import { useIntelligenceFeed, FeedCategory, FeedSeverity } from "@/hooks/useIntelligenceFeed";
import { useGroupContext } from "@/contexts/GroupContext";
import { useGroups } from "@/hooks/useGroups";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Lightbulb, AlertTriangle, TrendingUp, Salad, Leaf, BarChart3,
  X, Bookmark, Users, Search,
} from "lucide-react";

const CATEGORY_CONFIG: Record<FeedCategory, { label: string; icon: typeof Lightbulb; gradient: string }> = {
  alerts: { label: "Alerts", icon: AlertTriangle, gradient: "from-red-500/80 to-orange-400/60" },
  nutrition: { label: "Nutrition", icon: Salad, gradient: "from-emerald-500/80 to-teal-400/60" },
  spending: { label: "Spending", icon: TrendingUp, gradient: "from-blue-500/80 to-indigo-400/60" },
  patterns: { label: "Patterns", icon: BarChart3, gradient: "from-purple-500/80 to-violet-400/60" },
  seasonality: { label: "Seasonal", icon: Leaf, gradient: "from-amber-500/80 to-lime-400/60" },
};

const SEVERITY_STYLE: Record<FeedSeverity, string> = {
  high: "bg-destructive text-destructive-foreground",
  medium: "bg-accent text-accent-foreground",
  low: "bg-secondary text-secondary-foreground",
};

const SEVERITY_LABEL: Record<FeedSeverity, string> = {
  high: "High",
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
  const [searchQuery, setSearchQuery] = useState("");

  const visibleItems = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return feedItems
      .filter((item) => !dismissed.has(item.id))
      .filter((item) => activeCategory === "all" || item.category === activeCategory)
      .filter((item) => !q || item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q));
  }, [feedItems, dismissed, activeCategory, searchQuery]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    for (const item of feedItems) {
      if (dismissed.has(item.id)) continue;
      counts.all = (counts.all ?? 0) + 1;
      counts[item.category] = (counts[item.category] ?? 0) + 1;
    }
    return counts;
  }, [feedItems, dismissed]);

  const categories: (FeedCategory | "all")[] = ["all", "alerts", "nutrition", "spending", "patterns", "seasonality"];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
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
            Personalized insights for your kitchen
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search insights..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 rounded-xl bg-secondary/50 border-0 focus-visible:ring-1"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="mt-6 flex flex-wrap gap-2 sticky top-0 z-10 bg-background/80 backdrop-blur-sm py-2 -mx-1 px-1">
        {categories.map((cat) => {
          const count = categoryCounts[cat] ?? 0;
          const isActive = activeCategory === cat;
          const config = cat !== "all" ? CATEGORY_CONFIG[cat] : null;
          const Icon = config?.icon ?? Lightbulb;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all ${
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

      {/* Card Grid */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {visibleItems.length === 0 ? (
          <div className="col-span-full rounded-2xl bg-card p-12 text-center shadow-[0_2px_16px_-4px_hsl(var(--foreground)/0.06)]">
            <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground/40" />
            <p className="mt-4 font-semibold text-foreground text-lg">All clear</p>
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
                className="group rounded-2xl bg-card shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-200 overflow-hidden min-h-[260px] flex flex-col"
              >
                {/* Gradient image area */}
                <div className={`relative h-32 bg-gradient-to-br ${catConfig.gradient} flex items-center justify-center shrink-0`}>
                  <CatIcon className="h-14 w-14 text-white/30" strokeWidth={1.5} />
                  {/* Severity badge */}
                  <span className={`absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full ${SEVERITY_STYLE[item.severity]}`}>
                    {SEVERITY_LABEL[item.severity]}
                  </span>
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col flex-1">
                  {/* Category label */}
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                    {catConfig.label}
                  </p>

                  {/* Title */}
                  <h3 className="text-lg font-semibold text-foreground leading-snug line-clamp-2">
                    {item.title}
                  </h3>

                  {/* Source + time */}
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    {item.source} · Just now
                  </p>

                  {/* Description */}
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-3">
                    {item.description}
                  </p>

                  {/* Tags — push to bottom */}
                  <div className="flex-1" />
                  <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                    {item.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="mt-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Save">
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
