import { useEffect, useState } from "react";
import { type InventoryRow, useUpdateInventory } from "@/hooks/usePantry";
import { useCreateConsumptionLog } from "@/hooks/useConsumption";
import { useCreateWasteLog } from "@/hooks/useWasteLogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useIsPhone } from "@/hooks/use-shell-mode";
import { CalendarDays, Trash2, Utensils } from "lucide-react";

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
    title: (name) => `Record ${name}`,
    description: "Tell Shelf Control how much you used. This is the only confirmation step.",
    quantityLabel: "How much did you use?",
    submit: "Save consumption",
    pending: "Saving…",
    toastTitle: "Consumed",
    status: "consumed",
  },
  dispose: {
    title: (name) => `Record disposal · ${name}`,
    description: "Record what left the pantry and why. This is the only confirmation step.",
    quantityLabel: "How much did you throw out?",
    submit: "Save disposal",
    pending: "Saving…",
    toastTitle: "Disposed",
    status: "discarded",
  },
};

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong.";

const localDateValue = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
};

const dateToTimestamp = (date: string) => {
  if (!date) return new Date().toISOString();
  const localNoon = new Date(`${date}T12:00:00`);
  return Number.isNaN(localNoon.getTime()) ? new Date().toISOString() : localNoon.toISOString();
};

/**
 * One flow for the two ways an item leaves the pantry: eaten or thrown out.
 * Either way we record the event (consumption_logs / waste_logs) and mark the
 * batch's status so it drops out of the active pantry — soft-delete, so the
 * eaten-vs-thrown-out history survives for the Kitchen Story and Analytics.
 */
const PantryExitDialog = ({ entry, mode, open, onClose, onCompleted }: Props) => {
  const copy = COPY[mode];
  const isPhone = useIsPhone();
  const [quantity, setQuantity] = useState(String(entry.quantity));
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [recordDate, setRecordDate] = useState(false);
  const [eventDate, setEventDate] = useState(localDateValue);
  const createConsumption = useCreateConsumptionLog();
  const createWaste = useCreateWasteLog();
  const updateInventory = useUpdateInventory();
  const { toast } = useToast();

  const pending = createConsumption.isPending || createWaste.isPending || updateInventory.isPending;

  useEffect(() => {
    if (!open) return;
    setQuantity(String(entry.quantity));
    setReason("");
    setNote("");
    setRecordDate(false);
    setEventDate(localDateValue());
  }, [entry.id, entry.quantity, mode, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) return;
    const amount = Math.min(qty, entry.quantity);
    const eventTimestamp = recordDate ? dateToTimestamp(eventDate) : new Date().toISOString();

    try {
      if (mode === "consume") {
        await createConsumption.mutateAsync({
          item_id: entry.item_id,
          quantity: amount,
          unit: entry.unit,
          consumed_at: eventTimestamp,
        });
      } else {
        await createWaste.mutateAsync({
          item_id: entry.item_id,
          inventory_id: entry.id,
          quantity: amount,
          unit: entry.unit,
          reason: reason || undefined,
          note: note || undefined,
          discarded_at: eventTimestamp,
        });
      }

      if (amount >= entry.quantity) {
        // Last unit gone: leave the pantry without destroying the row, so the
        // batch still counts toward the eaten-vs-thrown-out metric.
        await updateInventory.mutateAsync({
          id: entry.id,
          status: copy.status,
          archived_at: eventTimestamp,
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

  const form = (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-2xl border border-border/70 bg-muted/35 p-4">
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
            mode === "dispose" ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
          }`}>
            {mode === "dispose" ? <Trash2 className="h-5 w-5" /> : <Utensils className="h-5 w-5" />}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{entry.items.name}</p>
            <p className="text-xs text-muted-foreground">
              {entry.quantity} {entry.unit} currently available
            </p>
          </div>
        </div>
      </div>

      <div className={mode === "dispose" ? "grid gap-4 sm:grid-cols-2" : ""}>
        <div className="space-y-2">
          <Label htmlFor={`exit-quantity-${entry.id}`}>{copy.quantityLabel}</Label>
          <Input
            id={`exit-quantity-${entry.id}`}
            className="min-h-12 rounded-xl"
            type="number"
            inputMode="decimal"
            min={0.01}
            max={entry.quantity}
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>
        {mode === "dispose" && (
          <div className="space-y-2">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="min-h-12 rounded-xl"><SelectValue placeholder="Select a reason" /></SelectTrigger>
              <SelectContent>
                {WASTE_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border/70 bg-card p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <Label htmlFor={`record-date-${entry.id}`} className="text-sm">Choose a date</Label>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Optional. Leave this off to record the event now.
              </p>
            </div>
          </div>
          <Switch
            id={`record-date-${entry.id}`}
            checked={recordDate}
            onCheckedChange={setRecordDate}
            aria-label="Choose a specific date"
          />
        </div>
        {recordDate && (
          <div className="mt-4 space-y-2 border-t border-border/70 pt-4">
            <Label htmlFor={`exit-date-${entry.id}`}>
              {mode === "dispose" ? "Date disposed" : "Date consumed"}
            </Label>
            <Input
              id={`exit-date-${entry.id}`}
              className="min-h-12 rounded-xl"
              type="date"
              max={localDateValue()}
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required={recordDate}
            />
          </div>
        )}
      </div>

      {mode === "dispose" && (
        <div className="space-y-2">
          <Label htmlFor={`exit-note-${entry.id}`}>Note (optional)</Label>
          <Input
            id={`exit-note-${entry.id}`}
            className="min-h-12 rounded-xl"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything useful to remember?"
          />
        </div>
      )}

      <Button
        type="submit"
        variant={mode === "dispose" ? "destructive" : "default"}
        className="min-h-12 w-full rounded-xl"
        disabled={pending || !Number.isFinite(Number(quantity)) || Number(quantity) <= 0 || (recordDate && !eventDate)}
      >
        {pending ? copy.pending : copy.submit}
      </Button>
    </form>
  );

  if (isPhone) {
    return (
      <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
        <DrawerContent className="max-h-[92dvh] overflow-y-auto overscroll-contain">
          <DrawerHeader className="shrink-0 px-5 pb-3 pt-4 text-left">
            <DrawerTitle className="font-serif text-2xl leading-tight">{copy.title(entry.items.name)}</DrawerTitle>
            <DrawerDescription>{copy.description}</DrawerDescription>
          </DrawerHeader>
          <div className="px-5 pb-[max(1rem,var(--safe-bottom))]">
            {form}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title(entry.items.name)}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        {form}
      </DialogContent>
    </Dialog>
  );
};

export default PantryExitDialog;
