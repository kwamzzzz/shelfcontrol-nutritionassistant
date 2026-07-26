import { useState } from "react";
import { type Item, useUpdateItem, useDeleteItem } from "@/hooks/usePantry";
import GroupedUnitSelect from "@/components/shared/GroupedUnitSelect";
import ImageUpload from "@/components/shared/ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CATEGORIES } from "@/lib/pantry-utils";
import { Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  item: Item;
  open: boolean;
  onClose: () => void;
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong.";

const EditItemDialog = ({ item, open, onClose }: Props) => {
  const [name, setName] = useState(item.name);
  const [brand, setBrand] = useState(item.brand ?? "");
  const [category, setCategory] = useState(item.category ?? "");
  const [countryOfOrigin, setCountryOfOrigin] = useState(item.country_of_origin ?? "");
  const [additionalInfo, setAdditionalInfo] = useState(item.additional_info ?? "");
  const [defaultUnit, setDefaultUnit] = useState(item.default_unit ?? "Unit");
  const [calories, setCalories] = useState(String(item.calories_per_unit ?? 0));
  const [protein, setProtein] = useState(String(item.protein_g ?? 0));
  const [carbs, setCarbs] = useState(String(item.carbs_g ?? 0));
  const [fat, setFat] = useState(String(item.fat_g ?? 0));
  const [fiber, setFiber] = useState(String(item.fiber_g ?? 0));
  const [sugar, setSugar] = useState(String(item.sugar_g ?? 0));
  const [sodium, setSodium] = useState(String(item.sodium_mg ?? 0));
  const [servingSize, setServingSize] = useState(item.serving_size ?? "");
  const [nutritionBasis, setNutritionBasis] = useState(item.nutrition_basis ?? "per_unit");
  const [gramsPerUnit, setGramsPerUnit] = useState(String(item.nutrition_grams_per_unit ?? ""));
  const [mlPerUnit, setMlPerUnit] = useState(String(item.nutrition_ml_per_unit ?? ""));
  const [imageUrl, setImageUrl] = useState<string | null>(item.image_url ?? null);
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const { toast } = useToast();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextNutrition = {
      calories_per_unit: calories ? Number(calories) : 0,
      protein_g: protein ? Number(protein) : 0,
      carbs_g: carbs ? Number(carbs) : 0,
      fat_g: fat ? Number(fat) : 0,
      fiber_g: fiber ? Number(fiber) : 0,
      sugar_g: sugar ? Number(sugar) : 0,
      sodium_mg: sodium ? Number(sodium) : 0,
      serving_size: servingSize.trim() || null,
      nutrition_basis: nutritionBasis,
      nutrition_grams_per_unit: gramsPerUnit ? Number(gramsPerUnit) : null,
      nutrition_ml_per_unit: mlPerUnit ? Number(mlPerUnit) : null,
    };
    const nutritionWasEdited =
      Object.entries(nextNutrition).some(([key, value]) => {
        const current = item[key as keyof Item];
        return String(current ?? "") !== String(value ?? "");
      });

    try {
      await updateItem.mutateAsync({
        id: item.id,
        name,
        brand: brand || null,
        category: category || null,
        country_of_origin: countryOfOrigin.trim() || null,
        additional_info: additionalInfo.trim() || null,
        default_unit: defaultUnit,
        ...nextNutrition,
        ...(nutritionWasEdited
          ? {
              nutrition_source: "User-entered label values",
              nutrition_source_url: null,
              nutrition_source_id: null,
              nutrition_estimated: false,
              nutrition_confidence: "high",
              nutrition_updated_at: new Date().toISOString(),
            }
          : {}),
        image_url: imageUrl,
      });
      toast({ title: "Updated", description: `${name} updated.` });
      onClose();
    } catch (error: unknown) {
      toast({ title: "Error", description: errorMessage(error), variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteItem.mutateAsync(item.id);
      toast({ title: "Deleted", description: `${item.name} removed from catalog.` });
      onClose();
    } catch (error: unknown) {
      const isFkError = typeof error === "object" && error !== null && (
        ("message" in error && typeof error.message === "string" && error.message.includes("violates foreign key constraint"))
        || ("code" in error && error.code === "23503")
      );
      toast({
        title: isFkError ? "Cannot delete" : "Error",
        description: isFkError
          ? "This item is still used in your pantry. Remove the linked inventory entries first."
          : errorMessage(error),
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Edit: {item.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <ImageUpload
            currentUrl={imageUrl}
            onUploaded={setImageUrl}
            onRemoved={() => setImageUrl(null)}
            folder="items"
          />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Brand</Label>
              <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Tamrah" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label>Default Unit</Label>
              <GroupedUnitSelect value={defaultUnit} onValueChange={setDefaultUnit} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Country of origin</Label>
            <Input
              value={countryOfOrigin}
              onChange={(e) => setCountryOfOrigin(e.target.value)}
              placeholder="Only shown when set"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs uppercase tracking-wide">Nutrition</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Basis</Label>
                <Select value={nutritionBasis} onValueChange={setNutritionBasis}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_unit">Per unit</SelectItem>
                    <SelectItem value="per_100g">Per 100 g</SelectItem>
                    <SelectItem value="per_100ml">Per 100 ml</SelectItem>
                    <SelectItem value="per_serving">Per serving</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Serving size</Label>
                <Input value={servingSize} onChange={(e) => setServingSize(e.target.value)} placeholder="e.g. 125 g" />
              </div>
            </div>
            {(nutritionBasis === "per_100g" || nutritionBasis === "per_100ml") && (
              <div className="rounded-xl bg-muted/45 p-3">
                <Label className="text-xs">
                  {nutritionBasis === "per_100g"
                    ? "Grams in one piece, pack or container"
                    : "Millilitres in one container"}
                </Label>
                <Input
                  className="mt-1.5"
                  type="number"
                  min={0}
                  step="any"
                  value={nutritionBasis === "per_100g" ? gramsPerUnit : mlPerUnit}
                  onChange={(e) =>
                    nutritionBasis === "per_100g"
                      ? setGramsPerUnit(e.target.value)
                      : setMlPerUnit(e.target.value)
                  }
                  placeholder="Optional — used when logging 1 unit"
                />
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                  This lets Shelf Control convert a piece or pack into an accurate nutrition total.
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ["Calories", calories, setCalories],
                ["Protein (g)", protein, setProtein],
                ["Carbs (g)", carbs, setCarbs],
                ["Fat (g)", fat, setFat],
                ["Fiber (g)", fiber, setFiber],
                ["Sugar (g)", sugar, setSugar],
                ["Sodium (mg)", sodium, setSodium],
              ].map(([label, value, setter]) => (
                <div key={label as string}>
                  <Label className="text-xs">{label as string}</Label>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={value as string}
                    onChange={(e) => (setter as (next: string) => void)(e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Additional information</Label>
            <Textarea
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder="Ingredients, preparation, dietary or handling notes…"
              className="min-h-28 resize-y"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={updateItem.isPending}>
              {updateItem.isPending ? "Saving..." : "Save"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {item.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove it from the catalog. Any inventory entries using this item will also be affected.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditItemDialog;
