import { useState, useMemo, useRef, useEffect } from "react";
import QuickAddItemForm from "./QuickAddItemForm";
import { formatCurrency } from "@/lib/currency";
import { useCreatePurchase, type NewPurchaseLineItem } from "@/hooks/usePurchases";
import { useItems } from "@/hooks/usePantry";
import GroupedUnitSelect from "@/components/shared/GroupedUnitSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { STORAGE_LOCATIONS, SEALED_STATUS_OPTIONS } from "@/lib/pantry-utils";
import { Plus, Trash2, ShoppingBag, Check, ChevronsUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const emptyLine = (): NewPurchaseLineItem => ({
  item_id: "",
  quantity: 1,
  unit: "Unit",
  line_total: null,
  restock: false,
  storage_location: "",
  expiry_date: "",
  sealed_status: "sealed",
  opened_date: "",
});

const AddPurchaseDialog = () => {
  const [open, setOpen] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [purchasedAt, setPurchasedAt] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<NewPurchaseLineItem[]>([emptyLine()]);
  const [openCombobox, setOpenCombobox] = useState<number | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState<number | null>(null);
  const [highlightIdx, setHighlightIdx] = useState<number | null>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const { data: items } = useItems();
  const createPurchase = useCreatePurchase();
  const { toast } = useToast();

  const itemMap = useMemo(() => {
    const map = new Map<string, string>();
    items?.forEach((i) => map.set(i.id, i.name));
    return map;
  }, [items]);

  const reset = () => {
    setStoreName("");
    setPurchasedAt(new Date().toISOString().slice(0, 10));
    setNotes("");
    setLines([emptyLine()]);
    setHighlightIdx(null);
  };

  const updateLine = (idx: number, patch: Partial<NewPurchaseLineItem>) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const removeLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const addLine = () => {
    setLines((p) => [...p, emptyLine()]);
    const newIdx = lines.length;
    setHighlightIdx(newIdx);
    setTimeout(() => {
      lineRefs.current[newIdx]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      setHighlightIdx(null);
    }, 600);
  };

  const handleItemSelect = (idx: number, itemId: string) => {
    const item = items?.find((i) => i.id === itemId);
    updateLine(idx, {
      item_id: itemId,
      unit: item?.default_unit ?? "Unit",
    });
    setOpenCombobox(null);
    setShowQuickAdd(null);
  };

  const handleQuickItemCreated = (idx: number, itemId: string) => {
    handleItemSelect(idx, itemId);
  };

  const totalCost = lines.reduce((sum, l) => sum + (l.line_total ?? 0), 0);
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
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              className="h-16 max-h-32 resize-y"
            />
          </div>

          {/* Line items */}
          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Items</Label>
            {lines.map((line, idx) => (
              <div
                key={idx}
                ref={(el) => { lineRefs.current[idx] = el; }}
                className={cn(
                  "rounded-lg border bg-muted/30 p-3 space-y-2 transition-colors duration-500",
                  highlightIdx === idx && "ring-2 ring-primary/40 bg-primary/5"
                )}
              >
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Catalog Item *</Label>
                    <Popover open={openCombobox === idx} onOpenChange={(v) => { setOpenCombobox(v ? idx : null); if (!v) setShowQuickAdd(null); }}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openCombobox === idx}
                          className="h-9 w-full justify-between text-sm font-normal"
                        >
                          {line.item_id ? itemMap.get(line.item_id) ?? "Select item" : "Select item..."}
                          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        {showQuickAdd === idx ? (
                          <div>
                            <div className="flex items-center justify-between px-3 pt-2">
                              <span className="text-xs font-medium text-muted-foreground">New Catalog Item</span>
                              <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowQuickAdd(null)}>
                                Back
                              </Button>
                            </div>
                            <QuickAddItemForm onCreated={(id) => handleQuickItemCreated(idx, id)} />
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
                                  <CommandItem
                                    key={item.id}
                                    value={item.name}
                                    onSelect={() => handleItemSelect(idx, item.id)}
                                  >
                                    <Check className={cn("mr-2 h-3.5 w-3.5", line.item_id === item.id ? "opacity-100" : "opacity-0")} />
                                    <span>{item.name}</span>
                                    {item.category && (
                                      <span className="ml-auto text-xs text-muted-foreground">{item.category}</span>
                                    )}
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
                    <GroupedUnitSelect value={line.unit} onValueChange={(v) => updateLine(idx, { unit: v })} triggerClassName="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Line Total</Label>
                    <Input type="number" min={0} step="0.01" className="h-9 text-sm" placeholder="e.g. 32" value={line.line_total ?? ""} onChange={(e) => updateLine(idx, { line_total: e.target.value ? Number(e.target.value) : null })} />
                  </div>
                </div>

                {/* Expiry & sealed row */}
                <div className="grid grid-cols-[1.4fr_1fr_1.4fr] gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Expiry Date</Label>
                    <Input type="date" className="h-9 text-sm" value={line.expiry_date ?? ""} onChange={(e) => updateLine(idx, { expiry_date: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Status</Label>
                    <Select value={line.sealed_status ?? "sealed"} onValueChange={(v) => updateLine(idx, { sealed_status: v })}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SEALED_STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {line.sealed_status === "opened" && (
                    <div className="space-y-1">
                      <Label className="text-xs">Opened Date</Label>
                      <Input type="date" className="h-9 text-sm" value={line.opened_date ?? ""} onChange={(e) => updateLine(idx, { opened_date: e.target.value })} />
                    </div>
                  )}
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

            {/* Add Line button at bottom */}
            <Button type="button" variant="outline" size="sm" className="w-full" onClick={addLine}>
              <Plus className="mr-1 h-3 w-3" /> Add Line
            </Button>
          </div>

          {/* Total */}
          {totalCost > 0 && (
            <div className="flex justify-between text-sm font-medium text-foreground border-t pt-3">
              <span>Total</span>
              <span>{formatCurrency(totalCost)}</span>
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
