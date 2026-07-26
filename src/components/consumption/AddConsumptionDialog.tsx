import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useCreateConsumptionLog } from "@/hooks/useConsumption";
import { useItems } from "@/hooks/usePantry";
import QuickAddItemForm from "@/components/purchases/QuickAddItemForm";
import GroupedUnitSelect from "@/components/shared/GroupedUnitSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, Check, ChevronsUpDown, Package, Utensils } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AddConsumptionDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
  triggerLabel?: string;
}

const localDateTimeValue = () => format(new Date(), "yyyy-MM-dd'T'HH:mm");

const AddConsumptionDialog = ({
  open: controlledOpen,
  onOpenChange,
  hideTrigger,
  triggerLabel = "Log food",
}: AddConsumptionDialogProps) => {
  const navigate = useNavigate();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (v: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(v);
    onOpenChange?.(v);
  };
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("Unit");
  const [consumedAt, setConsumedAt] = useState(localDateTimeValue);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const { data: items } = useItems();
  const createLog = useCreateConsumptionLog();
  const { toast } = useToast();

  const itemMap = useMemo(() => {
    const map = new Map<string, { name: string; unit: string | null }>();
    items?.forEach((i) => map.set(i.id, { name: i.name, unit: i.default_unit }));
    return map;
  }, [items]);

  const reset = () => {
    setItemId("");
    setQuantity("1");
    setUnit("Unit");
    setConsumedAt(localDateTimeValue());
  };

  const handleItemSelect = (id: string) => {
    setItemId(id);
    setUnit(itemMap.get(id)?.unit || "Unit");
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
        unit,
        consumed_at: consumedAt ? new Date(consumedAt).toISOString() : undefined,
      });
      toast({ title: "Logged", description: `${itemMap.get(itemId)?.name ?? "Item"} consumption recorded.` });
      reset();
      setOpen(false);
    } catch (err: unknown) {
      toast({
        title: "Couldn't save this food log",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button className="min-h-11 rounded-xl">
            <Plus className="mr-1.5 h-4 w-4" />
            {triggerLabel}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="rounded-[1.75rem] sm:max-w-md">
        <DialogHeader>
          <span className="mb-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Utensils className="h-5 w-5" />
          </span>
          <DialogTitle className="font-display text-xl">Log what you ate</DialogTitle>
          <DialogDescription>
            Add an item from your food catalog to the consumption journal.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Food item *</Label>
            <Popover open={openCombobox} onOpenChange={(v) => { setOpenCombobox(v); if (!v) setShowQuickAdd(false); }}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="min-h-11 w-full justify-between rounded-xl text-sm font-normal">
                  {itemId ? itemMap.get(itemId)?.name ?? "Select" : "Choose a catalog item"}
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
                          <CommandItem key={item.id} value={item.name} onSelect={() => handleItemSelect(item.id)} className="min-h-10">
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
              <Input className="min-h-11 rounded-xl" type="number" min={0} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <GroupedUnitSelect value={unit} onValueChange={setUnit} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Date / Time</Label>
              <Input className="min-h-11 rounded-xl" type="datetime-local" value={consumedAt} onChange={(e) => setConsumedAt(e.target.value)} />
            </div>
          </div>

          <div className="rounded-2xl border border-primary/15 bg-primary/5 p-3">
            <div className="flex items-start gap-2.5">
              <Package className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-xs font-semibold text-foreground">Need to reduce pantry stock too?</p>
                <p className="mt-0.5 text-[0.7rem] leading-relaxed text-muted-foreground">
                  Use the consume action on a Pantry item so the journal and remaining quantity update together.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    navigate("/pantry");
                  }}
                  className="mt-1.5 text-xs font-semibold text-primary hover:text-primary/80"
                >
                  Open Pantry
                </button>
              </div>
            </div>
          </div>

          <Button type="submit" className="min-h-11 w-full rounded-xl" disabled={createLog.isPending}>
            <Utensils className="mr-1.5 h-4 w-4" />
            {createLog.isPending ? "Saving..." : "Add to food journal"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddConsumptionDialog;
