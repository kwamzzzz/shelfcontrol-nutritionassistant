import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { type ShoppingItem, useUpdateShoppingItem, useDeleteShoppingItem } from "@/hooks/useShoppingList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CATEGORIES } from "@/lib/pantry-utils";
import { BadgeDollarSign, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ImageUpload from "@/components/shared/ImageUpload";

interface Props {
  item: ShoppingItem;
  open: boolean;
  onClose: () => void;
}

const EditShoppingItemDialog = ({ item, open, onClose }: Props) => {
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(String(item.quantity ?? 1));
  const [category, setCategory] = useState(item.category ?? "");
  const [estimatedCost, setEstimatedCost] = useState(String(item.estimated_cost ?? ""));
  const [imageUrl, setImageUrl] = useState<string | null>(item.image_url ?? null);
  const updateItem = useUpdateShoppingItem();
  const deleteItem = useDeleteShoppingItem();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateItem.mutateAsync({
        id: item.id,
        name: name.trim(),
        quantity: quantity ? Number(quantity) : 1,
        category: category || null,
        estimated_cost: estimatedCost ? Number(estimatedCost) : null,
        image_url: imageUrl,
      });
      toast({ title: "Updated", description: `${name} updated.` });
      onClose();
    } catch (err: unknown) {
      toast({
        title: "Couldn't update item",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteItem.mutateAsync(item.id);
      toast({ title: "Removed", description: `${item.name} removed.` });
      onClose();
    } catch (err: unknown) {
      toast({
        title: "Couldn't remove item",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md rounded-[1.75rem]">
        <DialogHeader>
          <DialogTitle className="font-display">Edit: {item.name}</DialogTitle>
          <DialogDescription>
            Update the quantity, category, or expected unit cost.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label>Photo</Label>
            <ImageUpload
              currentUrl={imageUrl}
              folder="shopping"
              onUploaded={setImageUrl}
              onRemoved={() => setImageUrl(null)}
            />
          </div>
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input className="min-h-11 rounded-xl" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Qty</Label>
              <Input className="min-h-11 rounded-xl" type="number" min={0} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="min-h-11 rounded-xl"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Est. Cost</Label>
              <Input className="min-h-11 rounded-xl" type="number" min={0} step="0.01" value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="min-h-11 flex-1 rounded-xl" disabled={updateItem.isPending}>
              {updateItem.isPending ? "Saving..." : "Save"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" className="min-h-11 rounded-xl px-4">
                  <Trash2 className="h-4 w-4" />
                  <span className="ml-2">Remove</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove {item.name}?</AlertDialogTitle>
                  <AlertDialogDescription>This will remove it from your shopping list.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Remove</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          {item.item_id && (
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full rounded-xl border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
              onClick={() => {
                onClose();
                navigate(`/pantry/${item.item_id}/prices`);
              }}
            >
              <BadgeDollarSign className="h-4 w-4" />
              <span className="ml-2">Compare prices</span>
            </Button>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditShoppingItemDialog;
