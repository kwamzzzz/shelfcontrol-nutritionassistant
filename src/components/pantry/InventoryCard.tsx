import { type InventoryRow } from "@/hooks/usePantry";
import { getExpiryStatus, getExpiryLabel } from "@/lib/pantry-utils";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MapPin, Package, PackageOpen, AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";
import QuickActionsBar from "@/components/pantry/QuickActionsBar";

interface Props {
  entry: InventoryRow;
  onClick: () => void;
  addedBy?: string;
}

const statusBadge: Record<string, string> = {
  fresh: "bg-success text-success-foreground",
  expiring: "bg-warning text-warning-foreground",
  expired: "bg-destructive text-destructive-foreground",
  "no-date": "bg-muted text-muted-foreground",
};

const InventoryCard = ({ entry, onClick, addedBy }: Props) => {
  const status = getExpiryStatus(entry.expiry_date);
  const label = getExpiryLabel(entry.expiry_date);
  const isOpened = entry.sealed_status === "opened";
  const imageUrl = (entry.items as any)?.image_url;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
      className="group flex flex-col rounded-2xl bg-card shadow-sm transition-shadow hover:shadow-md text-left overflow-hidden w-full cursor-pointer"
    >
      {/* Image area */}
      <div className="relative aspect-square sm:aspect-[4/3] w-full bg-secondary flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={entry.items.name} className="h-full w-full object-cover" />
        ) : (
          <Package className="h-10 w-10 text-muted-foreground/30" />
        )}
        {/* Status badge overlay */}
        <span
          className={cn(
            "absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5 rounded-full px-1.5 py-0.5 sm:px-2.5 text-[0.55rem] sm:text-xs font-semibold shadow-sm",
            statusBadge[status]
          )}
        >
          {label}
        </span>
        {/* Opened indicator */}
        {isOpened && (
          <span className="absolute top-1.5 left-1.5 sm:top-2.5 sm:left-2.5 rounded-full bg-accent/90 px-1.5 py-0.5 sm:px-2 text-[0.55rem] sm:text-xs font-medium text-accent-foreground shadow-sm flex items-center gap-0.5 sm:gap-1">
            <PackageOpen className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            Opened
          </span>
        )}
        {/* No confirmed storage location — expiry estimates are unreliable until set */}
        {entry.status === "active" && !entry.storage_location && (
          <span
            className="absolute bottom-1.5 left-1.5 sm:bottom-2.5 sm:left-2.5 flex items-center gap-0.5 sm:gap-1 rounded-full bg-warning px-1.5 py-0.5 sm:px-2 text-[0.55rem] sm:text-xs font-medium text-warning-foreground shadow-sm"
            title="No storage location set — confirm it for an accurate expiry estimate"
          >
            <AlertTriangle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            Set storage
          </span>
        )}
        {/* Archived / consumed / discarded status (archived-months view) */}
        {entry.status && entry.status !== "active" && (
          <span className="absolute bottom-2.5 right-2.5 rounded-full bg-foreground/85 px-2 py-0.5 text-[0.65rem] font-medium capitalize text-background shadow-sm">
            {entry.status}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-2.5 sm:p-3.5">
        <p className="font-semibold text-sm sm:text-[0.95rem] leading-tight text-foreground truncate font-[Outfit,var(--font-heading),sans-serif]">
          {entry.items.name}
        </p>

        {entry.items.brand && (
          <p className="mt-0.5 text-[0.7rem] sm:text-xs text-muted-foreground truncate">{entry.items.brand}</p>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-1 sm:gap-1.5">
          {entry.items.category && (
            <Badge variant="secondary" className="text-[0.6rem] sm:text-[0.65rem] font-normal px-1.5 py-0">
              {entry.items.category}
            </Badge>
          )}
          {entry.storage_location && (
            <span className="inline-flex items-center gap-0.5 text-[0.6rem] sm:text-[0.65rem] text-muted-foreground">
              <MapPin className="h-2.5 w-2.5" />
              {entry.storage_location}
            </span>
          )}
        </div>

        {/* Purchase date + store */}
        {entry.purchases?.purchased_at && (
          <p className="mt-1 text-[0.6rem] sm:text-[0.65rem] text-muted-foreground truncate">
            Bought {format(parseISO(entry.purchases.purchased_at), "MMM d")}
            {entry.purchases.store_name ? ` · ${entry.purchases.store_name}` : ""}
          </p>
        )}

        {/* Attribution */}
        {addedBy && (
          <p className="mt-1 text-[0.6rem] text-muted-foreground truncate">
            Added by {addedBy}
          </p>
        )}

        {/* Quantity */}
        <div className="mt-auto pt-2 sm:pt-3 border-t border-border flex items-baseline justify-between">
          <div>
            <span className="text-base sm:text-lg font-bold tabular-nums text-foreground font-[Outfit,var(--font-heading),sans-serif]">
              {entry.quantity}
            </span>
            <span className="ml-1 text-xs sm:text-sm text-muted-foreground">{entry.unit}</span>
          </div>
        </div>

        {/* Quick Actions (visible on hover) */}
        <QuickActionsBar entry={entry} />
      </div>
    </div>
  );
};

export default InventoryCard;
