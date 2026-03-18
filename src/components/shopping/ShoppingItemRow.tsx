import { type ShoppingItem, useUpdateShoppingItem } from "@/hooks/useShoppingList";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Link2 } from "lucide-react";

interface Props {
  item: ShoppingItem;
  onClick: () => void;
}

const ShoppingItemRow = ({ item, onClick }: Props) => {
  const updateItem = useUpdateShoppingItem();

  const togglePurchased = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await updateItem.mutateAsync({ id: item.id, is_purchased: !item.is_purchased });
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:bg-accent/30",
        item.is_purchased && "opacity-60"
      )}
    >
      <div
        onClick={togglePurchased}
        className="shrink-0"
      >
        <Checkbox
          checked={item.is_purchased}
          className="pointer-events-none"
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className={cn(
          "font-medium text-foreground truncate",
          item.is_purchased && "line-through text-muted-foreground"
        )}>
          {item.name}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {item.category && (
            <Badge variant="secondary" className="text-xs font-normal">{item.category}</Badge>
          )}
          {item.item_id && (
            <span className="flex items-center gap-0.5 text-primary/60">
              <Link2 className="h-3 w-3" />
              Linked
            </span>
          )}
        </div>
      </div>

      <div className="ml-4 flex flex-col items-end gap-1 shrink-0 text-sm">
        {item.quantity && (
          <span className="font-semibold text-foreground">×{item.quantity}</span>
        )}
        {item.estimated_cost != null && item.estimated_cost > 0 && (
          <span className="text-muted-foreground">${Number(item.estimated_cost).toFixed(2)}</span>
        )}
      </div>
    </button>
  );
};

export default ShoppingItemRow;
