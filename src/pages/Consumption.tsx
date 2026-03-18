import { useState, useMemo } from "react";
import { useConsumptionLogs, useDeleteConsumptionLog, type ConsumptionLog } from "@/hooks/useConsumption";
import AddConsumptionDialog from "@/components/consumption/AddConsumptionDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Utensils, Trash2, Flame, Beef, Wheat, Droplets } from "lucide-react";
import { format, parseISO, isToday } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const NutritionCard = ({ icon: Icon, label, value, unit }: { icon: any; label: string; value: number; unit: string }) => (
  <div className="rounded-xl border bg-card p-4 shadow-sm">
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="h-4 w-4" />
      <p className="text-xs font-medium">{label}</p>
    </div>
    <p className="mt-1 text-2xl font-display font-bold text-foreground tabular-nums">
      {value > 0 ? value.toFixed(0) : "—"}
      {value > 0 && <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>}
    </p>
  </div>
);

const ConsumptionRow = ({ log, onDelete }: { log: ConsumptionLog; onDelete: () => void }) => (
  <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <p className="font-medium text-foreground text-sm truncate">{log.items?.name ?? "Unknown"}</p>
        {log.recipes && (
          <Badge variant="secondary" className="text-xs font-normal shrink-0">
            {log.recipes.name}
          </Badge>
        )}
      </div>
      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
        <span>{log.quantity} {log.items?.default_unit ?? "unit"}</span>
        <span>·</span>
        <span>{format(parseISO(log.consumed_at), "MMM d, h:mm a")}</span>
        {log.items?.calories_per_unit != null && Number(log.items.calories_per_unit) > 0 && (
          <>
            <span>·</span>
            <span>{(Number(log.items.calories_per_unit) * Number(log.quantity)).toFixed(0)} cal</span>
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
  const todayTotals = useMemo(() => {
    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    if (!logs) return totals;

    for (const log of logs) {
      if (!isToday(parseISO(log.consumed_at))) continue;
      const qty = Number(log.quantity);
      const item = log.items;
      if (!item) continue;
      totals.calories += qty * Number(item.calories_per_unit ?? 0);
      totals.protein += qty * Number(item.protein_g ?? 0);
      totals.carbs += qty * Number(item.carbs_g ?? 0);
      totals.fat += qty * Number(item.fat_g ?? 0);
    }
    return totals;
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
        <NutritionCard icon={Flame} label="Calories" value={todayTotals.calories} unit="cal" />
        <NutritionCard icon={Beef} label="Protein" value={todayTotals.protein} unit="g" />
        <NutritionCard icon={Wheat} label="Carbs" value={todayTotals.carbs} unit="g" />
        <NutritionCard icon={Droplets} label="Fat" value={todayTotals.fat} unit="g" />
      </div>

      {/* Log list */}
      <div className="mt-6 space-y-2">
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
          logs.map((log) => (
            <ConsumptionRow key={log.id} log={log} onDelete={() => handleDelete(log.id)} />
          ))
        )}
      </div>
    </div>
  );
};

export default Consumption;
