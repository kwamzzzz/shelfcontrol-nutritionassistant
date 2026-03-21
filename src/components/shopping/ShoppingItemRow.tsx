import { type ShoppingItem, useUpdateShoppingItem } from "@/hooks/useShoppingList";
import { formatCurrency } from "@/lib/currency";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Link2, ShoppingBag } from "lucide-react";

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
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
      className={cn(
        "group relative flex flex-col rounded-2xl bg-card shadow-sm transition-shadow hover:shadow-md text-left overflow-hidden w-full cursor-pointer",
        item.is_purchased && "opacity-60"
      )}
    >
      {/* Image placeholder area */}
      <div className="relative aspect-[4/3] w-full bg-secondary flex items-center justify-center">
        <ShoppingBag className="h-10 w-10 text-muted-foreground/30" />

        {/* Checkbox overlay — top right */}
        <div
          onClick={togglePurchased}
          className="absolute top-2.5 right-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-card/90 shadow-sm backdrop-blur-sm cursor-pointer"
        >
          <Checkbox
            checked={item.is_purchased}
            className={cn(
              "pointer-events-none h-5 w-5 rounded-md border-2",
              item.is_purchased
                ? "border-success bg-success text-success-foreground"
                : "border-muted-foreground"
            )}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-3.5">
        <p className={cn(
          "font-semibold text-[0.95rem] leading-tight text-foreground truncate font-[Outfit,var(--font-heading),sans-serif]",
          item.is_purchased && "line-through text-muted-foreground"
        )}>
          {item.name}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {item.category && (
            <Badge variant="secondary" className="text-[0.65rem] font-normal px-1.5 py-0">
              {item.category}
            </Badge>
          )}
          {item.item_id && (
            <span className="inline-flex items-center gap-0.5 text-[0.65rem] text-primary/60">
              <Link2 className="h-2.5 w-2.5" />
              Linked
            </span>
          )}
        </div>

        {/* Quantity + Cost footer */}
        <div className="mt-auto pt-3 border-t border-border/50 flex items-baseline justify-between">
          {item.quantity ? (
            <span className="text-lg font-bold tabular-nums text-foreground font-[Outfit,var(--font-heading),sans-serif]">
              ×{item.quantity}
            </span>
          ) : (
            <span />
          )}
          {item.estimated_cost != null && item.estimated_cost > 0 && (
            <span className="text-sm text-muted-foreground">{formatCurrency(Number(item.estimated_cost))}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShoppingItemRow;
