import { useState } from "react";
import { useCreateShoppingItem } from "@/hooks/useShoppingList";
import { useItems } from "@/hooks/usePantry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CATEGORIES } from "@/lib/pantry-utils";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AddShoppingItemDialog = () => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"catalog" | "custom">("custom");
  const [itemId, setItemId] = useState("");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [category, setCategory] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const { data: items } = useItems();
  const createItem = useCreateShoppingItem();
  const { toast } = useToast();

  const reset = () => {
    setMode("custom");
    setItemId("");
    setName("");
    setQuantity("1");
    setCategory("");
    setEstimatedCost("");
  };

  const handleCatalogSelect = (id: string) => {
    setItemId(id);
    const item = items?.find((i) => i.id === id);
    if (item) {
      setName(item.name);
      if (item.category) setCategory(item.category);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createItem.mutateAsync({
        name: name.trim(),
        item_id: mode === "catalog" && itemId ? itemId : null,
        quantity: quantity ? Number(quantity) : 1,
        category: category || null,
        estimated_cost: estimatedCost ? Number(estimatedCost) : null,
      });
      toast({ title: "Added", description: `${name} added to shopping list.` });
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
          Add Item
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Add to Shopping List</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === "custom" ? "default" : "outline"}
              size="sm"
              onClick={() => { setMode("custom"); setItemId(""); }}
            >
              Custom Item
            </Button>
            <Button
              type="button"
              variant={mode === "catalog" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("catalog")}
            >
              From Catalog
            </Button>
          </div>

          {mode === "catalog" ? (
            <div className="space-y-2">
              <Label>Catalog Item</Label>
              <Select value={itemId} onValueChange={handleCatalogSelect}>
                <SelectTrigger><SelectValue placeholder="Select an item" /></SelectTrigger>
                <SelectContent>
                  {items?.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} {item.category ? `(${item.category})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {items?.length === 0 && (
                <p className="text-xs text-muted-foreground">No catalog items yet.</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Item Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Olive Oil"
              />
            </div>
          )}

          {/* Always show name field for catalog mode (pre-filled but editable) */}
          {mode === "catalog" && itemId && (
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Qty</Label>
              <Input type="number" min={0} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Est. Cost</Label>
              <Input type="number" min={0} step="0.01" value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} placeholder="0.00" />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={!name.trim() || createItem.isPending}>
            {createItem.isPending ? "Adding..." : "Add to List"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddShoppingItemDialog;
