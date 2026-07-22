import { useState } from "react";
import { useItems } from "@/hooks/usePantry";
import { useAddRecipeIngredient } from "@/hooks/useRecipes";
import QuickAddItemForm from "@/components/purchases/QuickAddItemForm";
import GroupedUnitSelect from "@/components/shared/GroupedUnitSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  recipeId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const AddIngredientDialog = ({ recipeId, open, onOpenChange }: Props) => {
  const { data: items } = useItems();
  const addIngredient = useAddRecipeIngredient();
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("Unit");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [quickAdd, setQuickAdd] = useState(false);

  const selectedName = items?.find((i) => i.id === itemId)?.name;

  const reset = () => {
    setItemId("");
    setQuantity("1");
    setUnit("Unit");
    setQuickAdd(false);
  };

  const handleSelect = (id: string) => {
    const item = items?.find((i) => i.id === id);
    setItemId(id);
    setUnit(item?.default_unit ?? "Unit");
    setPickerOpen(false);
    setQuickAdd(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemId) {
      toast.error("Pick an ingredient first");
      return;
    }
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }
    try {
      await addIngredient.mutateAsync({
        recipe_id: recipeId,
        item_id: itemId,
        quantity: qty,
        unit,
      });
      toast.success("Ingredient added");
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Could not add ingredient");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Add Ingredient</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Catalog Item</Label>
            <Popover
              open={pickerOpen}
              onOpenChange={(v) => {
                setPickerOpen(v);
                if (!v) setQuickAdd(false);
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  className="h-9 w-full justify-between text-sm font-normal"
                >
                  {selectedName ?? "Select item..."}
                  <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-0"
                align="start"
              >
                {quickAdd ? (
                  <div>
                    <div className="flex items-center justify-between px-3 pt-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        New Catalog Item
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => setQuickAdd(false)}
                      >
                        Back
                      </Button>
                    </div>
                    <QuickAddItemForm onCreated={(id) => handleSelect(id)} />
                  </div>
                ) : (
                  <Command>
                    <CommandInput placeholder="Search items..." className="h-9" />
                    <CommandList>
                      <CommandEmpty>
                        <p className="text-sm text-muted-foreground">No items found.</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2 h-7 text-xs"
                          onClick={() => setQuickAdd(true)}
                        >
                          <Plus className="mr-1 h-3 w-3" /> Create new item
                        </Button>
                      </CommandEmpty>
                      <CommandGroup>
                        {items?.map((item) => (
                          <CommandItem
                            key={item.id}
                            value={item.name}
                            onSelect={() => handleSelect(item.id)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-3.5 w-3.5",
                                itemId === item.id ? "opacity-100" : "opacity-0",
                              )}
                            />
                            <span>{item.name}</span>
                            {item.category && (
                              <span className="ml-auto text-xs text-muted-foreground">
                                {item.category}
                              </span>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                    <div className="border-t p-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full h-8 text-xs justify-start"
                        onClick={() => setQuickAdd(true)}
                      >
                        <Plus className="mr-1.5 h-3 w-3" /> Create new catalog item
                      </Button>
                    </div>
                  </Command>
                )}
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Quantity</Label>
              <Input
                type="number"
                min={0}
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Unit</Label>
              <GroupedUnitSelect
                value={unit}
                onValueChange={setUnit}
                triggerClassName="h-9 text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={addIngredient.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={addIngredient.isPending}>
              {addIngredient.isPending ? "Adding…" : "Add Ingredient"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddIngredientDialog;