import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { useInventory, useAllInventory, type InventoryRow } from "@/hooks/usePantry";
import { usePurchases } from "@/hooks/usePurchases";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES, STORAGE_LOCATIONS } from "@/lib/pantry-utils";
import { getExpiryStatus, type ExpiryStatus } from "@/lib/pantry-utils";
import AddInventoryDialog from "@/components/pantry/AddInventoryDialog";
import EditInventoryDialog from "@/components/pantry/EditInventoryDialog";
import InventoryCard from "@/components/pantry/InventoryCard";
import ItemCatalogSection from "@/components/pantry/ItemCatalogSection";
import ShelfLifeManager from "@/components/pantry/ShelfLifeManager";
import PantryCleanupDialog from "@/components/pantry/PantryCleanupDialog";
import PantryStatsDialog from "@/components/pantry/PantryStatsDialog";
import PantryToolsSheet from "@/components/pantry/PantryToolsSheet";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Package, Search, AlertTriangle, Clock, ShieldCheck, HelpCircle, Users, ChevronLeft, ChevronRight, Archive, SlidersHorizontal, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGroupContext } from "@/contexts/GroupContext";
import { useGroups } from "@/hooks/useGroups";
import { useProfileNames } from "@/hooks/useProfileNames";
import { useIsPhone } from "@/hooks/use-shell-mode";
import { Badge } from "@/components/ui/badge";

const LOCATION_TABS = ["All", ...STORAGE_LOCATIONS] as const;

interface StatusGroup {
  key: ExpiryStatus;
  label: string;
  icon: React.ReactNode;
  colorClasses: string;
}

const STATUS_GROUPS: StatusGroup[] = [
  { key: "expired", label: "Expired", icon: <AlertTriangle className="h-4 w-4" />, colorClasses: "text-destructive" },
  { key: "expiring", label: "Expiring Soon", icon: <Clock className="h-4 w-4" />, colorClasses: "text-warning" },
  { key: "fresh", label: "Fresh Inventory", icon: <ShieldCheck className="h-4 w-4" />, colorClasses: "text-success" },
  { key: "no-date", label: "No Expiry Set", icon: <HelpCircle className="h-4 w-4" />, colorClasses: "text-muted-foreground" },
];

