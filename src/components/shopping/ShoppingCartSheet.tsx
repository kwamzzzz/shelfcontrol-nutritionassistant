import { useMemo } from "react";
import { CheckCircle2, ShoppingBasket, ShoppingCart, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import ShoppingItemRow from "@/components/shopping/ShoppingItemRow";
import { useSetCartMembership, type ShoppingItem } from "@/hooks/useShoppingList";
import { formatCurrency } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  items: ShoppingItem[];
  onEditItem: (item: ShoppingItem) => void;
}

const UNSORTED = "__unsorted__";

/**
 * In-store shopping cart: the final destination for selected buckets and items.
 * Buckets stay grouped so a shopper can walk the store basket by basket.
 */
const ShoppingCartSheet = ({ open, onClose, items, onEditItem }: Props) => {
  const setCart = useSetCartMembership();
  const { toast } = useToast();

  const groups = useMemo(() => {
    const map = new Map<string, ShoppingItem[]>();
    for (const item of items) {
      const key = item.basket?.trim() ? item.basket.trim() : UNSORTED;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return [...map.entries()]
      .map(([key, groupItems]) => ({
        key,
        label: key === UNSORTED ? "Loose items" : key,
        isUnsorted: key === UNSORTED,
        items: groupItems,
        total: groupItems.reduce((sum, i) => sum + Number(i.estimated_cost ?? 0), 0),
        picked: groupItems.filter((i) => i.is_purchased).length,
      }))
      .sort((a, b) => {
        if (a.isUnsorted !== b.isUnsorted) return a.isUnsorted ? 1 : -1;
        return a.label.localeCompare(b.label);
      });
  }, [items]);

  const pickedIds = items.filter((i) => i.is_purchased).map((i) => i.id);
  const total = items.reduce((sum, i) => sum + Number(i.estimated_cost ?? 0), 0);
  const openTotal = items
    .filter((i) => !i.is_purchased)
    .reduce((sum, i) => sum + Number(i.estimated_cost ?? 0), 0);

  const removeAll = async (ids: string[], label: string) => {
    if (ids.length === 0) return;
    await setCart.mutateAsync({ ids, inCart: false });
    toast({ title: "Removed from cart", description: label });
  };

  return (
    <Sheet open={open} onOpenChange={(value) => !value && onClose()}>
      <SheetContent side="right" className="flex w-full max-w-lg flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="px-5 pt-5 text-left">
          <SheetTitle className="flex items-center gap-2 font-display text-2xl">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Shopping cart
          </SheetTitle>
          <SheetDescription>
            {items.length === 0
              ? "Select buckets or items on your list and add them here."
              : `${items.length - pickedIds.length} left to pick up • ${pickedIds.length} ticked off`}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="rounded-[1.5rem] border border-border/50 bg-[hsl(var(--surface-subtle))] px-5 py-10 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ShoppingCart className="h-5 w-5" />
              </span>
              <p className="mt-3 font-display text-base font-bold text-foreground">Cart is empty</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Use “Add to cart” on a basket or on selected items.
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <section key={group.key} className="space-y-2">
                <header className="flex items-center justify-between gap-3 px-1">
                  <span className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
                    <ShoppingBasket className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate">{group.label}</span>
                    <span className="shrink-0 rounded-full bg-[hsl(var(--surface-subtle))] px-2 py-0.5 text-[0.65rem] tabular-nums text-muted-foreground">
                      {group.picked}/{group.items.length}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    <span className="text-sm font-semibold tabular-nums text-muted-foreground">
                      {formatCurrency(group.total)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-xl"
                      aria-label={`Remove ${group.label} from cart`}
                      onClick={() => removeAll(group.items.map((i) => i.id), group.label)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </span>
                </header>

                {group.items.map((item) => (
                  <ShoppingItemRow key={item.id} item={item} onClick={() => onEditItem(item)} />
                ))}
              </section>
            ))
          )}
        </div>

        {items.length > 0 && (
          <footer className="space-y-3 border-t border-border/50 px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Cart total
                </p>
                <p className="font-display text-xl font-bold tabular-nums text-foreground">
                  {formatCurrency(total)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Still to pick
                </p>
                <p className="font-display text-xl font-bold tabular-nums text-primary">
                  {formatCurrency(openTotal)}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full rounded-2xl"
              disabled={pickedIds.length === 0 || setCart.isPending}
              onClick={() => removeAll(pickedIds, `${pickedIds.length} ticked-off item(s)`)}
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Clear ticked-off items
            </Button>
          </footer>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default ShoppingCartSheet;