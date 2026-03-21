import type { Insight, InsightSeverity } from "@/hooks/useAnalytics";

interface Props {
  insights: Insight[];
  tab: string;
}

const BUCKETS: { severity: InsightSeverity; label: string; dotClass: string; borderClass: string }[] = [
  { severity: "act_now", label: "Act Now", dotClass: "bg-destructive", borderClass: "border-l-destructive" },
  { severity: "watch", label: "Watch", dotClass: "bg-warning", borderClass: "border-l-warning" },
  { severity: "good_news", label: "Good News", dotClass: "bg-success", borderClass: "border-l-success" },
];

const InsightsRail = ({ insights, tab }: Props) => {
  const filtered = insights.filter((i) => i.tabs.includes(tab));
  if (filtered.length === 0) return null;

  return (
    <div className="rounded-2xl bg-card shadow-sm p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-4">What You Should Know</p>
      <div className="space-y-5">
        {BUCKETS.map((bucket) => {
          const items = filtered.filter((i) => i.severity === bucket.severity);
          if (items.length === 0) return null;
          return (
            <div key={bucket.severity}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`h-2 w-2 rounded-full ${bucket.dotClass}`} />
                <p className="text-xs font-semibold text-foreground">{bucket.label}</p>
              </div>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className={`border-l-2 ${bucket.borderClass} pl-3 py-1`}>
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InsightsRail;
