import { type InventoryRow } from "@/hooks/usePantry";
import { getExpiryStatus, getExpiryLabel } from "@/lib/pantry-utils";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MapPin, Package, PackageOpen, Apple, Beef, Milk, Wheat, Coffee, IceCream, Cookie, Droplets } from "lucide-react";
import QuickActionsBar from "@/components/pantry/QuickActionsBar";

interface Props {
  entry: InventoryRow;
  onClick: () => void;
  addedBy?: string;
}

const statusBadge: Record<string, string> = {
  fresh: "bg-success/15 text-success",
  expiring: "bg-warning/15 text-warning",
  expired: "bg-destructive/15 text-destructive",
  "no-date": "bg-muted text-muted-foreground",
};

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

const InventoryCard = ({ entry, onClick, addedBy }: Props) => {
  const status = getExpiryStatus(entry.expiry_date);
  const label = getExpiryLabel(entry.expiry_date);
  const isOpened = entry.sealed_status === "opened";
  const imageUrl = (entry.items as any)?.image_url;
  const category = entry.items.category ?? "";
  const FallbackIcon = CATEGORY_ICON[category] ?? Package;
  const fallbackBg = CATEGORY_BG[category] ?? "bg-secondary";

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
      className="group flex items-center gap-3.5 rounded-2xl bg-card p-3.5 shadow-sm transition-all hover:shadow-md hover:bg-accent/5 cursor-pointer min-h-[72px]"
    >
      {/* Image */}
      <div className={cn(
        "relative h-12 w-12 shrink-0 rounded-xl overflow-hidden flex items-center justify-center",
        !imageUrl && fallbackBg
      )}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={entry.items.name}
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        ) : (
          <FallbackIcon className="h-5 w-5 text-muted-foreground/50" />
        )}
        {isOpened && (
          <div className="absolute bottom-0 inset-x-0 bg-accent/90 flex items-center justify-center py-px">
            <PackageOpen className="h-2.5 w-2.5 text-accent-foreground" />
          </div>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm leading-tight text-foreground truncate">
            {entry.items.name}
          </p>
          {entry.items.brand && (
            <span className="text-[0.65rem] text-muted-foreground truncate hidden sm:inline">
              {entry.items.brand}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
          {category && (
            <Badge variant="secondary" className="text-[0.6rem] font-normal px-1.5 py-0 h-4">
              {category}
            </Badge>
          )}
          {entry.storage_location && (
            <span className="inline-flex items-center gap-0.5 text-[0.6rem] text-muted-foreground">
              <MapPin className="h-2.5 w-2.5" />
              {entry.storage_location}
            </span>
          )}
          {addedBy && (
            <span className="text-[0.6rem] text-muted-foreground truncate">
              by {addedBy}
            </span>
          )}
        </div>
      </div>

      {/* Right side: quantity + status */}
      <div className="shrink-0 flex flex-col items-end gap-1">
        <span className={cn(
          "rounded-full px-2 py-0.5 text-[0.6rem] font-semibold",
          statusBadge[status]
        )}>
          {label}
        </span>
        <span className="text-sm font-bold tabular-nums text-foreground">
          {entry.quantity} <span className="text-xs font-normal text-muted-foreground">{entry.unit}</span>
        </span>
      </div>
    </div>
  );
};

export default InventoryCard;
