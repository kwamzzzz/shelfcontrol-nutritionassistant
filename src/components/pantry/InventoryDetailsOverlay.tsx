import { useEffect, useMemo, useState } from "react";
import { differenceInCalendarDays, format, parseISO, startOfToday } from "date-fns";
import { useNavigate } from "react-router-dom";
import {
  BadgeDollarSign,
  CalendarDays,
  ExternalLink,
  Globe2,
  ImagePlus,
  MapPin,
  Pencil,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Utensils,
} from "lucide-react";
import type { InventoryRow } from "@/hooks/usePantry";
import { useIsPhone } from "@/hooks/use-shell-mode";
import { classifyFood, estimateShelfLifeDays, recommendStorage, type StorageLocation } from "@/lib/shelf-life";
import { getItemMedia, type ItemMediaSource } from "@/lib/item-media";
import { useSignedImage } from "@/hooks/useSignedImage";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PantryExitDialog, { type PantryExitMode } from "@/components/pantry/PantryExitDialog";

interface Props {
  entry: InventoryRow;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onShare?: () => void;
}

interface NutritionRow {
  label: string;
  value: number;
  unit: string;
  dailyValue?: number;
}

const nutritionBasisLabel = (entry: InventoryRow) => {
  const { items } = entry;
  if (items.serving_size?.trim()) return items.serving_size.trim();
  if (items.nutrition_basis === "per_100g") return "100 g";
  if (items.nutrition_basis === "per_100ml") return "100 ml";
  if (items.nutrition_basis === "per_serving") return "1 serving";
  return "Per unit";
};

const displayNumber = (value: number) =>
  Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 1 });

