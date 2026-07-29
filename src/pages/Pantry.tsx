import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { useInventory, useAllInventory, type InventoryRow } from "@/hooks/usePantry";
import { usePurchases } from "@/hooks/usePurchases";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES, STORAGE_LOCATIONS } from "@/lib/pantry-utils";
import { getExpiryStatus, type ExpiryStatus } from "@/lib/pantry-utils";
import AddInventoryDialog from "@/components/pantry/AddInventoryDialog";
import InventoryCard from "@/components/pantry/InventoryCard";
import InventoryDetailsOverlay from "@/components/pantry/InventoryDetailsOverlay";
import ShelfLifeManager from "@/components/pantry/ShelfLifeManager";
import PantryCleanupDialog from "@/components/pantry/PantryCleanupDialog";
import PantryStatsDialog from "@/components/pantry/PantryStatsDialog";
import PantryToolsSheet from "@/components/pantry/PantryToolsSheet";
import ShareToGroupDialog from "@/components/groups/ShareToGroupDialog";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import {
  Package,
  Search,
  AlertTriangle,
  Clock,
  ShieldCheck,
  HelpCircle,
  Users,
  Archive,
  SlidersHorizontal,
  Settings2,
  Share2,
  ListChecks,
  Trash2,
  UtensilsCrossed,
  X,
  CalendarDays,
  ReceiptText,
  Store,
  RotateCcw,
  ChevronRight,
  LayoutGrid,
  MapPinned,
  Tags,
  CalendarClock,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGroupContext } from "@/contexts/GroupContext";
import { useGroups } from "@/hooks/useGroups";
import { useProfileNames } from "@/hooks/useProfileNames";
import { useIsPhone } from "@/hooks/use-shell-mode";
import { Badge } from "@/components/ui/badge";
import PantryExitDialog, { type PantryExitMode } from "@/components/pantry/PantryExitDialog";
import { STORAGE_STYLES, type StorageStyleKey } from "@/components/pantry/storage-style";

const LOCATION_TABS = ["All", ...STORAGE_LOCATIONS] as const;
const normalizeStoreName = (value: string | null | undefined) => value?.trim().toLowerCase() ?? "";

type PantryView = "location" | "category" | "items" | "freshness";

const VIEW_OPTIONS: { value: PantryView; label: string; icon: LucideIcon }[] = [
  { value: "location", label: "Location", icon: MapPinned },
  { value: "category", label: "Category", icon: Tags },
  { value: "items", label: "All items", icon: LayoutGrid },
  { value: "freshness", label: "Freshness", icon: CalendarClock },
];

interface DisplayGroup {
  key: string;
  label: string;
  items: InventoryRow[];
  icon?: LucideIcon;
  tone?: string;
  detail?: string;
  panel?: string;
}

