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
  const missingLocation = entry.status === "active" && !entry.storage_location;

  // Phone shows ONE overlay badge. Priority: expired → expiring → missing storage
  // → opened → no expiry. Secondary states stay available in the detail sheet and
  // are still announced through the card's accessible name.
  const primaryBadge =
    status === "expired" || status === "expiring"
      ? { label, className: statusBadge[status] }
      : missingLocation
        ? { label: "Set storage", className: "bg-warning text-warning-foreground" }
        : isOpened
          ? { label: "Opened", className: "bg-accent text-accent-foreground" }
          : { label, className: statusBadge[status] };

  const a11yLabel = [
    entry.items.name,
    entry.items.brand,
    `${entry.quantity} ${entry.unit}`,
    label,
    isOpened ? "Opened" : null,
    missingLocation ? "No storage location set" : null,
    entry.storage_location,
    entry.status && entry.status !== "active" ? entry.status : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
      className="group surface-panel flex flex-col rounded-2xl transition-shadow hover:shadow-md text-left overflow-hidden w-full cursor-pointer"
      aria-label={a11yLabel}
    >
      {/* Image area — consistent media well whether or not an image exists */}
      <div className="media-well relative aspect-[3/4] sm:aspect-[4/3] w-full flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={entry.items.name} loading="lazy" className="h-full w-full object-contain p-1.5 sm:p-2" />
        ) : (
          <Package aria-hidden className="h-10 w-10 sm:h-10 sm:w-10 text-muted-foreground/30" />
        )}

        {/* Phone: a single prioritised status. Tablet/desktop: full badge set. */}
        <span
          aria-hidden
          className={cn(
            "absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5 rounded-full px-1.5 py-0.5 sm:px-2.5 text-[0.65rem] sm:text-xs font-semibold shadow-sm",
            primaryBadge.className,
          )}
        >
          {primaryBadge.label}
        </span>

        {/* Secondary states — hidden on phone to avoid overlay collisions */}
        {isOpened && (
          <span className="hidden sm:flex absolute top-2.5 left-2.5 rounded-full bg-accent/90 px-2 py-0.5 text-xs font-medium text-accent-foreground shadow-sm items-center gap-1">
            <PackageOpen className="h-3 w-3" />
            Opened
          </span>
        )}
        {entry.status === "active" && !entry.storage_location && (
          <span
            className="hidden sm:flex absolute bottom-2.5 left-2.5 items-center gap-1 rounded-full bg-warning px-2 py-0.5 text-xs font-medium text-warning-foreground shadow-sm"
            title="No storage location set — confirm it for an accurate expiry estimate"
          >
            <AlertTriangle className="h-3 w-3" />
            Set storage
          </span>
        )}
        {entry.status && entry.status !== "active" && (
          <span className="hidden sm:block absolute bottom-2.5 right-2.5 rounded-full bg-foreground/85 px-2 py-0.5 text-[0.65rem] font-medium capitalize text-background shadow-sm">
            {entry.status}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-2.5 sm:p-3.5">
        <p className="font-semibold text-sm sm:text-[0.95rem] leading-tight text-foreground line-clamp-2 font-[Outfit,var(--font-heading),sans-serif]">
          {entry.items.name}
        </p>

        {entry.items.brand && (
          <p className="mt-0.5 hidden sm:block text-xs text-muted-foreground truncate">{entry.items.brand}</p>
        )}

        {/* Phone: one concise metadata line (location preferred, else category).
            Tablet/desktop: the full set. */}
        <div className="mt-1 sm:mt-1.5 flex flex-wrap items-center gap-1 sm:gap-1.5">
          {entry.items.category && (
            <Badge variant="secondary" className="hidden sm:inline-flex text-[0.65rem] font-normal px-1.5 py-0">
              {entry.items.category}
            </Badge>
          )}
          {(entry.storage_location || entry.items.category) && (
            <span className="inline-flex sm:hidden items-center gap-0.5 text-[0.7rem] text-muted-foreground truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{entry.storage_location ?? entry.items.category}</span>
            </span>
          )}
          {entry.storage_location && (
            <span className="hidden sm:inline-flex items-center gap-0.5 text-[0.65rem] text-muted-foreground">
              <MapPin className="h-2.5 w-2.5" />
              {entry.storage_location}
            </span>
          )}
        </div>

        {/* Purchase date + store — detail-level metadata, tablet/desktop only */}
        {entry.purchases?.purchased_at && (
          <p className="mt-1 hidden sm:block text-[0.65rem] text-muted-foreground truncate">
            Bought {format(parseISO(entry.purchases.purchased_at), "MMM d")}
            {entry.purchases.store_name ? ` · ${entry.purchases.store_name}` : ""}
          </p>
        )}

        {/* Attribution — tablet/desktop only */}
        {addedBy && (
          <p className="mt-1 hidden sm:block text-[0.6rem] text-muted-foreground truncate">
            Added by {addedBy}
          </p>
        )}

        {/* Quantity — no divider on phone (brief §8.2) */}
        <div className="mt-auto pt-1.5 sm:pt-3 sm:border-t sm:border-border flex items-baseline justify-between">
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
