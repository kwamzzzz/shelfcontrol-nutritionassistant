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
import { Package, Search, AlertTriangle, Clock, ShieldCheck, HelpCircle, Users, ChevronLeft, ChevronRight, Archive } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGroupContext } from "@/contexts/GroupContext";
import { useGroups } from "@/hooks/useGroups";
import { useProfileNames } from "@/hooks/useProfileNames";
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

  // Deep-link from Intelligence cards
  useEffect(() => {
    const filter = searchParams.get("filter");
    const searchParam = searchParams.get("search");
    if (filter === "expired" || filter === "expiring" || filter === "no_expiry" || filter === "missing_nutrition") {
      setExpiryFilter(filter);
    }
    if (searchParam) setSearch(searchParam);
  }, [searchParams]);

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

  const filtered = useMemo(() => {
    return sourceItems.filter((entry) => {
      const matchesSearch = entry.items.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = filterCategory === "all" || entry.items.category === filterCategory;
      const matchesLocation = filterLocation === "All" || entry.storage_location === filterLocation;
      // Deep-link expiry/nutrition filters
      if (expiryFilter === "expired" && getExpiryStatus(entry.expiry_date) !== "expired") return false;
      if (expiryFilter === "expiring" && getExpiryStatus(entry.expiry_date) !== "expiring") return false;
      if (expiryFilter === "no_expiry" && entry.expiry_date) return false;
      if (expiryFilter === "missing_nutrition") {
        const hasData = Number(entry.items?.calories_per_unit ?? 0) > 0 || Number(entry.items?.protein_g ?? 0) > 0;
        if (hasData) return false;
      }
      return matchesSearch && matchesCategory && matchesLocation;
    });
  }, [sourceItems, search, filterCategory, filterLocation, expiryFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<ExpiryStatus, number> = { expired: 0, expiring: 0, fresh: 0, "no-date": 0 };
    (filtered ?? []).forEach((e) => { counts[getExpiryStatus(e.expiry_date)]++; });
    return counts;
  }, [filtered]);

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
    <div className="space-y-6">
      {/* Header */}
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

      {/* Location Pill Tabs */}
      <div className="flex flex-wrap gap-2">
        {LOCATION_TABS.map((loc) => (
          <button
            key={loc}
            onClick={() => setFilterLocation(loc)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              filterLocation === loc
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            {loc === "All" ? "All Locations" : loc}
          </button>
        ))}
      </div>

      {/* Purchase-Date (Month) Filter */}
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

      {/* Search + Category */}
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

      {/* Intelligence Strip */}
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
    </div>
  );
};

export default Pantry;
