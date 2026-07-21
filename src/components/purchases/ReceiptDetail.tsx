import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Receipt, Calendar, MapPin } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Props {
  purchase: PurchaseWithItems | null;
}

const ReceiptDetail = ({ purchase }: Props) => {
  const [editing, setEditing] = useState(false);
  const deletePurchase = useDeletePurchase();
  const { toast } = useToast();

  if (!purchase) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-12 text-center">
        <Receipt className="h-12 w-12 text-muted-foreground/30" />
        <p className="mt-4 font-[Outfit] text-lg font-medium text-muted-foreground">
          Select a trip to view the receipt
        </p>
        <p className="mt-1 text-sm text-muted-foreground/70">
          Click on any shopping trip from the list
        </p>
      </div>
    );
  }

  const handleDelete = async () => {
    try {
      await deletePurchase.mutateAsync(purchase.id);
      toast({ title: "Deleted", description: "Purchase removed." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const items = purchase.purchase_items ?? [];
  const totalCost = Number(purchase.total_cost ?? 0);

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl shadow-[0_2px_20px_-4px_hsl(var(--foreground)/0.08)]">
        {/* Torn top edge */}
        <div
          className="h-4 w-full"
          style={{
            background: "hsl(var(--card))",
            clipPath:
              "polygon(0% 100%, 2% 60%, 4% 100%, 6% 60%, 8% 100%, 10% 60%, 12% 100%, 14% 60%, 16% 100%, 18% 60%, 20% 100%, 22% 60%, 24% 100%, 26% 60%, 28% 100%, 30% 60%, 32% 100%, 34% 60%, 36% 100%, 38% 60%, 40% 100%, 42% 60%, 44% 100%, 46% 60%, 48% 100%, 50% 60%, 52% 100%, 54% 60%, 56% 100%, 58% 60%, 60% 100%, 62% 60%, 64% 100%, 66% 60%, 68% 100%, 70% 60%, 72% 100%, 74% 60%, 76% 100%, 78% 60%, 80% 100%, 82% 60%, 84% 100%, 86% 60%, 88% 100%, 90% 60%, 92% 100%, 94% 60%, 96% 100%, 98% 60%, 100% 100%)",
          }}
        />

        {/* Receipt body */}
        <div className="bg-card px-6 pb-6">
          {/* Store header */}
          <div className="text-center pb-4">
            <h3 className="font-[Outfit] text-xl font-bold text-foreground tracking-tight">
              {purchase.store_name || "Unknown Store"}
            </h3>
            <div className="mt-1.5 flex items-center justify-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(parseISO(purchase.purchased_at), "EEEE, MMM d, yyyy")}
              </span>
            </div>
          </div>

          {/* Dashed separator */}
          <div className="border-t border-dashed border-border my-3" />

          {/* Items */}
          {items.length > 0 ? (
            <div className="space-y-0">
              {items.map((pi) => (
                <div key={pi.id} className="flex items-start justify-between py-2.5 border-b border-border last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="font-[Outfit] text-sm font-medium text-foreground">
                      {pi.items?.name ?? "Unknown"}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {pi.quantity} {pi.unit}
                      </span>
                      {(pi as any).expiry_date && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal text-muted-foreground">
                          exp {format(parseISO((pi as any).expiry_date), "MMM d")}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <span className="font-[Outfit] text-sm font-semibold tabular-nums text-foreground ml-4">
                    {pi.unit_price != null ? formatCurrency(Number(pi.unit_price)) : "—"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">No line items recorded.</p>
          )}

          {/* Dashed separator */}
          <div className="border-t border-dashed border-border my-3" />

          {/* Total */}
          <div className="flex items-center justify-between">
            <span className="font-[Outfit] text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Total
            </span>
            <span className="font-[Outfit] text-2xl font-bold tabular-nums text-foreground">
              {totalCost > 0 ? formatCurrency(totalCost) : "—"}
            </span>
          </div>

          {/* Notes */}
          {purchase.notes && (
            <>
              <div className="border-t border-dashed border-border my-3" />
              <p className="text-xs text-muted-foreground italic leading-relaxed">{purchase.notes}</p>
            </>
          )}

          {/* Dashed separator */}
          <div className="border-t border-dashed border-border my-4" />

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="text-xs">
              <Pencil className="mr-1.5 h-3 w-3" />
              Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive">
                  <Trash2 className="mr-1.5 h-3 w-3" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this purchase?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove the purchase and all its line items. Inventory entries created via restock will not be removed automatically.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete Purchase
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Torn bottom edge */}
        <div
          className="h-4 w-full"
          style={{
            background: "hsl(var(--card))",
            clipPath:
              "polygon(0% 0%, 2% 40%, 4% 0%, 6% 40%, 8% 0%, 10% 40%, 12% 0%, 14% 40%, 16% 0%, 18% 40%, 20% 0%, 22% 40%, 24% 0%, 26% 40%, 28% 0%, 30% 40%, 32% 0%, 34% 40%, 36% 0%, 38% 40%, 40% 0%, 42% 40%, 44% 0%, 46% 40%, 48% 0%, 50% 40%, 52% 0%, 54% 40%, 56% 0%, 58% 40%, 60% 0%, 62% 40%, 64% 0%, 66% 40%, 68% 0%, 70% 40%, 72% 0%, 74% 40%, 76% 0%, 78% 40%, 80% 0%, 82% 40%, 84% 0%, 86% 40%, 88% 0%, 90% 40%, 92% 0%, 94% 40%, 96% 0%, 98% 40%, 100% 0%)",
          }}
        />
      </div>

      {editing && (
        <EditPurchaseDialog purchase={purchase} open={editing} onClose={() => setEditing(false)} />
      )}
    </>
  );
};

export default ReceiptDetail;
