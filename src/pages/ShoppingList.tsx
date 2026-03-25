import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { formatCurrency } from "@/lib/currency";
import { useShoppingList, type ShoppingItem } from "@/hooks/useShoppingList";
import AddShoppingItemDialog from "@/components/shopping/AddShoppingItemDialog";
import EditShoppingItemDialog from "@/components/shopping/EditShoppingItemDialog";
import ShoppingItemRow from "@/components/shopping/ShoppingItemRow";
import { ShoppingCart, Package, CheckCircle2, DollarSign, Users, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGroupContext } from "@/contexts/GroupContext";
import { useGroups } from "@/hooks/useGroups";
import { useProfileNames } from "@/hooks/useProfileNames";
import { Badge } from "@/components/ui/badge";

type FilterTab = "all" | "open" | "completed";

const ShoppingList = () => {
  const { data: list, isLoading } = useShoppingList();
  const [editing, setEditing] = useState<ShoppingItem | null>(null);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const { activeGroupId, isPersonalMode } = useGroupContext();
  const { groups } = useGroups();
  const activeGroup = groups.find((g) => g.id === activeGroupId);
  const [searchParams] = useSearchParams();
  const prefill = searchParams.get("prefill");

  // Collect user IDs for attribution
  const userIds = useMemo(() => {
    if (!list) return [];
    const ids: string[] = [];
    list.forEach((item) => {
      ids.push(item.user_id);
      if (item.completed_by) ids.push(item.completed_by);
    });
    return ids;
  }, [list]);
  const { data: profileMap } = useProfileNames(userIds);

  const filtered = useMemo(() => {
    if (!list) return [];
    return list.filter((item) => {
      const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;
      if (filterTab === "open") return !item.is_purchased;
      if (filterTab === "completed") return item.is_purchased;
      return true;
    });
  }, [list, search, filterTab]);

  const { unpurchased, purchased } = useMemo(() => {
    const unpurchased: ShoppingItem[] = [];
    const purchased: ShoppingItem[] = [];
    filtered.forEach((item) => {
      (item.is_purchased ? purchased : unpurchased).push(item);
    });
    return { unpurchased, purchased };
  }, [filtered]);

  const totalEstimate = useMemo(() => {
    const openItems = (list ?? []).filter((i) => !i.is_purchased);
    return openItems.reduce((sum, i) => sum + (Number(i.estimated_cost ?? 0) * Number(i.quantity ?? 1)), 0);
  }, [list]);

  const totalItems = (list ?? []).length;
  const toBuyCount = (list ?? []).filter((i) => !i.is_purchased).length;
  const purchasedCount = (list ?? []).filter((i) => i.is_purchased).length;

  const summaryCards = [
    { label: "Total Items", value: totalItems, icon: <Package className="h-5 w-5" />, accent: "text-foreground", bg: "bg-secondary/60" },
    { label: "To Buy", value: toBuyCount, icon: <ShoppingCart className="h-5 w-5" />, accent: "text-primary", bg: "bg-primary/10" },
    { label: "Purchased", value: purchasedCount, icon: <CheckCircle2 className="h-5 w-5" />, accent: "text-success", bg: "bg-success/10" },
    { label: "Est. Spend", value: totalEstimate > 0 ? formatCurrency(totalEstimate) : "—", icon: <DollarSign className="h-5 w-5" />, accent: "text-accent", bg: "bg-accent/10" },
  ];

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "open", label: "Open" },
    { key: "completed", label: "Completed" },
  ];

  const contextLabel = isPersonalMode ? "Personal" : activeGroup?.name ?? "Group";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-foreground font-[Outfit,var(--font-heading),sans-serif]">Shopping List</h1>
            {!isPersonalMode && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Users className="h-3 w-3" />
                Shared
              </Badge>
            )}
          </div>
          <p className="mt-1 text-muted-foreground">
            Viewing: {contextLabel} · {toBuyCount} item{toBuyCount !== 1 ? "s" : ""} to buy
            {prefill && (
              <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                Suggested: {prefill}
              </span>
            )}
          </p>
        </div>
        <AddShoppingItemDialog />
      </div>

      {/* Filter Tabs + Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex gap-1.5">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterTab(tab.key)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                filterTab === tab.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Intelligence Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.label} className={cn("rounded-2xl p-4 shadow-sm", card.bg)}>
            <div className={cn("mb-1", card.accent)}>{card.icon}</div>
            <p className={cn("text-2xl font-bold tabular-nums font-[Outfit,var(--font-heading),sans-serif]", card.accent)}>
              {card.value}
            </p>
            <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="rounded-2xl bg-card p-8 text-center text-muted-foreground shadow-sm">Loading...</div>
      ) : totalItems === 0 ? (
        <div className="rounded-2xl bg-card p-10 text-center shadow-sm">
          <ShoppingCart className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-muted-foreground">
            {isPersonalMode
              ? "Your shopping list is empty. Add items to get started."
              : `This shared shopping list is empty. Add items for ${activeGroup?.name ?? "the group"} to collaborate.`}
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
          No items match your filter.
        </div>
      ) : (
        <>
          {unpurchased.length > 0 && (
            <section>
              <div className="mb-4 flex items-center gap-2 text-primary">
                <ShoppingCart className="h-4 w-4" />
                <h2 className="text-sm font-semibold uppercase tracking-wide font-[Outfit,var(--font-heading),sans-serif]">
                  To Buy
                </h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {unpurchased.length}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {unpurchased.map((item) => (
                  <ShoppingItemRow
                    key={item.id}
                    item={item}
                    onClick={() => setEditing(item)}
                    addedBy={activeGroupId ? profileMap?.get(item.user_id) : undefined}
                    completedBy={undefined}
                  />
                ))}
              </div>
            </section>
          )}

          {purchased.length > 0 && (
            <section>
              <div className="mb-4 flex items-center gap-2 text-success">
                <CheckCircle2 className="h-4 w-4" />
                <h2 className="text-sm font-semibold uppercase tracking-wide font-[Outfit,var(--font-heading),sans-serif]">
                  Purchased
                </h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {purchased.length}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {purchased.map((item) => (
                  <ShoppingItemRow
                    key={item.id}
                    item={item}
                    onClick={() => setEditing(item)}
                    addedBy={activeGroupId ? profileMap?.get(item.user_id) : undefined}
                    completedBy={activeGroupId && item.completed_by ? profileMap?.get(item.completed_by) : undefined}
                  />
                ))}
              </div>
            </section>
          )}

          {unpurchased.length === 0 && purchased.length > 0 && (
            <div className="rounded-2xl bg-success/10 p-6 text-center text-sm text-success shadow-sm">
              All items purchased! 🎉
            </div>
          )}
        </>
      )}

      {editing && (
        <EditShoppingItemDialog item={editing} open={!!editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
};

export default ShoppingList;
