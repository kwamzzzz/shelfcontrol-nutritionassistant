import { format, parseISO } from "date-fns";
import { CalendarDays, ChevronRight, ShoppingBag, Store } from "lucide-react";
import { type PurchaseWithItems } from "@/hooks/usePurchases";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";

interface Props {
  purchase: PurchaseWithItems;
  isActive: boolean;
  onClick: () => void;
  loggedBy?: string;
}

const TripCard = ({ purchase, isActive, onClick, loggedBy }: Props) => {
  const items = purchase.purchase_items ?? [];
  const itemCount = items.length;
  const totalCost = Number(purchase.total_cost ?? 0);
  const preview = items
    .slice(0, 3)
    .map((line) => line.items?.name ?? "Unknown")
    .join(", ");

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive ? "true" : undefined}
      className={cn(
        "group relative w-full overflow-hidden rounded-2xl border p-3 text-left transition duration-200 sm:p-3.5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isActive
          ? "border-primary/25 bg-[linear-gradient(110deg,hsl(var(--primary)/0.10),hsl(var(--surface-panel))_62%)] shadow-[0_16px_36px_-28px_hsl(var(--primary)/0.8)]"
          : "border-transparent bg-[hsl(var(--surface-subtle))] hover:-translate-y-0.5 hover:border-primary/15 hover:bg-[hsl(var(--surface-inset))]"
      )}
    >
      {isActive && (
        <span
          aria-hidden="true"
          className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-primary"
        />
      )}

      <span className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border shadow-sm",
            isActive
              ? "border-primary/15 bg-primary text-primary-foreground"
              : "border-border/65 bg-[hsl(var(--surface-panel))] text-primary"
          )}
        >
          <Store className="h-5 w-5" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-[0.95rem] font-semibold text-foreground">
            {purchase.store_name || "Store not recorded"}
          </span>
          <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            {format(parseISO(purchase.purchased_at), "MMM d, yyyy")}
          </span>
        </span>

        <span className="shrink-0 text-right">
          <span className="block font-display text-sm font-bold tabular-nums text-foreground sm:text-base">
            {totalCost > 0 ? formatCurrency(totalCost) : "—"}
          </span>
          <span className="mt-1 inline-flex items-center justify-end gap-1 text-[0.7rem] font-medium text-muted-foreground">
            <ShoppingBag className="h-3 w-3" />
            {itemCount} item{itemCount === 1 ? "" : "s"}
          </span>
        </span>

        <ChevronRight
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground/50 transition",
            "group-hover:translate-x-0.5 group-hover:text-primary",
            isActive && "text-primary"
          )}
        />
      </span>

      <span className="mt-3 flex min-w-0 items-center gap-2 pl-14">
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          {preview
            ? `${preview}${itemCount > 3 ? ` +${itemCount - 3}` : ""}`
            : "No line items recorded"}
        </span>
        {loggedBy && (
          <span className="hidden shrink-0 text-[0.68rem] text-muted-foreground/80 sm:inline">
            by {loggedBy}
          </span>
        )}
      </span>
    </button>
  );
};

export default TripCard;
