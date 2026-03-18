import { type InventoryRow } from "@/hooks/usePantry";
import { getExpiryStatus, getExpiryLabel } from "@/lib/pantry-utils";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MapPin } from "lucide-react";

interface Props {
  entry: InventoryRow;
  onClick: () => void;
}

const expiryColors: Record<string, string> = {
  fresh: "bg-success/10 text-success border-success/20",
  expiring: "bg-warning/10 text-warning border-warning/20",
  expired: "bg-destructive/10 text-destructive border-destructive/20",
  "no-date": "bg-muted text-muted-foreground border-border",
};

const InventoryCard = ({ entry, onClick }: Props) => {
  const status = getExpiryStatus(entry.expiry_date);
  const label = getExpiryLabel(entry.expiry_date);

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-xl border bg-card p-4 text-left transition-colors hover:bg-accent/30",
        status === "expired" && "border-destructive/30",
        status === "expiring" && "border-warning/30"
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground truncate">{entry.items.name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {entry.items.category && (
            <Badge variant="secondary" className="text-xs font-normal">{entry.items.category}</Badge>
          )}
          {entry.storage_location && (
            <span className="flex items-center gap-0.5">
              <MapPin className="h-3 w-3" />
              {entry.storage_location}
            </span>
          )}
        </div>
      </div>
      <div className="ml-4 flex flex-col items-end gap-1.5 shrink-0">
        <span className="text-sm font-semibold text-foreground">
          {entry.quantity} {entry.unit}
        </span>
        <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-medium", expiryColors[status])}>
          {label}
        </span>
      </div>
    </button>
  );
};

export default InventoryCard;
