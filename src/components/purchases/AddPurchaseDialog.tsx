import { useRef, useState } from "react";
import { formatCurrency } from "@/lib/currency";
import { useCreatePurchase, type NewPurchaseLineItem } from "@/hooks/usePurchases";
import { useReceiptScan } from "@/hooks/useReceiptScan";
import { parseBulkNotes } from "@/lib/purchase-parser";
import ManualLinesEditor, { manualEmptyLine } from "./ManualLinesEditor";
import BulkReviewTable, { toReviewRows, type ReviewRow } from "./BulkReviewTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ShoppingBag, Sparkles, Camera, Loader2, ScanLine, Package } from "lucide-react";
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
}

const AddPurchaseDialog = ({ open: controlledOpen, onOpenChange, hideTrigger }: AddPurchaseDialogProps) => {
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

  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const createPurchase = useCreatePurchase();
  const { scan, isScanning, error: scanError, setError: setScanError } = useReceiptScan();
  const { toast } = useToast();

  const inReview = (tab === "bulk" || tab === "scan") && reviewRows !== null;

  const reset = () => {
    setTab("bulk");
    setStoreName(""); setPurchasedAt(today()); setNotes("");
    setBulkText(""); setReviewRows(null); setSelected(new Set());
    setManualLines([manualEmptyLine()]);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
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

  const handleScanFile = async (file: File) => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    const result = await scan(file);
    if (!result) return;
    if (result.items.length === 0) {
      toast({ title: "No items found", description: "Couldn't read line items from that image.", variant: "destructive" });
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
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const saveReview = () => reviewRows && save(buildFromReview(reviewRows));
  const saveManual = () => save(manualLines.filter((l) => l.item_id));

  const manualTotal = manualLines.reduce((s, l) => s + (l.line_total ?? 0), 0);

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            Log Purchase
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className={cn("max-h-[88vh] overflow-y-auto", inReview ? "max-w-3xl" : "max-w-lg")}>
        <DialogHeader>
          <DialogTitle className="font-display">Log Purchase</DialogTitle>
        </DialogHeader>

        {/* Session fields — apply to every item */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Store / Market</Label>
              <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="e.g. Waterfront Market" />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={purchasedAt} onChange={(e) => setPurchasedAt(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="General notes for this trip…" className="h-14 max-h-28 resize-y" />
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="bulk"><Sparkles className="mr-1.5 h-3.5 w-3.5" /> Bulk Paste</TabsTrigger>
              <TabsTrigger value="scan"><ScanLine className="mr-1.5 h-3.5 w-3.5" /> Scan Receipt</TabsTrigger>
              <TabsTrigger value="manual">Manual</TabsTrigger>
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
              <p className="text-xs text-muted-foreground">
                Snap or upload a supermarket receipt — we'll read the line items into an editable table.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleScanFile(f); e.target.value = ""; }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={isScanning}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background/40 px-4 py-10 text-center transition-colors hover:bg-secondary/50 disabled:opacity-70"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Reading receipt…</span>
                  </>
                ) : (
                  <>
                    {preview ? (
                      <img src={preview} alt="Receipt preview" className="mb-1 max-h-28 rounded-lg object-contain" />
                    ) : (
                      <Camera className="h-7 w-7 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium text-foreground">{preview ? "Scan another photo" : "Take / upload receipt photo"}</span>
                    <span className="text-xs text-muted-foreground">JPG or PNG</span>
                  </>
                )}
              </button>
              {scanError && <p className="text-xs text-destructive">{scanError}</p>}
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
