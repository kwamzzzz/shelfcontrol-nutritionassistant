import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, MapPin, Package, Pencil, Repeat2, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import GroupedUnitSelect from "@/components/shared/GroupedUnitSelect";
import { useIsPhone } from "@/hooks/use-shell-mode";
import { useItems } from "@/hooks/usePantry";
import { useRemoveRecipeIngredient, useUpdateRecipeIngredient } from "@/hooks/useRecipes";
import { useCreateShoppingItem, useShoppingList } from "@/hooks/useShoppingList";
import { getExpiryLabel, getExpiryStatus } from "@/lib/pantry-utils";
import {
  canonicalUnit,
  round2,
  shoppingListHasIngredient,
  toBaseQuantity,
  toShoppingLine,
  type IngredientNeed,
} from "@/lib/recipe-pantry";
import { cn } from "@/lib/utils";

interface Props {
  need: IngredientNeed | null;
  /** Current servings scale — typed amounts are converted back through this. */
  scale: number;
  /** Absent for the sample cookbook page, which has no editable recipe. */
  recipeId?: string;
  open: boolean;
  onClose: () => void;
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong.";

const EXPIRY_TONE: Record<string, string> = {
  expired: "text-destructive",
  expiring: "text-warning",
  fresh: "text-muted-foreground",
  "no-date": "text-muted-foreground",
};

const KitchenSheetBody = ({ need, scale, recipeId, onClose }: Omit<Props, "open">) => {
  const { data: items } = useItems();
  const { data: shoppingItems } = useShoppingList();
  const updateIngredient = useUpdateRecipeIngredient();
  const removeIngredient = useRemoveRecipeIngredient();
  const createShoppingItem = useCreateShoppingItem();

  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);

  const ingredient = need?.ingredient;

  useEffect(() => {
    if (!need) return;
    setAmount(need.scaledQty != null ? String(need.scaledQty) : "");
    setUnit(canonicalUnit(need.ingredient.unit));
    setConfirmRemove(false);
  }, [need]);

  const busy =
    updateIngredient.isPending || removeIngredient.isPending || createShoppingItem.isPending;

  // Only a real recipe row can be edited; sample data has placeholder ids.
  const editable = Boolean(recipeId && ingredient?.item_id);

  const alreadyOnList = useMemo(() => {
    if (!ingredient) return false;
    const open = (shoppingItems ?? [])
      .filter((row) => !row.is_purchased)
      .map((row) => ({ name: row.name, item_id: row.item_id ?? null }));
    return shoppingListHasIngredient(open, {
      name: ingredient.name,
      item_id: ingredient.item_id ?? null,
    });
  }, [shoppingItems, ingredient]);

  if (!need || !ingredient) return null;

  const { batches, available, status, shortfall, scaledQty } = need;

  const saveAmount = async () => {
    const base = toBaseQuantity(Number(amount), scale);
    if (base == null) {
      toast.error("Enter an amount greater than zero.");
      return;
    }
    try {
      await updateIngredient.mutateAsync({ id: ingredient.id, quantity: base, unit });
      toast.success(`${ingredient.name} updated`);
    } catch (error: unknown) {
      toast.error(errorMessage(error));
    }
  };

  const useWhatIHave = async () => {
    const base = toBaseQuantity(available, scale);
    if (base == null) {
      toast.error("There is nothing in your pantry to use.");
      return;
    }
    try {
      await updateIngredient.mutateAsync({ id: ingredient.id, quantity: base, unit });
      setAmount(String(round2(available)));
      toast.success(`Set to the ${round2(available)} you have`);
    } catch (error: unknown) {
      toast.error(errorMessage(error));
    }
  };

