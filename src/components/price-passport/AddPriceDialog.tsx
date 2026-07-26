import { useEffect, useState, type FormEvent } from "react";
import { format } from "date-fns";
import { Eye, ReceiptText, ShieldCheck } from "lucide-react";
import { useCreatePriceObservation } from "@/hooks/usePricePassport";
import type { Item } from "@/hooks/usePantry";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface AddPriceDialogProps {
  item: Item;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PACKAGE_UNITS = [
  { value: "kg", label: "Kilogram (kg)" },
  { value: "g", label: "Gram (g)" },
  { value: "l", label: "Litre (L)" },
  { value: "ml", label: "Millilitre (ml)" },
  { value: "piece", label: "Piece" },
  { value: "pack", label: "Pack" },
] as const;

const localDateTime = () => format(new Date(), "yyyy-MM-dd'T'HH:mm");

const AddPriceDialog = ({ item, open, onOpenChange }: AddPriceDialogProps) => {
  const [storeName, setStoreName] = useState("");
  const [price, setPrice] = useState("");
  const [packageQuantity, setPackageQuantity] = useState("1");
  const [packageUnit, setPackageUnit] = useState("piece");
  const [observedAt, setObservedAt] = useState(localDateTime);
  const [share, setShare] = useState(true);
  const [notes, setNotes] = useState("");
  const createObservation = useCreatePriceObservation();
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    const suggestedUnit = (item.default_unit ?? "").toLowerCase();
    const supported = PACKAGE_UNITS.find((unit) => unit.value === suggestedUnit);
    setPackageUnit(supported?.value ?? "piece");
    setObservedAt(localDateTime());
  }, [item.default_unit, open]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const numericPrice = Number(price);
    const numericQuantity = Number(packageQuantity);
    if (!storeName.trim() || !Number.isFinite(numericPrice) || numericPrice < 0) return;
    if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) return;

    try {
      await createObservation.mutateAsync({
        item_id: item.id,
        item_name: item.name,
        item_brand: item.brand,
        store_name: storeName.trim(),
        price: numericPrice,
        currency: "AED",
        package_quantity: numericQuantity,
        package_unit: packageUnit,
        observed_at: new Date(observedAt).toISOString(),
        share_with_community: share,
        notes: notes.trim() || null,
      });
      toast({
        title: "Price added",
        description: `${item.name} at ${storeName.trim()} has been added to Compare.`,
      });
      setStoreName("");
      setPrice("");
      setPackageQuantity("1");
      setNotes("");
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "The price could not be saved.";
      toast({ title: "Could not add price", description: message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] max-w-md overflow-y-auto rounded-3xl">
        <DialogHeader>
          <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ReceiptText className="h-5 w-5" />
          </div>
          <DialogTitle className="text-xl">Add an observed price</DialogTitle>
          <DialogDescription>
            Record a price you saw while shopping. It will not change your pantry quantity.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="price-store">Store</Label>
            <Input
              id="price-store"
              autoComplete="organization"
              placeholder="e.g. Waterfront Market"
              value={storeName}
              onChange={(event) => setStoreName(event.target.value)}
              className="h-11"
              required
            />
          </div>

          <div className="grid grid-cols-[1.2fr_0.8fr] gap-3">
            <div className="space-y-2">
              <Label htmlFor="price-value">Price</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                  AED
                </span>
                <Input
                  id="price-value"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  className="h-11 pl-12 text-base font-semibold tabular-nums"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price-quantity">Package size</Label>
              <Input
                id="price-quantity"
                type="number"
                min="0.001"
                step="any"
                inputMode="decimal"
                value={packageQuantity}
                onChange={(event) => setPackageQuantity(event.target.value)}
                className="h-11"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Measured as</Label>
            <Select value={packageUnit} onValueChange={setPackageUnit}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PACKAGE_UNITS.map((unit) => (
                  <SelectItem key={unit.value} value={unit.value}>
                    {unit.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs leading-relaxed text-muted-foreground">
              We use this to compare unlike package sizes fairly — for example 500 g against 1 kg.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price-date">Seen on</Label>
            <Input
              id="price-date"
              type="datetime-local"
              value={observedAt}
              onChange={(event) => setObservedAt(event.target.value)}
              className="h-11"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price-notes">Notes <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="price-notes"
              placeholder="Offer details, pack size, branch…"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="min-h-20 resize-none"
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-2xl border bg-secondary/60 p-3.5">
            <div className="flex min-w-0 gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <Label htmlFor="share-price" className="font-semibold">Help other shoppers</Label>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Share the store, price and date anonymously. Your identity and notes stay private.
                </p>
              </div>
            </div>
            <Switch id="share-price" checked={share} onCheckedChange={setShare} />
          </div>

          <Button
            type="submit"
            className="h-12 w-full rounded-xl text-base font-semibold"
            disabled={createObservation.isPending}
          >
            <Eye className="mr-2 h-4 w-4" />
            {createObservation.isPending ? "Adding price…" : "Add observed price"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddPriceDialog;
