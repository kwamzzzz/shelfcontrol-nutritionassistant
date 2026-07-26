import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { type InventoryRow, useUpdateInventory, useDeleteInventory, useUpdateItem } from "@/hooks/usePantry";
import GroupedUnitSelect from "@/components/shared/GroupedUnitSelect";
import ImageUpload from "@/components/shared/ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { STORAGE_LOCATIONS, CATEGORIES } from "@/lib/pantry-utils";
import { classifyFood, estimateShelfLifeDays, estimateExpiryDate, type StorageLocation } from "@/lib/shelf-life";
import { BadgeDollarSign, ChevronRight, Trash2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  entry: InventoryRow;
  open: boolean;
  onClose: () => void;
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong.";

const EditInventoryDialog = ({ entry, open, onClose }: Props) => {
  // Inventory fields
  const [quantity, setQuantity] = useState(String(entry.quantity));
  const [unit, setUnit] = useState(entry.unit);
  const [location, setLocation] = useState(entry.storage_location ?? "");
  const [expiryDate, setExpiryDate] = useState(entry.expiry_date ?? "");

  // Item reclassification fields
  const [itemName, setItemName] = useState(entry.items.name);
  const [category, setCategory] = useState(entry.items.category ?? "");

  // Inline nutrition
  const [calories, setCalories] = useState(String(entry.items.calories_per_unit ?? 0));
  const [protein, setProtein] = useState(String(entry.items.protein_g ?? 0));
  const [carbs, setCarbs] = useState(String(entry.items.carbs_g ?? 0));
  const [fat, setFat] = useState(String(entry.items.fat_g ?? 0));
  const [imageUrl, setImageUrl] = useState<string | null>(entry.items.image_url ?? null);

  const updateInventory = useUpdateInventory();
  const updateItem = useUpdateItem();
  const deleteInventory = useDeleteInventory();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Changing storage location recalculates the expected shelf life — but never
  // over an expiry the user has typed/kept (e.g. a printed use-by date).
  const [autoEstimated, setAutoEstimated] = useState(false);
  const [manualExpiry, setManualExpiry] = useState(!!entry.expiry_date);
  const handleLocationChange = (loc: string) => {
    setLocation(loc);
    if (loc && loc !== "Other" && entry.added_at && !manualExpiry) {
      const cls = classifyFood(entry.items.name, entry.items.category);
      const sealed = entry.sealed_status === "opened" ? "opened" : "sealed";
      const days = estimateShelfLifeDays(cls.type, loc as StorageLocation, sealed);
      if (days != null) {
        setExpiryDate(estimateExpiryDate(entry.added_at, days));
        setAutoEstimated(true);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Update inventory row
      await updateInventory.mutateAsync({
        id: entry.id,
        quantity: Number(quantity),
        unit,
        storage_location: location || null,
        expiry_date: expiryDate || null,
      });

      // Update item catalog fields (reclassification + nutrition)
      await updateItem.mutateAsync({
        id: entry.items.id,
        name: itemName.trim() || entry.items.name,
        category: category || null,
        calories_per_unit: calories ? Number(calories) : 0,
        protein_g: protein ? Number(protein) : 0,
        carbs_g: carbs ? Number(carbs) : 0,
        fat_g: fat ? Number(fat) : 0,
        image_url: imageUrl,
      });

      toast({ title: "Updated", description: `${itemName} updated.` });
      onClose();
    } catch (error: unknown) {
      toast({ title: "Error", description: errorMessage(error), variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteInventory.mutateAsync(entry.id);
      toast({ title: "Removed", description: `${entry.items.name} removed from pantry.` });
      onClose();
    } catch (error: unknown) {
      toast({ title: "Error", description: errorMessage(error), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Edit: {entry.items.name}</DialogTitle>
        </DialogHeader>
        <button
          type="button"
          onClick={() => {
            onClose();
            navigate(`/pantry/${entry.item_id}/prices`);
          }}
          className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-primary/20 bg-primary/[0.06] px-4 text-left transition-colors hover:bg-primary/10"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <BadgeDollarSign className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-foreground">Open Price Passport</span>
            <span className="block truncate text-xs text-muted-foreground">Compare stores and add a price</span>
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
        <form onSubmit={handleSave} className="space-y-4">
          <ImageUpload
            currentUrl={imageUrl}
            onUploaded={setImageUrl}
            onRemoved={() => setImageUrl(null)}
            folder="items"
          />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Item Name</Label>
              <Input value={itemName} onChange={(e) => setItemName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stock details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input type="number" min={0} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <GroupedUnitSelect value={unit} onValueChange={setUnit} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Storage Location</Label>
              <Select value={location} onValueChange={handleLocationChange}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {STORAGE_LOCATIONS.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <Input type="date" value={expiryDate} onChange={(e) => { setExpiryDate(e.target.value); setAutoEstimated(false); setManualExpiry(!!e.target.value); }} />
              {autoEstimated && (
                <p className="flex items-center gap-1 text-[11px] text-primary">
                  <Sparkles className="h-3 w-3" /> Auto-estimated from {location}
                </p>
              )}
            </div>
          </div>

          {/* Inline nutrition editing */}
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs uppercase tracking-wide">Nutrition per unit</Label>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label className="text-xs">Cal</Label>
                <Input type="number" min={0} step="any" value={calories} onChange={(e) => setCalories(e.target.value)} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Protein</Label>
                <Input type="number" min={0} step="any" value={protein} onChange={(e) => setProtein(e.target.value)} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Carbs</Label>
                <Input type="number" min={0} step="any" value={carbs} onChange={(e) => setCarbs(e.target.value)} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Fat</Label>
                <Input type="number" min={0} step="any" value={fat} onChange={(e) => setFat(e.target.value)} className="h-8 text-sm" />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={updateInventory.isPending || updateItem.isPending}>
              {updateInventory.isPending || updateItem.isPending ? "Saving..." : "Save"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove {entry.items.name}?</AlertDialogTitle>
                  <AlertDialogDescription>This will remove it from your pantry inventory.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Remove</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditInventoryDialog;
