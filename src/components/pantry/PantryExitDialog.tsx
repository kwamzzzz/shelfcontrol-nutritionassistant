import { useState } from "react";
import { type InventoryRow, useUpdateInventory } from "@/hooks/usePantry";
import { useCreateConsumptionLog } from "@/hooks/useConsumption";
import { useCreateWasteLog } from "@/hooks/useWasteLogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export type PantryExitMode = "consume" | "dispose";

interface Props {
  entry: InventoryRow;
  mode: PantryExitMode;
  open: boolean;
  onClose: () => void;
  /** Fired after a successful log — lets a parent sheet dismiss itself. */
  onCompleted?: () => void;
}

const WASTE_REASONS = ["Expired", "Spoiled", "Stale", "Freezer burn", "Damaged", "Overcooked", "Other"] as const;

const COPY: Record<PantryExitMode, {
  title: (name: string) => string;
  description: string;
  quantityLabel: string;
  submit: string;
  pending: string;
  toastTitle: string;
  status: "consumed" | "discarded";
}> = {
  consume: {
    title: (name) => `Consumed: ${name}`,
    description: "Logs what you ate. When the last unit is gone, it leaves your pantry.",
    quantityLabel: "How much did you use?",
    submit: "Log & remove",
    pending: "Logging…",
    toastTitle: "Consumed",
    status: "consumed",
  },
  dispose: {
    title: (name) => `Disposed: ${name}`,
    description: "Logs what you threw out. When the last unit is gone, it leaves your pantry.",
    quantityLabel: "How much did you throw out?",
    submit: "Log & remove",
    pending: "Logging…",
    toastTitle: "Disposed",
    status: "discarded",
  },
};

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong.";

/**
 * One flow for the two ways an item leaves the pantry: eaten or thrown out.
 * Either way we record the event (consumption_logs / waste_logs) and mark the
 * batch's status so it drops out of the active pantry — soft-delete, so the
 * eaten-vs-thrown-out history survives for the Kitchen Story and Analytics.
 */
const PantryExitDialog = ({ entry, mode, open, onClose, onCompleted }: Props) => {
  const copy = COPY[mode];
  const [quantity, setQuantity] = useState(String(entry.quantity));
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const createConsumption = useCreateConsumptionLog();
  const createWaste = useCreateWasteLog();
  const updateInventory = useUpdateInventory();
  const { toast } = useToast();

  const pending = createConsumption.isPending || createWaste.isPending || updateInventory.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) return;
    const amount = Math.min(qty, entry.quantity);

    try {
      if (mode === "consume") {
        await createConsumption.mutateAsync({
          item_id: entry.item_id,
          quantity: amount,
          unit: entry.unit,
        });
      } else {
        await createWaste.mutateAsync({
          item_id: entry.item_id,
          inventory_id: entry.id,
          quantity: amount,
          unit: entry.unit,
          reason: reason || undefined,
          note: note || undefined,
        });
      }

      if (amount >= entry.quantity) {
        // Last unit gone: leave the pantry without destroying the row, so the
        // batch still counts toward the eaten-vs-thrown-out metric.
        await updateInventory.mutateAsync({
          id: entry.id,
          status: copy.status,
          archived_at: new Date().toISOString(),
        });
      } else {
        await updateInventory.mutateAsync({ id: entry.id, quantity: entry.quantity - amount });
      }

      toast({
        title: copy.toastTitle,
        description: `${amount} ${entry.unit} of ${entry.items.name} logged.`,
      });
      onClose();
      onCompleted?.();
    } catch (error: unknown) {
      toast({ title: "Error", description: errorMessage(error), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">{copy.title(entry.items.name)}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className={mode === "dispose" ? "grid grid-cols-2 gap-3" : ""}>
            <div className="space-y-2">
              <Label>{copy.quantityLabel}</Label>
              <Input
                type="number"
                min={0.01}
                max={entry.quantity}
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Available: {entry.quantity} {entry.unit}
              </p>
            </div>
            {mode === "dispose" && (
              <div className="space-y-2">
                <Label>Reason</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {WASTE_REASONS.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {mode === "dispose" && (
            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any additional notes…" />
            </div>
          )}
          <Button
            type="submit"
            variant={mode === "dispose" ? "destructive" : "default"}
            className="w-full"
            disabled={pending}
          >
            {pending ? copy.pending : copy.submit}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PantryExitDialog;
