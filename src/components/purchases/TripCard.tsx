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
  loggedBy?: string;
}

const TripCard = ({ purchase, isActive, onClick, loggedBy }: Props) => {
  const itemCount = purchase.purchase_items?.length ?? 0;
  const totalCost = Number(purchase.total_cost ?? 0);
  const previewItems = purchase.purchase_items?.slice(0, 3) ?? [];

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-2xl border bg-card p-4 transition-all duration-200",
        isActive
          ? "border-border bg-secondary shadow-[0_14px_30px_-20px_rgba(0,0,0,0.28)] -translate-y-[2px]"
          : "border-border shadow-[0_1px_6px_-2px_rgba(0,0,0,0.10)] hover:border-border hover:-translate-y-px hover:shadow-[0_8px_20px_-12px_rgba(0,0,0,0.16)]"
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
                <p className="font-[Outfit] text-[15px] font-semibold text-foreground truncate">
                  {purchase.store_name}
                </p>
              ) : (
                <p className="font-[Outfit] text-[15px] font-medium text-muted-foreground italic">
                  No store
                </p>
              )}
              <p className="mt-0.5 text-[13px] text-muted-foreground">
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
        <div className="mt-3 space-y-1">
          {previewItems.map((pi) => (
            <p key={pi.id} className="text-[13px] leading-relaxed text-muted-foreground truncate pl-10">
              {pi.items?.name ?? "Unknown"}
              {pi.unit_price != null && (
                <span className="ml-1 tabular-nums">· {formatCurrency(Number(pi.unit_price))}</span>
              )}
            </p>
          ))}
          {itemCount > 3 && (
            <p className="text-[13px] text-muted-foreground/70 pl-10">
              + {itemCount - 3} more item{itemCount - 3 !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 flex items-center gap-2 pl-10 flex-wrap">
        <Badge variant="secondary" className="text-xs font-normal px-2 py-0.5 h-auto">
          <ShoppingBag className="mr-1 h-3 w-3" />
          {itemCount} item{itemCount !== 1 ? "s" : ""}
        </Badge>
        {loggedBy && (
          <span className="text-xs text-muted-foreground">Logged by {loggedBy}</span>
        )}
      </div>
    </button>
  );
};

export default TripCard;
