import { useMemo, useState } from "react";
import { useWeighIns, useAddWeighIn, useDeleteWeighIn } from "@/hooks/useWeighIns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const WeighInTracker = () => {
  const { data: weighIns, isLoading } = useWeighIns();
  const addWeighIn = useAddWeighIn();
  const deleteWeighIn = useDeleteWeighIn();
  const { toast } = useToast();
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");

  const trend = useMemo(() => {
    if (!weighIns || weighIns.length < 2) return null;
    const latest = Number(weighIns[0].weight_kg);
    const previous = Number(weighIns[1].weight_kg);
    return { delta: latest - previous, latest };
  }, [weighIns]);

  const handleAdd = async () => {
    const value = Number(weight);
    if (!Number.isFinite(value) || value <= 0) {
      toast({ title: "Invalid weight", description: "Enter a positive number in kg.", variant: "destructive" });
      return;
    }
    try {
      await addWeighIn.mutateAsync({ weight_kg: value, note: note.trim() || null });
      setWeight("");
      setNote("");
      toast({ title: "Logged", description: `${value} kg recorded.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteWeighIn.mutateAsync(id);
      toast({ title: "Removed" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          type="number"
          inputMode="decimal"
          step="0.1"
          min="0"
          placeholder="Weight (kg)"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="rounded-xl sm:max-w-[180px]"
        />
        <Input
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="rounded-xl flex-1"
        />
        <Button onClick={handleAdd} disabled={addWeighIn.isPending} className="rounded-xl">
          {addWeighIn.isPending ? "Saving..." : "Add"}
        </Button>
      </div>

      {trend && (
        <div className="rounded-xl bg-muted/40 px-4 py-3 flex items-center gap-3">
          {trend.delta < 0 ? (
            <TrendingDown className="h-4 w-4 text-emerald-600" />
          ) : trend.delta > 0 ? (
            <TrendingUp className="h-4 w-4 text-amber-600" />
          ) : (
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          )}
          <p className="text-sm">
            <span className="font-semibold tabular-nums">{trend.latest.toFixed(1)} kg</span>
            <span className="text-muted-foreground">
              {" "}
              ({trend.delta === 0 ? "no change" : `${trend.delta > 0 ? "+" : ""}${trend.delta.toFixed(1)} kg vs previous`})
            </span>
          </p>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : !weighIns?.length ? (
        <p className="text-sm text-muted-foreground">No weigh-ins yet. Add your first one above.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border">
          {weighIns.slice(0, 10).map((w) => (
            <li key={w.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium tabular-nums">{Number(w.weight_kg).toFixed(1)} kg</p>
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(w.recorded_at), "d MMM yyyy")}
                  {w.note ? ` · ${w.note}` : ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(w.id)}
                aria-label="Delete weigh-in"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default WeighInTracker;
