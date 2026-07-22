import { useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatQuantity, type Ingredient } from "@/data/cookbookMockData";

interface Props {
  ingredients: Ingredient[];
  baseServings: number;
  servings: number;
  onServingsChange: (n: number) => void;
  onAddToShopping: () => void;
}

const IngredientsCard = ({ ingredients, baseServings, servings, onServingsChange, onAddToShopping }: Props) => {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const scale = servings / baseServings;

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-foreground">Ingredients</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {ingredients.length} items
          </span>
        </div>
      </div>

      <ul className="mt-4 space-y-1">
        {ingredients.map((ing) => {
          const isChecked = !!checked[ing.id];
          const scaledQty = ing.quantity != null ? ing.quantity * scale : null;
          return (
            <li key={ing.id} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
              <button
                onClick={() => setChecked((c) => ({ ...c, [ing.id]: !c[ing.id] }))}
                className={cn(
                  "shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors",
                  isChecked
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-border hover:border-primary",
                )}
                aria-label={isChecked ? "Uncheck" : "Check"}
              >
                {isChecked && <Check className="h-3 w-3" />}
              </button>
              <span
                className={cn(
                  "flex-1 text-sm",
                  isChecked ? "text-muted-foreground line-through" : "text-foreground",
                )}
              >
                {ing.name}
                {ing.optional && (
                  <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">optional</span>
                )}
              </span>
              <span className="text-xs font-medium text-muted-foreground tabular-nums shrink-0">
                {formatQuantity(scaledQty, ing.unit, { toTaste: ing.toTaste, optional: ing.optional })}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 flex flex-wrap items-center gap-2 justify-between">
        <Button variant="outline" size="sm" onClick={onAddToShopping} className="gap-2 rounded-full">
          <Plus className="h-3.5 w-3.5" /> Add Ingredient
        </Button>
        <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/50 px-2 py-1">
          <span className="text-xs text-muted-foreground pl-2">Servings</span>
          <button
            onClick={() => onServingsChange(Math.max(1, servings - 1))}
            className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-muted text-foreground"
            aria-label="Decrease servings"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="text-sm font-medium tabular-nums w-5 text-center">{servings}</span>
          <button
            onClick={() => onServingsChange(servings + 1)}
            className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-muted text-foreground"
            aria-label="Increase servings"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default IngredientsCard;