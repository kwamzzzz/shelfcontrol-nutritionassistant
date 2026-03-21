import { useState, useMemo } from "react";
import { useCreateRecipe, type NewIngredientLine } from "@/hooks/useRecipes";
import { useItems } from "@/hooks/usePantry";
import QuickAddItemForm from "@/components/purchases/QuickAddItemForm";
import GroupedUnitSelect from "@/components/shared/GroupedUnitSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, Trash2, Check, ChevronsUpDown, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const emptyIngredient = (): NewIngredientLine => ({
  item_id: "",
  quantity: 1,
  unit: "Unit",
});

const AddRecipeDialog = () => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [servings, setServings] = useState("1");
  const [instructions, setInstructions] = useState("");
  const [ingredients, setIngredients] = useState<NewIngredientLine[]>([emptyIngredient()]);
  const [openCombobox, setOpenCombobox] = useState<number | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState<number | null>(null);
  const { data: items } = useItems();
  const createRecipe = useCreateRecipe();
  const { toast } = useToast();

  const itemMap = useMemo(() => {
    const map = new Map<string, string>();
    items?.forEach((i) => map.set(i.id, i.name));
    return map;
  }, [items]);

  const reset = () => {
    setName("");
    setServings("1");
    setInstructions("");
    setIngredients([emptyIngredient()]);
  };

  const updateIng = (idx: number, patch: Partial<NewIngredientLine>) =>
    setIngredients((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const removeIng = (idx: number) =>
    setIngredients((prev) => prev.filter((_, i) => i !== idx));

  const handleItemSelect = (idx: number, itemId: string) => {
    const item = items?.find((i) => i.id === itemId);
    updateIng(idx, { item_id: itemId, unit: item?.default_unit ?? "Unit" });
    setOpenCombobox(null);
    setShowQuickAdd(null);
  };

  const validIngredients = ingredients.filter((i) => i.item_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Error", description: "Recipe name is required.", variant: "destructive" });
      return;
    }
    try {
      await createRecipe.mutateAsync({
        name: name.trim(),
        servings: servings ? Number(servings) : null,
        instructions: instructions.trim() || null,
        ingredients: validIngredients,
      });
      toast({ title: "Recipe created", description: `${name} saved.` });
      reset();
      setOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          New Recipe
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">New Recipe</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chicken Stir Fry" />
            </div>
            <div className="space-y-2">
              <Label>Servings</Label>
              <Input type="number" min={1} value={servings} onChange={(e) => setServings(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Instructions</Label>
            <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Optional cooking instructions..." className="h-20 resize-none" />
          </div>

          {/* Ingredients */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Ingredients</Label>
            </div>
            {ingredients.map((ing, idx) => (
              <div key={idx} className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Catalog Item</Label>
                    <Popover open={openCombobox === idx} onOpenChange={(v) => { setOpenCombobox(v ? idx : null); if (!v) setShowQuickAdd(null); }}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="h-9 w-full justify-between text-sm font-normal">
                          {ing.item_id ? itemMap.get(ing.item_id) ?? "Select" : "Select item..."}
                          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        {showQuickAdd === idx ? (
                          <div>
                            <div className="flex items-center justify-between px-3 pt-2">
                              <span className="text-xs font-medium text-muted-foreground">New Catalog Item</span>
                              <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowQuickAdd(null)}>Back</Button>
                            </div>
                            <QuickAddItemForm onCreated={(id) => handleItemSelect(idx, id)} />
                          </div>
                        ) : (
                          <Command>
                            <CommandInput placeholder="Search items..." className="h-9" />
                            <CommandList>
                              <CommandEmpty>
                                <p className="text-sm text-muted-foreground">No items found.</p>
                                <Button type="button" variant="outline" size="sm" className="mt-2 h-7 text-xs" onClick={() => setShowQuickAdd(idx)}>
                                  <Plus className="mr-1 h-3 w-3" /> Create new item
                                </Button>
                              </CommandEmpty>
                              <CommandGroup>
                                {items?.map((item) => (
                                  <CommandItem key={item.id} value={item.name} onSelect={() => handleItemSelect(idx, item.id)}>
                                    <Check className={cn("mr-2 h-3.5 w-3.5", ing.item_id === item.id ? "opacity-100" : "opacity-0")} />
                                    <span>{item.name}</span>
                                    {item.category && <span className="ml-auto text-xs text-muted-foreground">{item.category}</span>}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                            <div className="border-t p-1">
                              <Button type="button" variant="ghost" size="sm" className="w-full h-8 text-xs justify-start" onClick={() => setShowQuickAdd(idx)}>
                                <Plus className="mr-1.5 h-3 w-3" /> Create new catalog item
                              </Button>
                            </div>
                          </Command>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>
                  {ingredients.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="mt-5 h-9 w-9 shrink-0" onClick={() => removeIng(idx)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Qty</Label>
                    <Input type="number" min={0} step="any" className="h-9 text-sm" value={ing.quantity} onChange={(e) => updateIng(idx, { quantity: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Unit</Label>
                    <GroupedUnitSelect value={ing.unit} onValueChange={(v) => updateIng(idx, { unit: v })} triggerClassName="h-9 text-sm" />
                  </div>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setIngredients((p) => [...p, emptyIngredient()])}>
              <Plus className="mr-1 h-3 w-3" /> Add Ingredient
            </Button>
          </div>

          <Button type="submit" className="w-full" disabled={createRecipe.isPending}>
            <BookOpen className="mr-1.5 h-4 w-4" />
            {createRecipe.isPending ? "Saving..." : "Save Recipe"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddRecipeDialog;
