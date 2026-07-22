import { useMemo, useState } from "react";
import { format, parseISO, isBefore } from "date-fns";
import { useAllInventory, useArchiveInventory, useUndoCleanup, useUpdateInventory } from "@/hooks/usePantry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Recycle, Archive, RotateCcw, CheckCircle2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Items whose most recent purchase date is before this are cleaned up; July stays.
const CUTOFF_ISO = "2026-07-01";
const LAST_BATCH_KEY = "sc:last-cleanup-batch";

const Stat = ({ label, value, tone }: { label: string; value: number; tone?: string }) => (
  <div className="rounded-xl border border-border bg-card p-3 text-center">
    <p className={`text-2xl font-bold tabular-nums ${tone ?? "text-foreground"}`}>{value}</p>
    <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
  </div>
);

const PantryCleanupDialog = () => {
  const { data: all } = useAllInventory();
  const archive = useArchiveInventory();
  const undo = useUndoCleanup();
  const updateInv = useUpdateInventory();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<{ batch: string; count: number } | null>(null);
  const [lastBatch, setLastBatch] = useState<string | null>(() => localStorage.getItem(LAST_BATCH_KEY));

  const active = useMemo(() => (all ?? []).filter((r) => r.status === "active"), [all]);
  const cutoff = parseISO(CUTOFF_ISO);

  const { remove, retained, review, range } = useMemo(() => {
    const remove: typeof active = [], retained: typeof active = [], review: typeof active = [];
    let min: Date | null = null, max: Date | null = null;
    for (const r of active) {
      const pd = r.purchases?.purchased_at ?? null;
      if (!pd) { review.push(r); continue; }
      const d = parseISO(pd);
      if (isBefore(d, cutoff)) {
        remove.push(r);
        if (!min || d < min) min = d;
        if (!max || d > max) max = d;
      } else retained.push(r);
    }
    return { remove, retained, review, range: min && max ? { min, max } : null };
  }, [active]);

  const runCleanup = async () => {
    const batch = crypto.randomUUID();
    await archive.mutateAsync({ ids: remove.map((r) => r.id), batch });
    localStorage.setItem(LAST_BATCH_KEY, batch);
    setLastBatch(batch);
    setDone({ batch, count: remove.length });
    toast({ title: "Pantry cleaned", description: `${remove.length} item${remove.length !== 1 ? "s" : ""} archived.` });
  };

  const undoCleanup = async (batch: string) => {
    await undo.mutateAsync(batch);
    localStorage.removeItem(LAST_BATCH_KEY);
    setLastBatch(null);
    setDone(null);
    toast({ title: "Cleanup undone", description: "Items restored to your pantry." });
  };

  const archiveOne = async (id: string) => {
    await archive.mutateAsync({ ids: [id], batch: crypto.randomUUID(), reason: "pantry cleanup (review)" });
  };
  const assignDate = (id: string, val: string) => {
    if (val) updateInv.mutate({ id, added_at: new Date(val).toISOString() } as never);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setDone(null); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Recycle className="h-4 w-4" /> Cleanup
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Recycle className="h-5 w-5 text-primary" /> Bulk Pantry Cleanup
          </DialogTitle>
          <DialogDescription>
            Archives items purchased before <strong>1 July 2026</strong> — July purchases stay. Nothing is deleted:
            archived items leave the active pantry but keep their history, photos and purchase records.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="space-y-4 py-2 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            <p className="text-lg font-medium text-foreground">{done.count} item{done.count !== 1 ? "s" : ""} archived</p>
            <p className="text-sm text-muted-foreground">They've left your active pantry. Changed your mind?</p>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={() => undoCleanup(done.batch)} disabled={undo.isPending} className="gap-1.5">
                <RotateCcw className="h-4 w-4" /> Undo Cleanup
              </Button>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="To archive" value={remove.length} tone="text-destructive" />
              <Stat label="July kept" value={retained.length} tone="text-primary" />
              <Stat label="Needs review" value={review.length} tone="text-warning" />
            </div>

            {range && (
              <p className="text-center text-sm text-muted-foreground">
                Affected purchases: {format(range.min, "MMM d, yyyy")} – {format(range.max, "MMM d, yyyy")}
              </p>
            )}

            {review.length > 0 && (
              <div className="rounded-xl border border-warning/40 bg-warning/[0.06] p-3 space-y-2">
                <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <AlertTriangle className="h-4 w-4 text-warning" /> {review.length} item{review.length !== 1 ? "s" : ""} with no purchase date
                </p>
                <p className="text-xs text-muted-foreground">These aren't touched automatically — keep, assign a date, or archive each.</p>
                <div className="max-h-40 space-y-1.5 overflow-y-auto">
                  {review.map((r) => (
                    <div key={r.id} className="flex items-center gap-2 rounded-lg bg-card px-2.5 py-1.5">
                      <span className="min-w-0 flex-1 truncate text-sm">{r.items?.name ?? "Unknown"}</span>
                      <Input type="date" onChange={(e) => assignDate(r.id, e.target.value)} className="h-7 w-[130px] text-xs" title="Assign a date" />
                      <Button variant="ghost" size="sm" onClick={() => archiveOne(r.id)} className="h-7 gap-1 px-2 text-muted-foreground hover:text-foreground">
                        <Archive className="h-3.5 w-3.5" /> Archive
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
              {lastBatch ? (
                <Button variant="ghost" size="sm" onClick={() => undoCleanup(lastBatch)} disabled={undo.isPending} className="gap-1.5 text-muted-foreground">
                  <RotateCcw className="h-4 w-4" /> Undo last cleanup
                </Button>
              ) : <span />}
              <Button onClick={runCleanup} disabled={remove.length === 0 || archive.isPending} className="gap-1.5">
                <Archive className="h-4 w-4" />
                {archive.isPending ? "Archiving…" : `Archive ${remove.length} item${remove.length !== 1 ? "s" : ""}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PantryCleanupDialog;
