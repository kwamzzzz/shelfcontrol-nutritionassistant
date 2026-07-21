import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAISummary } from "@/hooks/useAISummary";
import {
  Brain, ArrowRight, RefreshCw, Trash2, ShoppingCart,
  Apple, Lightbulb, ChevronDown, ChevronUp,
} from "lucide-react";
import { useState } from "react";

const SECTION_ICONS: Record<string, typeof Trash2> = {
  waste: Trash2,
  spending: ShoppingCart,
  nutrition: Apple,
  recommendation: Lightbulb,
};

const SECTION_LABELS: Record<string, string> = {
  waste: "Waste Behavior",
  spending: "Spending",
  nutrition: "Nutrition Gaps",
  recommendation: "Key Recommendation",
};

export const AISummaryCard = () => {
  const { data, isLoading, error, generate } = useAISummary();
  const navigate = useNavigate();
  const [reportOpen, setReportOpen] = useState(false);

  if (!data && !isLoading && !error) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">AI Summary</h3>
            <p className="text-xs text-muted-foreground">Get a personalized analysis of your kitchen</p>
          </div>
        </div>
        <Button onClick={generate} className="w-full rounded-xl gap-2" size="sm">
          <Brain className="h-4 w-4" />
          Generate AI Summary
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center animate-pulse">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-destructive/5 border border-destructive/20 p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-xl bg-destructive/15 flex items-center justify-center">
            <Brain className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">AI Summary</h3>
            <p className="text-xs text-destructive">{error}</p>
          </div>
        </div>
        <Button onClick={generate} variant="outline" className="w-full rounded-xl gap-2" size="sm">
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">AI Summary</h3>
            <p className="text-xs text-muted-foreground">Powered by AI · Updated just now</p>
          </div>
        </div>
        <Button onClick={generate} variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title="Refresh">
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Summary */}
      <p className="text-sm text-foreground leading-relaxed">{data.summary}</p>

      {/* Weekly Report (collapsible) */}
      <button
        onClick={() => setReportOpen(!reportOpen)}
        className="flex items-center gap-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
      >
        {reportOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        Weekly Report
      </button>

      {reportOpen && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(["waste", "spending", "nutrition", "recommendation"] as const).map((key) => {
            const Icon = SECTION_ICONS[key];
            return (
              <div key={key} className="rounded-xl bg-card/80 border border-border p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {SECTION_LABELS[key]}
                  </span>
                </div>
                <p className="text-xs text-foreground leading-relaxed">{data.weeklyReport[key]}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Suggestions */}
      {data.suggestions.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Suggestions</p>
          {data.suggestions.map((s, i) => (
            <Button
              key={i}
              variant="ghost"
              size="sm"
              className="w-full justify-between text-xs font-medium rounded-xl h-8 hover:bg-primary/10"
              onClick={() => navigate(s.actionPath)}
            >
              <span className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-normal">
                  {i + 1}
                </Badge>
                {s.text}
              </span>
              <ArrowRight className="h-3 w-3 shrink-0" />
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};
