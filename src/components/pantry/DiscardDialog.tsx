import { useState } from "react";
import { type InventoryRow, useDeleteInventory, useUpdateInventory } from "@/hooks/usePantry";
import { useCreateWasteLog } from "@/hooks/useWasteLogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Props {
  entry: InventoryRow;
  open: boolean;
  onClose: () => void;
}

const WASTE_REASONS = ["Expired", "Spoiled", "Stale", "Freezer burn", "Damaged", "Overcooked", "Other"] as const;

const DiscardDialog = ({ entry, open, onClose }: Props) => {
  const [quantity, setQuantity] = useState(String(entry.quantity));
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const createWaste = useCreateWasteLog();
  const deleteInventory = useDeleteInventory();
  const updateInventory = useUpdateInventory();
  const { toast } = useToast();

  const handleDiscard = async (e: React.FormEvent) => {
    e.preventDefault();
    const discardQty = Number(quantity);
    if (discardQty <= 0) return;

    try {
      await createWaste.mutateAsync({
        item_id: entry.item_id,
        inventory_id: entry.id,
        quantity: discardQty,
        unit: entry.unit,
        reason: reason || null,
        note: note || null,
      });

      // Remove or reduce inventory
      if (discardQty >= entry.quantity) {
        await deleteInventory.mutateAsync(entry.id);
      } else {
        await updateInventory.mutateAsync({
          id: entry.id,
          quantity: entry.quantity - discardQty,
        });
      }

      toast({ title: "Discarded", description: `${entry.items.name} logged as waste.` });
      onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Discard: {entry.items.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleDiscard} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Quantity to discard</Label>
              <Input
                type="number"
                min={0.01}
                max={entry.quantity}
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Available: {entry.quantity} {entry.unit}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {WASTE_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any additional notes..." />
          </div>
          <Button
            type="submit"
            variant="destructive"
            className="w-full"
            disabled={createWaste.isPending}
          >
            {createWaste.isPending ? "Discarding..." : "Discard & Log Waste"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DiscardDialog;
