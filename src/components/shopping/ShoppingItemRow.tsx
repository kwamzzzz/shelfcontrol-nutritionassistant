import { formatDistanceToNow, parseISO } from "date-fns";
import {
  Check,
  ChevronRight,
  Circle,
  Link2,
  Loader2,
  ShoppingBag,
} from "lucide-react";
import { type ShoppingItem, useToggleShoppingItem } from "@/hooks/useShoppingList";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";

interface Props {
  item: ShoppingItem;
  onClick: () => void;
  addedBy?: string;
  completedBy?: string;
}

const categoryTone = (category?: string | null) => {
  const value = category?.toLowerCase() ?? "";

  if (/(produce|fruit|vegetable|fresh)/.test(value)) {
    return "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300";
  }
  if (/(dairy|milk|cheese|egg)/.test(value)) {
    return "bg-sky-500/12 text-sky-700 dark:text-sky-300";
  }
  if (/(meat|fish|protein)/.test(value)) {
    return "bg-rose-500/12 text-rose-700 dark:text-rose-300";
  }
  if (/(bakery|bread|grain|pantry)/.test(value)) {
    return "bg-amber-500/14 text-amber-800 dark:text-amber-300";
  }

  return "bg-primary/10 text-primary";
};

const ShoppingItemRow = ({ item, onClick, addedBy, completedBy }: Props) => {
  const toggleItem = useToggleShoppingItem();
  const quantity = Number(item.quantity ?? 1);
  const estimatedLineCost = Number(item.estimated_cost ?? 0) * quantity;
  const completionTime =
    item.is_purchased && item.completed_at
      ? formatDistanceToNow(parseISO(item.completed_at), { addSuffix: true })
      : null;

  const togglePurchased = () => {
    toggleItem.mutate({ id: item.id, is_purchased: !item.is_purchased });
  };

  return (
    <div
      className={cn(
        "group flex min-w-0 items-center gap-2 rounded-2xl border border-transparent p-2 transition duration-200",
        "bg-[hsl(var(--surface-subtle))] hover:border-primary/15 hover:bg-[hsl(var(--surface-inset))]",
        item.is_purchased && "bg-success/5"
      )}
    >
      <button
        type="button"
        onClick={togglePurchased}
        disabled={toggleItem.isPending}
        aria-label={item.is_purchased ? `Mark ${item.name} as not purchased` : `Mark ${item.name} as purchased`}
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          item.is_purchased
            ? "border-success/25 bg-success text-success-foreground shadow-sm"
            : "border-border/80 bg-[hsl(var(--surface-panel))] text-muted-foreground hover:border-primary/35 hover:text-primary"
        )}
      >
        {toggleItem.isPending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : item.is_purchased ? (
          <Check className="h-5 w-5" strokeWidth={2.5} />
        ) : (
          <Circle className="h-5 w-5" strokeWidth={1.8} />
        )}
      </button>

      <button
        type="button"
        onClick={onClick}
        className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-xl px-1.5 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Edit ${item.name}`}
      >
        <span className={cn("hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl sm:flex", categoryTone(item.category))}>
          <ShoppingBag className="h-5 w-5" />
        </span>

        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block truncate font-display text-[0.95rem] font-semibold leading-tight text-foreground",
              item.is_purchased && "text-muted-foreground line-through decoration-muted-foreground/50"
            )}
          >
            {item.name}
          </span>

          <span className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            {item.category && <span className="truncate">{item.category}</span>}
            {item.category && item.item_id && <span aria-hidden="true">•</span>}
            {item.item_id && (
              <span className="inline-flex shrink-0 items-center gap-1 text-primary/80">
                <Link2 className="h-3 w-3" />
                Linked
              </span>
            )}
            {!item.category && !item.item_id && (
              <span>{item.is_purchased ? "In your basket" : "Ready to shop"}</span>
            )}
          </span>

          {(addedBy || completedBy) && (
            <span className="mt-1 block truncate text-[0.68rem] text-muted-foreground/80">
              {item.is_purchased && completedBy
                ? `Picked up by ${completedBy}${completionTime ? ` ${completionTime}` : ""}`
                : addedBy
                  ? `Added by ${addedBy}`
                  : null}
            </span>
          )}
        </span>

        <span className="shrink-0 text-right">
          <span className="block font-display text-sm font-semibold tabular-nums text-foreground">
            ×{quantity}
          </span>
          {estimatedLineCost > 0 && (
            <span className="mt-0.5 block text-xs tabular-nums text-muted-foreground">
              {formatCurrency(estimatedLineCost)}
            </span>
          )}
        </span>

        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/55 transition group-hover:translate-x-0.5 group-hover:text-primary" />
      </button>
    </div>
  );
};

export default ShoppingItemRow;
