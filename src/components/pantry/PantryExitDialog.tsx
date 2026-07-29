import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Trash2,
  Utensils,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getDisposalConfirmationEnabled,
  setDisposalConfirmationEnabled,
} from "@/lib/pantry-exit-preferences";

export type PantryExitMode = "consume" | "dispose";

interface Props {
  entry?: InventoryRow;
  entries?: InventoryRow[];
  mode: PantryExitMode;
  open: boolean;
  onClose: () => void;
  /** Fired after a successful log — lets a parent sheet dismiss itself. */
  onCompleted?: () => void;
}

const WASTE_REASONS = ["Expired", "Spoiled", "Stale", "Freezer burn", "Damaged", "Overcooked", "Other"] as const;

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
 * One exit surface for pantry items. Disposal defaults to a concise
 * confirmation and keeps quantity/date/reason as optional details. A user may
 * skip future single-item confirmations; every bulk action always confirms.
 */
const PantryExitDialog = ({ entry, entries, mode, open, onClose, onCompleted }: Props) => {
  const targets = useMemo(
    () => (entries?.length ? entries : entry ? [entry] : []),
    [entries, entry],
  );
  const primaryEntry = targets[0];
  const isBulk = targets.length > 1;
  const isPhone = useIsPhone();
  const [quantity, setQuantity] = useState(primaryEntry ? String(primaryEntry.quantity) : "");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [recordDate, setRecordDate] = useState(false);
  const [eventDate, setEventDate] = useState(localDateValue);
  const [detailsOpen, setDetailsOpen] = useState(mode === "consume");
  const [confirmationPreference, setConfirmationPreference] = useState<"keep" | "never">("keep");
  const autoSubmitted = useRef(false);
  const createConsumption = useCreateConsumptionLog();
  const createWaste = useCreateWasteLog();
  const updateInventory = useUpdateInventory();
  const { toast } = useToast();

  const pending = createConsumption.isPending || createWaste.isPending || updateInventory.isPending;
  const totalQuantity = targets.reduce((sum, target) => sum + Number(target.quantity || 0), 0);
  const unitLabel = new Set(targets.map((target) => target.unit)).size === 1
    ? primaryEntry?.unit
    : "units";

  const completeExit = useCallback(async ({
    selectedQuantity,
    selectedReason,
    selectedNote,
    selectedTimestamp,
    rememberPreference = true,
  }: {
    selectedQuantity?: number;
    selectedReason?: string;
    selectedNote?: string;
    selectedTimestamp: string;
    rememberPreference?: boolean;
  }) => {
    if (!primaryEntry || targets.length === 0) return;

    try {
      for (const target of targets) {
        const requestedAmount = isBulk
          ? Number(target.quantity)
          : Math.min(Number(selectedQuantity ?? target.quantity), Number(target.quantity));

        if (mode === "consume") {
          await createConsumption.mutateAsync({
            item_id: target.item_id,
            quantity: requestedAmount,
            unit: target.unit,
            consumed_at: selectedTimestamp,
          });
        } else {
          await createWaste.mutateAsync({
            item_id: target.item_id,
            inventory_id: target.id,
            quantity: requestedAmount,
            unit: target.unit,
            reason: selectedReason || undefined,
            note: selectedNote || undefined,
            discarded_at: selectedTimestamp,
          });
        }

        if (requestedAmount >= Number(target.quantity)) {
          await updateInventory.mutateAsync({
            id: target.id,
            status: mode === "dispose" ? "discarded" : "consumed",
            archived_at: selectedTimestamp,
          });
        } else {
          await updateInventory.mutateAsync({
            id: target.id,
            quantity: Number(target.quantity) - requestedAmount,
          });
        }
      }

      if (mode === "dispose" && !isBulk && rememberPreference) {
        setDisposalConfirmationEnabled(confirmationPreference === "keep");
      }

      toast({
        title: mode === "dispose" ? "Disposed" : "Consumed",
        description: isBulk
          ? `${targets.length} pantry items were recorded and removed.`
          : `${selectedQuantity ?? primaryEntry.quantity} ${primaryEntry.unit} of ${primaryEntry.items.name} logged.`,
      });
      onClose();
      onCompleted?.();
    } catch (error: unknown) {
      autoSubmitted.current = false;
      toast({ title: "Error", description: errorMessage(error), variant: "destructive" });
    }
  }, [
    confirmationPreference,
    createConsumption,
    createWaste,
    isBulk,
    mode,
    onClose,
    onCompleted,
    primaryEntry,
    targets,
    toast,
    updateInventory,
  ]);

  useEffect(() => {
    if (!open || !primaryEntry) return;
    setQuantity(String(primaryEntry.quantity));
    setReason("");
    setNote("");
    setRecordDate(false);
    setEventDate(localDateValue());
    setDetailsOpen(mode === "consume");
    setConfirmationPreference("keep");
  }, [mode, open, primaryEntry]);

  useEffect(() => {
    if (!open || !primaryEntry) {
      autoSubmitted.current = false;
      return;
    }
    const canSkip = mode === "dispose" && !isBulk && !getDisposalConfirmationEnabled();
    if (canSkip && !autoSubmitted.current) {
      autoSubmitted.current = true;
      void completeExit({
        selectedQuantity: Number(primaryEntry.quantity),
        selectedTimestamp: new Date().toISOString(),
        rememberPreference: false,
      });
    }
  }, [completeExit, isBulk, mode, open, primaryEntry]);

  if (!primaryEntry || targets.length === 0) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(quantity);
    if (!isBulk && (!Number.isFinite(qty) || qty <= 0)) return;
    const eventTimestamp = recordDate ? dateToTimestamp(eventDate) : new Date().toISOString();
    await completeExit({
      selectedQuantity: isBulk ? undefined : qty,
      selectedReason: reason,
      selectedNote: note,
      selectedTimestamp: eventTimestamp,
    });
  };

  const itemLabel = isBulk ? `${targets.length} selected items` : primaryEntry.items.name;
  const title = mode === "dispose"
    ? isBulk
      ? `Dispose ${targets.length} items?`
      : `Dispose ${primaryEntry.items.name}?`
    : isBulk
      ? `Consume ${targets.length} items?`
      : `Record ${primaryEntry.items.name}`;
  const description = mode === "dispose"
    ? "This records what left your pantry and removes it from the active view."
    : isBulk
      ? "This records the selected items as consumed and removes them from the active pantry."
      : "Tell Shelf Control how much you used and when.";

  const details = (
    <div className="space-y-4 rounded-2xl border border-border/70 bg-card/70 p-4">
      {!isBulk && (
        <div className="space-y-2">
          <Label htmlFor={`exit-quantity-${primaryEntry.id}`}>
            {mode === "dispose" ? "Amount disposed" : "Amount consumed"}
          </Label>
          <Input
            id={`exit-quantity-${primaryEntry.id}`}
            className="min-h-12 rounded-xl"
            type="number"
            inputMode="decimal"
            min={0.01}
            max={primaryEntry.quantity}
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>
      )}

      {mode === "dispose" && (
        <div className="space-y-2">
          <Label>Reason (optional)</Label>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger className="min-h-12 rounded-xl">
              <SelectValue placeholder="Select a reason" />
            </SelectTrigger>
            <SelectContent>
              {WASTE_REASONS.map((wasteReason) => (
                <SelectItem key={wasteReason} value={wasteReason}>{wasteReason}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <Label htmlFor={`record-date-${primaryEntry.id}`} className="text-sm">Choose a date</Label>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Optional. Leave this off to record it now.
              </p>
            </div>
          </div>
          <Switch
            id={`record-date-${primaryEntry.id}`}
            checked={recordDate}
            onCheckedChange={setRecordDate}
            aria-label="Choose a specific date"
          />
        </div>
        {recordDate && (
          <div className="mt-4 space-y-2 border-t border-border/70 pt-4">
            <Label htmlFor={`exit-date-${primaryEntry.id}`}>
              {mode === "dispose" ? "Date disposed" : "Date consumed"}
            </Label>
            <Input
              id={`exit-date-${primaryEntry.id}`}
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
          <Label htmlFor={`exit-note-${primaryEntry.id}`}>Note (optional)</Label>
          <Input
            id={`exit-note-${primaryEntry.id}`}
            className="min-h-12 rounded-xl"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything useful to remember?"
          />
        </div>
      )}
    </div>
  );

  const form = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className={cn(
        "rounded-[1.35rem] border p-4",
        mode === "dispose"
          ? "border-destructive/20 bg-destructive/[0.045]"
          : "border-success/20 bg-success/[0.045]",
      )}>
        <div className="flex items-center gap-3">
          <span className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
            mode === "dispose" ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success",
          )}>
            {mode === "dispose" ? <Trash2 className="h-5 w-5" /> : <Utensils className="h-5 w-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-foreground">{itemLabel}</p>
            <p className="text-xs text-muted-foreground">
              {isBulk
                ? `${totalQuantity.toLocaleString()} ${unitLabel} across this selection`
                : `${primaryEntry.quantity} ${primaryEntry.unit} currently available`}
            </p>
          </div>
        </div>
        {isBulk && (
          <div className={cn(
            "mt-3 flex flex-wrap gap-1.5 border-t pt-3",
            mode === "dispose" ? "border-destructive/10" : "border-success/10",
          )}>
            {targets.slice(0, 5).map((target) => (
              <span key={target.id} className="rounded-full bg-card/80 px-2.5 py-1 text-xs text-foreground shadow-sm">
                {target.items.name}
              </span>
            ))}
            {targets.length > 5 && (
              <span className="rounded-full bg-card/80 px-2.5 py-1 text-xs text-muted-foreground shadow-sm">
                +{targets.length - 5} more
              </span>
            )}
          </div>
        )}
      </div>

      {mode === "dispose" && (
        <>
          <button
            type="button"
            onClick={() => setDetailsOpen((current) => !current)}
            className="flex min-h-11 w-full items-center justify-between rounded-xl border border-border/70 bg-card/60 px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            aria-expanded={detailsOpen}
          >
            <span>{detailsOpen ? "Hide disposal details" : "Change amount or add details"}</span>
            {detailsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {detailsOpen && details}
        </>
      )}

      {mode === "consume" && details}

      {mode === "dispose" && !isBulk && (
        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Next time
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {([
              { value: "keep", label: "Keep asking", icon: ShieldCheck },
              { value: "never", label: "Don’t ask again", icon: Check },
            ] as const).map(({ value, label, icon: Icon }) => {
              const selected = confirmationPreference === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setConfirmationPreference(value)}
                  aria-pressed={selected}
                  className={cn(
                    "flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium transition-colors",
                    selected
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-card/60 text-muted-foreground hover:bg-accent",
                  )}
                >
                  <Icon className={cn("h-4 w-4", selected && "text-primary")} />
                  {label}
                </button>
              );
            })}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            You can turn confirmations back on anytime in Settings.
          </p>
        </fieldset>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        <Button type="button" variant="outline" className="min-h-12 flex-1 rounded-xl" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant={mode === "dispose" ? "destructive" : "default"}
          className="min-h-12 flex-[1.35] rounded-xl"
          disabled={
            pending ||
            (!isBulk && (!Number.isFinite(Number(quantity)) || Number(quantity) <= 0)) ||
            (recordDate && !eventDate)
          }
        >
          {pending
            ? mode === "dispose" ? "Disposing…" : "Saving…"
            : mode === "dispose"
              ? isBulk ? `Dispose ${targets.length} items` : "Dispose item"
              : isBulk ? `Consume ${targets.length} items` : "Save consumption"}
        </Button>
      </div>
    </form>
  );

  if (isPhone) {
    return (
      <Drawer open={open} onOpenChange={(value) => !value && onClose()}>
        <DrawerContent className="max-h-[92dvh] overflow-hidden">
          <DrawerHeader className="shrink-0 px-5 pb-3 pt-4 text-left">
            <DrawerTitle className="font-serif text-2xl leading-tight">{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1rem,var(--safe-bottom))]">
            {form}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[min(90dvh,820px)] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {form}
      </DialogContent>
    </Dialog>
  );
};

export default PantryExitDialog;
