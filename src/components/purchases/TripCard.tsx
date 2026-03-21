import { type PurchaseWithItems } from "@/hooks/usePurchases";
import { formatCurrency } from "@/lib/currency";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Store, ShoppingBag } from "lucide-react";

interface Props {
  purchase: PurchaseWithItems;
  isActive: boolean;
  onClick: () => void;
}

const TripCard = ({ purchase, isActive, onClick }: Props) => {
  const itemCount = purchase.purchase_items?.length ?? 0;
  const totalCost = Number(purchase.total_cost ?? 0);
  const previewItems = purchase.purchase_items?.slice(0, 3) ?? [];

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-2xl border bg-card p-4 transition-all duration-200",
        "shadow-[0_1px_8px_-2px_hsl(var(--foreground)/0.04)]",
        "hover:shadow-[0_2px_16px_-4px_hsl(var(--foreground)/0.08)]",
        isActive
          ? "border-l-4 border-l-primary border-t-border border-r-border border-b-border shadow-[0_2px_16px_-4px_hsl(var(--foreground)/0.1)]"
          : "border-border hover:border-border/80"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
              <Store className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              {purchase.store_name ? (
                <p className="font-[Outfit] text-sm font-semibold text-foreground truncate">
                  {purchase.store_name}
                </p>
              ) : (
                <p className="font-[Outfit] text-sm font-medium text-muted-foreground italic">
                  No store
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {format(parseISO(purchase.purchased_at), "MMM d, yyyy")}
              </p>
            </div>
          </div>
        </div>

        {totalCost > 0 && (
          <span className="font-[Outfit] text-base font-bold tabular-nums text-foreground shrink-0">
            {formatCurrency(totalCost)}
          </span>
        )}
      </div>

      {/* Preview items */}
      {previewItems.length > 0 && (
        <div className="mt-3 space-y-0.5">
          {previewItems.map((pi) => (
            <p key={pi.id} className="text-xs text-muted-foreground truncate pl-10">
              {pi.items?.name ?? "Unknown"}
              {pi.unit_price != null && (
                <span className="ml-1 tabular-nums">· {formatCurrency(Number(pi.unit_price))}</span>
              )}
            </p>
          ))}
          {itemCount > 3 && (
            <p className="text-xs text-muted-foreground/60 pl-10">
              + {itemCount - 3} more item{itemCount - 3 !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 flex items-center gap-2 pl-10">
        <Badge variant="secondary" className="text-[10px] font-normal px-2 py-0 h-5">
          <ShoppingBag className="mr-1 h-2.5 w-2.5" />
          {itemCount} item{itemCount !== 1 ? "s" : ""}
        </Badge>
      </div>
    </button>
  );
};

export default TripCard;
