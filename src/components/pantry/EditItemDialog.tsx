import { useState } from "react";
import { type Item, useUpdateItem, useDeleteItem } from "@/hooks/usePantry";
import GroupedUnitSelect from "@/components/shared/GroupedUnitSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const EditItemDialog = ({ item, open, onClose }: Props) => {
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category ?? "");
  const [defaultUnit, setDefaultUnit] = useState(item.default_unit ?? "Unit");
  const [calories, setCalories] = useState(String(item.calories_per_unit ?? 0));
  const [protein, setProtein] = useState(String(item.protein_g ?? 0));
  const [carbs, setCarbs] = useState(String(item.carbs_g ?? 0));
  const [fat, setFat] = useState(String(item.fat_g ?? 0));
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const { toast } = useToast();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateItem.mutateAsync({
        id: item.id,
        name,
        category: category || null,
        default_unit: defaultUnit,
        calories_per_unit: calories ? Number(calories) : 0,
        protein_g: protein ? Number(protein) : 0,
        carbs_g: carbs ? Number(carbs) : 0,
        fat_g: fat ? Number(fat) : 0,
      });
      toast({ title: "Updated", description: `${name} updated.` });
      onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteItem.mutateAsync(item.id);
      toast({ title: "Deleted", description: `${item.name} removed from catalog.` });
      onClose();
    } catch (err: any) {
      const isFkError = err.message?.includes("violates foreign key constraint") || err.code === "23503";
      toast({
        title: isFkError ? "Cannot delete" : "Error",
        description: isFkError
          ? "This item is still used in your pantry. Remove the linked inventory entries first."
          : err.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Edit: {item.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
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
            <Label className="text-muted-foreground text-xs uppercase tracking-wide">Nutrition per unit</Label>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label className="text-xs">Cal</Label>
                <Input type="number" min={0} step="any" value={calories} onChange={(e) => setCalories(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Protein</Label>
                <Input type="number" min={0} step="any" value={protein} onChange={(e) => setProtein(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Carbs</Label>
                <Input type="number" min={0} step="any" value={carbs} onChange={(e) => setCarbs(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Fat</Label>
                <Input type="number" min={0} step="any" value={fat} onChange={(e) => setFat(e.target.value)} />
              </div>
            </div>
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
