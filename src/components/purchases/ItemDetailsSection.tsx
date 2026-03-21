import { useState } from "react";
import { ChevronDown, ChevronRight, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES } from "@/lib/pantry-utils";
import type { Tables } from "@/integrations/supabase/types";

export interface ItemOverrides {
  brand?: string;
  category?: string;
  calories_per_unit?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
}

interface Props {
  item: Tables<"items"> | undefined;
  overrides: ItemOverrides;
  onChange: (patch: Partial<ItemOverrides>) => void;
}

const ItemDetailsSection = ({ item, overrides, onChange }: Props) => {
  const [expanded, setExpanded] = useState(false);

  if (!item) return null;

  const brand = overrides.brand ?? item.brand ?? "";
  const category = overrides.category ?? item.category ?? "";
  const cal = overrides.calories_per_unit ?? item.calories_per_unit ?? 0;
  const protein = overrides.protein_g ?? item.protein_g ?? 0;
  const carbs = overrides.carbs_g ?? item.carbs_g ?? 0;
  const fat = overrides.fat_g ?? item.fat_g ?? 0;

  const hasSomeData = !!(item.brand || item.calories_per_unit || item.protein_g || item.carbs_g || item.fat_g);

  return (
    <div className="border-t border-dashed pt-1.5">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <Info className="h-3 w-3" />
        <span>{hasSomeData ? "Item details" : "Add item details (brand, nutrition)"}</span>
        {hasSomeData && !expanded && (
          <span className="ml-auto text-[10px] opacity-60 truncate max-w-[160px]">
            {[brand, cal ? `${cal} cal` : null].filter(Boolean).join(" · ")}
          </span>
        )}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2 animate-in fade-in-0 slide-in-from-top-1 duration-200">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Brand</Label>
              <Input
                className="h-8 text-sm"
                placeholder="e.g. Al Ain"
                value={brand}
                onChange={(e) => onChange({ brand: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Select value={category} onValueChange={(v) => onChange({ category: v })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Nutrition per unit</Label>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label className="text-[10px]">Cal</Label>
                <Input type="number" min={0} step="any" className="h-7 text-xs" value={cal} onChange={(e) => onChange({ calories_per_unit: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div>
                <Label className="text-[10px]">Protein</Label>
                <Input type="number" min={0} step="any" className="h-7 text-xs" value={protein} onChange={(e) => onChange({ protein_g: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div>
                <Label className="text-[10px]">Carbs</Label>
                <Input type="number" min={0} step="any" className="h-7 text-xs" value={carbs} onChange={(e) => onChange({ carbs_g: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div>
                <Label className="text-[10px]">Fat</Label>
                <Input type="number" min={0} step="any" className="h-7 text-xs" value={fat} onChange={(e) => onChange({ fat_g: e.target.value ? Number(e.target.value) : null })} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemDetailsSection;