  const swapTo = async (itemId: string) => {
    const next = items?.find((i) => i.id === itemId);
    if (!next) return;
    try {
      // Adopt the new item's own unit: keeping the old one can silently zero
      // this ingredient's nutrition when the two use a different basis.
      await updateIngredient.mutateAsync({
        id: ingredient.id,
        item_id: itemId,
        unit: next.default_unit ?? unit,
      });
      setSwapOpen(false);
      toast.success(`Swapped to ${next.name}`);
      onClose();
    } catch (error: unknown) {
      toast.error(errorMessage(error));
    }
  };

  const remove = async () => {
    try {
      await removeIngredient.mutateAsync(ingredient.id);
      toast.success(`${ingredient.name} removed`);
      onClose();
    } catch (error: unknown) {
      toast.error(errorMessage(error));
    }
  };

  const addToShoppingList = async () => {
    const amountNeeded = shortfall > 0 ? shortfall : scaledQty ?? 1;
    const line = toShoppingLine(ingredient.name, amountNeeded, unit);
    try {
      await createShoppingItem.mutateAsync({
        name: line.name,
        quantity: line.quantity,
        item_id: ingredient.item_id ?? null,
      });
      toast.success(`${ingredient.name} added to your shopping list`);
    } catch (error: unknown) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-6">
        {/* What the recipe needs vs what's on the shelves */}
        <div
          className={cn(
            "rounded-2xl border p-4",
            status === "ok"
              ? "border-success/40 bg-success/5"
              : status
                ? "border-destructive/40 bg-destructive/5"
                : "border-border bg-muted/40",
          )}
        >
          <p className="text-sm text-muted-foreground">
            {scaledQty != null ? (
              <>
                This recipe needs{" "}
                <span className="font-semibold text-foreground tabular-nums">
                  {round2(scaledQty)} {unit}
                </span>
              </>
            ) : (
              "This recipe doesn't specify an amount"
            )}
          </p>
          <p className="mt-1 text-sm">
            {status === "missing" ? (
              <span className="font-semibold text-destructive">Nothing in your pantry</span>
            ) : (
              <>
                <span className="font-semibold text-foreground tabular-nums">
                  {round2(available)}
                </span>{" "}
                <span className="text-muted-foreground">
                  on your shelves across {batches.length}{" "}
                  {batches.length === 1 ? "batch" : "batches"}
                </span>
              </>
            )}
          </p>
          {shortfall > 0 && status !== "missing" && (
            <p className="mt-1 text-xs font-medium text-destructive tabular-nums">
              {round2(shortfall)} short
            </p>
          )}
          {batches.length > 0 && (
            <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
              Amounts are compared as numbers, not converted between units — check the batches
              below if the units differ.
            </p>
          )}
        </div>

        {/* The virtual shelf */}
        <div className="mt-4">
          <p className="font-analytics text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            In your kitchen
          </p>
          {batches.length === 0 ? (
            <p className="mt-2 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              You don't have {ingredient.name} in your pantry right now.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {batches.map((row) => {
                const expiryStatus = getExpiryStatus(row.expiry_date);
                return (
                  <li
                    key={row.id}
                    className="flex items-start gap-3 rounded-2xl border border-border bg-card/60 p-3"
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {row.items?.name ?? ingredient.name}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                        <span className={EXPIRY_TONE[expiryStatus]}>
                          {getExpiryLabel(row.expiry_date)}
                        </span>
                        {row.storage_location && (
                          <span className="inline-flex items-center gap-0.5 text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {row.storage_location}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                      {round2(Number(row.quantity) || 0)}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        {row.unit}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Edit this ingredient, right here */}
        {editable && (
          <div className="mt-5">
            <p className="font-analytics text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Adjust this ingredient
            </p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="kitchen-amount" className="text-xs">
                  Amount
                </Label>
                <Input
                  id="kitchen-amount"
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Unit</Label>
                <GroupedUnitSelect
                  value={unit}
                  onValueChange={setUnit}
                  triggerClassName="h-11"
                  // Recipes carry free-text units ("pieces") that aren't in the
                  // canonical list; show it rather than an empty trigger.
                  placeholder={unit || "Unit"}
                />
              </div>
            </div>

            <Button
              onClick={saveAmount}
              disabled={busy}
              className="mt-3 min-h-[44px] w-full rounded-xl"
            >
              <Pencil className="h-4 w-4" />
              {updateIngredient.isPending ? "Saving…" : "Save amount"}
            </Button>

            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {available > 0 && shortfall > 0 && (
                <Button
                  variant="outline"
                  onClick={useWhatIHave}
                  disabled={busy}
                  className="min-h-[44px] rounded-xl"
                >
                  <Check className="h-4 w-4" />
                  Use the {round2(available)} I have
                </Button>
              )}

              <Popover open={swapOpen} onOpenChange={setSwapOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={busy}
                    className="min-h-[44px] w-full rounded-xl"
                  >
                    <Repeat2 className="h-4 w-4" />
                    Swap for something else
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[min(20rem,calc(100vw-2rem))] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search your items…" className="h-10" />
                    <CommandList>
                      <CommandEmpty>
                        <p className="p-2 text-sm text-muted-foreground">No items found.</p>
                      </CommandEmpty>
                      <CommandGroup>
                        {items?.map((item) => (
                          <CommandItem
                            key={item.id}
                            value={item.name}
                            onSelect={() => swapTo(item.id)}
                          >
                            <span className="truncate">{item.name}</span>
                            {item.category && (
                              <span className="ml-auto text-xs text-muted-foreground">
                                {item.category}
                              </span>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {confirmRemove ? (
              <div
                role="alert"
                className="mt-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3"
              >
                <p className="text-sm text-foreground">
                  Remove {ingredient.name} from this recipe?
                </p>
                <div className="mt-2 flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={remove}
                    disabled={busy}
                    autoFocus
                    className="min-h-[44px] flex-1 rounded-xl"
                  >
                    {removeIngredient.isPending ? "Removing…" : "Remove"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setConfirmRemove(false)}
                    disabled={busy}
                    className="min-h-[44px] flex-1 rounded-xl"
                  >
                    Keep it
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                onClick={() => setConfirmRemove(true)}
                disabled={busy}
                className="mt-2 min-h-[44px] w-full rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Remove from recipe
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Shopping action pinned where a thumb reaches it */}
      <div className="shrink-0 border-t border-border bg-card/95 px-4 pb-[max(0.75rem,var(--safe-bottom))] pt-3 backdrop-blur sm:px-6 sm:pb-4">
        <Button
          onClick={addToShoppingList}
          disabled={busy || alreadyOnList}
          className="min-h-[48px] w-full rounded-xl"
          variant={status === "ok" ? "outline" : "default"}
        >
          <ShoppingCart className="h-4 w-4" />
          {alreadyOnList
            ? "Already on your shopping list"
            : createShoppingItem.isPending
              ? "Adding…"
              : shortfall > 0
                ? `Add the ${round2(shortfall)} I'm short to shopping list`
                : "Add to shopping list"}
        </Button>
      </div>
    </div>
  );
};

const IngredientKitchenSheet = ({ need, scale, recipeId, open, onClose }: Props) => {
  const isPhone = useIsPhone();
  const title = need?.ingredient.name ?? "Ingredient";

  if (isPhone) {
    return (
      <Drawer open={open} onOpenChange={(next) => !next && onClose()}>
        <DrawerContent className="max-h-[94dvh]">
          <DrawerHeader className="pb-2 text-left">
            <DrawerTitle className="truncate">{title}</DrawerTitle>
          </DrawerHeader>
          <KitchenSheetBody need={need} scale={scale} recipeId={recipeId} onClose={onClose} />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex max-w-lg flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="px-6 pb-2 pt-6">
          <DialogTitle className="truncate">{title}</DialogTitle>
        </DialogHeader>
        <KitchenSheetBody need={need} scale={scale} recipeId={recipeId} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
};

export default IngredientKitchenSheet;