const InventoryDetailsContent = ({ entry, onClose, onEdit, onShare }: Omit<Props, "open">) => {
  const navigate = useNavigate();
  const media = useMemo(() => getItemMedia(entry.items), [entry.items]);
  const fallbackMedia = useMemo(
    () => getItemMedia({ ...entry.items, image_url: null }),
    [entry.items],
  );
  const [imageSrc, setImageSrc] = useState<string | null>(media.src);
  const [mediaSource, setMediaSource] = useState<ItemMediaSource>(media.source);
  const signedUpload = useSignedImage(entry.items.image_url);
  const [exitMode, setExitMode] = useState<PantryExitMode | null>(null);
  const canExit = entry.status === "active";

  useEffect(() => {
    setImageSrc(media.source === "uploaded" ? signedUpload : media.src);
    setMediaSource(media.source);
  }, [media, signedUpload]);

  const classification = useMemo(
    () => classifyFood(entry.items.name, entry.items.category),
    [entry.items.category, entry.items.name],
  );
  const suggestedStorage = recommendStorage(classification.type).location;
  const storageLocation = (entry.storage_location || suggestedStorage) as StorageLocation | null;
  const isStorageSuggestion = !entry.storage_location && !!suggestedStorage;

  const shelfLife = useMemo(() => {
    if (entry.expiry_date) {
      const remaining = differenceInCalendarDays(parseISO(entry.expiry_date), startOfToday());
      if (remaining < 0) return { value: `Expired ${Math.abs(remaining)}d ago`, detail: format(parseISO(entry.expiry_date), "d MMM yyyy") };
      if (remaining === 0) return { value: "Expires today", detail: format(parseISO(entry.expiry_date), "d MMM yyyy") };
      return { value: `${remaining} day${remaining === 1 ? "" : "s"} left`, detail: format(parseISO(entry.expiry_date), "d MMM yyyy") };
    }

    if (storageLocation) {
      const days = estimateShelfLifeDays(
        classification.type,
        storageLocation,
        entry.sealed_status === "opened" ? "opened" : "sealed",
      );
      if (days != null) {
        return { value: `About ${days} day${days === 1 ? "" : "s"}`, detail: "App estimate" };
      }
    }

    return { value: "Not set", detail: "Add an expiry" };
  }, [classification.type, entry.expiry_date, entry.sealed_status, storageLocation]);

  const nutritionRows = useMemo(() => {
    const candidates: NutritionRow[] = [
      { label: "Calories", value: Number(entry.items.calories_per_unit ?? 0), unit: "kcal", dailyValue: 2000 },
      { label: "Protein", value: Number(entry.items.protein_g ?? 0), unit: "g", dailyValue: 50 },
      { label: "Carbohydrate", value: Number(entry.items.carbs_g ?? 0), unit: "g", dailyValue: 275 },
      { label: "Fat", value: Number(entry.items.fat_g ?? 0), unit: "g", dailyValue: 78 },
      { label: "Fiber", value: Number(entry.items.fiber_g ?? 0), unit: "g", dailyValue: 28 },
      { label: "Sugar", value: Number(entry.items.sugar_g ?? 0), unit: "g" },
      { label: "Sodium", value: Number(entry.items.sodium_mg ?? 0), unit: "mg", dailyValue: 2300 },
    ];
    return candidates.filter((row) => Number.isFinite(row.value) && row.value > 0);
  }, [entry.items]);
  const nutritionSourceUrl = entry.items.nutrition_source_url?.startsWith("https://")
    ? entry.items.nutrition_source_url
    : null;
  const nutritionStatus =
    entry.items.nutrition_confidence === "needs_review"
      ? "Needs package label"
      : entry.items.nutrition_estimated
        ? `${entry.items.nutrition_confidence === "high" ? "High-confidence " : ""}reference estimate`
        : "Confirmed by you";

  const metadata = [
    entry.items.country_of_origin?.trim()
      ? {
          label: "Country of origin",
          value: entry.items.country_of_origin.trim(),
          detail: "Product detail",
          icon: Globe2,
        }
      : null,
    {
      label: "Shelf life",
      value: shelfLife.value,
      detail: shelfLife.detail,
      icon: CalendarDays,
    },
    {
      label: "Storage",
      value: storageLocation || "Not set",
      detail: isStorageSuggestion ? "Suggested by Shelf Control" : entry.storage_location ? "Your pantry" : "Choose a location",
      icon: MapPin,
    },
  ].filter(Boolean) as Array<{
    label: string;
    value: string;
    detail: string;
    icon: typeof Globe2;
  }>;

  const openCompare = () => {
    onClose();
    navigate(`/pantry/${entry.item_id}/prices`);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="grid min-h-0 sm:grid-cols-[minmax(260px,0.9fr)_minmax(360px,1.1fr)]">
          <div className="relative min-h-64 overflow-hidden bg-[linear-gradient(145deg,hsl(var(--media-well-start)),hsl(var(--media-well-mid))_52%,hsl(var(--media-well-end)))] sm:min-h-[620px]">
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={mediaSource === "uploaded" ? entry.items.name : media.label}
                className={cn(
                  "h-full min-h-64 w-full sm:min-h-[620px]",
                  mediaSource === "uploaded"
                    ? "object-contain p-5 mix-blend-multiply"
                    : "object-contain p-5",
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
              <div className="flex min-h-64 w-full flex-col items-center justify-center px-8 text-center sm:min-h-[620px]">
                <span className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-border/70 bg-card/85 shadow-[0_18px_50px_-32px_hsl(var(--surface-shadow))]">
                  <ImagePlus aria-hidden className="h-8 w-8 text-primary" />
                </span>
                <p className="mt-5 font-serif text-2xl font-semibold text-foreground">Photo needed</p>
                <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
                  Upload an accurate photo for this exact product.
                </p>
              </div>
            )}
            {mediaSource === "catalog" && (
              <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/80 px-2.5 py-1 text-[11px] font-medium text-foreground shadow-sm backdrop-blur">
                <Sparkles className="h-3 w-3 text-primary" />
                Shelf Control catalogue image
              </span>
            )}
          </div>

          <div className="flex min-w-0 flex-col px-5 pb-7 pt-5 sm:px-7 sm:pb-8 sm:pt-8">
            <div className="pr-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {entry.items.category || classification.def.label}
              </p>
              <h2 className="mt-1 font-serif text-3xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-4xl">
                {entry.items.name}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {[entry.items.brand, `${displayNumber(entry.quantity)} ${entry.unit}`].filter(Boolean).join(" · ")}
              </p>
            </div>

            <div className={cn("mt-5 grid gap-2", metadata.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
              {metadata.map(({ label, value, detail, icon: Icon }) => (
                <div key={label} className="min-w-0 rounded-2xl border border-border/70 bg-card/75 p-3 shadow-[0_8px_24px_-20px_hsl(var(--surface-shadow))]">
                  <Icon className="h-4 w-4 text-primary" />
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                  <p className="mt-0.5 truncate text-xs font-semibold text-foreground sm:text-sm" title={value}>{value}</p>
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground" title={detail}>{detail}</p>
                </div>
              ))}
            </div>

            <Tabs defaultValue="nutrition" className="mt-6">
              <TabsList className="grid h-11 w-full grid-cols-2 rounded-xl bg-muted/70 p-1">
                <TabsTrigger value="nutrition" className="rounded-lg">Nutritional info</TabsTrigger>
                <TabsTrigger value="additional" className="rounded-lg">Additional info</TabsTrigger>
              </TabsList>

              <TabsContent value="nutrition" className="mt-4">
                <div className="mb-3 flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary/[0.055] px-3.5 py-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground">{nutritionStatus}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                      {entry.items.nutrition_source || "Add the product label to confirm these values."}
                    </p>
                  </div>
                  {nutritionSourceUrl && (
                    <a
                      href={nutritionSourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold text-primary hover:bg-primary/10"
                    >
                      Source
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                {nutritionRows.length ? (
                  <div className="overflow-hidden rounded-2xl border border-border bg-card/80">
                    <div className="flex items-end justify-between gap-4 border-b border-border bg-muted/35 px-4 py-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Serving basis</p>
                        <p className="font-semibold text-foreground">{nutritionBasisLabel(entry)}</p>
                      </div>
                      <div className="text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        <span className="block">Amount</span>
                        <span className="block">% guide</span>
                      </div>
                    </div>
                    <div className="px-4 py-2">
                      {nutritionRows.map((row) => (
                        <div key={row.label} className="grid grid-cols-[1fr_auto_3rem] items-center gap-3 border-b border-dashed border-border/80 py-2.5 text-sm last:border-0">
                          <span className="text-muted-foreground">{row.label}</span>
                          <span className="font-medium tabular-nums text-foreground">{displayNumber(row.value)} {row.unit}</span>
                          <span className="text-right text-xs tabular-nums text-muted-foreground">
                            {row.dailyValue ? `${Math.round((row.value / row.dailyValue) * 100)}%` : "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="border-t border-border bg-muted/25 px-4 py-2.5 text-[10px] leading-relaxed text-muted-foreground">
                      Guide percentages use standard adult reference values and are informational only.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-primary/25 bg-primary/[0.04] px-5 py-7 text-center">
                    <Sparkles className="mx-auto h-6 w-6 text-primary" />
                    <p className="mt-2 font-semibold text-foreground">Nutrition is ready to be completed</p>
                    <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
                      Add the label values once and they will appear anywhere this catalogue item is used.
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="additional" className="mt-4">
                <div className="rounded-2xl border border-border bg-card/80 px-5 py-5">
                  {entry.items.additional_info?.trim() ? (
                    <p className="whitespace-pre-line text-sm leading-7 text-foreground">
                      {entry.items.additional_info.trim()}
                    </p>
                  ) : (
                    <>
                      <p className="font-semibold text-foreground">No additional notes yet</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Add preparation, ingredient, dietary or handling notes. These details stay attached to the catalogue item across your pantry.
                      </p>
                    </>
                  )}
                  {mediaSource === "catalog" && (
                    <p className="mt-4 rounded-xl bg-muted/55 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                      This is a Shelf Control catalogue image for this product. Upload your own photo anytime to replace it.
                    </p>
                  )}
                  {mediaSource === "missing" && (
                    <p className="mt-4 rounded-xl bg-muted/55 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                      No exact image is available yet. Add a photo to complete this product card.
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <div className="shrink-0 space-y-2 border-t border-border bg-card/95 px-4 pb-[max(0.75rem,var(--safe-bottom))] pt-3 backdrop-blur sm:px-6 sm:pb-4">
        {canExit && (
          <div className="mx-auto flex max-w-3xl gap-2">
            <Button
              variant="outline"
              className="min-h-12 flex-1 rounded-xl border-success/40 text-success hover:bg-success/10 hover:text-success"
              onClick={() => setExitMode("consume")}
            >
              <Utensils className="h-4 w-4" />
              Consumed
            </Button>
            <Button
              variant="outline"
              className="min-h-12 flex-1 rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setExitMode("dispose")}
            >
              <Trash2 className="h-4 w-4" />
              Disposed
            </Button>
          </div>
        )}
        <div className="mx-auto flex max-w-3xl gap-2">
          <Button variant="outline" className="min-h-12 flex-1 rounded-xl" onClick={openCompare}>
            <BadgeDollarSign className="h-4 w-4" />
            Compare
          </Button>
          {onShare && (
            <Button variant="outline" size="icon" className="h-12 w-12 shrink-0 rounded-xl" onClick={onShare} aria-label="Share to group">
              <Share2 className="h-4 w-4" />
            </Button>
          )}
          <Button className="min-h-12 flex-[1.25] rounded-xl shadow-sm" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
            Edit details
          </Button>
        </div>
      </div>

      {exitMode && (
        <PantryExitDialog
          entry={entry}
          mode={exitMode}
          open={exitMode !== null}
          onClose={() => setExitMode(null)}
          onCompleted={onClose}
        />
      )}
    </div>
  );
};

const InventoryDetailsOverlay = ({ entry, open, onClose, onEdit, onShare }: Props) => {
  const isPhone = useIsPhone();
  const contentProps = { entry, onClose, onEdit, onShare };

  if (isPhone) {
    return (
      <Drawer open={open} onOpenChange={(next) => !next && onClose()}>
        <DrawerContent className="max-h-[94dvh] overflow-hidden">
          <DrawerHeader className="sr-only">
            <DrawerTitle>{entry.items.name}</DrawerTitle>
          </DrawerHeader>
          <InventoryDetailsContent {...contentProps} />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-5xl gap-0 overflow-hidden p-0 sm:p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>{entry.items.name}</DialogTitle>
        </DialogHeader>
        <InventoryDetailsContent {...contentProps} />
      </DialogContent>
    </Dialog>
  );
};

export default InventoryDetailsOverlay;
