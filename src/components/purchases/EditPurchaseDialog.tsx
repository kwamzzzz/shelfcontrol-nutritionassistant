import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import QuickAddItemForm from "./QuickAddItemForm";
import { formatCurrency } from "@/lib/currency";
import { useUpdatePurchase, type PurchaseWithItems, type NewPurchaseLineItem } from "@/hooks/usePurchases";
import { useItems } from "@/hooks/usePantry";
import GroupedUnitSelect from "@/components/shared/GroupedUnitSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { SEALED_STATUS_OPTIONS, STORAGE_LOCATIONS } from "@/lib/pantry-utils";
import { Plus, Trash2, Save, Check, ChevronsUpDown, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  purchase: PurchaseWithItems;
  open: boolean;
  onClose: () => void;
}

type LinkedInventoryRow = {
  item_id: string;
  quantity: number;
  unit: string;
  expiry_date: string | null;
  storage_location: string | null;
};

const normalizeQty = (value: number | string | null | undefined) => Number(value ?? 0).toString();
const makeLineKey = (itemId: string, quantity: number, unit: string, expiryDate?: string | null) =>
  `${itemId}::${normalizeQty(quantity)}::${unit}::${expiryDate ?? ""}`;

const toBaseLine = (pi: PurchaseWithItems["purchase_items"][number]): NewPurchaseLineItem => ({
  item_id: pi.item_id,
  quantity: Number(pi.quantity),
  unit: pi.unit,
  line_total: pi.unit_price != null ? Number(pi.unit_price) : null,
  restock: false,
  storage_location: "",
  expiry_date: (pi as any).expiry_date ?? "",
  sealed_status: (pi as any).sealed_status ?? "sealed",
  opened_date: (pi as any).opened_date ?? "",
});

const hydrateRestockState = (lines: NewPurchaseLineItem[], linkedInventory: LinkedInventoryRow[]): NewPurchaseLineItem[] => {
  const buckets = new Map<string, string[]>();

  linkedInventory.forEach((inv) => {
    const key = makeLineKey(inv.item_id, Number(inv.quantity), inv.unit, inv.expiry_date);
    const existing = buckets.get(key) ?? [];
    existing.push(inv.storage_location ?? "");
    buckets.set(key, existing);
  });

  return lines.map((line) => {
    const key = makeLineKey(line.item_id, line.quantity, line.unit, line.expiry_date);
    const matches = buckets.get(key);

    if (matches && matches.length > 0) {
      const storageLocation = matches.shift() ?? "";
      return {
        ...line,
        restock: true,
        storage_location: storageLocation,
      };
    }

    return {
      ...line,
      restock: false,
      storage_location: line.storage_location ?? "",
    };
  });
};