const Pantry = () => {
  const { data: inventory, isLoading } = useInventory();
  const { data: allInventory } = useAllInventory();
  const { data: purchases } = usePurchases();
  const { activeGroupId, isPersonalMode } = useGroupContext();
  const isPhone = useIsPhone();
  const { groups } = useGroups();
  const activeGroup = groups.find((g) => g.id === activeGroupId);
  const contextLabel = isPersonalMode ? "Personal Pantry" : `${activeGroup?.name ?? "Group"} Pantry`;
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterLocation, setFilterLocation] = useState("All");
  const [editing, setEditing] = useState<InventoryRow | null>(null);
  const [expiryFilter, setExpiryFilter] = useState<string | null>(null);
  // Purchase-date filter: "all" | "archived" | "YYYY-MM"
  const [purchaseFilter, setPurchaseFilter] = useState<string>("all");
  // Phone scope: Current = what is in the pantry now; History = a past month or
  // the archive. Keeping these apart stops "Archived" (an item state) from
  // living inside the month axis (a time scale), which made the row read as
  // navigation rather than a filter. Derive the scope from the actual data
  // filter so it stays correct when the viewport changes between desktop and
  // phone after a desktop month/archive selection.
  const mode: "current" | "history" = purchaseFilter === "all" ? "current" : "history";
  const [toolsOpen, setToolsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Deep-link from Intelligence cards
  useEffect(() => {
    const filter = searchParams.get("filter");
    const searchParam = searchParams.get("search");
    if (filter === "expired" || filter === "expiring" || filter === "no_expiry" || filter === "missing_nutrition") {
      setExpiryFilter(filter);
    }
    if (searchParam) setSearch(searchParam);
  }, [searchParams]);

  // A phone drawer should not silently reopen after rotating into a wider
  // shell and back again.
  useEffect(() => {
    if (!isPhone) {
      setToolsOpen(false);
      setFiltersOpen(false);
    }
  }, [isPhone]);

  // Attribution
  const userIds = useMemo(() => (inventory ?? []).map((e) => e.user_id), [inventory]);
  const { data: profileMap } = useProfileNames(userIds);

  // Months that have purchases (drives the month selector).
  const purchaseMonths = useMemo(() => {
    const set = new Set<string>();
    (purchases ?? []).forEach((p) => { const m = (p.purchased_at ?? "").slice(0, 7); if (m) set.add(m); });
    return [...set].sort().reverse();
  }, [purchases]);
  const monthOptions = useMemo(() => ["all", ...purchaseMonths, "archived"], [purchaseMonths]);
  const navMonth = (dir: number) => {
    const i = monthOptions.indexOf(purchaseFilter);
    const ni = Math.max(0, Math.min(monthOptions.length - 1, (i < 0 ? 0 : i) + dir));
    setPurchaseFilter(monthOptions[ni]);
  };

  // Item source depends on the purchase-date filter (view-only — never mutates data).
  const isArchivedView = purchaseFilter === "archived";
  const sourceItems = useMemo<InventoryRow[]>(() => {
    if (isArchivedView) return (allInventory ?? []).filter((e) => e.status !== "active");
    if (purchaseFilter === "all") return inventory ?? [];
    return (inventory ?? []).filter((e) => (e.purchases?.purchased_at ?? "").slice(0, 7) === purchaseFilter);
  }, [isArchivedView, purchaseFilter, inventory, allInventory]);

  const monthSummary = useMemo(() => {
    if (purchaseFilter === "all" || isArchivedView) return null;
    const ps = (purchases ?? []).filter((p) => (p.purchased_at ?? "").slice(0, 7) === purchaseFilter);
    const items = ps.reduce((s, p) => s + (p.purchase_items?.length ?? 0), 0);
    return { label: format(parseISO(`${purchaseFilter}-01`), "MMMM yyyy"), trips: ps.length, items };
  }, [purchaseFilter, isArchivedView, purchases]);

  // Search / category / location narrowing, WITHOUT the status filter applied.
  // Status counts are derived from this so selecting a status does not zero out
  // the other counts and strand the user.
  const scoped = useMemo(() => {
    return sourceItems.filter((entry) => {
      const matchesSearch = entry.items.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = filterCategory === "all" || entry.items.category === filterCategory;
      const matchesLocation = filterLocation === "All" || entry.storage_location === filterLocation;
      return matchesSearch && matchesCategory && matchesLocation;
    });
  }, [sourceItems, search, filterCategory, filterLocation]);

  const statusCounts = useMemo(() => {
    const counts: Record<ExpiryStatus, number> = { expired: 0, expiring: 0, fresh: 0, "no-date": 0 };
    scoped.forEach((e) => { counts[getExpiryStatus(e.expiry_date)]++; });
    return counts;
  }, [scoped]);

  const filtered = useMemo(() => {
    return scoped.filter((entry) => {
      // Status / nutrition filters (also used by deep links from Intelligence)
      if (expiryFilter === "expired" && getExpiryStatus(entry.expiry_date) !== "expired") return false;
      if (expiryFilter === "expiring" && getExpiryStatus(entry.expiry_date) !== "expiring") return false;
      if (expiryFilter === "fresh" && getExpiryStatus(entry.expiry_date) !== "fresh") return false;
      if (expiryFilter === "no_expiry" && entry.expiry_date) return false;
      if (expiryFilter === "missing_nutrition") {
        const hasData = Number(entry.items?.calories_per_unit ?? 0) > 0 || Number(entry.items?.protein_g ?? 0) > 0;
        if (hasData) return false;
      }
      return true;
    });
  }, [scoped, expiryFilter]);

  // Phone status ribbon: summary + one-tap filter, replacing the 2x2 tile block.
  const statusChips: { key: string; label: string; count: number; filter: string | null; tone: string }[] = [
    { key: "all", label: "All", count: scoped.length, filter: null, tone: "" },
    { key: "expiring", label: "Use soon", count: statusCounts.expiring, filter: "expiring", tone: "text-warning" },
    { key: "expired", label: "Expired", count: statusCounts.expired, filter: "expired", tone: "text-destructive" },
    { key: "fresh", label: "Fresh", count: statusCounts.fresh, filter: "fresh", tone: "text-success" },
    { key: "no-date", label: "No date", count: statusCounts["no-date"], filter: "no_expiry", tone: "text-muted-foreground" },
  ];

  const activeFilterCount = (filterCategory !== "all" ? 1 : 0) + (expiryFilter ? 1 : 0);

  const enterMode = (next: "current" | "history") => {
    setExpiryFilter(null);
    if (next === "current") setPurchaseFilter("all");
    else setPurchaseFilter(purchaseMonths[0] ?? "archived");
  };

  const grouped = useMemo(() => {
    const groups: Record<ExpiryStatus, InventoryRow[]> = { expired: [], expiring: [], fresh: [], "no-date": [] };
    (filtered ?? []).forEach((e) => { groups[getExpiryStatus(e.expiry_date)].push(e); });
    return groups;
  }, [filtered]);

  const intelligenceCards: { key: ExpiryStatus; label: string; icon: React.ReactNode; accent: string; bg: string }[] = [
    { key: "expiring", label: "Use Soon", icon: <Clock className="h-5 w-5" />, accent: "text-warning", bg: "bg-warning/10" },
    { key: "expired", label: "Expired", icon: <AlertTriangle className="h-5 w-5" />, accent: "text-destructive", bg: "bg-destructive/10" },
    { key: "fresh", label: "Fresh", icon: <ShieldCheck className="h-5 w-5" />, accent: "text-success", bg: "bg-success/10" },
    { key: "no-date", label: "No Date", icon: <HelpCircle className="h-5 w-5" />, accent: "text-muted-foreground", bg: "bg-muted" },
  ];

  return (
    <div className={cn(isPhone ? "space-y-4" : "space-y-6")}>
      {/* Header */}
      {/* ── Header: full toolbar outside the phone shell. The phone drops the
             duplicate <h1> (the app's PhoneHeader already renders "Pantry") and
             the duplicate Add button (Quick Add in the bottom nav covers it). ── */}
      {!isPhone && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-foreground font-[Outfit,var(--font-heading),sans-serif]">Pantry</h1>
              {!isPersonalMode && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Users className="h-3 w-3" />
                  Shared
                </Badge>
              )}
            </div>
            <p className="mt-1 text-muted-foreground">
              Viewing: {contextLabel} · {inventory?.length ?? 0} items in stock
              {expiryFilter && (
                <button
                  onClick={() => setExpiryFilter(null)}
                  className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                >
                  Filter: {expiryFilter.replace("_", " ")} ✕
                </button>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PantryStatsDialog />
            <PantryCleanupDialog />
            <ShelfLifeManager />
            <AddInventoryDialog />
          </div>
        </div>
      )}

      {isPhone && (
        <>
          {/* ── Phone row 1: scope + tools ─────────────────────────────────── */}
          <div className="flex items-center gap-2">
            <div className="flex flex-1 rounded-xl bg-secondary p-1" role="group" aria-label="Pantry scope">
              {(["current", "history"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  onClick={() => enterMode(m)}
                  className={cn(
                    "min-h-[44px] flex-1 rounded-lg px-3 text-[0.9375rem] font-medium transition-colors",
                    mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
                  )}
                >
                  {m === "current" ? "Current" : "History"}
                </button>
              ))}
            </div>
            {/* Labelled, never icon-only: an unlabelled glyph here reads as
                decoration and gives screen readers nothing to announce. */}
            <button
              type="button"
              onClick={() => setToolsOpen(true)}
              className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-3.5 text-[0.9375rem] font-medium text-foreground transition-colors hover:bg-accent"
            >
              <Settings2 className="h-5 w-5" aria-hidden />
              Tools
            </button>
          </div>

          {/* ── Phone row 2: search + filters ──────────────────────────────── */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 pl-9"
              />
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              aria-label={activeFilterCount > 0 ? `Filters, ${activeFilterCount} active` : "Filters"}
              className={cn(
                "inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl border px-3.5 text-[0.9375rem] font-medium transition-colors",
                activeFilterCount > 0
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-card text-foreground hover:bg-accent",
              )}
            >
              <SlidersHorizontal className="h-5 w-5" aria-hidden />
              Filters
              {activeFilterCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* ── Phone row 3: locations ────────────────────────────────────── */}
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {LOCATION_TABS.map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => setFilterLocation(loc)}
                aria-pressed={filterLocation === loc}
                className={cn(
                  "min-h-[44px] shrink-0 whitespace-nowrap rounded-full px-4 text-[0.9375rem] font-medium transition-colors",
                  filterLocation === loc
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground",
                )}
              >
                {loc}
              </button>
            ))}
          </div>

          {/* ── Phone row 4: status ribbon ────────────────────────────────── */}
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {statusChips.map((c) => {
              const active = expiryFilter === c.filter || (c.filter === null && !expiryFilter);
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setExpiryFilter(c.filter)}
                  aria-pressed={active}
                  className={cn(
                    "flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-[0.9375rem] font-medium transition-colors",
                    active
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-card text-muted-foreground",
                  )}
                >
                  <span className={cn("font-bold tabular-nums", active ? "text-primary" : c.tone)}>{c.count}</span>
                  {c.label}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Location Pill Tabs — tablet/desktop (the phone has its own chip row) */}
      {!isPhone && (
        <div className="flex flex-wrap gap-2">
          {LOCATION_TABS.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => setFilterLocation(loc)}
              aria-pressed={filterLocation === loc}
              className={cn(
                "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                filterLocation === loc
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              {loc === "All" ? "All Locations" : loc}
            </button>
          ))}
        </div>
      )}

      {/* Purchase-Date (Month) Filter — tablet/desktop keeps the full row */}
      {!isPhone && (
        <div className="flex items-center gap-2">
          <button
            type="button" onClick={() => navMonth(-1)} disabled={monthOptions.indexOf(purchaseFilter) <= 0}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-secondary disabled:opacity-40"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex flex-1 gap-2 overflow-x-auto py-0.5">
            {monthOptions.map((opt) => {
              const label = opt === "all" ? "All Items" : opt === "archived" ? "Archived" : format(parseISO(`${opt}-01`), "MMM yyyy");
              const active = purchaseFilter === opt;
              return (
                <button
                  key={opt} type="button" onClick={() => setPurchaseFilter(opt)}
                  className={cn(
                    "flex shrink-0 items-center gap-1 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                    active ? "bg-primary text-primary-foreground shadow-sm" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  )}
                >
                  {opt === "archived" && <Archive className="h-3.5 w-3.5" />}
                  {label}
                </button>
              );
            })}
          </div>
          <button
            type="button" onClick={() => navMonth(1)} disabled={monthOptions.indexOf(purchaseFilter) >= monthOptions.length - 1}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-secondary disabled:opacity-40"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Phone: month picker, revealed only in History. "Archived" is kept
             off the month axis and separated by a divider, because it is an
             item state rather than a point in time. ── */}
      {isPhone && mode === "history" && (
        <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {purchaseMonths.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setPurchaseFilter(m)}
              aria-pressed={purchaseFilter === m}
              className={cn(
                "min-h-[44px] shrink-0 whitespace-nowrap rounded-full px-4 text-[0.9375rem] font-medium transition-colors",
                purchaseFilter === m
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground",
              )}
            >
              {format(parseISO(`${m}-01`), "MMM yyyy")}
            </button>
          ))}
          <span aria-hidden className="h-6 w-px shrink-0 bg-border" />
          <button
            type="button"
            onClick={() => setPurchaseFilter("archived")}
            aria-pressed={isArchivedView}
            className={cn(
              "flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-[0.9375rem] font-medium transition-colors",
              isArchivedView
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground",
            )}
          >
            <Archive className="h-4 w-4" />
            Archived
          </button>
        </div>
      )}

      {monthSummary && (
        <div className="rounded-xl border border-primary/20 bg-primary/[0.05] px-4 py-2.5 text-sm">
          <span className="font-semibold text-foreground">{monthSummary.label}</span>
          <span className="text-muted-foreground">
            {" "}— {monthSummary.items} item{monthSummary.items !== 1 ? "s" : ""} purchased across {monthSummary.trips} shopping trip{monthSummary.trips !== 1 ? "s" : ""}
          </span>
        </div>
      )}
      {isArchivedView && (
        <div className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm">
          <span className="font-semibold text-foreground">Archived items</span>
          <span className="text-muted-foreground"> — {filtered.length} item{filtered.length !== 1 ? "s" : ""} consumed, discarded, or removed from the active pantry</span>
        </div>
      )}

      {/* Search + Category — tablet/desktop (the phone has its own row + sheet) */}
      {!isPhone && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Intelligence Strip — tablet/desktop (the phone uses the status ribbon) */}
      {!isPhone && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {intelligenceCards.map((card) => (
            <div key={card.key} className={cn("rounded-2xl p-4 shadow-sm", card.bg)}>
              <div className={cn("mb-1", card.accent)}>{card.icon}</div>
              <p className={cn("text-2xl font-bold tabular-nums font-[Outfit,var(--font-heading),sans-serif]", card.accent)}>
                {statusCounts[card.key]}
              </p>
              <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Grouped Sections */}
      {isLoading ? (
        <div className="rounded-2xl bg-card p-8 text-center text-muted-foreground shadow-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-card p-10 text-center shadow-sm">
          <Package className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-muted-foreground">
            {inventory?.length === 0
              ? isPersonalMode
                ? "Your pantry is empty. Add a catalog item first, then add it to your pantry."
                : "This shared pantry is empty. Add items here for this group."
              : "No items match your filters."}
          </p>
        </div>
      ) : isArchivedView ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {filtered.map((entry) => (
            <InventoryCard
              key={entry.id}
              entry={entry}
              onClick={() => setEditing(entry)}
              addedBy={activeGroupId ? profileMap?.get(entry.user_id) : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {STATUS_GROUPS.map((group) => {
            const items = grouped[group.key];
            if (items.length === 0) return null;
            return (
              <section key={group.key}>
                <div className={cn("mb-4 flex items-center gap-2", group.colorClasses)}>
                  {group.icon}
                  <h2 className="text-sm font-semibold uppercase tracking-wide font-[Outfit,var(--font-heading),sans-serif]">
                    {group.label}
                  </h2>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {items.length}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
                  {items.map((entry) => (
                    <InventoryCard
                      key={entry.id}
                      entry={entry}
                      onClick={() => setEditing(entry)}
                      addedBy={activeGroupId ? profileMap?.get(entry.user_id) : undefined}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {editing && (
        <EditInventoryDialog entry={editing} open={!!editing} onClose={() => setEditing(null)} />
      )}

      <ItemCatalogSection />

      {/* Phone progressive disclosure */}
      {isPhone && (
        <>
          <PantryToolsSheet open={toolsOpen} onOpenChange={setToolsOpen} />

          <Drawer open={filtersOpen} onOpenChange={setFiltersOpen}>
            <DrawerContent>
              <DrawerHeader className="text-center">
                <DrawerTitle>Filters</DrawerTitle>
              </DrawerHeader>
              <div className="space-y-4 px-4 pb-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Category</label>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="h-11 w-full"><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {CATEGORIES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    className="h-11 flex-1"
                    onClick={() => { setFilterCategory("all"); setExpiryFilter(null); }}
                    disabled={activeFilterCount === 0}
                  >
                    Clear
                  </Button>
                  <Button className="h-11 flex-1" onClick={() => setFiltersOpen(false)}>Done</Button>
                </div>
              </div>
            </DrawerContent>
          </Drawer>
        </>
      )}
    </div>
  );
};

export default Pantry;
