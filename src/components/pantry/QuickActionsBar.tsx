import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { type InventoryRow, useUpdateInventory } from "@/hooks/usePantry";
import { Button } from "@/components/ui/button";
import { BadgeDollarSign, PackageOpen, Minus, Plus, Share2, Utensils, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PantryExitDialog, { type PantryExitMode } from "@/components/pantry/PantryExitDialog";

interface Props {
  entry: InventoryRow;
  onShare?: () => void;
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong.";

const QuickActionsBar = ({ entry, onShare }: Props) => {
  const updateInventory = useUpdateInventory();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [exitMode, setExitMode] = useState<PantryExitMode | null>(null);

  const handleToggleOpened = async () => {
    const newStatus = entry.sealed_status === "opened" ? "sealed" : "opened";
    try {
      await updateInventory.mutateAsync({
        id: entry.id,
        sealed_status: newStatus,
        opened_date: newStatus === "opened" ? new Date().toISOString().split("T")[0] : null,
      });
      toast({ title: newStatus === "opened" ? "Opened" : "Sealed", description: `${entry.items.name} marked as ${newStatus}.` });
    } catch (error: unknown) {
      toast({ title: "Error", description: errorMessage(error), variant: "destructive" });
    }
  };

  const handleAdjustQty = async (delta: number) => {
    const newQty = Math.max(0, entry.quantity + delta);
    if (newQty === 0) {
      // Reducing below one is an exit from the pantry — ask why (ate or tossed).
      setExitMode("dispose");
      return;
    }
    try {
      await updateInventory.mutateAsync({ id: entry.id, quantity: newQty });
    } catch (error: unknown) {
      toast({ title: "Error", description: errorMessage(error), variant: "destructive" });
    }
  };

  return (
    <>
      {/* Tablet/desktop only: five compact icon actions would be sub-44px and
          collide in the three-column phone grid. On phone the card opens the
          detail sheet, which exposes the same actions at full size. */}
      <div className="hidden sm:flex items-center gap-1 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-primary"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/pantry/${entry.item_id}/prices`);
          }}
          title="Open Compare"
        >
          <BadgeDollarSign className="h-3.5 w-3.5" />
        </Button>
        {onShare && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-primary"
            onClick={(e) => {
              e.stopPropagation();
              onShare();
            }}
            title="Share to group"
          >
            <Share2 className="h-3.5 w-3.5" />
          </Button>
        )}
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
          className="h-7 w-7 text-success"
          onClick={(e) => { e.stopPropagation(); setExitMode("consume"); }}
          title="Consumed"
        >
          <Utensils className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive"
          onClick={(e) => { e.stopPropagation(); setExitMode("dispose"); }}
          title="Disposed"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      {exitMode && (
        <PantryExitDialog
          entry={entry}
          mode={exitMode}
          open={exitMode !== null}
          onClose={() => setExitMode(null)}
        />
      )}
    </>
  );
};

export default QuickActionsBar;
