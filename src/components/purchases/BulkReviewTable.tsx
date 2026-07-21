import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Combine, ChevronLeft } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { mergeDuplicates, type ParsedLine } from "@/lib/purchase-parser";
import { cn } from "@/lib/utils";

export interface ReviewRow {
  id: string;
  name: string;
  quantity: string;
  quantityUnit: string;
  weight: string;
  weightUnit: string;
  price: string;
  notes: string;
}

let _rid = 0;
const rid = () => `r${_rid++}`;

const num = (s: string | number | null | undefined): string =>
  s == null || s === "" ? "" : String(s);

export const toReviewRows = (lines: ParsedLine[]): ReviewRow[] =>
  lines.map((l) => ({
    id: rid(),
    name: l.name ?? "",
    quantity: num(l.quantity),
    quantityUnit: l.quantityUnit ?? "",
    weight: num(l.weight),
    weightUnit: l.weightUnit ?? "",
    price: num(l.price),
    notes: l.notes ?? "",
  }));

export const emptyReviewRow = (): ReviewRow => ({
  id: rid(), name: "", quantity: "", quantityUnit: "", weight: "", weightUnit: "", price: "", notes: "",
});

const rowToParsed = (r: ReviewRow): ParsedLine => ({
  name: r.name.trim(),
  quantity: r.quantity ? Number(r.quantity) : null,
  quantityUnit: r.quantityUnit.trim() || null,
  weight: r.weight ? Number(r.weight) : null,
  weightUnit: r.weightUnit.trim() || null,
  price: r.price ? Number(r.price) : null,
  notes: r.notes.trim() || null,
  raw: r.name,
});

interface Props {
  rows: ReviewRow[];
  setRows: (rows: ReviewRow[]) => void;
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
  onSave: () => void;
  saving: boolean;
  onBack: () => void;
}

const cell =
  "h-9 rounded-lg border border-input bg-background/60 backdrop-blur-sm px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const BulkReviewTable = ({ rows, setRows, selected, setSelected, onSave, saving, onBack }: Props) => {
  const total = rows.reduce((s, r) => s + (r.price ? Number(r.price) : 0), 0);
  const allSelected = rows.length > 0 && selected.size === rows.length;

  const update = (id: string, patch: Partial<ReviewRow>) =>
    setRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const removeRow = (id: string) => {
    setRows(rows.filter((r) => r.id !== id));
    const next = new Set(selected); next.delete(id); setSelected(next);
  };

  const removeSelected = () => {
    setRows(rows.filter((r) => !selected.has(r.id)));
    setSelected(new Set());
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));

  const merge = () => {
    const merged = mergeDuplicates(rows.map(rowToParsed));
    setRows(toReviewRows(merged));
    setSelected(new Set());
  };

  const dupCount = rows.length - new Set(rows.map((r) => r.name.trim().toLowerCase()).filter(Boolean)).size;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onBack} className="h-8 px-2 text-muted-foreground">
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <span className="text-sm text-muted-foreground">
          {rows.length} item{rows.length !== 1 ? "s" : ""}
          {selected.size > 0 && <> · {selected.size} selected</>}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {selected.size > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={removeSelected} className="h-8 px-2 text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4 mr-1" /> Remove
            </Button>
          )}
          <Button
            type="button" variant="outline" size="sm" onClick={merge} disabled={dupCount <= 0}
            className="h-8 px-2.5"
            title={dupCount > 0 ? `Merge ${dupCount} duplicate row${dupCount !== 1 ? "s" : ""}` : "No duplicate names"}
          >
            <Combine className="h-4 w-4 mr-1" /> Merge duplicates
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <div className="min-w-[720px]">
          {/* Header */}
          <div className="grid grid-cols-[32px_minmax(120px,1.6fr)_repeat(2,minmax(64px,0.8fr))_repeat(2,minmax(64px,0.8fr))_minmax(72px,0.8fr)_minmax(120px,1.2fr)_32px] items-center gap-1.5 bg-secondary/60 px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
            <span>Item</span>
            <span>Qty</span>
            <span>Unit</span>
            <span>Weight</span>
            <span>W. unit</span>
            <span>Price</span>
            <span>Notes</span>
            <span />
          </div>
          {/* Rows */}
          <div className="max-h-[46vh] overflow-y-auto divide-y divide-border">
            {rows.map((r) => (
              <div
                key={r.id}
                className={cn(
                  "grid grid-cols-[32px_minmax(120px,1.6fr)_repeat(2,minmax(64px,0.8fr))_repeat(2,minmax(64px,0.8fr))_minmax(72px,0.8fr)_minmax(120px,1.2fr)_32px] items-center gap-1.5 px-2.5 py-1.5",
                  selected.has(r.id) && "bg-primary/5"
                )}
              >
                <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} aria-label={`Select ${r.name}`} />
                <input className={cn(cell, "font-medium")} value={r.name} placeholder="Item name" onChange={(e) => update(r.id, { name: e.target.value })} />
                <input className={cn(cell, "tabular-nums")} value={r.quantity} inputMode="decimal" placeholder="—" onChange={(e) => update(r.id, { quantity: e.target.value })} />
                <input className={cell} value={r.quantityUnit} placeholder="pcs" onChange={(e) => update(r.id, { quantityUnit: e.target.value })} />
                <input className={cn(cell, "tabular-nums")} value={r.weight} inputMode="decimal" placeholder="—" onChange={(e) => update(r.id, { weight: e.target.value })} />
                <input className={cell} value={r.weightUnit} placeholder="kg" onChange={(e) => update(r.id, { weightUnit: e.target.value })} />
                <input className={cn(cell, "tabular-nums")} value={r.price} inputMode="decimal" placeholder="0.00" onChange={(e) => update(r.id, { price: e.target.value })} />
                <input className={cell} value={r.notes} placeholder="—" onChange={(e) => update(r.id, { notes: e.target.value })} />
                <button type="button" onClick={() => removeRow(r.id)} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Remove ${r.name}`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {rows.length === 0 && (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">No items to review.</div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={() => setRows([...rows, emptyReviewRow()])} className="text-muted-foreground">
          + Add row
        </Button>
        <div className="flex items-center gap-4">
          {total > 0 && (
            <span className="text-sm text-muted-foreground">
              Total <span className="font-bold tabular-nums text-foreground">{formatCurrency(total)}</span>
            </span>
          )}
          <Button type="button" onClick={onSave} disabled={saving || rows.length === 0} className="gradient-cool border-0">
            {saving ? "Saving…" : `Save ${rows.length} item${rows.length !== 1 ? "s" : ""}`}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BulkReviewTable;
