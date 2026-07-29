import { useState } from "react";
import { formatCurrency } from "@/lib/currency";
import { useCreatePurchase, type NewPurchaseLineItem } from "@/hooks/usePurchases";
import { useReceiptScan } from "@/hooks/useReceiptScan";
import { parseBulkNotes } from "@/lib/purchase-parser";
import ManualLinesEditor, { manualEmptyLine } from "./ManualLinesEditor";
import BulkReviewTable, { toReviewRows, type ReviewRow } from "./BulkReviewTable";
import ReceiptImagePicker from "./ReceiptImagePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, ShoppingBag, Sparkles, ScanLine, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const BULK_PLACEHOLDER = `Item, quantity, weight, price

Tomatoes, 6 pieces, 1 kg, 14
Spinach, 1 bunch, 500 g, 5
Avocado, 4 pieces, 1.2 kg, 18
Potatoes, 8 pieces, 2 kg, 16`;

type Tab = "bulk" | "scan" | "manual";

const today = () => new Date().toISOString().slice(0, 10);

interface AddPurchaseDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
  triggerClassName?: string;
  triggerLabel?: string;
}

const AddPurchaseDialog = ({
  open: controlledOpen,
  onOpenChange,
  hideTrigger,
  triggerClassName,
  triggerLabel = "Log Purchase",
}: AddPurchaseDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (v: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(v);
    onOpenChange?.(v);
  };
  const [tab, setTab] = useState<Tab>("bulk");

  // Session-level fields — applied to every item in this purchase.
  const [storeName, setStoreName] = useState("");
  const [purchasedAt, setPurchasedAt] = useState(today());
  const [notes, setNotes] = useState("");

  // Bulk paste + scan feed a shared review table.
  const [bulkText, setBulkText] = useState("");
  const [reviewRows, setReviewRows] = useState<ReviewRow[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Manual fallback.
  const [manualLines, setManualLines] = useState<NewPurchaseLineItem[]>([manualEmptyLine()]);

  const createPurchase = useCreatePurchase();
  const {
    scan,
    isScanning,
    scanStage,
    error: scanError,
    setError: setScanError,
  } = useReceiptScan();
  const { toast } = useToast();

  const inReview = (tab === "bulk" || tab === "scan") && reviewRows !== null;

  const reset = () => {
    setTab("bulk");
    setStoreName(""); setPurchasedAt(today()); setNotes("");
    setBulkText(""); setReviewRows(null); setSelected(new Set());
    setManualLines([manualEmptyLine()]);
    setScanError(null);
  };

  const analyseBulk = () => {
    const rows = toReviewRows(parseBulkNotes(bulkText));
    if (rows.length === 0) {
      toast({ title: "Nothing to analyse", description: "Add some items first.", variant: "destructive" });
      return;
    }
    setReviewRows(rows);
    setSelected(new Set());
  };

  const handleScanFiles = async (files: File[]) => {
    const result = await scan(files);
    if (!result) return;
    if (result.items.length === 0) {
      toast({
        title: "No items found",
        description: "We couldn't find receipt line items in those images.",
        variant: "destructive",
      });
      return;
    }
    if (!storeName && result.storeName) setStoreName(result.storeName);
    if (result.purchasedAt) setPurchasedAt(result.purchasedAt.slice(0, 10));
    setReviewRows(toReviewRows(result.items));
    setSelected(new Set());
  };

  const buildFromReview = (rows: ReviewRow[]): NewPurchaseLineItem[] =>
    rows
      .filter((r) => r.name.trim())
      .map((r) => ({
        name: r.name.trim(),
        quantity: r.quantity ? Number(r.quantity) : 1,
        unit: r.quantityUnit.trim() || "unit",
        line_total: r.price ? Number(r.price) : null,
        weight: r.weight ? Number(r.weight) : null,
        weight_unit: r.weightUnit.trim() || null,
        notes: r.notes.trim() || null,
        restock: false,
      }));

  const save = async (lineItems: NewPurchaseLineItem[]) => {
    if (lineItems.length === 0) {
      toast({ title: "Error", description: "Add at least one item.", variant: "destructive" });
      return;
    }
    const totalCost = lineItems.reduce((s, l) => s + (l.line_total ?? 0), 0);
    try {
      const result = await createPurchase.mutateAsync({
        store_name: storeName || null,
        purchased_at: purchasedAt ? new Date(purchasedAt).toISOString() : new Date().toISOString(),
        notes: notes || null,
        total_cost: totalCost || null,
        line_items: lineItems,
      });
      const n = (result as { pantryAdded?: number })?.pantryAdded ?? lineItems.length;
      toast({ title: "Purchase saved", description: `${n} item${n !== 1 ? "s" : ""} added to your Pantry.` });
      reset();
      setOpen(false);
    } catch (err: unknown) {
      toast({
        title: "Couldn't save purchase",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const saveReview = () => reviewRows && save(buildFromReview(reviewRows));
  const saveManual = () => save(manualLines.filter((l) => l.item_id));

  const manualTotal = manualLines.reduce((s, l) => s + (l.line_total ?? 0), 0);

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button className={cn("min-h-11 rounded-full px-5", triggerClassName)}>
            <Plus className="mr-1.5 h-4 w-4" />
            {triggerLabel}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className={cn("max-h-[88vh] overflow-y-auto rounded-[1.75rem]", inReview ? "max-w-3xl" : "max-w-lg")}>
        <DialogHeader>
          <DialogTitle className="font-display">Log Purchase</DialogTitle>
          <DialogDescription>
            Capture a shopping trip and add its items to your pantry.
          </DialogDescription>
        </DialogHeader>

        {/* Session fields — apply to every item */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Store / Market</Label>
              <Input className="min-h-11 rounded-xl" value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="e.g. Waterfront Market" />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input className="min-h-11 rounded-xl" type="date" value={purchasedAt} onChange={(e) => setPurchasedAt(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="General notes for this trip…" className="min-h-20 max-h-28 resize-y rounded-xl" />
          </div>
        </div>

        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Package className="h-3.5 w-3.5 shrink-0 text-primary" /> Every item is added to your Pantry automatically on save.
        </p>

        {inReview ? (
          <div className="mt-4">
            <BulkReviewTable
              rows={reviewRows!}
              setRows={(r) => setReviewRows(r)}
              selected={selected}
              setSelected={setSelected}
              onSave={saveReview}
              saving={createPurchase.isPending}
              onBack={() => setReviewRows(null)}
            />
          </div>
        ) : (
          <Tabs value={tab} onValueChange={(v) => { setTab(v as Tab); setReviewRows(null); }} className="mt-4">
            <TabsList className="grid min-h-12 w-full grid-cols-3 rounded-xl">
              <TabsTrigger value="bulk" className="min-h-10 rounded-lg">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                <span className="sm:hidden">Paste</span>
                <span className="hidden sm:inline">Bulk Paste</span>
              </TabsTrigger>
              <TabsTrigger value="scan" className="min-h-10 rounded-lg">
                <ScanLine className="mr-1.5 h-3.5 w-3.5" />
                <span className="sm:hidden">Scan</span>
                <span className="hidden sm:inline">Scan Receipt</span>
              </TabsTrigger>
              <TabsTrigger value="manual" className="min-h-10 rounded-lg">Manual</TabsTrigger>
            </TabsList>

            {/* Bulk paste */}
            <TabsContent value="bulk" className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Paste your list — one item per line. Structure it as <span className="font-medium text-foreground">Item, quantity, weight, price</span>.
                Anything in (brackets) is kept as a note.
              </p>
              <Textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={BULK_PLACEHOLDER}
                className="min-h-[180px] font-mono text-sm leading-relaxed resize-y placeholder:text-muted-foreground/50"
              />
              <Button type="button" onClick={analyseBulk} disabled={!bulkText.trim()} className="w-full gradient-cool border-0">
                <Sparkles className="mr-1.5 h-4 w-4" /> Analyse List
              </Button>
            </TabsContent>

            {/* Scan receipt */}
            <TabsContent value="scan" className="space-y-3">
              <ReceiptImagePicker
                isScanning={isScanning}
                scanStage={scanStage}
                scanError={scanError}
                onScan={handleScanFiles}
              />
            </TabsContent>

            {/* Manual */}
            <TabsContent value="manual" className="space-y-3">
              <ManualLinesEditor lines={manualLines} setLines={setManualLines} />
              {manualTotal > 0 && (
                <div className="flex justify-between border-t pt-3 text-sm font-medium">
                  <span>Total</span>
                  <span className="tabular-nums">{formatCurrency(manualTotal)}</span>
                </div>
              )}
              <Button type="button" onClick={saveManual} disabled={createPurchase.isPending} className="w-full">
                <ShoppingBag className="mr-1.5 h-4 w-4" />
                {createPurchase.isPending ? "Saving…" : "Save Purchase"}
              </Button>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddPurchaseDialog;