const EditPurchaseDialog = ({ purchase, open, onClose }: Props) => {
  const [storeName, setStoreName] = useState(purchase.store_name ?? "");
  const [purchasedAt, setPurchasedAt] = useState(purchase.purchased_at?.slice(0, 10) ?? "");
  const [notes, setNotes] = useState(purchase.notes ?? "");
  const [lines, setLines] = useState<NewPurchaseLineItem[]>(() => purchase.purchase_items?.map(toBaseLine) ?? []);
  const [openCombobox, setOpenCombobox] = useState<number | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState<number | null>(null);
  const [highlightIdx, setHighlightIdx] = useState<number | null>(null);
  const [restockHydrated, setRestockHydrated] = useState(false);

  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  const { data: items } = useItems();
  const updatePurchase = useUpdatePurchase();
  const { toast } = useToast();

  const {
    data: linkedInventory = [],
    isLoading: isLoadingLinkedInventory,
    isError: isLinkedInventoryError,
  } = useQuery({
    queryKey: ["purchase-linked-inventory", purchase.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select("item_id, quantity, unit, expiry_date, storage_location")
        .eq("purchase_id", purchase.id);

      if (error) throw error;
      return (data ?? []) as unknown as LinkedInventoryRow[];
    },
    enabled: open && !!purchase.id,
  });

  useEffect(() => {
    if (!open) return;
    setStoreName(purchase.store_name ?? "");
    setPurchasedAt(purchase.purchased_at?.slice(0, 10) ?? "");
    setNotes(purchase.notes ?? "");
    setLines(purchase.purchase_items?.map(toBaseLine) ?? []);
    setRestockHydrated(false);
  }, [open, purchase]);

  useEffect(() => {
    if (!open || restockHydrated || isLoadingLinkedInventory) return;

    setLines((prev) => hydrateRestockState(prev, linkedInventory));
    setRestockHydrated(true);
  }, [open, restockHydrated, isLoadingLinkedInventory, linkedInventory]);

  const itemMap = useMemo(() => {
    const map = new Map<string, string>();
    items?.forEach((i) => map.set(i.id, i.name));
    return map;
  }, [items]);

  const updateLine = (idx: number, patch: Partial<NewPurchaseLineItem>) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const removeLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const addLine = () => {
    const newLine: NewPurchaseLineItem = {
      item_id: "",
      quantity: 1,
      unit: "Unit",
      line_total: null,
      restock: false,
      storage_location: "",
      expiry_date: "",
      sealed_status: "sealed",
      opened_date: "",
    };

    setLines((p) => [...p, newLine]);
    const newIdx = lines.length;
    setHighlightIdx(newIdx);

    setTimeout(() => {
      lineRefs.current[newIdx]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      setHighlightIdx(null);
    }, 600);
  };

  const handleItemSelect = (idx: number, itemId: string) => {
    const item = items?.find((i) => i.id === itemId);
    updateLine(idx, { item_id: itemId, unit: item?.default_unit ?? "Unit" });
    setOpenCombobox(null);
    setShowQuickAdd(null);
  };

  const totalCost = lines.reduce((sum, l) => sum + (l.line_total ?? 0), 0);
  const validLines = lines.filter((l) => l.item_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoadingLinkedInventory || !restockHydrated) {
      toast({
        title: "Please wait",
        description: "Still loading linked pantry restock state for this purchase.",
        variant: "destructive",
      });
      return;
    }

    if (isLinkedInventoryError) {
      toast({
        title: "Cannot verify restock state",
        description: "Could not load linked pantry entries. Please try again before saving.",
        variant: "destructive",
      });
      return;
    }

    try {
      await updatePurchase.mutateAsync({
        id: purchase.id,
        store_name: storeName || null,
        purchased_at: purchasedAt ? new Date(purchasedAt).toISOString() : new Date().toISOString(),
        notes: notes || null,
        total_cost: totalCost || null,
        line_items: validLines,
      });

      toast({ title: "Updated", description: "Purchase updated and pantry reconciled." });
      onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Edit Purchase</DialogTitle>
        </DialogHeader>

        <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">Pantry reconciliation</p>
            <p>Saving removes pantry entries previously linked to this purchase, then recreates them from lines marked "Add to pantry".</p>
            {isLoadingLinkedInventory ? <p className="mt-1">Detecting existing restocked lines…</p> : null}
          </div>
        </div>

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
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." className="h-16 max-h-32 resize-y" />
          </div>

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
                        <Button variant="outline" role="combobox" className="h-9 w-full justify-between text-sm font-normal">
                          {line.item_id ? itemMap.get(line.item_id) ?? "Select item" : "Select item..."}
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
                                    <Check className={cn("mr-2 h-3.5 w-3.5", line.item_id === item.id ? "opacity-100" : "opacity-0")} />
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

                <div className="grid grid-cols-3 gap-2">
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

                <div className="flex items-center gap-2 pt-1">
                  <Checkbox
                    id={`edit-restock-${idx}`}
                    checked={line.restock}
                    onCheckedChange={(v) => updateLine(idx, { restock: !!v })}
                  />
                  <label htmlFor={`edit-restock-${idx}`} className="text-xs text-muted-foreground cursor-pointer">
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

            <Button type="button" variant="outline" size="sm" className="w-full" onClick={addLine}>
              <Plus className="mr-1 h-3 w-3" /> Add Line
            </Button>
          </div>

          {totalCost > 0 && (
            <div className="flex justify-between text-sm font-medium text-foreground border-t pt-3">
              <span>Total</span>
              <span>{formatCurrency(totalCost)}</span>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={updatePurchase.isPending || isLoadingLinkedInventory || !restockHydrated}>
            <Save className="mr-1.5 h-4 w-4" />
            {updatePurchase.isPending ? "Saving..." : "Update Purchase"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditPurchaseDialog;
