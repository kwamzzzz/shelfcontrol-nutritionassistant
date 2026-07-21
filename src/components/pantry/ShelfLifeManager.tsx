import { useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
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
  const [days, setDays] = useState<number | null>(() => {
    if (entry.expiry_date && entry.added_at) return Math.max(0, daysFromDates(entry.added_at, entry.expiry_date));
    if (entry.storage_location && entry.storage_location !== "Other")
      return estimateShelfLifeDays(cls.type, entry.storage_location as StorageLocation, sealed);
    return null;
  });
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(saveTimer.current), []); // cancel pending write on unmount

  const persist = (loc: StorageLocation | "", d: number | null) => {
    const updates: Record<string, unknown> = { id: entry.id };
    if (loc) updates.storage_location = loc;
    if (d != null && loc && loc !== "Other" && entry.added_at) {
      updates.expiry_date = estimateExpiryDate(entry.added_at, d);
    }
    updateInventory.mutate(updates as never);
  };

  // Changing the storage location immediately recalculates the shelf life.
  const applyLocation = (loc: StorageLocation) => {
    clearTimeout(saveTimer.current); // cancel any pending ± write so it can't clobber this
    setLocation(loc);
    const est = loc !== "Other" ? estimateShelfLifeDays(cls.type, loc, sealed) : null;
    const nextDays = est ?? days; // unknown foods keep any existing value
    setDays(nextDays);
    persist(loc, est); // only write a fresh expiry when we actually have an estimate
  };

  const adjust = (delta: number) => {
    if (days == null || !location || location === "Other") return;
    const nd = Math.max(0, days + delta);
    setDays(nd);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(location, nd), 600);
  };

  const status = getExpiryStatus(entry.expiry_date);
  const preview = days != null && location && location !== "Other" && entry.added_at
    ? estimateExpiryDate(entry.added_at, days) : null;
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
          {getExpiryLabel(entry.expiry_date)}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={location || undefined} onValueChange={(v) => applyLocation(v as StorageLocation)}>
          <SelectTrigger className={cn("h-8 w-[130px] text-sm", needsLocation && "border-warning/50")}>
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

        {location && location !== "Other" && days != null ? (
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Shelf life</span>
            <button type="button" onClick={() => adjust(-1)} className="flex h-7 w-7 items-center justify-center rounded-md border border-border hover:bg-secondary disabled:opacity-40" disabled={days <= 0}>
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-[3.5rem] text-center text-sm font-semibold tabular-nums">{days} day{days !== 1 ? "s" : ""}</span>
            <button type="button" onClick={() => adjust(1)} className="flex h-7 w-7 items-center justify-center rounded-md border border-border hover:bg-secondary">
              <Plus className="h-3.5 w-3.5" />
            </button>
            {preview && <span className="ml-1 text-xs text-muted-foreground">→ {format(parseISO(preview), "MMM d")}</span>}
          </div>
        ) : (
          <span className="ml-auto text-xs text-muted-foreground">
            {needsLocation
              ? (rec.confidence !== "high" ? "Pick a storage location to estimate expiry" : "")
              : location === "Other" ? "No estimate for “Other”" : "No auto-estimate — set expiry in edit"}
          </span>
        )}
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
