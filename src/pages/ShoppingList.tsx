import { useState, useMemo } from "react";
import { formatCurrency } from "@/lib/currency";
import { useShoppingList, type ShoppingItem } from "@/hooks/useShoppingList";
import AddShoppingItemDialog from "@/components/shopping/AddShoppingItemDialog";
import EditShoppingItemDialog from "@/components/shopping/EditShoppingItemDialog";
import ShoppingItemRow from "@/components/shopping/ShoppingItemRow";
import { ShoppingCart, Package, CheckCircle2, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

const ShoppingList = () => {
  const { data: list, isLoading } = useShoppingList();
  const [editing, setEditing] = useState<ShoppingItem | null>(null);
  const [search, setSearch] = useState("");

  const { unpurchased, purchased } = useMemo(() => {
    const unpurchased: ShoppingItem[] = [];
    const purchased: ShoppingItem[] = [];
    list?.forEach((item) => {
      const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return;
      (item.is_purchased ? purchased : unpurchased).push(item);
    });
    return { unpurchased, purchased };
  }, [list, search]);

  const totalEstimate = useMemo(() => {
    return unpurchased.reduce((sum, i) => sum + (Number(i.estimated_cost ?? 0) * Number(i.quantity ?? 1)), 0);
  }, [unpurchased]);

  const totalItems = (list ?? []).length;
  const toBuyCount = unpurchased.length;
  const purchasedCount = purchased.length;

  const summaryCards = [
    { label: "Total Items", value: totalItems, icon: <Package className="h-5 w-5" />, accent: "text-foreground", bg: "bg-secondary/60" },
    { label: "To Buy", value: toBuyCount, icon: <ShoppingCart className="h-5 w-5" />, accent: "text-primary", bg: "bg-primary/10" },
    { label: "Purchased", value: purchasedCount, icon: <CheckCircle2 className="h-5 w-5" />, accent: "text-success", bg: "bg-success/10" },
    { label: "Est. Spend", value: totalEstimate > 0 ? formatCurrency(totalEstimate) : "—", icon: <DollarSign className="h-5 w-5" />, accent: "text-accent", bg: "bg-accent/10" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-[Outfit,var(--font-heading),sans-serif]">Shopping List</h1>
          <p className="mt-1 text-muted-foreground">
            {toBuyCount} item{toBuyCount !== 1 ? "s" : ""} to buy
          </p>
        </div>
        <AddShoppingItemDialog />
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
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

      {/* To Buy Section */}
      {isLoading ? (
        <div className="rounded-2xl bg-card p-8 text-center text-muted-foreground shadow-sm">Loading...</div>
      ) : totalItems === 0 ? (
        <div className="rounded-2xl bg-card p-10 text-center shadow-sm">
          <ShoppingCart className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-muted-foreground">
            Your shopping list is empty. Add items to get started.
          </p>
        </div>
      ) : (
        <>
          {toBuyCount === 0 && (
            <div className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground shadow-sm">
              All items purchased! 🎉
            </div>
          )}

          {toBuyCount > 0 && (
            <section>
              <div className="mb-4 flex items-center gap-2 text-primary">
                <ShoppingCart className="h-4 w-4" />
                <h2 className="text-sm font-semibold uppercase tracking-wide font-[Outfit,var(--font-heading),sans-serif]">
                  To Buy
                </h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {toBuyCount}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {unpurchased.map((item) => (
                  <ShoppingItemRow key={item.id} item={item} onClick={() => setEditing(item)} />
                ))}
              </div>
            </section>
          )}

          {purchasedCount > 0 && (
            <section>
              <div className="mb-4 flex items-center gap-2 text-success">
                <CheckCircle2 className="h-4 w-4" />
                <h2 className="text-sm font-semibold uppercase tracking-wide font-[Outfit,var(--font-heading),sans-serif]">
                  Purchased
                </h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {purchasedCount}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {purchased.map((item) => (
                  <ShoppingItemRow key={item.id} item={item} onClick={() => setEditing(item)} />
                ))}
              </div>
            </section>
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
