import { useMemo } from "react";
import { useConsumptionLogs, useDeleteConsumptionLog, type ConsumptionLog } from "@/hooks/useConsumption";
import AddConsumptionDialog from "@/components/consumption/AddConsumptionDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Utensils, Trash2, Flame, Beef, Wheat, Droplets, Info } from "lucide-react";
import { format, parseISO, isToday } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const NutritionCard = ({ icon: Icon, label, value, unit }: { icon: any; label: string; value: number; unit: string }) => (
  <div className="rounded-xl border bg-card p-4 shadow-sm">
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="h-4 w-4" />
      <p className="text-xs font-medium">{label}</p>
    </div>
    <p className="mt-1 text-xl font-display font-bold text-foreground tabular-nums">
      {value > 0 ? value.toFixed(0) : "—"}
      {value > 0 && <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>}
    </p>
  </div>
);

const ConsumptionRow = ({ log, onDelete }: { log: ConsumptionLog; onDelete: () => void }) => {
  const cal = Number(log.items?.calories_per_unit ?? 0) * Number(log.quantity);
  const hasNutrition = Number(log.items?.calories_per_unit ?? 0) > 0 || Number(log.items?.protein_g ?? 0) > 0;

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-foreground text-sm truncate">{log.items?.name ?? "Unknown"}</p>
          {log.recipes ? (
            <Badge variant="secondary" className="text-xs font-normal shrink-0">
              🍳 {log.recipes.name}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs font-normal shrink-0">
              Manual
            </Badge>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          <span className="font-medium">{log.quantity} {log.items?.default_unit ?? "unit"}</span>
          <span>·</span>
          <span>{format(parseISO(log.consumed_at), "MMM d, h:mm a")}</span>
          {hasNutrition && cal > 0 && (
            <>
              <span>·</span>
              <span className="text-foreground font-medium">{cal.toFixed(0)} cal</span>
            </>
          )}
          {!hasNutrition && (
            <>
              <span>·</span>
              <span className="italic">no nutrition data</span>
            </>
          )}
        </div>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this log?</AlertDialogTitle>
            <AlertDialogDescription>This will delete the consumption record. Inventory will not be restored.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const Consumption = () => {
  const { data: logs, isLoading } = useConsumptionLogs();
  const deleteLog = useDeleteConsumptionLog();
  const { toast } = useToast();

  const handleDelete = async (id: string) => {
    try {
      await deleteLog.mutateAsync(id);
      toast({ title: "Deleted", description: "Consumption log removed." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Today's nutrition totals
  const { todayTotals, missingCount, todayCount } = useMemo(() => {
    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    let missing = 0;
    let count = 0;
    if (!logs) return { todayTotals: totals, missingCount: 0, todayCount: 0 };

    for (const log of logs) {
      if (!isToday(parseISO(log.consumed_at))) continue;
      count++;
      const qty = Number(log.quantity);
      const item = log.items;
      if (!item) continue;
      const cal = Number(item.calories_per_unit ?? 0);
      if (cal === 0 && Number(item.protein_g ?? 0) === 0) missing++;
      totals.calories += qty * cal;
      totals.protein += qty * Number(item.protein_g ?? 0);
      totals.carbs += qty * Number(item.carbs_g ?? 0);
      totals.fat += qty * Number(item.fat_g ?? 0);
    }
    return { todayTotals: totals, missingCount: missing, todayCount: count };
  }, [logs]);

  // Group logs: today vs earlier
  const { todayLogs, earlierLogs } = useMemo(() => {
    const today: ConsumptionLog[] = [];
    const earlier: ConsumptionLog[] = [];
    logs?.forEach((log) => {
      (isToday(parseISO(log.consumed_at)) ? today : earlier).push(log);
    });
    return { todayLogs: today, earlierLogs: earlier };
  }, [logs]);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Consumption</h1>
          <p className="mt-1 text-muted-foreground">
            {logs?.length ?? 0} log{(logs?.length ?? 0) !== 1 ? "s" : ""} recorded
          </p>
        </div>
        <AddConsumptionDialog />
      </div>

      {/* Today's nutrition summary */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <NutritionCard icon={Flame} label="Calories Today" value={todayTotals.calories} unit="cal" />
        <NutritionCard icon={Beef} label="Protein" value={todayTotals.protein} unit="g" />
        <NutritionCard icon={Wheat} label="Carbs" value={todayTotals.carbs} unit="g" />
        <NutritionCard icon={Droplets} label="Fat" value={todayTotals.fat} unit="g" />
      </div>

      {/* Nutrition warning */}
      {missingCount > 0 && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-accent bg-accent/10 p-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent-foreground" />
          <span>
            {missingCount} of {todayCount} item(s) consumed today have no nutrition data.
            Add calories and macros in the Pantry catalog for accurate tracking.
          </span>
        </div>
      )}

      {/* Log list grouped */}
      <div className="mt-6 space-y-4">
        {isLoading ? (
          <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">Loading...</div>
        ) : !logs?.length ? (
          <div className="rounded-xl border bg-card p-8 text-center">
            <Utensils className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-muted-foreground">
              No consumption logged yet. Log manually or cook a recipe to get started.
            </p>
          </div>
        ) : (
          <>
            {/* Today section */}
            {todayLogs.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Today</p>
                <div className="space-y-2">
                  {todayLogs.map((log) => (
                    <ConsumptionRow key={log.id} log={log} onDelete={() => handleDelete(log.id)} />
                  ))}
                </div>
              </div>
            )}

            {/* Earlier section */}
            {earlierLogs.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Earlier</p>
                <div className="space-y-2">
                  {earlierLogs.map((log) => (
                    <ConsumptionRow key={log.id} log={log} onDelete={() => handleDelete(log.id)} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Consumption;
