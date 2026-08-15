import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useShoppingList, useUpdateShoppingItem, type ShoppingItem } from "@/hooks/useShoppingList";
import { formatCurrency } from "@/lib/currency";
import { Minus, Plus, Search, ShoppingBasket } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  /** The basket name being edited, or null for the unsorted group. */
  basketName: string | null;
}

const BasketEditDialog = ({ open, onClose, basketName }: Props) => {
  const { data: list } = useShoppingList();
  const updateItem = useUpdateShoppingItem();
  const { toast } = useToast();
  const [name, setName] = useState(basketName ?? "");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(basketName ?? "");
      setSearch("");
    }
  }, [open, basketName]);

  const inBasket = useMemo(
    () =>
      (list ?? []).filter((item) =>
        basketName ? item.basket?.trim() === basketName : !item.basket?.trim(),
      ),
    [list, basketName],
  );

  const available = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (list ?? [])
      .filter((item) => (basketName ? item.basket?.trim() !== basketName : !!item.basket?.trim()))
      .filter((item) => !term || item.name.toLowerCase().includes(term));
  }, [list, basketName, search]);

  const move = async (item: ShoppingItem, target: string | null) => {
    setBusy(true);
    try {
      await updateItem.mutateAsync({ id: item.id, basket: target });
    } catch (err: unknown) {
      toast({
        title: "Couldn't update the basket",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const rename = async () => {
    const next = name.trim();
    if (!basketName || !next || next === basketName) return;
    setBusy(true);
    try {
      for (const item of inBasket) {
        await updateItem.mutateAsync({ id: item.id, basket: next });
      }
      toast({ title: "Basket renamed", description: `Now called ${next}.` });
      onClose();
    } catch (err: unknown) {
      toast({
        title: "Couldn't rename the basket",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const label = basketName ?? "Unsorted list";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto rounded-[1.75rem]">
        <DialogHeader>
          <DialogTitle className="font-display">Edit {label}</DialogTitle>
          <DialogDescription>
            Rename this basket, remove items from it, or pull items in from the rest of your list.
          </DialogDescription>
        </DialogHeader>

        {basketName && (
          <div className="space-y-2">
            <Label>Basket name</Label>
            <div className="flex gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="min-h-11 rounded-xl"
              />
              <Button
                type="button"
                variant="outline"
                className="min-h-11 shrink-0 rounded-xl"
                disabled={busy || !name.trim() || name.trim() === basketName}
                onClick={rename}
              >
                Rename
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <ShoppingBasket className="h-3.5 w-3.5 text-primary" />
            In this basket ({inBasket.length})
          </Label>
          <div className="max-h-[28vh] space-y-1.5 overflow-y-auto rounded-xl border border-border/40 p-2">
            {inBasket.length === 0 ? (
              <p className="px-1 py-2 text-sm text-muted-foreground">No items here yet.</p>
            ) : (
              inBasket.map((item) => (
                <div key={item.id} className="flex items-center gap-2 rounded-lg px-1 py-1">
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">{item.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {formatCurrency(Number(item.estimated_cost ?? 0))}
                  </span>
                  {basketName && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 rounded-lg"
                      aria-label={`Remove ${item.name} from basket`}
                      disabled={busy}
                      onClick={() => move(item, null)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {basketName && (
          <div className="space-y-2">
            <Label>Add from your list</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search items"
                className="min-h-11 rounded-xl pl-9"
              />
            </div>
            <div className="max-h-[28vh] space-y-1.5 overflow-y-auto rounded-xl border border-border/40 p-2">
              {available.length === 0 ? (
                <p className="px-1 py-2 text-sm text-muted-foreground">Nothing else to add.</p>
              ) : (
                available.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 rounded-lg px-1 py-1">
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                      {item.name}
                      {item.basket?.trim() && (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          · {item.basket.trim()}
                        </span>
                      )}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 rounded-lg"
                      aria-label={`Add ${item.name} to basket`}
                      disabled={busy}
                      onClick={() => move(item, basketName)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <Button type="button" className="min-h-11 w-full rounded-xl" onClick={onClose} disabled={busy}>
          Done
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default BasketEditDialog;
