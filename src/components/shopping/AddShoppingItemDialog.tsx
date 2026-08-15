import { useState } from "react";
import { useCreateShoppingItem } from "@/hooks/useShoppingList";
import { useItems } from "@/hooks/usePantry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CATEGORIES } from "@/lib/pantry-utils";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import ImageUpload from "@/components/shared/ImageUpload";
import GroupedUnitSelect from "@/components/shared/GroupedUnitSelect";

interface Props {
  triggerClassName?: string;
  triggerLabel?: string;
}

const AddShoppingItemDialog = ({
  triggerClassName,
  triggerLabel = "Add Item",
}: Props) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"catalog" | "custom">("custom");
  const [itemId, setItemId] = useState("");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("Piece");
  const [category, setCategory] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const { data: items } = useItems();
  const createItem = useCreateShoppingItem();
  const { toast } = useToast();

  const reset = () => {
    setMode("custom");
    setItemId("");
    setName("");
    setQuantity("1");
    setUnit("Piece");
    setCategory("");
    setEstimatedCost("");
    setImageUrl(null);
  };

  const handleCatalogSelect = (id: string) => {
    setItemId(id);
    const item = items?.find((i) => i.id === id);
    if (item) {
      setName(item.name);
      if (item.default_unit) setUnit(item.default_unit);
      if (item.category) setCategory(item.category);
      if (item.image_url) setImageUrl(item.image_url);
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
        unit: unit || null,
        category: category || null,
        estimated_cost: estimatedCost ? Number(estimatedCost) : null,
        image_url: imageUrl,
      });
      toast({ title: "Added", description: `${name} added to shopping list.` });
      reset();
      setOpen(false);
    } catch (err: unknown) {
      toast({
        title: "Couldn't add item",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button className={cn("min-h-11 rounded-full px-5", triggerClassName)}>
          <Plus className="mr-1.5 h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-[1.75rem]">
        <DialogHeader>
          <DialogTitle className="font-display">Add to Shopping List</DialogTitle>
          <DialogDescription>
            Add something new or choose an item already in your pantry catalog.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={mode === "custom" ? "default" : "outline"}
              className="min-h-11 rounded-xl"
              onClick={() => { setMode("custom"); setItemId(""); }}
            >
              Custom Item
            </Button>
            <Button
              type="button"
              variant={mode === "catalog" ? "default" : "outline"}
              className="min-h-11 rounded-xl"
              onClick={() => setMode("catalog")}
            >
              From Catalog
            </Button>
          </div>

          {mode === "catalog" ? (
            <div className="space-y-2">
              <Label>Catalog Item</Label>
              <Select value={itemId} onValueChange={handleCatalogSelect}>
                <SelectTrigger className="min-h-11 rounded-xl"><SelectValue placeholder="Select an item" /></SelectTrigger>
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
                className="min-h-11 rounded-xl"
              />
            </div>
          )}

          {/* Always show name field for catalog mode (pre-filled but editable) */}
          {mode === "catalog" && itemId && (
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input className="min-h-11 rounded-xl" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}

          <div className="space-y-2">
            <Label>Photo</Label>
            <ImageUpload
              currentUrl={imageUrl}
              folder="shopping"
              onUploaded={setImageUrl}
              onRemoved={() => setImageUrl(null)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-2">
              <Label>Qty</Label>
              <Input className="min-h-11 rounded-xl" type="number" min={0} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <GroupedUnitSelect value={unit} onValueChange={setUnit} triggerClassName="min-h-11 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="min-h-11 rounded-xl"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Est. Cost</Label>
              <Input className="min-h-11 rounded-xl" type="number" min={0} step="0.01" value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} placeholder="0.00" />
            </div>
          </div>

          <Button type="submit" className="min-h-11 w-full rounded-xl" disabled={!name.trim() || createItem.isPending}>
            {createItem.isPending ? "Adding..." : "Add to List"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddShoppingItemDialog;
