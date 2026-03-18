import { useState, useMemo } from "react";
import { useShoppingList, type ShoppingItem } from "@/hooks/useShoppingList";
import AddShoppingItemDialog from "@/components/shopping/AddShoppingItemDialog";
import EditShoppingItemDialog from "@/components/shopping/EditShoppingItemDialog";
import ShoppingItemRow from "@/components/shopping/ShoppingItemRow";
import { ShoppingCart } from "lucide-react";

const ShoppingList = () => {
  const { data: list, isLoading } = useShoppingList();
  const [editing, setEditing] = useState<ShoppingItem | null>(null);

  const { unpurchased, purchased } = useMemo(() => {
    const unpurchased: ShoppingItem[] = [];
    const purchased: ShoppingItem[] = [];
    list?.forEach((item) => {
      (item.is_purchased ? purchased : unpurchased).push(item);
    });
    return { unpurchased, purchased };
  }, [list]);

  const totalEstimate = useMemo(() => {
    return unpurchased.reduce((sum, i) => sum + (Number(i.estimated_cost ?? 0) * Number(i.quantity ?? 1)), 0);
  }, [unpurchased]);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Shopping List</h1>
          <p className="mt-1 text-muted-foreground">
            {unpurchased.length} item{unpurchased.length !== 1 ? "s" : ""} to buy
            {totalEstimate > 0 && (
              <span className="ml-1">· est. ${totalEstimate.toFixed(2)}</span>
            )}
          </p>
        </div>
        <AddShoppingItemDialog />
      </div>

      {/* Unpurchased items */}
      <div className="mt-6 space-y-2">
        {isLoading ? (
          <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">Loading...</div>
        ) : unpurchased.length === 0 && purchased.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center">
            <ShoppingCart className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-muted-foreground">
              Your shopping list is empty. Add items to get started.
            </p>
          </div>
        ) : (
          <>
            {unpurchased.length === 0 && (
              <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
                All items purchased! 🎉
              </div>
            )}
            {unpurchased.map((item) => (
              <ShoppingItemRow key={item.id} item={item} onClick={() => setEditing(item)} />
            ))}
          </>
        )}
      </div>

      {/* Purchased items */}
      {purchased.length > 0 && (
        <div className="mt-8">
          <p className="mb-3 text-sm font-medium text-muted-foreground">
            Purchased ({purchased.length})
          </p>
          <div className="space-y-2">
            {purchased.map((item) => (
              <ShoppingItemRow key={item.id} item={item} onClick={() => setEditing(item)} />
            ))}
          </div>
        </div>
      )}

      {editing && (
        <EditShoppingItemDialog item={editing} open={!!editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
};

export default ShoppingList;
