import { useState } from "react";
import { useCreateShoppingItem } from "@/hooks/useShoppingList";
import { useItems } from "@/hooks/usePantry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { parseBulkNotes } from "@/lib/purchase-parser";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CATEGORIES } from "@/lib/pantry-utils";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import ImageUpload from "@/components/shared/ImageUpload";
import GroupedUnitSelect from "@/components/shared/GroupedUnitSelect";

interface Props {
  triggerClassName?: string;
  triggerLabel?: string;
}

const BULK_PLACEHOLDER = `Item, quantity, unit, price

Tomatoes, 6 pieces, 14
Spinach, 1 bunch, 5
Milk, 2 bottles, 8
Rice, 5 kg, 30`;

interface BulkRow {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  cost: string;
}

const AddShoppingItemDialog = ({
  triggerClassName,
  triggerLabel = "Add Item",
}: Props) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"single" | "bulk">("single");
  const [bulkText, setBulkText] = useState("");
  const [bulkRows, setBulkRows] = useState<BulkRow[] | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [mode, setMode] = useState<"catalog" | "custom">("custom");
  const [itemId, setItemId] = useState("");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("Piece");
  const [category, setCategory] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [basket, setBasket] = useState("");
  const [notes, setNotes] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const { data: items } = useItems();
  const createItem = useCreateShoppingItem();
  const { toast } = useToast();

  const reset = () => {
    setMode("custom");
    setTab("single");
    setBulkText("");
    setBulkRows(null);
    setBulkSaving(false);
    setItemId("");
    setName("");
    setQuantity("1");
    setUnit("Piece");
    setCategory("");
    setEstimatedCost("");
    setBasket("");
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

  const analyseBulk = () => {
    const parsed = parseBulkNotes(bulkText);
    if (parsed.length === 0) {
      toast({ title: "Nothing to add", description: "Add some items first.", variant: "destructive" });
      return;
    }
    setBulkRows(
      parsed.map((p, i) => ({
        id: `${i}-${p.name}`,
        name: p.name,
        quantity: p.quantity != null ? String(p.quantity) : p.weight != null ? String(p.weight) : "1",
        unit: p.quantityUnit || p.weightUnit || "Piece",
        cost: p.price != null ? String(p.price) : "",
      })),
    );
  };

  const saveBulk = async () => {
    const rows = (bulkRows ?? []).filter((r) => r.name.trim());
    if (rows.length === 0) return;
    setBulkSaving(true);
    try {
      for (const r of rows) {
        await createItem.mutateAsync({
          name: r.name.trim(),
          item_id: null,
          quantity: r.quantity ? Number(r.quantity) : 1,
          unit: r.unit || null,
          category: null,
          estimated_cost: r.cost ? Number(r.cost) : null,
          basket: basket.trim() ? basket.trim() : null,
          image_url: null,
        });
      }
      toast({ title: "Added", description: `${rows.length} item${rows.length !== 1 ? "s" : ""} added to your shopping list.` });
      reset();
      setOpen(false);
    } catch (err: unknown) {
      toast({
        title: "Couldn't add items",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBulkSaving(false);
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
        basket: basket.trim() ? basket.trim() : null,
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
      <DialogContent className={cn("max-h-[88vh] overflow-y-auto rounded-[1.75rem]", bulkRows ? "max-w-2xl" : "max-w-md")}>
        <DialogHeader>
          <DialogTitle className="font-display">Add to Shopping List</DialogTitle>
          <DialogDescription>
            Add one item, or paste a whole list at once.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "single" | "bulk")}>
          <TabsList className="grid min-h-12 w-full grid-cols-2 rounded-xl">
            <TabsTrigger value="single" className="min-h-10 rounded-lg">Single Item</TabsTrigger>
            <TabsTrigger value="bulk" className="min-h-10 rounded-lg">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Bulk Paste
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bulk" className="space-y-3">
            <div className="space-y-2">
              <Label>Basket (optional)</Label>
              <Input
                className="min-h-11 rounded-xl"
                value={basket}
                onChange={(e) => setBasket(e.target.value)}
                placeholder="e.g. Carrefour, Amazon, Corner shop"
              />
            </div>
            {bulkRows ? (
              <>
                <div className="space-y-2">
                  {bulkRows.map((r) => (
                    <div key={r.id} className="grid grid-cols-[1fr_4.5rem_7rem_5.5rem_2rem] items-center gap-2">
                      <Input
                        className="min-h-10 rounded-xl"
                        value={r.name}
                        onChange={(e) => setBulkRows((rows) => rows!.map((x) => (x.id === r.id ? { ...x, name: e.target.value } : x)))}
                      />
                      <Input
                        className="min-h-10 rounded-xl"
                        type="number" min={0} step="any"
                        value={r.quantity}
                        onChange={(e) => setBulkRows((rows) => rows!.map((x) => (x.id === r.id ? { ...x, quantity: e.target.value } : x)))}
                      />
                      <GroupedUnitSelect
                        value={r.unit}
                        onValueChange={(v) => setBulkRows((rows) => rows!.map((x) => (x.id === r.id ? { ...x, unit: v } : x)))}
                        triggerClassName="min-h-10 rounded-xl"
                      />
                      <Input
                        className="min-h-10 rounded-xl"
                        type="number" min={0} step="0.01" placeholder="Total"
                        value={r.cost}
                        onChange={(e) => setBulkRows((rows) => rows!.map((x) => (x.id === r.id ? { ...x, cost: e.target.value } : x)))}
                      />
                      <Button
                        type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-lg"
                        onClick={() => setBulkRows((rows) => rows!.filter((x) => x.id !== r.id))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="min-h-11 flex-1 rounded-xl" onClick={() => setBulkRows(null)}>
                    Back
                  </Button>
                  <Button type="button" className="min-h-11 flex-1 rounded-xl" onClick={saveBulk} disabled={bulkSaving}>
                    {bulkSaving ? "Adding…" : `Add ${bulkRows.length} item${bulkRows.length !== 1 ? "s" : ""}`}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  One item per line — <span className="font-medium text-foreground">Item, quantity, price</span>. Anything in (brackets) is ignored.
                </p>
                <Textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={BULK_PLACEHOLDER}
                  className="min-h-[180px] resize-y font-mono text-sm leading-relaxed placeholder:text-muted-foreground/50"
                />
                <Button type="button" onClick={analyseBulk} disabled={!bulkText.trim()} className="min-h-11 w-full rounded-xl">
                  <Sparkles className="mr-1.5 h-4 w-4" /> Review List
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="single">
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
              <Label>Total Price</Label>
              <Input className="min-h-11 rounded-xl" type="number" min={0} step="0.01" value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} placeholder="0.00" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Basket (optional)</Label>
            <Input
              className="min-h-11 rounded-xl"
              value={basket}
              onChange={(e) => setBasket(e.target.value)}
              placeholder="e.g. Carrefour, Amazon, Corner shop"
            />
            <p className="text-xs text-muted-foreground">
              Group this trip under a named basket — store, location or online order.
            </p>
          </div>

          <Button type="submit" className="min-h-11 w-full rounded-xl" disabled={!name.trim() || createItem.isPending}>
            {createItem.isPending ? "Adding..." : "Add to List"}
          </Button>
        </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AddShoppingItemDialog;
