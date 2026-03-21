import { type InventoryRow } from "@/hooks/usePantry";
import { getExpiryStatus, getExpiryLabel } from "@/lib/pantry-utils";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MapPin, Pencil, UtensilsCrossed, Trash2 } from "lucide-react";

interface Props {
  entry: InventoryRow;
  onClick: () => void;
}

const statusAccent: Record<string, string> = {
  fresh: "border-l-success",
  expiring: "border-l-warning",
  expired: "border-l-destructive",
  "no-date": "border-l-border",
};

const expiryPill: Record<string, string> = {
  fresh: "bg-success/10 text-success",
  expiring: "bg-warning/10 text-warning",
  expired: "bg-destructive/10 text-destructive",
  "no-date": "bg-muted text-muted-foreground",
};

const InventoryCard = ({ entry, onClick }: Props) => {
  const status = getExpiryStatus(entry.expiry_date);
  const label = getExpiryLabel(entry.expiry_date);

  return (
    <div
      className={cn(
        "group relative flex w-full items-start justify-between rounded-2xl border-l-4 bg-card p-4 shadow-sm transition-shadow hover:shadow-md cursor-pointer",
        statusAccent[status]
      )}
      onClick={onClick}
    >
      {/* Left info */}
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold text-foreground truncate">
          {entry.items.name}
        </p>
        {entry.items.brand && (
          <p className="text-xs text-muted-foreground truncate">{entry.items.brand}</p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {entry.items.category && (
            <Badge variant="secondary" className="text-xs font-normal">
              {entry.items.category}
            </Badge>
          )}
          {entry.storage_location && (
            <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {entry.storage_location}
            </span>
          )}
        </div>
      </div>

      {/* Right info */}
      <div className="ml-4 flex flex-col items-end gap-1.5 shrink-0">
        <span className="text-lg font-bold tabular-nums text-foreground">
          {entry.quantity} <span className="text-sm font-medium text-muted-foreground">{entry.unit}</span>
        </span>
        <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", expiryPill[status])}>
          {label}
        </span>
      </div>

      {/* Hover quick actions */}
      <div className="absolute bottom-2 right-3 hidden items-center gap-1 group-hover:flex">
        <button
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent/20 hover:text-foreground transition-colors"
          title="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent/20 hover:text-foreground transition-colors"
          title="Consume"
        >
          <UtensilsCrossed className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-colors"
          title="Discard"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default InventoryCard;
