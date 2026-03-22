import { useState } from "react";
import { type InventoryRow, useUpdateInventory } from "@/hooks/usePantry";
import { useCreateConsumptionLog } from "@/hooks/useConsumption";
import { Button } from "@/components/ui/button";
import { PackageOpen, Minus, Plus, Utensils, Trash2, MapPin } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STORAGE_LOCATIONS } from "@/lib/pantry-utils";
import { useToast } from "@/hooks/use-toast";
import DiscardDialog from "@/components/pantry/DiscardDialog";

interface Props {
  entry: InventoryRow;
}

const QuickActionsBar = ({ entry }: Props) => {
  const updateInventory = useUpdateInventory();
  const createConsumption = useCreateConsumptionLog();
  const { toast } = useToast();
  const [discardOpen, setDiscardOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);

  const handleToggleOpened = async () => {
    const newStatus = entry.sealed_status === "opened" ? "sealed" : "opened";
    try {
      await updateInventory.mutateAsync({
        id: entry.id,
        sealed_status: newStatus,
        opened_date: newStatus === "opened" ? new Date().toISOString().split("T")[0] : null,
      });
      toast({ title: newStatus === "opened" ? "Opened" : "Sealed", description: `${entry.items.name} marked as ${newStatus}.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleAdjustQty = async (delta: number) => {
    const newQty = Math.max(0, entry.quantity + delta);
    if (newQty === 0) {
      setDiscardOpen(true);
      return;
    }
    try {
      await updateInventory.mutateAsync({ id: entry.id, quantity: newQty });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleConsume = async () => {
    try {
      await createConsumption.mutateAsync({
        item_id: entry.item_id,
        quantity: 1,
      });
      // Also reduce inventory by 1
      const newQty = Math.max(0, entry.quantity - 1);
      if (newQty > 0) {
        await updateInventory.mutateAsync({ id: entry.id, quantity: newQty });
      }
      toast({ title: "Consumed", description: `1 ${entry.unit} of ${entry.items.name} logged.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleLocationChange = async (loc: string) => {
    try {
      await updateInventory.mutateAsync({ id: entry.id, storage_location: loc });
      toast({ title: "Moved", description: `${entry.items.name} moved to ${loc}.` });
      setLocationOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <>
      <div className="flex items-center gap-1 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => { e.stopPropagation(); handleToggleOpened(); }}
          title={entry.sealed_status === "opened" ? "Mark sealed" : "Mark opened"}
        >
          <PackageOpen className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => { e.stopPropagation(); handleAdjustQty(-1); }}
          title="Reduce quantity"
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => { e.stopPropagation(); handleAdjustQty(1); }}
          title="Increase quantity"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => { e.stopPropagation(); handleConsume(); }}
          title="Log consumption"
        >
          <Utensils className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive"
          onClick={(e) => { e.stopPropagation(); setDiscardOpen(true); }}
          title="Discard"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      {discardOpen && (
        <DiscardDialog entry={entry} open={discardOpen} onClose={() => setDiscardOpen(false)} />
      )}
    </>
  );
};

export default QuickActionsBar;
