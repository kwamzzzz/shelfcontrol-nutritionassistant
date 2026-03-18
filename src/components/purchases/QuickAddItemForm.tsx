import { useState } from "react";
import { useCreateItem } from "@/hooks/usePantry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES, UNITS } from "@/lib/pantry-utils";
import { Plus, Loader2 } from "lucide-react";

interface QuickAddItemFormProps {
  initialName?: string;
  onCreated: (itemId: string) => void;
}

const QuickAddItemForm = ({ initialName = "", onCreated }: QuickAddItemFormProps) => {
  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState("");
  const [defaultUnit, setDefaultUnit] = useState("unit");
  const createItem = useCreateItem();

  const handleSubmit = async () => {
    if (!name.trim()) return;
    try {
      const item = await createItem.mutateAsync({
        name: name.trim(),
        category: category || null,
        default_unit: defaultUnit,
      });
      onCreated(item.id);
    } catch {
      // error handled by mutation
    }
  };

  return (
    <div className="p-3 space-y-2 border-t bg-muted/30">
      <p className="text-xs font-medium text-muted-foreground">Quick-add new catalog item</p>
      <Input
        placeholder="Item name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-8 text-sm"
        autoFocus
      />
      <div className="grid grid-cols-2 gap-2">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={defaultUnit} onValueChange={setDefaultUnit}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {UNITS.map((u) => (
              <SelectItem key={u} value={u}>{u}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        type="button"
        size="sm"
        className="w-full h-8 text-xs"
        onClick={handleSubmit}
        disabled={!name.trim() || createItem.isPending}
      >
        {createItem.isPending ? (
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        ) : (
          <Plus className="mr-1 h-3 w-3" />
        )}
        Create & Select
      </Button>
    </div>
  );
};

export default QuickAddItemForm;
