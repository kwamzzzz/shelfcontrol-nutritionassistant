import { useState, useMemo } from "react";
import { useCreateConsumptionLog } from "@/hooks/useConsumption";
import { useItems } from "@/hooks/usePantry";
import QuickAddItemForm from "@/components/purchases/QuickAddItemForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, Check, ChevronsUpDown, Utensils } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AddConsumptionDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

const AddConsumptionDialog = ({ open: controlledOpen, onOpenChange, hideTrigger }: AddConsumptionDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (v: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(v);
    onOpenChange?.(v);
  };
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [consumedAt, setConsumedAt] = useState(new Date().toISOString().slice(0, 16));
  const [openCombobox, setOpenCombobox] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const { data: items } = useItems();
  const createLog = useCreateConsumptionLog();
  const { toast } = useToast();

  const itemMap = useMemo(() => {
    const map = new Map<string, string>();
    items?.forEach((i) => map.set(i.id, i.name));
    return map;
  }, [items]);

  const reset = () => {
    setItemId("");
    setQuantity("1");
    setConsumedAt(new Date().toISOString().slice(0, 16));
  };

  const handleItemSelect = (id: string) => {
    setItemId(id);
    setOpenCombobox(false);
    setShowQuickAdd(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemId) {
      toast({ title: "Error", description: "Select an item.", variant: "destructive" });
      return;
    }
    try {
      await createLog.mutateAsync({
        item_id: itemId,
        quantity: Number(quantity) || 1,
        consumed_at: consumedAt ? new Date(consumedAt).toISOString() : undefined,
      });
      toast({ title: "Logged", description: `${itemMap.get(itemId) ?? "Item"} consumption recorded.` });
      reset();
      setOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            Log Consumption
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Log Consumption</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Catalog Item *</Label>
            <Popover open={openCombobox} onOpenChange={(v) => { setOpenCombobox(v); if (!v) setShowQuickAdd(false); }}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="h-9 w-full justify-between text-sm font-normal">
                  {itemId ? itemMap.get(itemId) ?? "Select" : "Select item..."}
                  <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                {showQuickAdd ? (
                  <div>
                    <div className="flex items-center justify-between px-3 pt-2">
                      <span className="text-xs font-medium text-muted-foreground">New Catalog Item</span>
                      <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowQuickAdd(false)}>Back</Button>
                    </div>
                    <QuickAddItemForm onCreated={handleItemSelect} />
                  </div>
                ) : (
                  <Command>
                    <CommandInput placeholder="Search items..." className="h-9" />
                    <CommandList>
                      <CommandEmpty>
                        <p className="text-sm text-muted-foreground">No items found.</p>
                        <Button type="button" variant="outline" size="sm" className="mt-2 h-7 text-xs" onClick={() => setShowQuickAdd(true)}>
                          <Plus className="mr-1 h-3 w-3" /> Create new item
                        </Button>
                      </CommandEmpty>
                      <CommandGroup>
                        {items?.map((item) => (
                          <CommandItem key={item.id} value={item.name} onSelect={() => handleItemSelect(item.id)}>
                            <Check className={cn("mr-2 h-3.5 w-3.5", itemId === item.id ? "opacity-100" : "opacity-0")} />
                            <span>{item.name}</span>
                            {item.category && <span className="ml-auto text-xs text-muted-foreground">{item.category}</span>}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                    <div className="border-t p-1">
                      <Button type="button" variant="ghost" size="sm" className="w-full h-8 text-xs justify-start" onClick={() => setShowQuickAdd(true)}>
                        <Plus className="mr-1.5 h-3 w-3" /> Create new catalog item
                      </Button>
                    </div>
                  </Command>
                )}
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input type="number" min={0} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Date / Time</Label>
              <Input type="datetime-local" value={consumedAt} onChange={(e) => setConsumedAt(e.target.value)} />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={createLog.isPending}>
            <Utensils className="mr-1.5 h-4 w-4" />
            {createLog.isPending ? "Saving..." : "Log"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddConsumptionDialog;