const Pantry = () => {
  const navigate = useNavigate();
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
  const [viewMode, setViewMode] = useState<PantryView>("location");
  const [viewing, setViewing] = useState<InventoryRow | null>(null);
  const [exitRequest, setExitRequest] = useState<{
    entries: InventoryRow[];
    mode: PantryExitMode;
    bulk?: boolean;
  } | null>(null);
  const [expiryFilter, setExpiryFilter] = useState<string | null>(null);
  // Purchase-date filter: "all" | "archived" | "YYYY-MM"
  const [purchaseFilter, setPurchaseFilter] = useState<string>("all");
  // Purchase-source filters make receipt-backed pantry rows easy to revisit.
  // "all" keeps every source; "unlinked" shows manual additions; otherwise
  // the value is an exact purchase id.
  const [storeFilter, setStoreFilter] = useState("all");
  const [receiptFilter, setReceiptFilter] = useState("all");
  // Phone scope: Current = what is in the pantry now; History = a past month or
  // the archive. Keeping these apart stops "Archived" (an item state) from
  // living inside the month axis (a time scale), which made the row read as
  // navigation rather than a filter. Derive the scope from the actual data
  // filter so it stays correct when the viewport changes between desktop and
  // phone after a desktop month/archive selection.
  const mode: "current" | "history" =
    purchaseFilter === "all" && storeFilter === "all" && receiptFilter === "all"
      ? "current"
      : "history";
  const [toolsOpen, setToolsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [shareEntries, setShareEntries] = useState<InventoryRow[] | null>(null);

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

  useEffect(() => {
    if (!isPersonalMode) setShareEntries(null);
  }, [isPersonalMode]);

  // Purchase and receipt options are scoped to the active kitchen. Resetting
  // them when that kitchen changes prevents a hidden Personal receipt id from
  // producing an empty Group pantry (and vice versa).
  useEffect(() => {
    setPurchaseFilter("all");
    setStoreFilter("all");
    setReceiptFilter("all");
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, [activeGroupId]);

  // Attribution
  const userIds = useMemo(() => (inventory ?? []).map((e) => e.user_id), [inventory]);
  const { data: profileMap } = useProfileNames(userIds);

  // Months that have purchases (drives the month selector).
  const purchaseMonths = useMemo(() => {
    const set = new Set<string>();
    (purchases ?? []).forEach((p) => { const m = (p.purchased_at ?? "").slice(0, 7); if (m) set.add(m); });
    return [...set].sort().reverse();
  }, [purchases]);
  const purchaseStores = useMemo(() => {
    const stores = new Map<string, string>();
    (purchases ?? []).forEach((purchase) => {
      const key = normalizeStoreName(purchase.store_name);
      if (key && !stores.has(key)) stores.set(key, purchase.store_name!.trim());
    });
    return [...stores.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [purchases]);

  const receiptOptions = useMemo(() => {
    if (purchaseFilter === "archived") return [];
    return (purchases ?? []).filter((purchase) => {
      const matchesMonth =
        purchaseFilter === "all" ||
        (purchase.purchased_at ?? "").slice(0, 7) === purchaseFilter;
      const matchesStore =
        storeFilter === "all" ||
        normalizeStoreName(purchase.store_name) === storeFilter;
      return matchesMonth && matchesStore;
    });
  }, [purchases, purchaseFilter, storeFilter]);

  const selectedReceipt = useMemo(
    () => (purchases ?? []).find((purchase) => purchase.id === receiptFilter) ?? null,
    [purchases, receiptFilter],
  );

  const updatePurchaseFilter = (value: string) => {
    setPurchaseFilter(value);
    setReceiptFilter("all");
    if (value === "archived") setStoreFilter("all");
  };

  const updateStoreFilter = (value: string) => {
    setStoreFilter(value);
    setReceiptFilter("all");
  };

  // Item source depends on the purchase-date filter (view-only — never mutates data).
  const isArchivedView = purchaseFilter === "archived";
  useEffect(() => {
    if (isArchivedView) {
      setSelectionMode(false);
      setSelectedIds(new Set());
    }
  }, [isArchivedView]);

  const sourceItems = useMemo<InventoryRow[]>(() => {
    if (isArchivedView) return (allInventory ?? []).filter((e) => e.status !== "active");
    return (inventory ?? []).filter((entry) => {
      const matchesMonth =
        purchaseFilter === "all" ||
        (entry.purchases?.purchased_at ?? "").slice(0, 7) === purchaseFilter;
      const matchesStore =
        storeFilter === "all" ||
        normalizeStoreName(entry.purchases?.store_name) === storeFilter;
      const matchesReceipt =
        receiptFilter === "all" ||
        (receiptFilter === "unlinked"
          ? !entry.purchase_id
          : entry.purchase_id === receiptFilter);
      return matchesMonth && matchesStore && matchesReceipt;
    });
  }, [isArchivedView, purchaseFilter, storeFilter, receiptFilter, inventory, allInventory]);

  const purchaseSummary = useMemo(() => {
    if (isArchivedView) return null;
    const linkedReceiptIds = new Set(sourceItems.map((entry) => entry.purchase_id).filter(Boolean));

    if (receiptFilter === "unlinked") {
      return {
        title: "Added without a receipt",
        detail: `${sourceItems.length} active pantry item${sourceItems.length !== 1 ? "s" : ""}`,
      };
    }

    if (selectedReceipt) {
      const date = format(parseISO(selectedReceipt.purchased_at), "MMM d, yyyy");
      const lines = selectedReceipt.purchase_items?.length ?? 0;
      return {
        title: selectedReceipt.store_name || "Store not recorded",
        detail: `${date} · ${sourceItems.length} pantry item${sourceItems.length !== 1 ? "s" : ""} from ${lines} receipt line${lines !== 1 ? "s" : ""}`,
      };
    }

    if (purchaseFilter !== "all" || storeFilter !== "all") {
      const monthLabel =
        purchaseFilter === "all"
          ? "All purchase dates"
          : format(parseISO(`${purchaseFilter}-01`), "MMMM yyyy");
      const storeLabel =
        storeFilter === "all"
          ? null
          : purchaseStores.find((store) => store.value === storeFilter)?.label;
      return {
        title: [monthLabel, storeLabel].filter(Boolean).join(" · "),
        detail: `${sourceItems.length} pantry item${sourceItems.length !== 1 ? "s" : ""} from ${linkedReceiptIds.size} receipt${linkedReceiptIds.size !== 1 ? "s" : ""}`,
      };
    }

    return null;
  }, [
    isArchivedView,
    sourceItems,
    receiptFilter,
    selectedReceipt,
    purchaseFilter,
    storeFilter,
    purchaseStores,
  ]);

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

  const selectedEntries = useMemo(
    () => (inventory ?? []).filter((entry) => selectedIds.has(entry.id)),
    [inventory, selectedIds]
  );

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const cancelSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const startSelection = () => {
    setSelectionMode(true);
    setSelectedIds(new Set());
  };

  const selectVisible = () => {
    setSelectedIds(new Set(filtered.map((entry) => entry.id)));
  };

  const openStatus = (filter: string | null) => {
    if (filter === "expiring") {
      navigate("/pantry/alerts/use-soon");
      return;
    }
    if (filter === "expired") {
      navigate("/pantry/alerts/expired");
      return;
    }
    setExpiryFilter(filter);
  };

  // Phone status ribbon: summary + one-tap filter, replacing the 2x2 tile block.
  const statusChips: { key: string; label: string; count: number; filter: string | null; tone: string }[] = [
    { key: "all", label: "All", count: scoped.length, filter: null, tone: "" },
    { key: "expiring", label: "Use soon", count: statusCounts.expiring, filter: "expiring", tone: "text-warning" },
    { key: "expired", label: "Expired", count: statusCounts.expired, filter: "expired", tone: "text-destructive" },
    { key: "fresh", label: "Fresh", count: statusCounts.fresh, filter: "fresh", tone: "text-success" },
    { key: "no-date", label: "No date", count: statusCounts["no-date"], filter: "no_expiry", tone: "text-muted-foreground" },
  ];

  // The phone's Filters button counts only the controls inside its drawer.
  // Purchase filters are visible in the History panel and have their own reset.
  const activeFilterCount = (filterCategory !== "all" ? 1 : 0) + (expiryFilter ? 1 : 0);

  const purchaseFilterCount =
    (purchaseFilter !== "all" ? 1 : 0) +
    (storeFilter !== "all" ? 1 : 0) +
    (receiptFilter !== "all" ? 1 : 0);

  const resetPurchaseFilters = () => {
    setPurchaseFilter("all");
    setStoreFilter("all");
    setReceiptFilter("all");
  };

  const enterMode = (next: "current" | "history") => {
    setExpiryFilter(null);
    if (next === "current") resetPurchaseFilters();
    else {
      setPurchaseFilter(purchaseMonths[0] ?? "archived");
      setStoreFilter("all");
      setReceiptFilter("all");
    }
  };

  const displayGroups = useMemo<DisplayGroup[]>(() => {
    const byName = [...filtered].sort((a, b) => a.items.name.localeCompare(b.items.name));

    if (viewMode === "items") {
      return [{ key: "all", label: "All pantry items", items: byName, icon: LayoutGrid }];
    }

    if (viewMode === "freshness") {
      const freshness: Array<{
        key: ExpiryStatus;
        label: string;
        icon: LucideIcon;
        tone: string;
        detail: string;
      }> = [
        { key: "expired", label: "Expired", icon: AlertTriangle, tone: "text-destructive", detail: "Past the recorded date" },
        { key: "expiring", label: "Use soon", icon: Clock, tone: "text-warning", detail: "Best used in the next few days" },
        { key: "fresh", label: "Fresh", icon: ShieldCheck, tone: "text-success", detail: "Comfortably within date" },
        { key: "no-date", label: "No date", icon: HelpCircle, tone: "text-muted-foreground", detail: "No expiry has been recorded" },
      ];
      return freshness
        .map((group) => ({
          ...group,
          items: byName.filter((entry) => getExpiryStatus(entry.expiry_date) === group.key),
        }))
        .filter((group) => group.items.length > 0);
    }

    if (viewMode === "category") {
      return [...CATEGORIES, "Uncategorised"]
        .map((category) => ({
          key: category,
          label: category,
          icon: Tags,
          detail: category === "Non-perishables" ? "Long-life staples stored properly" : "Items in this food category",
          items: byName.filter((entry) =>
            category === "Uncategorised"
              ? !entry.items.category
              : entry.items.category === category,
          ),
        }))
        .filter((group) => group.items.length > 0);
    }

    const locations: StorageStyleKey[] = ["Fridge", "Freezer", "Pantry", "Counter", "Other"];
    return locations
      .map((location) => {
        const style = STORAGE_STYLES[location];
        return {
          key: location,
          label: location,
          icon: style.icon,
          tone: style.accent,
          detail: style.detail,
          panel: style.panel,
          items: byName.filter((entry) =>
            location === "Other"
              ? !entry.storage_location || entry.storage_location === "Other"
              : entry.storage_location === location,
          ),
        };
      })
      .filter((group) => group.items.length > 0);
  }, [filtered, viewMode]);

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
            {!isArchivedView && (
              <Button
                type="button"
                variant="outline"
                onClick={startSelection}
                disabled={(inventory?.length ?? 0) === 0}
                className="gap-1.5"
              >
                <ListChecks className="h-4 w-4" />
                Select items
              </Button>
            )}
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
            {!isArchivedView && (
              <button
                type="button"
                onClick={startSelection}
                disabled={(inventory?.length ?? 0) === 0}
                className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-3.5 text-[0.9375rem] font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-45"
              >
                <ListChecks className="h-5 w-5" aria-hidden />
                Select
              </button>
            )}
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
            {LOCATION_TABS.map((loc) => {
              const style = STORAGE_STYLES[loc];
              const Icon = style.icon;
              return (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setFilterLocation(loc)}
                  aria-pressed={filterLocation === loc}
                  className={cn(
                    "inline-flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-[0.9375rem] font-medium transition-all",
                    filterLocation === loc ? style.activeChip : style.inactiveChip,
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {loc}
                </button>
              );
            })}
          </div>

          {/* ── Phone row 4: status ribbon ────────────────────────────────── */}
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {statusChips.map((c) => {
              const active = expiryFilter === c.filter || (c.filter === null && !expiryFilter);
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => openStatus(c.filter)}
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
                  {(c.filter === "expiring" || c.filter === "expired") && <ChevronRight className="h-3.5 w-3.5" aria-hidden />}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="flex min-h-[44px] w-full items-center justify-between rounded-2xl border border-border/80 bg-card px-4 text-left shadow-sm"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
              {(() => {
                const option = VIEW_OPTIONS.find((item) => item.value === viewMode) ?? VIEW_OPTIONS[0];
                const Icon = option.icon;
                return <Icon className="h-4 w-4 text-primary" aria-hidden />;
              })()}
              View by {VIEW_OPTIONS.find((item) => item.value === viewMode)?.label.toLowerCase()}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
          </button>
        </>
      )}

      {selectionMode && (
        <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-primary/20 bg-card/95 p-3 shadow-lg backdrop-blur">
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-semibold text-foreground">
              {selectedIds.size} selected
            </p>
            <p className="text-xs text-muted-foreground">Choose individual items or select everything visible.</p>
          </div>
          <Button type="button" variant="ghost" size="sm" className="rounded-xl" onClick={selectVisible}>
            Select visible
          </Button>
          {isPersonalMode && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-xl"
              disabled={selectedEntries.length === 0}
              onClick={() => setShareEntries(selectedEntries)}
            >
              <Share2 className="mr-1.5 h-4 w-4" />
              Share
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={selectedEntries.length === 0}
            onClick={() => setExitRequest({
              entries: selectedEntries,
              mode: "consume",
              bulk: true,
            })}
          >
            <UtensilsCrossed className="mr-1.5 h-4 w-4" />
            Consume
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="rounded-xl"
            disabled={selectedEntries.length === 0}
            onClick={() => setExitRequest({
              entries: selectedEntries,
              mode: "dispose",
              bulk: true,
            })}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Dispose
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl"
            onClick={cancelSelection}
            aria-label="Cancel item selection"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Location Pill Tabs — tablet/desktop (the phone has its own chip row) */}
      {!isPhone && (
        <div className="flex flex-wrap gap-2">
          {LOCATION_TABS.map((loc) => {
            const style = STORAGE_STYLES[loc];
            const Icon = style.icon;
            return (
              <button
                key={loc}
                type="button"
                onClick={() => setFilterLocation(loc)}
                aria-pressed={filterLocation === loc}
                className={cn(
                  "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-all",
                  filterLocation === loc ? style.activeChip : style.inactiveChip,
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {loc === "All" ? "All Locations" : loc}
              </button>
            );
          })}
        </div>
      )}

      {/* Purchase history filters — explicit month, store and receipt controls.
          These replace the old month carousel, whose arrows implied navigation
          and hid the fact that it was filtering the pantry. */}
      {!isPhone && (
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ReceiptText className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <h2 className="font-display text-base font-semibold text-foreground">Find purchased stock</h2>
                <p className="text-sm text-muted-foreground">Filter this pantry by month, store, or an exact receipt.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {purchaseFilterCount > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-xl text-muted-foreground"
                  onClick={resetPurchaseFilters}
                >
                  <RotateCcw className="mr-1.5 h-4 w-4" />
                  Reset
                </Button>
              )}
              <Button
                type="button"
                variant={isArchivedView ? "default" : "outline"}
                size="sm"
                className="rounded-xl"
                onClick={() => updatePurchaseFilter(isArchivedView ? "all" : "archived")}
              >
                <Archive className="mr-1.5 h-4 w-4" />
                {isArchivedView ? "Viewing archived" : "Archived"}
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[0.85fr_1fr_1.5fr]">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                Purchase month
              </label>
              <Select
                value={isArchivedView ? "all" : purchaseFilter}
                onValueChange={updatePurchaseFilter}
                disabled={isArchivedView}
              >
                <SelectTrigger className="h-11 w-full rounded-xl" aria-label="Filter by purchase month">
                  <SelectValue placeholder="Any month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any month</SelectItem>
                  {purchaseMonths.map((month) => (
                    <SelectItem key={month} value={month}>
                      {format(parseISO(`${month}-01`), "MMMM yyyy")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Store className="h-3.5 w-3.5" aria-hidden />
                Store
              </label>
              <Select value={storeFilter} onValueChange={updateStoreFilter} disabled={isArchivedView}>
                <SelectTrigger className="h-11 w-full rounded-xl" aria-label="Filter by store">
                  <SelectValue placeholder="Any store" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any store</SelectItem>
                  {purchaseStores.map((store) => (
                    <SelectItem key={store.value} value={store.value}>{store.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <ReceiptText className="h-3.5 w-3.5" aria-hidden />
                Exact receipt
              </label>
              <Select value={receiptFilter} onValueChange={setReceiptFilter} disabled={isArchivedView}>
                <SelectTrigger className="h-11 w-full rounded-xl" aria-label="Filter by exact receipt">
                  <SelectValue placeholder="All receipts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All receipts</SelectItem>
                  {purchaseFilter === "all" && storeFilter === "all" && (
                    <SelectItem value="unlinked">Added without a receipt</SelectItem>
                  )}
                  {receiptOptions.map((purchase) => (
                    <SelectItem key={purchase.id} value={purchase.id}>
                      {purchase.store_name || "Unknown store"} · {format(parseISO(purchase.purchased_at), "MMM d, yyyy")} · {purchase.purchase_items?.length ?? 0} items
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!isArchivedView && purchaseSummary && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-primary/[0.06] px-3.5 py-3">
              <ReceiptText className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <p className="text-sm">
                <span className="font-semibold text-foreground">{purchaseSummary.title}</span>
                <span className="text-muted-foreground"> — {purchaseSummary.detail}</span>
              </p>
            </div>
          )}
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
              onClick={() => updatePurchaseFilter(m)}
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
            onClick={() => updatePurchaseFilter("archived")}
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

      {isPhone && mode === "history" && !isArchivedView && (
        <div className="space-y-3 rounded-2xl border border-border/80 bg-card p-3.5 shadow-sm">
          <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Store className="h-3.5 w-3.5" aria-hidden />
                Store
              </label>
              <Select value={storeFilter} onValueChange={updateStoreFilter}>
                <SelectTrigger className="h-11 w-full rounded-xl" aria-label="Filter purchase history by store">
                  <SelectValue placeholder="Any store" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any store</SelectItem>
                  {purchaseStores.map((store) => (
                    <SelectItem key={store.value} value={store.value}>{store.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <ReceiptText className="h-3.5 w-3.5" aria-hidden />
                Receipt
              </label>
              <Select value={receiptFilter} onValueChange={setReceiptFilter}>
                <SelectTrigger className="h-11 w-full rounded-xl" aria-label="Filter purchase history by receipt">
                  <SelectValue placeholder="All receipts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All receipts</SelectItem>
                  {receiptOptions.map((purchase) => (
                    <SelectItem key={purchase.id} value={purchase.id}>
                      {purchase.store_name || "Unknown store"} · {format(parseISO(purchase.purchased_at), "MMM d")} · {purchase.purchase_items?.length ?? 0} items
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {purchaseSummary && (
            <div className="flex items-start gap-2 rounded-xl bg-primary/[0.06] px-3 py-2.5">
              <ReceiptText className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <p className="text-xs leading-relaxed">
                <span className="font-semibold text-foreground">{purchaseSummary.title}</span>
                <span className="text-muted-foreground"> — {purchaseSummary.detail}</span>
              </p>
            </div>
          )}
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
            <Input placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 pl-9" />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="h-11 w-full rounded-xl sm:w-44"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={viewMode} onValueChange={(value) => setViewMode(value as PantryView)}>
            <SelectTrigger className="h-11 w-full rounded-xl sm:w-44" aria-label="Organize pantry">
              <SelectValue placeholder="View by" />
            </SelectTrigger>
            <SelectContent>
              {VIEW_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>View by {option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Intelligence Strip — tablet/desktop (the phone uses the status ribbon) */}
      {!isPhone && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {intelligenceCards.map((card) => (
            <button
              key={card.key}
              type="button"
              onClick={() => openStatus(card.key === "no-date" ? "no_expiry" : card.key)}
              className={cn(
                "group rounded-2xl p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                card.bg,
              )}
              aria-label={`${statusCounts[card.key]} ${card.label}. Open details.`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className={cn("mb-1", card.accent)}>{card.icon}</div>
                  <p className={cn("text-2xl font-bold tabular-nums font-[Outfit,var(--font-heading),sans-serif]", card.accent)}>
                    {statusCounts[card.key]}
                  </p>
                  <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </div>
            </button>
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
              onClick={() => setViewing(entry)}
              addedBy={activeGroupId ? profileMap?.get(entry.user_id) : undefined}
              selectionMode={selectionMode}
              selected={selectedIds.has(entry.id)}
              onToggleSelected={() => toggleSelected(entry.id)}
              onShare={isPersonalMode ? () => setShareEntries([entry]) : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {displayGroups.map((group) => {
            const GroupIcon = group.icon ?? Package;
            return (
              <section
                key={group.key}
                className={cn(
                  "rounded-[1.75rem] border p-3.5 sm:p-5",
                  group.panel ?? "border-border/60 bg-card/30",
                )}
              >
                <div className={cn("mb-4 flex items-center gap-3", group.tone)}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-current/10 bg-card/75 shadow-sm">
                    <GroupIcon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground font-[Outfit,var(--font-heading),sans-serif]">
                      {group.label}
                    </h2>
                    {group.detail && <p className="truncate text-xs text-muted-foreground">{group.detail}</p>}
                  </div>
                  <span className="rounded-full border border-border/70 bg-card/80 px-2.5 py-1 text-xs font-semibold tabular-nums text-muted-foreground shadow-sm">
                    {group.items.length}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
                  {group.items.map((entry) => (
                    <InventoryCard
                      key={entry.id}
                      entry={entry}
                      onClick={() => setViewing(entry)}
                      addedBy={activeGroupId ? profileMap?.get(entry.user_id) : undefined}
                      selectionMode={selectionMode}
                      selected={selectedIds.has(entry.id)}
                      onToggleSelected={() => toggleSelected(entry.id)}
                      onShare={isPersonalMode ? () => setShareEntries([entry]) : undefined}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {viewing && (
        <InventoryDetailsOverlay
          entry={viewing}
          open={!!viewing}
          onClose={() => setViewing(null)}
          onExit={(exitMode) => {
            setExitRequest({ entries: [viewing], mode: exitMode });
            setViewing(null);
          }}
          onShare={
            isPersonalMode
              ? () => {
                  setShareEntries([viewing]);
                  setViewing(null);
                }
              : undefined
          }
        />
      )}

      <ShareToGroupDialog
        open={!!shareEntries}
        onOpenChange={(open) => {
          if (!open) setShareEntries(null);
        }}
        payload={shareEntries ? { kind: "inventory", entries: shareEntries } : null}
        onShared={() => cancelSelection()}
      />

      {exitRequest && (
        <PantryExitDialog
          entries={exitRequest.entries}
          mode={exitRequest.mode}
          open
          onClose={() => setExitRequest(null)}
          onCompleted={() => {
            if (exitRequest.bulk) cancelSelection();
            setExitRequest(null);
          }}
        />
      )}

      {/* Phone progressive disclosure */}
      {isPhone && (
        <>
          <PantryToolsSheet open={toolsOpen} onOpenChange={setToolsOpen} />

          <Drawer open={filtersOpen} onOpenChange={setFiltersOpen}>
            <DrawerContent className="max-h-[88dvh] overflow-hidden">
              <DrawerHeader className="shrink-0 text-center">
                <DrawerTitle>Filters</DrawerTitle>
              </DrawerHeader>
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-[max(1.5rem,var(--safe-bottom))]">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Organize pantry</label>
                  <div className="grid grid-cols-2 gap-2">
                    {VIEW_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      const active = viewMode === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setViewMode(option.value)}
                          aria-pressed={active}
                          className={cn(
                            "flex min-h-12 items-center gap-2 rounded-xl border px-3 text-left text-sm font-medium transition-colors",
                            active
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border bg-card text-muted-foreground",
                          )}
                        >
                          <Icon className={cn("h-4 w-4", active && "text-primary")} aria-hidden />
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
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
