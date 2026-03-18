import { useState } from "react";
import { useCreatePurchase, type NewPurchaseLineItem } from "@/hooks/usePurchases";
import { useItems, type Item } from "@/hooks/usePantry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UNITS, STORAGE_LOCATIONS } from "@/lib/pantry-utils";
import { Plus, Trash2, ShoppingBag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const emptyLine = (): NewPurchaseLineItem => ({
  item_id: "",
  quantity: 1,
  unit: "unit",
  unit_price: null,
  restock: false,
  storage_location: "",
});

const AddPurchaseDialog = () => {
  const [open, setOpen] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [purchasedAt, setPurchasedAt] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<NewPurchaseLineItem[]>([emptyLine()]);
  const { data: items } = useItems();
  const createPurchase = useCreatePurchase();
  const { toast } = useToast();

  const reset = () => {
    setStoreName("");
    setPurchasedAt(new Date().toISOString().slice(0, 10));
    setNotes("");
    setLines([emptyLine()]);
  };

  const updateLine = (idx: number, patch: Partial<NewPurchaseLineItem>) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const removeLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleItemSelect = (idx: number, itemId: string) => {
    const item = items?.find((i) => i.id === itemId);
    updateLine(idx, {
      item_id: itemId,
      unit: item?.default_unit ?? "unit",
    });
  };

  const totalCost = lines.reduce((sum, l) => sum + (l.quantity * (l.unit_price ?? 0)), 0);

  const validLines = lines.filter((l) => l.item_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validLines.length === 0) {
      toast({ title: "Error", description: "Add at least one item.", variant: "destructive" });
      return;
    }
    try {
      await createPurchase.mutateAsync({
        store_name: storeName || null,
        purchased_at: purchasedAt ? new Date(purchasedAt).toISOString() : new Date().toISOString(),
        notes: notes || null,
        total_cost: totalCost || null,
        line_items: validLines,
      });
      toast({ title: "Purchase recorded", description: `${validLines.length} item(s) logged.` });
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
          Log Purchase
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Log Purchase</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Store Name</Label>
              <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="e.g. Costco" />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={purchasedAt} onChange={(e) => setPurchasedAt(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." className="h-16 resize-none" />
          </div>

          {/* Line items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setLines((p) => [...p, emptyLine()])}>
                <Plus className="mr-1 h-3 w-3" /> Add Line
              </Button>
            </div>
            {lines.map((line, idx) => (
              <div key={idx} className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Catalog Item *</Label>
                    <Select value={line.item_id} onValueChange={(v) => handleItemSelect(idx, v)}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select item" /></SelectTrigger>
                      <SelectContent>
                        {items?.map((item) => (
                          <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {lines.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="mt-5 h-9 w-9 shrink-0" onClick={() => removeLine(idx)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Qty</Label>
                    <Input type="number" min={0} step="any" className="h-9 text-sm" value={line.quantity} onChange={(e) => updateLine(idx, { quantity: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Unit</Label>
                    <Select value={line.unit} onValueChange={(v) => updateLine(idx, { unit: v })}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {UNITS.map((u) => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Price</Label>
                    <Input type="number" min={0} step="0.01" className="h-9 text-sm" placeholder="$" value={line.unit_price ?? ""} onChange={(e) => updateLine(idx, { unit_price: e.target.value ? Number(e.target.value) : null })} />
                  </div>
                </div>
                {/* Restock toggle */}
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox
                    id={`restock-${idx}`}
                    checked={line.restock}
                    onCheckedChange={(v) => updateLine(idx, { restock: !!v })}
                  />
                  <label htmlFor={`restock-${idx}`} className="text-xs text-muted-foreground cursor-pointer">
                    Add to pantry inventory
                  </label>
                  {line.restock && (
                    <Select value={line.storage_location ?? ""} onValueChange={(v) => updateLine(idx, { storage_location: v })}>
                      <SelectTrigger className="h-7 w-28 text-xs ml-auto"><SelectValue placeholder="Location" /></SelectTrigger>
                      <SelectContent>
                        {STORAGE_LOCATIONS.map((l) => (
                          <SelectItem key={l} value={l}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          {totalCost > 0 && (
            <div className="flex justify-between text-sm font-medium text-foreground border-t pt-3">
              <span>Total</span>
              <span>${totalCost.toFixed(2)}</span>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={createPurchase.isPending}>
            <ShoppingBag className="mr-1.5 h-4 w-4" />
            {createPurchase.isPending ? "Saving..." : "Save Purchase"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddPurchaseDialog;
