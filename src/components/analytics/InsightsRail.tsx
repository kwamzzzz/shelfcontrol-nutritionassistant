import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { Insight, InsightSeverity } from "@/hooks/useAnalytics";

interface Props {
  insights: Insight[];
  tab: string;
}

const BUCKETS: { severity: InsightSeverity; label: string; dotClass: string; borderClass: string; bgClass: string }[] = [
  { severity: "act_now", label: "Act Now", dotClass: "bg-destructive", borderClass: "border-l-destructive", bgClass: "bg-destructive/5" },
  { severity: "watch", label: "Watch", dotClass: "bg-warning", borderClass: "border-l-warning", bgClass: "bg-warning/5" },
  { severity: "good_news", label: "Good News", dotClass: "bg-success", borderClass: "border-l-success", bgClass: "bg-success/5" },
];

/* Map insight titles to actionable CTAs */
const CTA_MAP: Record<string, { label: string; to: string }> = {
  "Expired items": { label: "Review Pantry", to: "/pantry" },
  "Expiring soon": { label: "Review Pantry", to: "/pantry" },
  "No expiry set": { label: "Fix Pantry Dates", to: "/pantry" },
  "Missing nutrition data": { label: "Update Item Data", to: "/pantry" },
  "Low protein supply": { label: "Open Shopping List", to: "/shopping-list" },
  "Tracking today": { label: "Open Consumption", to: "/consumption" },
  "Spending on track": { label: "View Purchases", to: "/purchases" },
  "Best protein value": { label: "View Purchases", to: "/purchases" },
};

const InsightsRail = ({ insights, tab }: Props) => {
  const navigate = useNavigate();
  const filtered = insights.filter((i) => i.tabs.includes(tab));
  if (filtered.length === 0) return null;

  return (
    <div className="rounded-2xl bg-card shadow-[0_1px_8px_-2px_hsl(var(--foreground)/0.05)] p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground font-analytics mb-5">What You Should Know</p>
      <div className="space-y-5">
        {BUCKETS.map((bucket) => {
          const items = filtered.filter((i) => i.severity === bucket.severity);
          if (items.length === 0) return null;
          return (
            <div key={bucket.severity}>
              <div className="flex items-center gap-2.5 mb-3">
                <span className={`h-2.5 w-2.5 rounded-full ${bucket.dotClass} ring-2 ring-offset-2 ring-offset-card ${bucket.dotClass}/30`} />
                <p className="text-xs font-bold text-foreground font-analytics tracking-wide">{bucket.label}</p>
              </div>
              <div className="space-y-2">
                {items.map((item, i) => {
                  const cta = CTA_MAP[item.title];
                  return (
                    <div key={i} className={`border-l-2 ${bucket.borderClass} ${bucket.bgClass} rounded-r-lg pl-3.5 pr-3 py-2.5`}>
                      <p className="text-sm font-semibold text-foreground font-analytics leading-snug">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.body}</p>
                      {cta && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-0 mt-1.5 text-[11px] font-semibold font-analytics text-primary hover:text-primary hover:bg-transparent hover:underline"
                          onClick={() => navigate(cta.to)}
                        >
                          {cta.label} →
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InsightsRail;
