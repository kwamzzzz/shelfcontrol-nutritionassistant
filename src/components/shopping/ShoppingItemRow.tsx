import { type ShoppingItem, useToggleShoppingItem } from "@/hooks/useShoppingList";
import { formatCurrency } from "@/lib/currency";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Link2, ShoppingBag, Apple, Beef, Milk, Wheat, Coffee, IceCream, Cookie, Droplets, Package } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";

interface Props {
  item: ShoppingItem;
  onClick: () => void;
  addedBy?: string;
  completedBy?: string;
}

const CATEGORY_ICON: Record<string, typeof Package> = {
  Produce: Apple,
  "Meat & Seafood": Beef,
  Dairy: Milk,
  "Grains & Bread": Wheat,
  Beverages: Coffee,
  Frozen: IceCream,
  Snacks: Cookie,
  "Canned Goods": Droplets,
};

const CATEGORY_BG: Record<string, string> = {
  Produce: "bg-emerald-500/10",
  "Meat & Seafood": "bg-rose-500/10",
  Dairy: "bg-blue-500/10",
  "Grains & Bread": "bg-amber-500/10",
  Beverages: "bg-purple-500/10",
  Frozen: "bg-cyan-500/10",
  Snacks: "bg-orange-500/10",
  "Canned Goods": "bg-slate-500/10",
};

const ShoppingItemRow = ({ item, onClick, addedBy, completedBy }: Props) => {
  const toggleItem = useToggleShoppingItem();
  const category = item.category ?? "";
  const FallbackIcon = CATEGORY_ICON[category] ?? ShoppingBag;
  const fallbackBg = CATEGORY_BG[category] ?? "bg-secondary";

  const togglePurchased = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleItem.mutateAsync({ id: item.id, is_purchased: !item.is_purchased });
  };

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
      className={cn(
        "group flex items-center gap-3.5 rounded-2xl bg-card p-3.5 shadow-sm transition-all hover:shadow-md hover:bg-accent/5 cursor-pointer min-h-[72px]",
        item.is_purchased && "opacity-60"
      )}
    >
      {/* Checkbox */}
      <div
        onClick={togglePurchased}
        className="shrink-0 flex items-center justify-center cursor-pointer"
      >
        <Checkbox
          checked={item.is_purchased}
          className={cn(
            "h-5 w-5 rounded-md border-2 transition-colors",
            item.is_purchased
              ? "border-success bg-success text-success-foreground"
              : "border-muted-foreground"
          )}
        />
      </div>

      {/* Image */}
      <div className={cn(
        "relative h-12 w-12 shrink-0 rounded-xl overflow-hidden flex items-center justify-center",
        fallbackBg
      )}>
        <FallbackIcon className="h-5 w-5 text-muted-foreground/50" />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-semibold text-sm leading-tight text-foreground truncate",
          item.is_purchased && "line-through text-muted-foreground"
        )}>
          {item.name}
        </p>
        <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
          {category && (
            <Badge variant="secondary" className="text-[0.6rem] font-normal px-1.5 py-0 h-4">
              {category}
            </Badge>
          )}
          {item.item_id && (
            <span className="inline-flex items-center gap-0.5 text-[0.6rem] text-primary/60">
              <Link2 className="h-2.5 w-2.5" />
              Linked
            </span>
          )}
          {addedBy && (
            <span className="text-[0.6rem] text-muted-foreground truncate">by {addedBy}</span>
          )}
          {item.is_purchased && completedBy && (
            <span className="text-[0.6rem] text-success truncate">
              ✓ {completedBy}
              {item.completed_at && (
                <span className="text-muted-foreground ml-0.5">
                  {formatDistanceToNow(parseISO(item.completed_at), { addSuffix: true })}
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Right side: quantity + cost */}
      <div className="shrink-0 flex flex-col items-end gap-1">
        {item.quantity ? (
          <span className="text-sm font-bold tabular-nums text-foreground">×{item.quantity}</span>
        ) : null}
        {item.estimated_cost != null && item.estimated_cost > 0 && (
          <span className="text-xs text-muted-foreground">{formatCurrency(Number(item.estimated_cost))}</span>
        )}
      </div>
    </div>
  );
};

export default ShoppingItemRow;
