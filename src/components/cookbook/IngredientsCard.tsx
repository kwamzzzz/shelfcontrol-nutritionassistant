import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, Check, ChevronRight, Minus, Plus, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatQuantity, type Ingredient } from "@/data/cookbookMockData";
import { useInventory } from "@/hooks/usePantry";
import { useCreateShoppingItem, useShoppingList } from "@/hooks/useShoppingList";
import {
  computeIngredientNeeds,
  round2,
  safeScale,
  shoppingListHasIngredient,
  toShoppingLine,
  type IngredientNeed,
} from "@/lib/recipe-pantry";
import IngredientKitchenSheet from "@/components/cookbook/IngredientKitchenSheet";

interface Props {
  ingredients: Ingredient[];
  baseServings: number;
  servings: number;
  onServingsChange: (n: number) => void;
  onAddIngredient?: () => void;
  /** Absent on the sample cookbook page — disables editing, not inspection. */
  recipeId?: string;
}

const IngredientsCard = ({
  ingredients,
  baseServings,
  servings,
  onServingsChange,
  onAddIngredient,
  recipeId,
}: Props) => {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [openNeed, setOpenNeed] = useState<IngredientNeed | null>(null);
  const scale = safeScale(servings, baseServings);

  const { data: inventory, isLoading: inventoryLoading } = useInventory();
  // Dedupe is only meaningful once the list has actually arrived — adding
  // before it resolves would duplicate everything already on it.
  const { data: shoppingItems, isLoading: shoppingLoading } = useShoppingList();
  const createShoppingItem = useCreateShoppingItem();

  const needs = useMemo(
    () => computeIngredientNeeds(ingredients, inventory, scale),
    [ingredients, inventory, scale],
  );

  // Keep the open sheet's figures live as the pantry or servings change.
  const liveNeed = openNeed
    ? needs.find((n) => n.ingredient.id === openNeed.ingredient.id) ?? openNeed
    : null;

  const lacking = needs.filter((n) => n.status === "missing" || n.status === "short");

  const addAllMissing = async () => {
    const open = (shoppingItems ?? [])
      .filter((row) => !row.is_purchased)
      .map((row) => ({ name: row.name, item_id: row.item_id ?? null }));

    const queued = lacking.filter(
      (n) =>
        !shoppingListHasIngredient(open, {
          name: n.ingredient.name,
          item_id: n.ingredient.item_id ?? null,
        }),
    );

    if (queued.length === 0) {
      toast.info("Everything you're short of is already on your shopping list.");
      return;
    }

    let added = 0;
    for (const need of queued) {
      const amount = need.shortfall > 0 ? need.shortfall : need.scaledQty ?? 1;
      const line = toShoppingLine(need.ingredient.name, amount, need.ingredient.unit ?? "");
      try {
        await createShoppingItem.mutateAsync({
          name: line.name,
          quantity: line.quantity,
          item_id: need.ingredient.item_id ?? null,
          recipe_id: recipeId ?? null,
        });
        added += 1;
      } catch {
        // Keep going: one bad row shouldn't strand the rest of the list.
      }
    }

    if (added === 0) toast.error("Could not add those to your shopping list.");
    else toast.success(`Added ${added} ${added === 1 ? "item" : "items"} to your shopping list`);
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-foreground">Ingredients</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {ingredients.length} items
          </span>
        </div>
        {onAddIngredient && (
          <button
            type="button"
            onClick={onAddIngredient}
            className="inline-flex min-h-[44px] items-center gap-1 px-2 text-xs font-medium text-primary hover:underline"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        )}
      </div>

      <ul className="mt-2">
        {needs.map((need) => {
          const ing = need.ingredient;
          const isChecked = !!checked[ing.id];
          const { status } = need;
          const lackingThis = status === "missing" || status === "short";

          return (
            <li key={ing.id} className="flex items-center gap-2 border-b border-border/40 last:border-0">
              <button
                type="button"
                onClick={() => setChecked((c) => ({ ...c, [ing.id]: !c[ing.id] }))}
                className="flex h-11 w-11 shrink-0 items-center justify-center"
                aria-pressed={isChecked}
                aria-label={`Mark ${ing.name} as gathered`}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors",
                    isChecked
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border",
                  )}
                >
                  {isChecked && <Check className="h-3 w-3" />}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setOpenNeed(need)}
                className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 py-2 pr-1 text-left"
                aria-label={`${ing.name}, ${formatQuantity(need.scaledQty, ing.unit, {
                  toTaste: ing.toTaste,
                  optional: ing.optional,
                })}${
                  status === "missing"
                    ? ", not in your pantry"
                    : status === "short"
                      ? `, only ${round2(need.available)} in your pantry`
                      : status === "ok"
                        ? ", in your pantry"
                        : ""
                }. Open your kitchen.`}
              >
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate text-sm",
                      isChecked
                        ? "text-muted-foreground line-through"
                        : lackingThis
                          ? "font-medium text-destructive"
                          : "text-foreground",
                    )}
                  >
                    {ing.name}
                    {ing.optional && (
                      <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                        optional
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5">
                    <span className="text-xs font-medium tabular-nums text-muted-foreground">
                      {formatQuantity(need.scaledQty, ing.unit, {
                        toTaste: ing.toTaste,
                        optional: ing.optional,
                      })}
                    </span>
                    {status && !isChecked && (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                          status === "ok"
                            ? "bg-success/10 text-success"
                            : "bg-destructive/10 text-destructive",
                        )}
                      >
                        {status === "ok" ? (
                          <>
                            <Check className="h-3 w-3" /> In pantry
                          </>
                        ) : status === "short" ? (
                          <>
                            <AlertCircle className="h-3 w-3" /> Have {round2(need.available)}
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-3 w-3" /> Not in pantry
                          </>
                        )}
                      </span>
                    )}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            </li>
          );
        })}
      </ul>

      {lacking.length > 0 && !inventoryLoading && !shoppingLoading && (
        <button
          type="button"
          onClick={addAllMissing}
          disabled={createShoppingItem.isPending}
          className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-border bg-card/60 px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-60"
        >
          <ShoppingCart className="h-4 w-4" />
          {createShoppingItem.isPending
            ? "Adding…"
            : `Add ${lacking.length} missing to shopping list`}
        </button>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2 justify-end">
        <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/50 px-2 py-1">
          <span className="text-xs text-muted-foreground pl-2">Servings</span>
          <button
            onClick={() => onServingsChange(Math.max(1, servings - 1))}
            className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-muted text-foreground"
            aria-label="Decrease servings"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="text-sm font-medium tabular-nums w-5 text-center">{servings}</span>
          <button
            onClick={() => onServingsChange(servings + 1)}
            className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-muted text-foreground"
            aria-label="Increase servings"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <IngredientKitchenSheet
        need={liveNeed}
        scale={scale}
        recipeId={recipeId}
        open={openNeed !== null}
        onClose={() => setOpenNeed(null)}
      />
    </div>
  );
};

export default IngredientsCard;
