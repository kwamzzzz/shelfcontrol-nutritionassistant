import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useUpdateShoppingItem } from "@/hooks/useShoppingList";
import { cn } from "@/lib/utils";
import { ShoppingBasket } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  itemIds: string[];
  existingBaskets: string[];
  onDone?: () => void;
}

const BasketAssignDialog = ({ open, onClose, itemIds, existingBaskets, onDone }: Props) => {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const updateItem = useUpdateShoppingItem();
  const { toast } = useToast();

  const apply = async (basket: string | null) => {
    if (itemIds.length === 0) return;
    setSaving(true);
    try {
      for (const id of itemIds) {
        await updateItem.mutateAsync({ id, basket });
      }
      toast({
        title: basket ? `Moved to ${basket}` : "Removed from basket",
        description: `${itemIds.length} item${itemIds.length === 1 ? "" : "s"} updated.`,
      });
      setName("");
      onDone?.();
      onClose();
    } catch (err: unknown) {
      toast({
        title: "Couldn't move items",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md rounded-[1.75rem]">
        <DialogHeader>
          <DialogTitle className="font-display">Move to a basket</DialogTitle>
          <DialogDescription>
            Baskets split one big list into trips — a store, a location, or an online order.
          </DialogDescription>
        </DialogHeader>

        {existingBaskets.length > 0 && (
          <div className="space-y-2">
            <Label>Existing baskets</Label>
            <div className="flex flex-wrap gap-2">
              {existingBaskets.map((basket) => (
                <button
                  key={basket}
                  type="button"
                  disabled={saving}
                  onClick={() => apply(basket)}
                  className={cn(
                    "inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border/70 bg-[hsl(var(--surface-subtle))] px-3.5 text-sm font-semibold text-foreground transition",
                    "hover:border-primary/40 hover:text-primary disabled:opacity-60"
                  )}
                >
                  <ShoppingBasket className="h-3.5 w-3.5 text-primary" />
                  {basket}
                </button>
              ))}
            </div>
          </div>
        )}

        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) apply(name.trim());
          }}
        >
          <Label>New basket name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Carrefour Mall of Emirates"
            className="min-h-11 rounded-xl"
          />
          <Button type="submit" disabled={!name.trim() || saving} className="min-h-11 w-full rounded-xl">
            {saving ? "Moving…" : `Move ${itemIds.length} item${itemIds.length === 1 ? "" : "s"}`}
          </Button>
        </form>

        <DialogFooter className="sm:justify-between">
          <Button type="button" variant="ghost" className="min-h-11 rounded-xl" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" variant="outline" className="min-h-11 rounded-xl" onClick={() => apply(null)} disabled={saving}>
            Remove from basket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BasketAssignDialog;
