import { useState } from "react";
import { useCreateItem } from "@/hooks/usePantry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CATEGORIES, UNITS } from "@/lib/pantry-utils";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AddItemDialog = () => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [defaultUnit, setDefaultUnit] = useState("unit");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const createItem = useCreateItem();
  const { toast } = useToast();

  const reset = () => {
    setName("");
    setCategory("");
    setDefaultUnit("unit");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createItem.mutateAsync({
        name,
        category: category || null,
        default_unit: defaultUnit,
        calories_per_unit: calories ? Number(calories) : 0,
        protein_g: protein ? Number(protein) : 0,
        carbs_g: carbs ? Number(carbs) : 0,
        fat_g: fat ? Number(fat) : 0,
      });
      toast({ title: "Item added", description: `${name} added to catalog.` });
      reset();
      setOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          New Item
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Add Catalog Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Chicken Breast" />
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
              <Select value={defaultUnit} onValueChange={setDefaultUnit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs uppercase tracking-wide">Nutrition per unit</Label>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label className="text-xs">Cal</Label>
                <Input type="number" min={0} step="any" value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="0" />
              </div>
              <div>
                <Label className="text-xs">Protein</Label>
                <Input type="number" min={0} step="any" value={protein} onChange={(e) => setProtein(e.target.value)} placeholder="0" />
              </div>
              <div>
                <Label className="text-xs">Carbs</Label>
                <Input type="number" min={0} step="any" value={carbs} onChange={(e) => setCarbs(e.target.value)} placeholder="0" />
              </div>
              <div>
                <Label className="text-xs">Fat</Label>
                <Input type="number" min={0} step="any" value={fat} onChange={(e) => setFat(e.target.value)} placeholder="0" />
              </div>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={createItem.isPending}>
            {createItem.isPending ? "Adding..." : "Add Item"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddItemDialog;
