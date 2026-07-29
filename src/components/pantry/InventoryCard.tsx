import { useEffect, useMemo, useState } from "react";
import { type InventoryRow } from "@/hooks/usePantry";
import { getExpiryStatus, getExpiryLabel } from "@/lib/pantry-utils";
import { getItemMedia, type ItemMediaSource } from "@/lib/item-media";
import { useSignedImage } from "@/hooks/useSignedImage";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Check, ImagePlus, PackageOpen, AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";
import QuickActionsBar from "@/components/pantry/QuickActionsBar";
import { nutritionBasisLabel } from "@/lib/nutrition";
import { getStorageStyle } from "@/components/pantry/storage-style";

interface Props {
  entry: InventoryRow;
  onClick: () => void;
  addedBy?: string;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelected?: () => void;
  onShare?: () => void;
}

const statusBadge: Record<string, string> = {
  fresh: "bg-success text-success-foreground",
  expiring: "bg-warning text-warning-foreground",
  expired: "bg-destructive text-destructive-foreground",
  "no-date": "bg-muted text-muted-foreground",
};

const InventoryCard = ({
  entry,
  onClick,
  addedBy,
  selectionMode = false,
  selected = false,
  onToggleSelected,
  onShare,
}: Props) => {
  const status = getExpiryStatus(entry.expiry_date);
  const label = getExpiryLabel(entry.expiry_date);
  const isOpened = entry.sealed_status === "opened";
  const media = useMemo(() => getItemMedia(entry.items), [entry.items]);
  const fallbackMedia = useMemo(
    () => getItemMedia({ ...entry.items, image_url: null }),
    [entry.items],
  );
  const [imageSrc, setImageSrc] = useState<string | null>(media.src);
  const [mediaSource, setMediaSource] = useState<ItemMediaSource>(media.source);
  const signedUpload = useSignedImage(entry.items.image_url);
  const missingLocation = entry.status === "active" && !entry.storage_location;
  const storageStyle = getStorageStyle(entry.storage_location);
  const StorageIcon = storageStyle.icon;
  const nutritionBasis = nutritionBasisLabel(entry.items).replace(/^Per /, "per ");
  const nutritionSummary = [
    Number(entry.items.calories_per_unit ?? 0) > 0
      ? `${Number(entry.items.calories_per_unit).toLocaleString(undefined, { maximumFractionDigits: 0 })} kcal`
      : null,
    Number(entry.items.protein_g ?? 0) > 0
      ? `${Number(entry.items.protein_g).toLocaleString(undefined, { maximumFractionDigits: 1 })}g protein`
      : null,
  ].filter(Boolean).join(" · ");
  const nutritionWithBasis = nutritionSummary ? `${nutritionSummary} · ${nutritionBasis}` : "";

  useEffect(() => {
    setImageSrc(media.source === "uploaded" ? signedUpload : media.src);
    setMediaSource(media.source);
  }, [media, signedUpload]);

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
      onClick={selectionMode ? onToggleSelected : onClick}
      role="button"
      tabIndex={0}
      aria-pressed={selectionMode ? selected : undefined}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (selectionMode) onToggleSelected?.();
          else onClick();
        }
      }}
      className={cn(
        "group surface-panel flex w-full cursor-pointer flex-col overflow-hidden rounded-2xl text-left transition",
        selected
          ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-md"
          : "hover:shadow-md"
      )}
      aria-label={a11yLabel}
    >
      {/* Image area — consistent media well whether or not an image exists */}
      <div className="media-well relative isolate aspect-[3/4] sm:aspect-[4/3] w-full flex items-center justify-center overflow-hidden">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={mediaSource === "uploaded" ? entry.items.name : media.label}
            loading="lazy"
            className={cn(
              "h-full w-full transition duration-300 group-hover:scale-[1.025]",
              mediaSource === "uploaded"
                ? "object-contain p-1.5 mix-blend-multiply sm:p-2"
                : "object-contain p-1.5 sm:p-2",
            )}
            onError={() => {
              if (mediaSource === "uploaded" && fallbackMedia.src) {
                setImageSrc(fallbackMedia.src);
                setMediaSource(fallbackMedia.source);
              } else {
                setImageSrc(null);
                setMediaSource("missing");
              }
            }}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[linear-gradient(145deg,hsl(var(--media-well-start)),hsl(var(--media-well-mid))_55%,hsl(var(--media-well-end)))] px-3 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/80 bg-card/85 shadow-sm">
              <ImagePlus aria-hidden className="h-5 w-5 text-primary" />
            </span>
            <span className="text-[0.65rem] font-medium text-muted-foreground">Photo needed</span>
          </div>
        )}

        {selectionMode && (
          <span
            aria-hidden
            className={cn(
              "absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 shadow-sm transition",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-white/90 bg-background/85 text-transparent backdrop-blur"
            )}
          >
            <Check className="h-4 w-4" strokeWidth={3} />
          </span>
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
        {isOpened && !selectionMode && (
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

        {nutritionWithBasis && (
          <p className="mt-1 truncate text-[0.65rem] font-medium text-primary/90 sm:text-xs">
            {nutritionWithBasis}
          </p>
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
            <span className={cn("inline-flex truncate items-center gap-0.5 text-[0.7rem] sm:hidden", entry.storage_location ? storageStyle.accent : "text-muted-foreground")}>
              <StorageIcon className="h-3 w-3 shrink-0" />
              <span className="truncate">{entry.storage_location ?? entry.items.category}</span>
            </span>
          )}
          {entry.storage_location && (
            <span className={cn("hidden items-center gap-0.5 rounded-full bg-card/70 px-1.5 py-0.5 text-[0.65rem] sm:inline-flex", storageStyle.accent)}>
              <StorageIcon className="h-2.5 w-2.5" />
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
        {!selectionMode && <QuickActionsBar entry={entry} onShare={onShare} />}
      </div>
    </div>
  );
};

export default InventoryCard;
