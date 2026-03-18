import { useState, useMemo } from "react";
import { useInventory, type InventoryRow } from "@/hooks/usePantry";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES, STORAGE_LOCATIONS } from "@/lib/pantry-utils";
import AddInventoryDialog from "@/components/pantry/AddInventoryDialog";
import EditInventoryDialog from "@/components/pantry/EditInventoryDialog";
import InventoryCard from "@/components/pantry/InventoryCard";
import ItemCatalogSection from "@/components/pantry/ItemCatalogSection";
import { Package, Search } from "lucide-react";

const Pantry = () => {
  const { data: inventory, isLoading } = useInventory();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");
  const [editing, setEditing] = useState<InventoryRow | null>(null);

  const filtered = useMemo(() => {
    if (!inventory) return [];
    return inventory.filter((entry) => {
      const matchesSearch = entry.items.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = filterCategory === "all" || entry.items.category === filterCategory;
      const matchesLocation = filterLocation === "all" || entry.storage_location === filterLocation;
      return matchesSearch && matchesCategory && matchesLocation;
    });
  }, [inventory, search, filterCategory, filterLocation]);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Pantry</h1>
          <p className="mt-1 text-muted-foreground">
            {inventory?.length ?? 0} items in stock
          </p>
        </div>
        <AddInventoryDialog />
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterLocation} onValueChange={setFilterLocation}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {STORAGE_LOCATIONS.map((l) => (
              <SelectItem key={l} value={l}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <div className="mt-6 space-y-2">
        {isLoading ? (
          <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center">
            <Package className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-muted-foreground">
              {inventory?.length === 0
                ? "Your pantry is empty. Add a catalog item first, then add it to your pantry."
                : "No items match your filters."}
            </p>
          </div>
        ) : (
          filtered.map((entry) => (
            <InventoryCard key={entry.id} entry={entry} onClick={() => setEditing(entry)} />
          ))
        )}
      </div>

      {editing && (
        <EditInventoryDialog entry={editing} open={!!editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
};

export default Pantry;
