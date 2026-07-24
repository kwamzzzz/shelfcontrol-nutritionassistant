import { useState } from "react";
import { format, parseISO } from "date-fns";
import {
  CalendarDays,
  Pencil,
  Receipt,
  ShoppingBag,
  StickyNote,
  Trash2,
} from "lucide-react";
import { type PurchaseWithItems, useDeletePurchase } from "@/hooks/usePurchases";
import { formatCurrency } from "@/lib/currency";
import EditPurchaseDialog from "./EditPurchaseDialog";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface Props {
  purchase: PurchaseWithItems | null;
}

const TORN_TOP =
  "polygon(0% 100%, 2% 58%, 4% 100%, 6% 58%, 8% 100%, 10% 58%, 12% 100%, 14% 58%, 16% 100%, 18% 58%, 20% 100%, 22% 58%, 24% 100%, 26% 58%, 28% 100%, 30% 58%, 32% 100%, 34% 58%, 36% 100%, 38% 58%, 40% 100%, 42% 58%, 44% 100%, 46% 58%, 48% 100%, 50% 58%, 52% 100%, 54% 58%, 56% 100%, 58% 58%, 60% 100%, 62% 58%, 64% 100%, 66% 58%, 68% 100%, 70% 58%, 72% 100%, 74% 58%, 76% 100%, 78% 58%, 80% 100%, 82% 58%, 84% 100%, 86% 58%, 88% 100%, 90% 58%, 92% 100%, 94% 58%, 96% 100%, 98% 58%, 100% 100%)";

const TORN_BOTTOM =
  "polygon(0% 0%, 2% 42%, 4% 0%, 6% 42%, 8% 0%, 10% 42%, 12% 0%, 14% 42%, 16% 0%, 18% 42%, 20% 0%, 22% 42%, 24% 0%, 26% 42%, 28% 0%, 30% 42%, 32% 0%, 34% 42%, 36% 0%, 38% 42%, 40% 0%, 42% 42%, 44% 0%, 46% 42%, 48% 0%, 50% 42%, 52% 0%, 54% 42%, 56% 0%, 58% 42%, 60% 0%, 62% 42%, 64% 0%, 66% 42%, 68% 0%, 70% 42%, 72% 0%, 74% 42%, 76% 0%, 78% 42%, 80% 0%, 82% 42%, 84% 0%, 86% 42%, 88% 0%, 90% 42%, 92% 0%, 94% 42%, 96% 0%, 98% 42%, 100% 0%)";

const ReceiptDetail = ({ purchase }: Props) => {
  const [editing, setEditing] = useState(false);
  const deletePurchase = useDeletePurchase();
  const { toast } = useToast();

  if (!purchase) {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-border bg-[hsl(var(--surface-subtle))] p-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Receipt className="h-6 w-6" />
        </span>
        <p className="mt-4 font-display text-lg font-semibold text-foreground">
          Choose a shopping trip
        </p>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Its receipt and line-item details will appear here.
        </p>
      </div>
    );
  }

  const handleDelete = async () => {
    try {
      await deletePurchase.mutateAsync(purchase.id);
      toast({ title: "Purchase deleted", description: "The trip was removed from your history." });
    } catch (err: unknown) {
      toast({
        title: "Couldn't delete purchase",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const items = purchase.purchase_items ?? [];
  const totalCost = Number(purchase.total_cost ?? 0);
  const storeName = purchase.store_name || "Store not recorded";
  const storeInitial = storeName.trim().charAt(0).toUpperCase() || "•";

  return (
    <>
      <article className="relative overflow-hidden drop-shadow-[0_24px_28px_hsl(var(--foreground)/0.10)]">
        <div
          aria-hidden="true"
          className="h-4 w-full bg-[hsl(var(--surface-panel))]"
          style={{ clipPath: TORN_TOP }}
        />

        <div className="border-x border-border/70 bg-[hsl(var(--surface-panel))] px-4 pb-5 sm:px-6 sm:pb-6">
          <header className="flex items-center gap-3 pb-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground shadow-md">
              {storeInitial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-primary">
                Purchase receipt
              </p>
              <h3 className="mt-1 truncate font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {storeName}
              </h3>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                {format(parseISO(purchase.purchased_at), "EEEE, MMM d, yyyy")}
              </p>
            </div>
            <span className="hidden rounded-full bg-[hsl(var(--surface-subtle))] px-3 py-1.5 text-xs font-semibold text-muted-foreground sm:inline-flex">
              {items.length} item{items.length === 1 ? "" : "s"}
            </span>
          </header>

          <div className="border-t border-dashed border-border" />

          {items.length > 0 ? (
            <div className="divide-y divide-border/75">
              {items.map((line, index) => (
                <div
                  key={line.id}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 py-3"
                >
                  <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-lg bg-[hsl(var(--surface-subtle))] text-[0.65rem] font-semibold tabular-nums text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <p className="font-display text-sm font-semibold text-foreground">
                      {line.items?.name ?? "Unknown item"}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.7rem] text-muted-foreground">
                      <span className="tabular-nums">
                        {line.quantity} {line.unit}
                      </span>
                      {line.weight != null && (
                        <span className="tabular-nums">
                          • {line.weight} {line.weight_unit ?? ""}
                        </span>
                      )}
                      {line.expiry_date && (
                        <span className="rounded-full bg-warning/10 px-2 py-0.5 text-warning">
                          exp {format(parseISO(line.expiry_date), "MMM d")}
                        </span>
                      )}
                    </div>
                    {line.notes && (
                      <p className="mt-1 text-[0.7rem] italic leading-relaxed text-muted-foreground/80">
                        {line.notes}
                      </p>
                    )}
                  </div>
                  <span className="ml-2 font-display text-sm font-semibold tabular-nums text-foreground">
                    {line.unit_price != null ? formatCurrency(Number(line.unit_price)) : "—"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <ShoppingBag className="mx-auto h-5 w-5 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">No line items recorded.</p>
            </div>
          )}

          <div className="border-t border-dashed border-border" />

          <div className="mt-4 rounded-2xl bg-[linear-gradient(120deg,hsl(var(--primary)/0.11),hsl(var(--surface-subtle)))] p-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Trip total
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {items.length} recorded item{items.length === 1 ? "" : "s"}
                </p>
              </div>
              <p className="font-display text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
                {totalCost > 0 ? formatCurrency(totalCost) : "—"}
              </p>
            </div>
          </div>

          {purchase.notes && (
            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-border/65 bg-[hsl(var(--surface-subtle))] p-3">
              <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-xs italic leading-relaxed text-muted-foreground">
                {purchase.notes}
              </p>
            </div>
          )}

          <footer className="mt-4 flex items-center gap-2 border-t border-dashed border-border pt-4">
            <Button
              variant="secondary"
              onClick={() => setEditing(true)}
              className="min-h-11 flex-1 rounded-xl"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit receipt
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  aria-label="Delete purchase"
                  className="min-h-11 rounded-xl px-4 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="ml-2 hidden sm:inline">Delete</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-[1.75rem]">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this purchase?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes the trip and all its receipt lines. Pantry entries created
                    through restocking are not removed automatically.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete Purchase
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </footer>
        </div>

        <div
          aria-hidden="true"
          className="h-4 w-full bg-[hsl(var(--surface-panel))]"
          style={{ clipPath: TORN_BOTTOM }}
        />
      </article>

      {editing && (
        <EditPurchaseDialog
          purchase={purchase}
          open={editing}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
};

export default ReceiptDetail;
