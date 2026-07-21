import { useIntelligenceFeed } from "@/hooks/useIntelligenceFeed";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, ArrowRight, AlertTriangle, Salad, TrendingUp, BarChart3, Leaf } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { FeedCategory } from "@/hooks/useIntelligenceFeed";
import { cn } from "@/lib/utils";

const CATEGORY_META: Record<FeedCategory, { icon: typeof Lightbulb; gradient: string }> = {
  alerts: { icon: AlertTriangle, gradient: "from-red-500/80 to-orange-400/60" },
  nutrition: { icon: Salad, gradient: "from-emerald-500/80 to-teal-400/60" },
  spending: { icon: TrendingUp, gradient: "from-blue-500/80 to-emerald-400/60" },
  patterns: { icon: BarChart3, gradient: "from-emerald-500/80 to-green-400/60" },
  seasonality: { icon: Leaf, gradient: "from-amber-500/80 to-lime-400/60" },
};

const IntelligenceWidget = () => {
  const { feedItems } = useIntelligenceFeed();
  const navigate = useNavigate();
  const topItems = feedItems.slice(0, 3);

  if (topItems.length === 0) return null;

  return (
    <div className="glass-card glass-card-hover p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-[#FFE53B]" />
          <span className="label-small">Intelligence</span>
        </div>
        <button
          className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          onClick={() => navigate("/intelligence")}
        >
          View all <ArrowRight className="h-3 w-3" />
        </button>
      </div>
      <div className="flex flex-col">
        {topItems.map((item, idx) => {
          const meta = CATEGORY_META[item.category];
          const Icon = meta.icon;
          return (
            <div
              key={item.id}
              className={cn(
                "flex items-start gap-3 cursor-pointer hover:bg-white/[0.04] rounded-xl p-3 -mx-3 transition-colors",
                idx < topItems.length - 1 && "separator-dotted"
              )}
              onClick={() => navigate("/intelligence")}
            >
              <div className={`mt-0.5 w-8 h-8 rounded-lg bg-gradient-to-br ${meta.gradient} flex items-center justify-center shrink-0`}>
                <Icon className="h-3.5 w-3.5 text-white/90" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                <p className="text-xs text-muted-foreground truncate">{item.description}</p>
              </div>
              <span className={cn(
                "inline-block px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase shrink-0",
                item.severity === "high"
                  ? "bg-[hsla(22,100%,55%,0.15)] text-[#FF5A25]"
                  : item.severity === "medium"
                  ? "bg-[hsla(142,70%,45%,0.15)] text-[#10B981]"
                  : "bg-[hsla(142,72%,40%,0.15)] text-[#34D399]"
              )}>
                {item.severity}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default IntelligenceWidget;
