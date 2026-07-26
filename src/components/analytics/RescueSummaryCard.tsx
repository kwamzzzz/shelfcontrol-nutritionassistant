import { useConsumptionLogs } from "@/hooks/useConsumption";
import { useWasteLogs } from "@/hooks/useWasteLogs";
import { Utensils, Trash2 } from "lucide-react";

/**
 * Eaten vs thrown out — a compact, honest split of what left the pantry.
 * Counts logged events (each is one decision), so mixed units never skew it.
 * Reads the same group-scoped hooks as the rest of Analytics.
 */
const RescueSummaryCard = () => {
  const { data: logs = [], isLoading: loadingLogs } = useConsumptionLogs();
  const { data: waste = [], isLoading: loadingWaste } = useWasteLogs();

  const eaten = logs.length;
  const thrownOut = waste.length;
  const total = eaten + thrownOut;
  const eatenPct = total > 0 ? Math.round((eaten / total) * 100) : null;

  if (loadingLogs || loadingWaste) {
    return <div className="surface-panel h-[104px] animate-pulse rounded-2xl" />;
  }

  return (
    <div className="surface-panel rounded-2xl p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-analytics text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Eaten vs thrown out
        </p>
        {eatenPct !== null && (
          <p className="font-[Outfit,sans-serif] text-lg font-semibold tabular-nums text-success">
            {eatenPct}% eaten
          </p>
        )}
      </div>

      {total === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Nothing has left your pantry yet. Mark items Consumed or Disposed and this fills in.
        </p>
      ) : (
        <>
          <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-muted">
            <div className="bg-success" style={{ width: `${(eaten / total) * 100}%` }} />
            <div className="bg-destructive" style={{ width: `${(thrownOut / total) * 100}%` }} />
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Utensils className="h-3.5 w-3.5 text-success" />
              <span className="tabular-nums">{eaten}</span> eaten
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="tabular-nums">{thrownOut}</span> thrown out
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default RescueSummaryCard;
