import { useEffect, useMemo, useRef, useState } from "react";
import { useInventory, useUpdateInventory, type InventoryRow } from "@/hooks/usePantry";
import {
  classifyFood, estimateShelfLifeDays, recommendStorage, estimateExpiryDate,
  daysFromDates, type StorageLocation,
} from "@/lib/shelf-life";
import { getExpiryStatus, getExpiryLabel, STORAGE_LOCATIONS } from "@/lib/pantry-utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { CalendarClock, Minus, Plus, AlertTriangle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const statusColor: Record<string, string> = {
  fresh: "bg-success text-success-foreground",
  expiring: "bg-warning text-warning-foreground",
  expired: "bg-destructive text-destructive-foreground",
  "no-date": "bg-muted text-muted-foreground",
};

const ShelfLifeRow = ({ entry }: { entry: InventoryRow }) => {
  const updateInventory = useUpdateInventory();
  const cls = useMemo(() => classifyFood(entry.items?.name, entry.items?.category), [entry.items]);
  const sealed = entry.sealed_status === "opened" ? "opened" : "sealed";
  const rec = recommendStorage(cls.type);

  const [location, setLocation] = useState<StorageLocation | "">((entry.storage_location as StorageLocation) ?? "");
  // Expiry (best-before date) is the single source of truth; shelf-life days derive from it.
  const [expiry, setExpiry] = useState<string>(entry.expiry_date ?? "");
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(saveTimer.current), []); // cancel pending write on unmount

  const days = expiry && entry.added_at ? daysFromDates(entry.added_at, expiry) : null;
  const persist = (patch: Record<string, unknown>) => updateInventory.mutate({ id: entry.id, ...patch } as never);

  // Changing the storage location immediately recalculates the shelf life.
  const applyLocation = (loc: StorageLocation) => {
    clearTimeout(saveTimer.current);
    setLocation(loc);
    const est = loc !== "Other" ? estimateShelfLifeDays(cls.type, loc, sealed) : null;
    if (est != null && entry.added_at) {
      const exp = estimateExpiryDate(entry.added_at, est);
      setExpiry(exp);
      persist({ storage_location: loc, expiry_date: exp });
    } else {
      persist({ storage_location: loc });
    }
  };

  // ± fine-tunes the estimate by a day (debounced save).
  const adjust = (delta: number) => {
    if (!entry.added_at) return;
    const base = days ?? (location && location !== "Other" ? estimateShelfLifeDays(cls.type, location as StorageLocation, sealed) ?? 0 : 0);
    const exp = estimateExpiryDate(entry.added_at, Math.max(0, base + delta));
    setExpiry(exp);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist({ expiry_date: exp }), 600);
  };

  // Fast path: type/pick a best-before date directly.
  const setBestBefore = (val: string) => {
    clearTimeout(saveTimer.current);
    setExpiry(val);
    persist({ expiry_date: val || null });
  };

  const status = getExpiryStatus(expiry || null);
  const needsLocation = !location;

  return (
    <div className={cn(
      "rounded-xl border p-3 space-y-2.5",
      needsLocation ? "border-warning/40 bg-warning/[0.06]" : "border-border"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {needsLocation && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" />}
            <p className="font-medium text-foreground truncate">{entry.items?.name ?? "Unknown"}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {cls.def.label} · {entry.quantity} {entry.unit}
            {sealed === "opened" && " · opened"}
          </p>
        </div>
        <Badge className={cn("shrink-0 border-0 text-[11px] font-medium", statusColor[status])}>
          {getExpiryLabel(expiry || null)}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={location || undefined} onValueChange={(v) => applyLocation(v as StorageLocation)}>
          <SelectTrigger className={cn("h-8 w-[124px] text-sm", needsLocation && "border-warning/50")}>
            <SelectValue placeholder="Select location" />
          </SelectTrigger>
          <SelectContent>
            {STORAGE_LOCATIONS.map((l) => (
              <SelectItem key={l} value={l}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {needsLocation && rec.confidence === "high" && rec.location && (
          <Button
            type="button" variant="outline" size="sm"
            onClick={() => applyLocation(rec.location as StorageLocation)}
            className="h-8 gap-1 border-primary/30 text-primary hover:bg-primary/10"
          >
            <Sparkles className="h-3.5 w-3.5" /> Store in {rec.location}
          </Button>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {/* Fast best-before entry — type a date instead of clicking ± */}
          <input
            type="date"
            value={expiry}
            onChange={(e) => setBestBefore(e.target.value)}
            title="Best before date"
            className="h-8 rounded-md border border-input bg-background/60 px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button type="button" onClick={() => adjust(-1)} disabled={!entry.added_at} className="flex h-7 w-7 items-center justify-center rounded-md border border-border hover:bg-secondary disabled:opacity-40" aria-label="One day less">
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-[2.75rem] text-center text-xs font-semibold tabular-nums text-muted-foreground">
            {days != null ? `${days}d` : "—"}
          </span>
          <button type="button" onClick={() => adjust(1)} disabled={!entry.added_at} className="flex h-7 w-7 items-center justify-center rounded-md border border-border hover:bg-secondary disabled:opacity-40" aria-label="One day more">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

const ShelfLifeManager = () => {
  const { data: inventory } = useInventory();
  const updateInventory = useUpdateInventory();

  const rows = useMemo(() => {
    const list = inventory ?? [];
    // Items needing a storage location float to the top — they need attention.
    return [...list].sort((a, b) => {
      const an = a.storage_location ? 1 : 0;
      const bn = b.storage_location ? 1 : 0;
      if (an !== bn) return an - bn;
      return (a.items?.name ?? "").localeCompare(b.items?.name ?? "");
    });
  }, [inventory]);

  const needCount = rows.filter((r) => !r.storage_location).length;

  // Located items that have an estimate but no saved expiry yet — a one-tap backfill.
  const applicable = useMemo(
    () => rows.filter((r) => {
      if (!r.storage_location || r.storage_location === "Other" || r.expiry_date || !r.added_at) return false;
      const cls = classifyFood(r.items?.name, r.items?.category);
      const sealed = r.sealed_status === "opened" ? "opened" : "sealed";
      return estimateShelfLifeDays(cls.type, r.storage_location as StorageLocation, sealed) != null;
    }),
    [rows],
  );

  const applyAll = () => {
    applicable.forEach((r) => {
      const cls = classifyFood(r.items?.name, r.items?.category);
      const sealed = r.sealed_status === "opened" ? "opened" : "sealed";
      const days = estimateShelfLifeDays(cls.type, r.storage_location as StorageLocation, sealed);
      if (days != null && r.added_at) {
        updateInventory.mutate({ id: r.id, expiry_date: estimateExpiryDate(r.added_at, days) } as never);
      }
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <CalendarClock className="h-4 w-4" /> Shelf-Life
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" /> Shelf-Life Manager
          </DialogTitle>
          <DialogDescription>
            Review and fine-tune how long each item lasts. Estimates come from the food type and where it's stored — adjust with the − / + controls.
          </DialogDescription>
        </DialogHeader>

        {needCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/[0.08] px-3 py-2 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
            <span className="text-foreground">
              <strong>{needCount}</strong> item{needCount !== 1 ? "s need" : " needs"} a storage location before we can estimate expiry.
            </span>
          </div>
        )}

        {applicable.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/[0.06] px-3 py-2 text-sm">
            <Sparkles className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-foreground">
              <strong>{applicable.length}</strong> item{applicable.length !== 1 ? "s have" : " has"} an estimated expiry not yet applied.
            </span>
            <Button type="button" size="sm" onClick={applyAll} disabled={updateInventory.isPending} className="ml-auto h-7 gradient-cool border-0">
              Apply estimate{applicable.length !== 1 ? "s" : ""}
            </Button>
          </div>
        )}

        <div className="-mx-1 flex-1 space-y-2.5 overflow-y-auto px-1 py-1">
          {rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Your pantry is empty.</p>
          ) : (
            rows.map((entry) => <ShelfLifeRow key={entry.id} entry={entry} />)
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShelfLifeManager;
