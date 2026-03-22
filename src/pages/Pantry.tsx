import { useState, useMemo } from "react";
import { useInventory, type InventoryRow } from "@/hooks/usePantry";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES, STORAGE_LOCATIONS } from "@/lib/pantry-utils";
import { getExpiryStatus, type ExpiryStatus } from "@/lib/pantry-utils";
import AddInventoryDialog from "@/components/pantry/AddInventoryDialog";
import EditInventoryDialog from "@/components/pantry/EditInventoryDialog";
import InventoryCard from "@/components/pantry/InventoryCard";
import ItemCatalogSection from "@/components/pantry/ItemCatalogSection";
import { Package, Search, AlertTriangle, Clock, ShieldCheck, HelpCircle, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGroupContext } from "@/contexts/GroupContext";
import { useGroups } from "@/hooks/useGroups";
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
  const { activeGroupId, isPersonalMode } = useGroupContext();
  const { groups } = useGroups();
  const activeGroup = groups.find((g) => g.id === activeGroupId);
  const contextLabel = isPersonalMode ? "Personal Pantry" : `${activeGroup?.name ?? "Group"} Pantry`;
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterLocation, setFilterLocation] = useState("All");
  const [editing, setEditing] = useState<InventoryRow | null>(null);

  const filtered = useMemo(() => {
    if (!inventory) return [];
    return inventory.filter((entry) => {
      const matchesSearch = entry.items.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = filterCategory === "all" || entry.items.category === filterCategory;
      const matchesLocation = filterLocation === "All" || entry.storage_location === filterLocation;
      return matchesSearch && matchesCategory && matchesLocation;
    });
  }, [inventory, search, filterCategory, filterLocation]);

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
          </p>
        </div>
        <AddInventoryDialog />
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
                    <InventoryCard key={entry.id} entry={entry} onClick={() => setEditing(entry)} />
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
