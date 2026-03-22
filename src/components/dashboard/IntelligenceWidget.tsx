import { useIntelligenceFeed } from "@/hooks/useIntelligenceFeed";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lightbulb, ArrowRight, AlertTriangle, Salad, TrendingUp, BarChart3, Leaf } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { FeedCategory } from "@/hooks/useIntelligenceFeed";

const CATEGORY_META: Record<FeedCategory, { icon: typeof Lightbulb; gradient: string }> = {
  alerts: { icon: AlertTriangle, gradient: "from-red-500/80 to-orange-400/60" },
  nutrition: { icon: Salad, gradient: "from-emerald-500/80 to-teal-400/60" },
  spending: { icon: TrendingUp, gradient: "from-blue-500/80 to-indigo-400/60" },
  patterns: { icon: BarChart3, gradient: "from-purple-500/80 to-violet-400/60" },
  seasonality: { icon: Leaf, gradient: "from-amber-500/80 to-lime-400/60" },
};

const IntelligenceWidget = () => {
  const { feedItems } = useIntelligenceFeed();
  const navigate = useNavigate();
  const topItems = feedItems.slice(0, 3);

  if (topItems.length === 0) return null;

  return (
    <div className="rounded-2xl bg-card p-5 shadow-[0_2px_16px_-4px_hsl(var(--foreground)/0.06)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-accent" />
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Intelligence
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-foreground gap-1 h-7 px-2"
          onClick={() => navigate("/intelligence")}
        >
          View all <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
      <div className="space-y-2.5">
        {topItems.map((item) => {
          const meta = CATEGORY_META[item.category];
          const Icon = meta.icon;
          return (
            <div
              key={item.id}
              className="flex items-start gap-2.5 cursor-pointer hover:bg-secondary/50 rounded-lg p-2 -mx-2 transition-colors"
              onClick={() => navigate("/intelligence")}
            >
              {/* Gradient strip */}
              <div className={`mt-0.5 w-8 h-8 rounded-lg bg-gradient-to-br ${meta.gradient} flex items-center justify-center shrink-0`}>
                <Icon className="h-3.5 w-3.5 text-white/90" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                <p className="text-xs text-muted-foreground truncate">{item.description}</p>
              </div>
              <Badge
                variant="outline"
                className={`text-[9px] px-1 py-0 h-3.5 shrink-0 border ${
                  item.severity === "high"
                    ? "bg-destructive/10 text-destructive border-destructive/20"
                    : item.severity === "medium"
                    ? "bg-accent/10 text-accent border-accent/20"
                    : "bg-primary/10 text-primary border-primary/20"
                }`}
              >
                {item.severity === "high" ? "!" : item.severity === "medium" ? "~" : "i"}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default IntelligenceWidget;
