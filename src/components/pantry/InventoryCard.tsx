import { type InventoryRow } from "@/hooks/usePantry";
import { getExpiryStatus, getExpiryLabel } from "@/lib/pantry-utils";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MapPin, Package } from "lucide-react";

interface Props {
  entry: InventoryRow;
  onClick: () => void;
}

const statusBadge: Record<string, string> = {
  fresh: "bg-success text-success-foreground",
  expiring: "bg-warning text-warning-foreground",
  expired: "bg-destructive text-destructive-foreground",
  "no-date": "bg-muted text-muted-foreground",
};

const InventoryCard = ({ entry, onClick }: Props) => {
  const status = getExpiryStatus(entry.expiry_date);
  const label = getExpiryLabel(entry.expiry_date);

  return (
    <button
      onClick={onClick}
      className="group flex flex-col rounded-2xl bg-card shadow-sm transition-shadow hover:shadow-md text-left overflow-hidden w-full"
    >
      {/* Image placeholder */}
      <div className="relative aspect-[4/3] w-full bg-secondary flex items-center justify-center">
        <Package className="h-10 w-10 text-muted-foreground/30" />
        {/* Status badge overlay */}
        <span
          className={cn(
            "absolute top-2.5 right-2.5 rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-sm",
            statusBadge[status]
          )}
        >
          {label}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-3.5">
        <p className="font-semibold text-[0.95rem] leading-tight text-foreground truncate font-[Outfit,var(--font-heading),sans-serif]">
          {entry.items.name}
        </p>

        {entry.items.brand && (
          <p className="mt-0.5 text-xs text-muted-foreground truncate">{entry.items.brand}</p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {entry.items.category && (
            <Badge variant="secondary" className="text-[0.65rem] font-normal px-1.5 py-0">
              {entry.items.category}
            </Badge>
          )}
          {entry.storage_location && (
            <span className="inline-flex items-center gap-0.5 text-[0.65rem] text-muted-foreground">
              <MapPin className="h-2.5 w-2.5" />
              {entry.storage_location}
            </span>
          )}
        </div>

        {/* Quantity */}
        <div className="mt-auto pt-3 border-t border-border/50">
          <span className="text-lg font-bold tabular-nums text-foreground font-[Outfit,var(--font-heading),sans-serif]">
            {entry.quantity}
          </span>
          <span className="ml-1 text-sm text-muted-foreground">{entry.unit}</span>
        </div>
      </div>
    </button>
  );
};

export default InventoryCard;
