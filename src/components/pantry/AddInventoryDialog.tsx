import { useState } from "react";
import { useItems, useCreateInventory, type Item } from "@/hooks/usePantry";
import GroupedUnitSelect from "@/components/shared/GroupedUnitSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { STORAGE_LOCATIONS } from "@/lib/pantry-utils";
import { PackagePlus, Users, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useGroupContext } from "@/contexts/GroupContext";
import { useGroups } from "@/hooks/useGroups";

const AddInventoryDialog = () => {
  const [open, setOpen] = useState(false);
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("Unit");
  const [location, setLocation] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const { data: items } = useItems();
  const createInventory = useCreateInventory();
  const { toast } = useToast();

  const selectedItem = items?.find((i) => i.id === itemId);

  const reset = () => {
    setItemId("");
    setQuantity("1");
    setUnit("Unit");
    setLocation("");
    setExpiryDate("");
  };

  const handleItemSelect = (id: string) => {
    setItemId(id);
    const item = items?.find((i) => i.id === id);
    if (item?.default_unit) setUnit(item.default_unit);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createInventory.mutateAsync({
        item_id: itemId,
        quantity: Number(quantity),
        unit,
        storage_location: location || null,
        expiry_date: expiryDate || null,
      });
      toast({ title: "Added to pantry", description: `${selectedItem?.name} added.` });
      reset();
      setOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PackagePlus className="mr-1.5 h-4 w-4" />
          Add to Pantry
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Add to Pantry</DialogTitle>
          <ContextBanner />
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Item *</Label>
            <Select value={itemId} onValueChange={handleItemSelect}>
              <SelectTrigger><SelectValue placeholder="Select an item" /></SelectTrigger>
              <SelectContent>
                {items?.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} {item.category ? `(${item.category})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {items?.length === 0 && (
              <p className="text-xs text-muted-foreground">No items yet. Create one first using "New Item".</p>
            )}
          </div>
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
              <Select value={location} onValueChange={setLocation}>
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
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={!itemId || createInventory.isPending}>
            {createInventory.isPending ? "Adding..." : "Add to Pantry"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddInventoryDialog;
