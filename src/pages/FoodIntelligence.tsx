import { useState, useMemo } from "react";
import { useFoodNews, FoodNewsCategory, FOOD_NEWS_CATEGORY_CONFIG } from "@/hooks/useFoodNews";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search, Apple, HeartPulse, TrendingUp, FlaskConical, Newspaper,
  ExternalLink,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const CATEGORY_ICON: Record<FoodNewsCategory, typeof Apple> = {
  nutrition: Apple,
  health: HeartPulse,
  trends: TrendingUp,
  science: FlaskConical,
};

const CATEGORY_BADGE_STYLE: Record<FoodNewsCategory, string> = {
  nutrition: "bg-emerald-500/90 text-white",
  health: "bg-rose-500/90 text-white",
  trends: "bg-blue-500/90 text-white",
  science: "bg-purple-500/90 text-white",
};

type FilterCategory = FoodNewsCategory | "all";

const FoodIntelligence = () => {
  const { articles } = useFoodNews();
  const [activeCategory, setActiveCategory] = useState<FilterCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(8);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return articles
      .filter((a) => activeCategory === "all" || a.category === activeCategory)
      .filter((a) => !q || a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q));
  }, [articles, activeCategory, searchQuery]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const categories: FilterCategory[] = ["all", "nutrition", "health", "trends", "science"];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-display font-bold text-foreground">Food Intelligence</h1>
          </div>
          <p className="mt-1 text-muted-foreground">
            Relevant insights from the world of food and health · {articles.length} articles
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 rounded-xl bg-secondary/50 border-0 focus-visible:ring-1"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="mt-6 flex flex-wrap gap-2 sticky top-0 z-10 bg-background/80 backdrop-blur-sm py-2 -mx-1 px-1">
        {categories.map((cat) => {
          const isActive = activeCategory === cat;
          const config = cat !== "all" ? FOOD_NEWS_CATEGORY_CONFIG[cat] : null;
          const Icon = cat !== "all" ? CATEGORY_ICON[cat] : Newspaper;
          return (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat); setVisibleCount(8); }}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                isActive
                  ? "bg-foreground text-background shadow-sm"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {cat === "all" ? "All" : config!.label}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {visible.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-card p-12 text-center shadow-[0_2px_16px_-4px_hsl(var(--foreground)/0.06)]">
          <Newspaper className="h-12 w-12 mx-auto text-muted-foreground/40" />
          <p className="mt-4 font-semibold text-foreground text-lg">No articles found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a different search or category filter.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {visible.map((article) => {
              const config = FOOD_NEWS_CATEGORY_CONFIG[article.category];
              const CatIcon = CATEGORY_ICON[article.category];
              return (
                <div
                  key={article.id}
                  className="group rounded-2xl bg-card shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-200 overflow-hidden min-h-[260px] flex flex-col cursor-pointer"
                >
                  {/* Image area */}
                  <div className={`relative h-32 bg-gradient-to-br ${config.gradient} flex items-center justify-center shrink-0`}>
                    <CatIcon className="h-14 w-14 text-white/30" strokeWidth={1.5} />
                    <span className={`absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full ${CATEGORY_BADGE_STYLE[article.category]}`}>
                      {config.label}
                    </span>
                    <span className="absolute top-3 left-3 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/30 text-white">
                      ↑ {article.relevanceScore}
                    </span>
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                      {config.label}
                    </p>
                    <h3 className="text-lg font-semibold text-foreground leading-snug line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground/70">
                      {article.source} · {formatDistanceToNow(article.publishedAt, { addSuffix: true })}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-3">
                      {article.summary}
                    </p>

                    <div className="flex-1" />

                    <div className="mt-3 flex items-center justify-between">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                        {article.source}
                      </Badge>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {hasMore && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => setVisibleCount((c) => c + 8)}
                className="rounded-full px-6 py-2.5 text-sm font-medium bg-secondary text-muted-foreground hover:bg-secondary/80 transition-colors"
              >
                Load more articles
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FoodIntelligence;
